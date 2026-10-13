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
import type { MakeOffline } from '@/lib/app/breaks/audio/offline';
import {
  DEBOUNCE_MS,
  LAYERS,
  MAX_RENDER_S,
  RENDERED,
  SynthSource,
  VARIATIONS,
  nearestLayer,
  renderSeconds,
  renderTake,
  signature,
} from '@/lib/app/breaks/audio/synth-source';
import { type ResolvedKit, type VoiceParams, withTuning } from '@/lib/app/breaks/kit';
import { logger } from '@/lib/logging';
import { testKit } from '@/tests/helpers/catalogue';
import {
  FakeAudioBuffer,
  FakeAudioBufferSourceNode,
  FakeAudioContext,
  FakeAudioNode,
  FakeChannelMergerNode,
  FakeChannelSplitterNode,
  FakeConvolverNode,
  FakeGainNode,
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
  for (let i = 0; i < 2000; i++) await Promise.resolve();
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
} {
  const audio = new BreakAudio();
  audio.samples = new SourceStack([new SynthSource(undefined, make)]);
  audio.setKit(kit, sound ?? withTuning(kit, undefined));
  const ctx = audio.init() as unknown as FakeAudioContext;
  return { audio, ctx };
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

function oscillators(nodes: FakeAudioNode[]): FakeAudioNode[] {
  return nodes.filter((n) => n instanceof FakeOscillatorNode);
}

/** Whether a kick plays from a render — one buffer that is not looped noise, no oscillator. */
function kickRendered(audio: BreakAudio, ctx: FakeAudioContext): boolean {
  const nodes = recordNodes(ctx, () => audio.kick(9, 1));
  return oscillators(nodes).length === 0 && played(nodes).length === 1;
}

/** How many takes a voice renders: five layers × three for a snare stroke with wires, three otherwise. */
function rendersOf(voice: string): number {
  return RENDERED[voice].reduce(
    (n, slot) => n + (['s', 'sGhost', 'sRim'].includes(slot) ? LAYERS.length : 1) * VARIATIONS,
    0
  );
}
const ALL = Object.keys(RENDERED).reduce((n, v) => n + rendersOf(v), 0);

function gainOf(node: FakeAudioNode): number {
  const g = (node as FakeGainNode).gain;
  const first = g.events[0] as { value?: number } | undefined;
  return first?.value ?? g.value;
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
  const layers = LAYERS.map((v) => ({ v }));

  it('takes the layer nearest above or below, the first on a tie', () => {
    expect(nearestLayer(layers, 0.05).v).toBe(0.2);
    expect(nearestLayer(layers, 0.42).v).toBe(0.4);
    expect(nearestLayer(layers, 0.58).v).toBe(0.6);
    expect(nearestLayer(layers, 0.5).v).toBe(0.4);
    expect(nearestLayer(layers, 1).v).toBe(1);
  });
});

describe('renderSeconds', () => {
  it('outlasts the longest-ringing part: decay, or the open hat', () => {
    expect(renderSeconds({ decay: 0.36 })).toBeCloseTo(0.36 * 1.8 + 0.25, 9);
    expect(renderSeconds({ decay: 0.05, open: 0.5 })).toBeCloseTo(0.5 * 1.8 + 0.25, 9);
  });

  it("sizes a missing, zero or broken decay as the toms' default, which the tom plays with", () => {
    const tom = 0.5 * 1.8 + 0.25;
    expect(renderSeconds({ tune: 90 })).toBeCloseTo(tom, 9);
    expect(renderSeconds({ decay: 0 })).toBeCloseTo(tom, 9);
    expect(renderSeconds({ decay: NaN, open: NaN })).toBeCloseTo(tom, 9);
  });
});

