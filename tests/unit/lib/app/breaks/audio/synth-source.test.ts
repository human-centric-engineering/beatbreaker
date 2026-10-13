// @vitest-environment happy-dom

/**
 * `SynthSource` — the synthesised kits, rendered ahead (9-vi-d).
 *
 * The live context is `FakeAudioContext` and every render is a
 * `FakeOfflineAudioContext` (`tests/helpers/fake-audio-context.ts`), so each
 * assertion reads what was drawn where: how many offline contexts a voice
 * rendered into, which buffer a hit played, how many nodes a hit built on the
 * live context. Timers are fake, so the 150 ms debounce is stepped, not slept.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BreakAudio, SourceStack } from '@/lib/app/breaks/audio/engine';
import {
  DEBOUNCE_MS,
  LAYERS,
  RENDERED,
  SynthSource,
  VARIATIONS,
  nearestLayer,
  renderTake,
  signature,
  type MakeOffline,
} from '@/lib/app/breaks/audio/synth-source';
import { type ResolvedKit, type VoiceParams, withTuning } from '@/lib/app/breaks/kit';
import { testKit } from '@/tests/helpers/catalogue';
import {
  FakeAudioBuffer,
  FakeAudioBufferSourceNode,
  FakeAudioContext,
  FakeAudioNode,
  FakeOfflineAudioContext,
  FakeOscillatorNode,
  nodesOfKind,
} from '@/tests/helpers/fake-audio-context';

const STUDIO70: ResolvedKit = testKit('studio70');
const LIVEROOM: ResolvedKit = testKit('liveroom');
const MULDJORD: ResolvedKit = testKit('muldjord');

const make: MakeOffline = (channels, length, rate) =>
  new FakeOfflineAudioContext(channels, length, rate) as unknown as OfflineAudioContext;

/** Let every render's promise chain run out. */
async function settle(): Promise<void> {
  for (let i = 0; i < 200; i++) await Promise.resolve();
}

/** Past the debounce, and every render it started finished. */
async function rendered(): Promise<void> {
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  await settle();
}

function engineWith(
  kit: ResolvedKit,
  sound?: Record<string, VoiceParams>
): {
  audio: BreakAudio;
  ctx: FakeAudioContext;
  synth: SynthSource;
} {
  const audio = new BreakAudio();
  const synth = new SynthSource(undefined, make);
  audio.samples = new SourceStack([synth]);
  audio.setKit(kit, sound ?? withTuning(kit, undefined));
  const ctx = audio.init() as unknown as FakeAudioContext;
  return { audio, ctx, synth };
}

/** Nodes the live context created while `fn` ran. */
function recordNodes(ctx: FakeAudioContext, fn: () => void): FakeAudioNode[] {
  const before = ctx.nodes.length;
  fn();
  return ctx.nodes.slice(before);
}

function played(nodes: FakeAudioNode[]): FakeAudioBufferSourceNode[] {
  return nodes.filter(
    (n): n is FakeAudioBufferSourceNode => n instanceof FakeAudioBufferSourceNode
  );
}