describe('renderTake', () => {
  const kick: VoiceParams = { tune: 50, decay: 0.36, tone: 0.3, room: 0.04 };

  it('draws the slot into a context of its own, at the rate asked, long enough to ring out', async () => {
    const buf = await renderTake(make, 48000, 'k', 1, kick, 7);
    expect(FakeOfflineAudioContext.made).toHaveLength(1);
    const ctx = FakeOfflineAudioContext.made[0];
    expect(ctx.sampleRate).toBe(48000);
    // decay ±5%, × 1.8, + 0.25 s
    expect(ctx.length).toBeGreaterThan(48000 * (0.36 * 0.95 * 1.8 + 0.25) - 1);
    expect(ctx.length).toBeLessThan(48000 * (0.36 * 1.05 * 1.8 + 0.25) + 1);
    // the kick's sine, through the merger into the render's own destination
    expect(nodesOfKind<FakeOscillatorNode>(ctx, 'oscillator')).toHaveLength(1);
    const merger = nodesOfKind<FakeChannelMergerNode>(ctx, 'merger')[0];
    expect(merger.outputs).toContain(ctx.destination);
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

  it("keeps the room send's own channel when a part sends less room — the kick's beater, ×0.4", async () => {
    const buf = (await renderTake(make, 44100, 'k', 1, kick, 7)) as unknown as FakeAudioBuffer;
    expect(buf.numberOfChannels).toBe(2);
    const ctx = FakeOfflineAudioContext.made[0];
    const merger = nodesOfKind<FakeChannelMergerNode>(ctx, 'merger')[0];
    // into the room channel: the sine's envelope directly, the beater's through a 0.4 tap
    const toRoom = ctx.nodes.filter((n) => n.links.some((l) => l.dest === merger && l.input === 1));
    expect(toRoom).toHaveLength(2);
    const taps = toRoom.filter((n) => (n as FakeGainNode).gain.events.length === 0);
    expect(taps.map((n) => (n as FakeGainNode).gain.value)).toEqual([0.4]);
  });

  it('is one channel when every part sends the room alike — a crash', async () => {
    const crash: VoiceParams = { tune: 0.88, decay: 2.4, tone: 2500 };
    const buf = (await renderTake(make, 44100, 'c', 1, crash, 7)) as unknown as FakeAudioBuffer;
    expect(buf.numberOfChannels).toBe(1);
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

  it('does not reach the room itself: the room is sent when it plays', async () => {
    await renderTake(make, 44100, 's', 1, { tune: 186, decay: 0.18, tone: 0.52, room: 0.2 }, 3);
    expect(nodesOfKind(FakeOfflineAudioContext.made[0], 'convolver')).toHaveLength(0);
  });

  it('is null for a slot the synth does not draw, and for one that rings too long', async () => {
    expect(await renderTake(make, 44100, 'p1', 1, kick, 1)).toBeNull();
    const huge = { ...kick, decay: MAX_RENDER_S };
    expect(await renderTake(make, 44100, 'k', 1, huge, 1)).toBeNull();
    expect(FakeOfflineAudioContext.made).toHaveLength(1); // the p1 context; none for the long one
  });
});

/* ---------------------------------------------------------------------- */
/* BreakAudio.playTake                                                    */
/* ---------------------------------------------------------------------- */

describe('BreakAudio.playTake', () => {
  it("splits a two-channel take: the voice to the bus, its room send at the voice's room", () => {
    const audio = new BreakAudio();
    audio.setKit(STUDIO70, withTuning(STUDIO70, undefined));
    const ctx = audio.init() as unknown as FakeAudioContext;
    const buf = new FakeAudioBuffer(2, 100, 44100) as unknown as AudioBuffer;

    const nodes = recordNodes(ctx, () => audio.playTake(1, buf, 0.8, 's'));
    expect(played(nodes)).toHaveLength(1);
    const split = nodes.find(
      (n): n is FakeChannelSplitterNode => n instanceof FakeChannelSplitterNode
    );
    expect(split).toBeDefined();
    const [dry, wet] = [0, 1].map((o) => split?.links.find((l) => l.output === o)?.dest);
    const convolver = nodesOfKind<FakeConvolverNode>(ctx, 'convolver')[0];
    // dry: no room send of its own
    expect(dry?.outputs.some((n) => n.outputs.includes(convolver))).toBe(false);
    // wet: into the room at the snare's 0.2, and not to the bus
    expect(wet?.outputs).toHaveLength(1);
    const send = wet?.outputs[0] as FakeGainNode;
    expect(send.gain.value).toBeCloseTo(0.2, 9);
    expect(send.outputs).toContain(convolver);
  });

  it('plays a one-channel take as any recording', () => {
    const audio = new BreakAudio();
    audio.setKit(STUDIO70, withTuning(STUDIO70, undefined));
    const ctx = audio.init() as unknown as FakeAudioContext;
    const buf = new FakeAudioBuffer(1, 100, 44100) as unknown as AudioBuffer;
    const nodes = recordNodes(ctx, () => audio.playTake(1, buf, 0.8, 'c'));
    expect(played(nodes)).toHaveLength(1);
    expect(nodes.some((n) => n instanceof FakeChannelSplitterNode)).toBe(false);
  });
});

/* ---------------------------------------------------------------------- */
/* SynthSource                                                            */
/* ---------------------------------------------------------------------- */

describe('SynthSource', () => {
  it('plays the live graph until the renders land, then a synth hit is one source node', async () => {
    const { audio, ctx } = engineWith(STUDIO70);
    expect(kickRendered(audio, ctx)).toBe(false);

    await rendered();

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
      expect(oscillators(nodes)).toHaveLength(0);
    }
  });

  it('renders each voice once: five layers × three takes for the snare with wires, three takes elsewhere', async () => {
    engineWith(STUDIO70);
    await rendered();
    expect(FakeOfflineAudioContext.made).toHaveLength(ALL);
    expect(rendersOf('s')).toBe(15 + 15 + 3 + 15);
    expect(rendersOf('k')).toBe(3);
  });

  it("renders one voice at a time, a layer's takes together", async () => {
    FakeOfflineAudioContext.hold = true;
    engineWith(STUDIO70);
    await rendered();
    expect(FakeOfflineAudioContext.made).toHaveLength(VARIATIONS);
    FakeOfflineAudioContext.release();
    await settle();
    expect(FakeOfflineAudioContext.made).toHaveLength(2 * VARIATIONS);
  });

  it('shares one seeded noise buffer per take across every render', async () => {
    engineWith(STUDIO70);
    await rendered();
    const noiseOf = (c: FakeOfflineAudioContext) =>
      nodesOfKind<FakeAudioBufferSourceNode>(c, 'bufferSource')[0]?.buffer;
    const made = FakeOfflineAudioContext.made;
    // the kick's takes 0–2, then the snare's first layer, takes 0–2
    expect(noiseOf(made[0])).toBeDefined();
    expect(noiseOf(made[3])).toBe(noiseOf(made[0]));
    expect(noiseOf(made[1])).not.toBe(noiseOf(made[0]));
  });

  it('plays a hit at its velocity over the layer it was rendered at', async () => {
    const { audio, ctx } = engineWith(STUDIO70);
    await rendered();

    const kick = played(recordNodes(ctx, () => audio.kick(2, 0.5)))[0];
    expect(gainOf(kick.outputs[0])).toBeCloseTo(0.5, 9); // rendered at 1

    const snare = played(recordNodes(ctx, () => audio.snare(2, 0.5)))[0];
    expect(gainOf(snare.outputs[0])).toBeCloseTo(0.5 / 0.4, 9); // nearest layer, 0.4
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
    const g = open.outputs[0] as FakeGainNode;
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

  it('plays the voice live while it re-renders, so an audition is where the knob is', async () => {
    const { audio, ctx } = engineWith(STUDIO70);
    await rendered();
    expect(kickRendered(audio, ctx)).toBe(true);

    FakeOfflineAudioContext.hold = true;
    const sound = withTuning(STUDIO70, undefined);
    audio.setKit(STUDIO70, { ...sound, k: { ...sound.k, tune: 60, decay: 0.8 } });

    // moved, not yet rendered: the live kick, at the new tune
    const during = recordNodes(ctx, () => audio.kick(3, 1));
    const sine = oscillators(during)[0] as FakeOscillatorNode;
    const lastFreq = sine.frequency.events[sine.frequency.events.length - 1] as { value: number };
    expect(lastFreq.value).toBeCloseTo(60, 9);
    // the other voices keep their renders
    expect(oscillators(recordNodes(ctx, () => audio.snare(3, 1)))).toHaveLength(0);

    await rendered();
    FakeOfflineAudioContext.release();
    await settle();
    const after = played(recordNodes(ctx, () => audio.kick(4, 1)));
    expect(after).toHaveLength(1);
    expect(longKick(after[0].buffer)).toBe(true);
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
    // the 0.8 s render finishes after the move, and is not wanted any more
    FakeOfflineAudioContext.release();
    await settle();

    expect(FakeOfflineAudioContext.made.length - first).toBe(2 * rendersOf('k'));
    const buf = played(recordNodes(ctx, () => audio.kick(5, 1)))[0].buffer as FakeAudioBuffer;
    expect(buf.duration).toBeLessThan(0.4);
  });

  it('keeps its render when a knob moves and comes back before the debounce', async () => {
    const { audio, ctx } = engineWith(STUDIO70);
    await rendered();
    const before = FakeOfflineAudioContext.made.length;
    const sound = withTuning(STUDIO70, undefined);
    audio.setKit(STUDIO70, { ...sound, k: { ...sound.k, decay: 0.8 } });
    audio.setKit(STUDIO70, sound);
    await rendered();
    expect(FakeOfflineAudioContext.made.length).toBe(before);
    expect(kickRendered(audio, ctx)).toBe(true);
  });

  it('drops every render when the kit changes, and plays the new kit live until its own land', async () => {
    const { audio, ctx } = engineWith(STUDIO70);
    await rendered();
    audio.setKit(LIVEROOM, withTuning(LIVEROOM, undefined));
    expect(kickRendered(audio, ctx)).toBe(false);
    await rendered();
    expect(kickRendered(audio, ctx)).toBe(true);
  });

  it('renders a kit once when it is left and picked again mid-render', async () => {
    FakeOfflineAudioContext.hold = true;
    const { audio, ctx } = engineWith(STUDIO70);
    await rendered(); // the kick's first layer is held
    audio.setKit(LIVEROOM, withTuning(LIVEROOM, undefined));
    audio.setKit(STUDIO70, withTuning(STUDIO70, undefined));
    FakeOfflineAudioContext.hold = false;
    FakeOfflineAudioContext.release();
    await rendered();
    // the held layer, then one full render: the first was let go, not installed and redone
    expect(FakeOfflineAudioContext.made).toHaveLength(VARIATIONS + ALL);
    expect(kickRendered(audio, ctx)).toBe(true);
  });

  it('renders nothing for a recorded kit', async () => {
    const { audio, ctx } = engineWith(MULDJORD);
    await rendered();
    expect(FakeOfflineAudioContext.made).toHaveLength(0);
    expect(kickRendered(audio, ctx)).toBe(false);
  });

  it('plays live in a browser without OfflineAudioContext', async () => {
    const audio = new BreakAudio();
    audio.samples = new SourceStack([new SynthSource(undefined, null)]);
    audio.setKit(STUDIO70, withTuning(STUDIO70, undefined));
    const ctx = audio.init() as unknown as FakeAudioContext;
    await rendered();
    expect(kickRendered(audio, ctx)).toBe(false);
  });

  it('plays a voice that rings too long to render live, and logs why', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const sound = withTuning(STUDIO70, undefined);
    const { audio, ctx } = engineWith(STUDIO70, { ...sound, c: { ...sound.c, decay: 600 } });
    await rendered();
    expect(oscillators(recordNodes(ctx, () => audio.crash(2, 1))).length).toBeGreaterThan(0);
    expect(kickRendered(audio, ctx)).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      'Synth kit: slots that did not render play live',
      expect.objectContaining({ kit: 'studio70', voice: 'c' })
    );
  });

  it('renders a tom whose row has no decay, as the live tom plays it', async () => {
    const sound = withTuning(STUDIO70, undefined);
    const { decay: _decay, ...noDecay } = sound.t;
    const { audio, ctx } = engineWith(STUDIO70, { ...sound, t: noDecay });
    await rendered();
    expect(oscillators(recordNodes(ctx, () => audio.tom(2, 1, 't2')))).toHaveLength(0);
  });

  it('stops rendering when the engine closes', async () => {
    const { audio } = engineWith(STUDIO70);
    audio.close();
    await rendered();
    expect(FakeOfflineAudioContext.made).toHaveLength(0);
  });

  it('leaves percussion live', async () => {
    const { audio, ctx } = engineWith(STUDIO70);
    await rendered();
    const nodes = recordNodes(ctx, () => audio.perc(2, 1, 'cowbell'));
    expect(oscillators(nodes)).toHaveLength(2);
  });
});