/** How many takes a voice renders: five layers × three for a snare stroke with wires, three otherwise. */
function rendersOf(voice: string): number {
  return RENDERED[voice].reduce(
    (n, slot) => n + (['s', 'sGhost', 'sRim'].includes(slot) ? LAYERS.length : 1) * VARIATIONS,
    0
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeAudioContext.instances.length = 0;
  FakeAudioContext.throwOnConstruct = false;
  FakeOfflineAudioContext.reset();
  window.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ---------------------------------------------------------------------- */
/* pure pieces                                                            */
/* ---------------------------------------------------------------------- */

describe('signature', () => {
  it('ignores the room send, which is applied when a render plays', () => {
    expect(signature({ tune: 50, decay: 0.3, room: 0.1 }, 44100)).toBe(
      signature({ room: 0.9, decay: 0.3, tune: 50 }, 44100)
    );
  });

  it('changes with any other knob, and with the rate', () => {
    const base = signature({ tune: 50, decay: 0.3 }, 44100);
    expect(signature({ tune: 51, decay: 0.3 }, 44100)).not.toBe(base);
    expect(signature({ tune: 50, decay: 0.3 }, 48000)).not.toBe(base);
  });
});

describe('nearestLayer', () => {
  const layers = LAYERS.map((v) => ({ v, takes: [] }));

  it('takes the layer nearest above or below, the first on a tie', () => {
    expect(nearestLayer(layers, 0.05).v).toBe(0.2);
    expect(nearestLayer(layers, 0.42).v).toBe(0.4);
    expect(nearestLayer(layers, 0.58).v).toBe(0.6);
    expect(nearestLayer(layers, 0.5).v).toBe(0.4);
    expect(nearestLayer(layers, 1).v).toBe(1);
  });
});

describe('renderTake', () => {
  const kick: VoiceParams = { tune: 50, decay: 0.36, tone: 0.3, room: 0.04 };

  it('draws the slot into a mono context of its own, at the rate asked, long enough to ring out', async () => {
    const buf = await renderTake(make, 48000, 'k', 1, kick, 7);
    expect(FakeOfflineAudioContext.made).toHaveLength(1);
    const ctx = FakeOfflineAudioContext.made[0];
    expect(ctx.numberOfChannels).toBe(1);
    expect(ctx.sampleRate).toBe(48000);
    // decay ±5%, × 1.8, + 0.25 s
    expect(ctx.length).toBeGreaterThan(48000 * (0.36 * 0.95 * 1.8 + 0.25) - 1);
    expect(ctx.length).toBeLessThan(48000 * (0.36 * 1.05 * 1.8 + 0.25) + 1);
    // the kick's sine, into the render's own destination
    const osc = nodesOfKind<FakeOscillatorNode>(ctx, 'oscillator');
    expect(osc).toHaveLength(1);
    expect(ctx.nodes.some((n) => n.outputs.includes(ctx.destination))).toBe(true);
    expect(buf).not.toBeNull();
  });

  it('cuts the silent end off the render', async () => {
    const buf = (await renderTake(make, 44100, 'k', 1, kick, 7)) as unknown as FakeAudioBuffer;
    const ctx = FakeOfflineAudioContext.made[0];
    // the fake's render is 0.5 for its first half and silent after
    const half = Math.floor(ctx.length / 2);
    expect(buf.length).toBe(half + Math.ceil(44100 * 0.001));
    expect(buf.getChannelData(0)[half - 1]).toBe(0.5);
  });

  it('strays its pitch by the seed, the same seed the same way', async () => {
    const freqOf = async (seed: number): Promise<number> => {
      FakeOfflineAudioContext.reset();
      await renderTake(make, 44100, 'k', 1, kick, seed);
      const osc = nodesOfKind<FakeOscillatorNode>(FakeOfflineAudioContext.made[0], 'oscillator')[0];
      const last = osc.frequency.events[osc.frequency.events.length - 1] as { value: number };
      return last.value;
    };
    const a = await freqOf(1);
    expect(await freqOf(1)).toBe(a);
    expect(await freqOf(2)).not.toBe(a);
    // ±1.5% pitch and ±0.7% detune, around the knob's 50 Hz
    expect(a).toBeGreaterThan(50 * 0.985 * 0.993);
    expect(a).toBeLessThan(50 * 1.015 * 1.007);
    // the live jitter is Math.random, pinned at 0.5: a render did not use it
    expect(Math.random).not.toHaveBeenCalled();
  });

  it('does not send the render to a room: a render is the voice dry', async () => {
    await renderTake(make, 44100, 's', 1, { tune: 186, decay: 0.18, tone: 0.52, room: 0.2 }, 3);
    const ctx = FakeOfflineAudioContext.made[0];
    expect(nodesOfKind(ctx, 'convolver')).toHaveLength(0);
  });

  it('is null for a slot the synth does not draw', async () => {
    expect(await renderTake(make, 44100, 'p1', 1, kick, 1)).toBeNull();
  });
});

/* ---------------------------------------------------------------------- */
/* SynthSource                                                            */
/* ---------------------------------------------------------------------- */

describe('SynthSource', () => {
  it('plays the live graph until the renders land, then a synth hit is one source node', async () => {
    const { audio, ctx, synth } = engineWith(STUDIO70);

    const live = recordNodes(ctx, () => audio.kick(1, 1));
    expect(nodesOfKind(ctx, 'oscillator').length).toBeGreaterThan(0);
    expect(played(live).every((n) => n.loop)).toBe(true); // only the beater's noise

    await rendered();
    expect(synth.isReady()).toBe(true);

    for (const hit of [
      () => audio.kick(2, 1),
      () => audio.snare(2, 0.7),
      () => audio.snare(2, 0.3, true),
      () => audio.hat(2, 0.8, true),
      () => audio.ride(2, 0.9, true),
      () => audio.crash(2, 1, 'cChina'),
      () => audio.tom(2, 1, 't3'),
    ]) {
      const nodes = recordNodes(ctx, hit);
      expect(played(nodes)).toHaveLength(1);
      expect(played(nodes)[0].loop).toBe(false);
      expect(nodes.filter((n) => n instanceof FakeOscillatorNode)).toHaveLength(0);
    }
  });

  it('renders each voice once: five layers × three takes for the snare with wires, three takes elsewhere', async () => {
    engineWith(STUDIO70);
    await rendered();
    const total = Object.keys(RENDERED).reduce((n, v) => n + rendersOf(v), 0);
    expect(FakeOfflineAudioContext.made).toHaveLength(total);
    expect(rendersOf('s')).toBe(15 + 15 + 3 + 15);
    expect(rendersOf('k')).toBe(3);
  });

  it('plays a hit at its velocity over the layer it was rendered at', async () => {
    const { audio, ctx } = engineWith(STUDIO70);
    await rendered();

    const kick = recordNodes(ctx, () => audio.kick(2, 0.5));
    const kg = played(kick)[0].outputs[0] as unknown as { gain: { events: { value: number }[] } };
    expect(kg.gain.events[0].value).toBeCloseTo(0.5, 9); // rendered at 1

    const snare = recordNodes(ctx, () => audio.snare(2, 0.5));
    const sg = played(snare)[0].outputs[0] as unknown as { gain: { events: { value: number }[] } };
    expect(sg.gain.events[0].value).toBeCloseTo(0.5 / 0.4, 9); // nearest layer, 0.4
  });

  it('never plays the same take twice in a row', async () => {
    const { audio, ctx } = engineWith(STUDIO70);
    await rendered();
    let last: unknown = null;
    for (let i = 0; i < 12; i++) {
      const buf = played(recordNodes(ctx, () => audio.ride(2 + i, 0.8)))[0].buffer;
      expect(buf).not.toBe(last);
      last = buf;
    }
  });

  it('chokes a rendered open hat with the next hat', async () => {
    const { audio, ctx } = engineWith(STUDIO70);
    await rendered();
    const open = played(recordNodes(ctx, () => audio.hat(2, 0.9, true)))[0];
    audio.hat(2.1, 0.8);
    const g = open.outputs[0] as unknown as { gain: { events: { type: string }[] } };
    expect(g.gain.events.map((e) => e.type)).toContain('exponentialRampToValueAtTime');
  });

  it('a knob re-renders only its voice, once, 150 ms after it stops moving', async () => {
    const { audio } = engineWith(STUDIO70);
    await rendered();
    const before = FakeOfflineAudioContext.made.length;

    const sound = withTuning(STUDIO70, undefined);
    for (const tune of [190, 194, 198]) {
      audio.setKit(STUDIO70, { ...sound, s: { ...sound.s, tune } });
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 50);
    }
    expect(FakeOfflineAudioContext.made.length).toBe(before);
    await rendered();
    expect(FakeOfflineAudioContext.made.length - before).toBe(rendersOf('s'));
  });

  it('does not re-render for the room send, which plays live', async () => {
    const { audio } = engineWith(STUDIO70);
    await rendered();
    const before = FakeOfflineAudioContext.made.length;
    const sound = withTuning(STUDIO70, undefined);
    audio.setKit(STUDIO70, { ...sound, c: { ...sound.c, room: 0.9 } });
    await rendered();
    expect(FakeOfflineAudioContext.made.length).toBe(before);
  });

  /* A kick's render runs to half its context in the fake, and its context is
     sized from its decay: Studio '70s' 0.36 s kick renders to about 0.45 s,
     a 0.8 s one to about 0.85 s. Its length says which render played. */
  const longKick = (buf: unknown): boolean => (buf as FakeAudioBuffer).duration > 0.65;

  it('plays the old render until the new one is ready', async () => {
    const { audio, ctx } = engineWith(STUDIO70);
    await rendered();
    expect(longKick(played(recordNodes(ctx, () => audio.kick(2, 1)))[0].buffer)).toBe(false);

    FakeOfflineAudioContext.hold = true;
    const sound = withTuning(STUDIO70, undefined);
    audio.setKit(STUDIO70, { ...sound, k: { ...sound.k, decay: 0.8 } });
    await rendered();

    // rendering: still the old kick, as one buffer
    const during = played(recordNodes(ctx, () => audio.kick(3, 1)));
    expect(during).toHaveLength(1);
    expect(longKick(during[0].buffer)).toBe(false);

    FakeOfflineAudioContext.release();
    await settle();
    expect(longKick(played(recordNodes(ctx, () => audio.kick(4, 1)))[0].buffer)).toBe(true);
  });

  it('drops a render that a later knob move overtook', async () => {
    const { audio, ctx } = engineWith(STUDIO70);
    await rendered();
    const sound = withTuning(STUDIO70, undefined);
    const first = FakeOfflineAudioContext.made.length;

    FakeOfflineAudioContext.hold = true;
    audio.setKit(STUDIO70, { ...sound, k: { ...sound.k, decay: 0.8 } });
    await rendered();
    FakeOfflineAudioContext.hold = false;
    audio.setKit(STUDIO70, { ...sound, k: { ...sound.k, decay: 0.2 } });
    await rendered();
    // the 0.8 s render finishes last, and is not wanted any more
    FakeOfflineAudioContext.release();
    await settle();

    expect(FakeOfflineAudioContext.made.length - first).toBe(2 * rendersOf('k'));
    const buf = played(recordNodes(ctx, () => audio.kick(5, 1)))[0].buffer as FakeAudioBuffer;
    expect(buf.duration).toBeLessThan(0.4);
  });

  it('keeps its render when a knob moves and comes back before the debounce', async () => {
    const { audio } = engineWith(STUDIO70);
    await rendered();
    const before = FakeOfflineAudioContext.made.length;
    const sound = withTuning(STUDIO70, undefined);
    audio.setKit(STUDIO70, { ...sound, k: { ...sound.k, decay: 0.8 } });
    audio.setKit(STUDIO70, sound);
    await rendered();
    expect(FakeOfflineAudioContext.made.length).toBe(before);
  });

  it('drops every render when the kit changes, and plays the new kit live until its own land', async () => {
    const { audio, ctx, synth } = engineWith(STUDIO70);
    await rendered();
    audio.setKit(LIVEROOM, withTuning(LIVEROOM, undefined));
    expect(synth.isReady()).toBe(false);
    const live = recordNodes(ctx, () => audio.kick(2, 1));
    expect(live.filter((n) => n instanceof FakeOscillatorNode)).toHaveLength(1);
    await rendered();
    expect(synth.isReady()).toBe(true);
  });

  it('renders nothing for a recorded kit', async () => {
    const { synth } = engineWith(MULDJORD);
    await rendered();
    expect(FakeOfflineAudioContext.made).toHaveLength(0);
    expect(synth.isReady()).toBe(false);
  });

  it('plays live in a browser without OfflineAudioContext', async () => {
    const audio = new BreakAudio();
    const synth = new SynthSource(undefined, null);
    audio.samples = new SourceStack([synth]);
    audio.setKit(STUDIO70, withTuning(STUDIO70, undefined));
    const ctx = audio.init() as unknown as FakeAudioContext;
    await rendered();
    expect(synth.isReady()).toBe(false);
    expect(nodesOfKind(ctx, 'oscillator')).toHaveLength(0);
    audio.kick(1, 1);
    expect(nodesOfKind(ctx, 'oscillator')).toHaveLength(1);
  });

  it('leaves percussion live', async () => {
    const { audio, ctx } = engineWith(STUDIO70);
    await rendered();
    const nodes = recordNodes(ctx, () => audio.perc(2, 1, 'cowbell'));
    expect(nodes.filter((n) => n instanceof FakeOscillatorNode)).toHaveLength(2);
  });
});
