// @vitest-environment happy-dom

/**
 * The drum machines (9-vi-e): voice models drawn into a `Draw`, by the ids
 * `DRIFT_MAP` names, and the TR kits playing through them — live while their
 * renders are on the way, then from the renders.
 *
 * Drawn into a `FakeAudioContext` (`tests/helpers/fake-audio-context.ts`),
 * which records the graph: each assertion reads the frequencies, envelopes
 * and connections a voice built, not that a function was called.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BreakAudio, SourceStack } from '@/lib/app/breaks/audio/engine';
import {
  MACHINE_VOICES,
  drawMachineSlot,
  machineGain,
  machineHas,
} from '@/lib/app/breaks/audio/machines';
import type { MakeOffline } from '@/lib/app/breaks/audio/offline';
import {
  DEBOUNCE_MS,
  MAX_RENDER_S,
  RENDERED,
  SynthSource,
  VARIATIONS,
} from '@/lib/app/breaks/audio/synth-source';
import type { Draw } from '@/lib/app/breaks/audio/voices';
import {
  DRIFT_MAP,
  type ResolvedKit,
  SAMPLE_STAND_IN,
  type VoiceParams,
  kitIsPlayable,
  withTuning,
} from '@/lib/app/breaks/kit';
import { testKit } from '@/tests/helpers/catalogue';
import {
  FakeAudioBufferSourceNode,
  FakeAudioContext,
  FakeAudioNode,
  FakeGainNode,
  FakeOfflineAudioContext,
  FakeOscillatorNode,
  nodesOfKind,
} from '@/tests/helpers/fake-audio-context';

const TR808: ResolvedKit = testKit('tr808');
const TR909: ResolvedKit = testKit('tr909');
const TR606: ResolvedKit = testKit('tr606');
const LINN: ResolvedKit = testKit('linn');

const make: MakeOffline = (channels, length, rate) =>
  new FakeOfflineAudioContext(channels, length, rate) as unknown as OfflineAudioContext;

/** A `Draw` into a fresh fake context, recording what each voice sends. */
function drawInto(): {
  d: Draw;
  ctx: FakeAudioContext;
  sent: Array<{ node: AudioNode; voice: string }>;
} {
  const ctx = new FakeAudioContext();
  const sent: Array<{ node: AudioNode; voice: string }> = [];
  const noise = ctx.createBuffer(1, 100, 44100) as unknown as AudioBuffer;
  const d: Draw = {
    ctx: ctx as unknown as BaseAudioContext,
    noise,
    send: (node, voice) => sent.push({ node, voice }),
    rand: () => 0.5,
  };
  return { d, ctx, sent };
}

/** The frequency an oscillator settles on: its last scheduled value, or its value. */
function settlesOn(osc: FakeOscillatorNode): number {
  const evs = osc.frequency.events as Array<{ value?: number }>;
  return evs.length ? (evs[evs.length - 1].value ?? osc.frequency.value) : osc.frequency.value;
}

async function settle(): Promise<void> {
  for (let i = 0; i < 2000; i++) await Promise.resolve();
}

async function rendered(): Promise<void> {
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  await settle();
}

function engineWith(kit: ResolvedKit, sound?: Record<string, VoiceParams>, offline = true) {
  const audio = new BreakAudio();
  audio.samples = new SourceStack([new SynthSource(undefined, offline ? make : null)]);
  audio.setKit(kit, sound ?? withTuning(kit, undefined));
  const ctx = audio.init() as unknown as FakeAudioContext;
  return { audio, ctx };
}

function recordNodes(ctx: FakeAudioContext, fn: () => void): FakeAudioNode[] {
  const before = ctx.nodes.length;
  fn();
  return ctx.nodes.slice(before);
}

function oscillators(nodes: FakeAudioNode[]): FakeOscillatorNode[] {
  return nodes.filter((n): n is FakeOscillatorNode => n instanceof FakeOscillatorNode);
}

function played(nodes: FakeAudioNode[]): FakeAudioBufferSourceNode[] {
  return nodes.filter(
    (n): n is FakeAudioBufferSourceNode => n instanceof FakeAudioBufferSourceNode && !n.loop
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeAudioContext.instances.length = 0;
  FakeOfflineAudioContext.reset();
  window.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ---------------------------------------------------------------------- */
/* the voices                                                             */
/* ---------------------------------------------------------------------- */

describe('MACHINE_VOICES', () => {
  it('has a voice for every id DRIFT_MAP names, on every machine', () => {
    for (const [machine, slots] of Object.entries(DRIFT_MAP)) {
      for (const [slot, id] of Object.entries(slots)) {
        expect(MACHINE_VOICES[id], `${machine}.${slot} → ${id}`).toBeDefined();
      }
    }
  });

  it('draws every voice into the Draw it is given, and nothing into the context’s own output', () => {
    for (const [id, voice] of Object.entries(MACHINE_VOICES)) {
      const { d, ctx, sent } = drawInto();
      voice.draw(d, 0, 1, { tune: 0.5, decay: 0.5, tone: 0.5, colour: 0.5 });
      expect(sent.length, id).toBeGreaterThan(0);
      expect(
        ctx.nodes.some((n) => n.outputs.includes(ctx.destination)),
        id
      ).toBe(false);
    }
  });

  it('says how long it rings, inside what a render may be, at both ends of every knob', () => {
    for (const [id, voice] of Object.entries(MACHINE_VOICES)) {
      for (const x of [0, 1]) {
        const P = { tune: x, decay: x, tone: x, colour: x };
        const s = voice.seconds(P);
        expect(s, `${id} @ ${x}`).toBeGreaterThan(0);
        expect(s, `${id} @ ${x}`).toBeLessThanOrEqual(MAX_RENDER_S);
      }
    }
  });

  it("tunes the 808's kick over 42–64 Hz, rising from a little above", () => {
    for (const [tune, hz] of [
      [0, 42],
      [1, 64],
    ]) {
      const { d, ctx } = drawInto();
      MACHINE_VOICES['808.bd'].draw(d, 0, 1, { tune, decay: 0.5, tone: 0, colour: 0 });
      const osc = nodesOfKind<FakeOscillatorNode>(ctx, 'oscillator')[0];
      expect(settlesOn(osc)).toBeCloseTo(hz, 6);
      const start = osc.frequency.events[0] as { value: number };
      expect(start.value).toBeCloseTo(hz * 1.35, 6);
    }
  });

  it("sweeps the 909's kick down hard from four times its note", () => {
    const { d, ctx } = drawInto();
    MACHINE_VOICES['909.bd'].draw(d, 0, 1, { tune: 0, decay: 0.5, tone: 0.5, colour: 0 });
    const osc = nodesOfKind<FakeOscillatorNode>(ctx, 'oscillator')[0];
    expect((osc.frequency.events[0] as { value: number }).value).toBeCloseTo(44 * 4.2, 6);
    expect(settlesOn(osc)).toBeCloseTo(44, 6);
  });

  it("builds the 808's hats from its six square waves, through two bands", () => {
    const { d, ctx } = drawInto();
    MACHINE_VOICES['808.ch'].draw(d, 0, 1, { tune: 0.5, decay: 0.5, tone: 0.5, colour: 0.5 });
    const osc = nodesOfKind<FakeOscillatorNode>(ctx, 'oscillator');
    expect(osc).toHaveLength(12); // six, into each of two bandpasses
    expect(osc.every((o) => o.type === 'square')).toBe(true);
    const size = 0.85 + (1.2 - 0.85) * 0.5;
    expect(osc.slice(0, 6).map((o) => o.frequency.value)).toEqual(
      [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * size)
    );
  });

  it('returns an open hat’s tail to choke, and none for a closed one', () => {
    for (const machine of ['808', '909', '606', 'linn']) {
      const { d } = drawInto();
      const P = { tune: 0.5, decay: 0.5, tone: 0.5, colour: 0.5 };
      expect(drawMachineSlot(d, machine, 'hOpen', 1, 1, P)).toMatchObject({
        end: expect.any(Number),
      });
      expect(drawMachineSlot(d, machine, 'h', 1, 1, P)).toBeNull();
    }
  });

  it("plays the 606's one cymbal on the crash lane", () => {
    const { d, sent } = drawInto();
    drawMachineSlot(d, '606', 'c', 0, 1, { tune: 0.5, decay: 0.5, tone: 0.5, colour: 0.5 });
    expect(sent.map((s) => s.voice)).toEqual(['c']);
  });

  it('reads a missing knob as the middle, and a tom with no decay as the synth tom does', () => {
    const { d, ctx } = drawInto();
    MACHINE_VOICES['808.bd'].draw(d, 0, 1, {});
    const mid = 42 * (64 / 42) ** 0.5;
    expect(settlesOn(nodesOfKind<FakeOscillatorNode>(ctx, 'oscillator')[0])).toBeCloseTo(mid, 6);
    expect(MACHINE_VOICES['808.lt'].seconds({ tune: 80 })).toBeCloseTo(0.5 * 1.1 + 0.06, 9);
  });
});

describe('drawMachineSlot and machineHas', () => {
  it("is undefined for a slot the machine does not have — the 808's rimshot, its china", () => {
    const { d } = drawInto();
    expect(drawMachineSlot(d, '808', 'sRim', 0, 1, {})).toBeUndefined();
    expect(machineHas('808', 'cChina')).toBe(false);
    expect(machineHas('808', 'sCross')).toBe(true);
    expect(machineHas(undefined, 'k')).toBe(false);
    expect(machineHas('707', 'k')).toBe(false);
  });
});

describe('machineGain', () => {
  it('is the lane’s Level times the kit’s trim, either missing as 1', () => {
    expect(machineGain(0.5, { level: 0.8 })).toBeCloseTo(0.4, 9);
    expect(machineGain(undefined, { level: 0.8 })).toBeCloseTo(0.8, 9);
    expect(machineGain(0.5, {})).toBeCloseTo(0.5, 9);
  });
});

/* ---------------------------------------------------------------------- */
/* the TR kits                                                            */
/* ---------------------------------------------------------------------- */

describe('the drum-machine kits', () => {
  it('are playable', () => {
    for (const kit of [TR808, TR909, TR606, LINN]) expect(kitIsPlayable(kit)).toBe(true);
  });

  it("play the machine live, at its own knobs, before the renders land — not the synth's stand-in", () => {
    const { audio, ctx } = engineWith(TR808, undefined, false);
    const nodes = recordNodes(ctx, () => audio.kick(1, 1));
    const sine = oscillators(nodes)[0];
    const hz = 42 * (64 / 42) ** TR808.k.tune;
    expect((sine.frequency.events[0] as { value: number }).value).toBeCloseTo(hz * 1.35, 6);
    expect(SAMPLE_STAND_IN.k.tune * 5.2).not.toBeCloseTo(hz * 1.35, 0);
  });

  it('play a live hit at its velocity times Level times trim', () => {
    const trimmed = { ...TR808, trim: 0.5 };
    const { audio, ctx } = engineWith(trimmed, undefined, false);
    const nodes = recordNodes(ctx, () => audio.snare(1, 0.8));
    const env = nodes.find(
      (n): n is FakeGainNode =>
        n instanceof FakeGainNode && n.gain.events.some((e) => e.type === 'linearRampToValueAtTime')
    );
    const peak = (env?.gain.events[1] as { value: number }).value;
    expect(peak).toBeCloseTo(0.8 * TR808.s.level * 0.5 * 0.62, 6); // the lower tone's share
  });

  it('fall back as a pack does: a foot hat to the closed hat, a rimshot to the synth', () => {
    const { audio, ctx } = engineWith(TR808, undefined, false);
    const foot = oscillators(recordNodes(ctx, () => audio.hat(1, 1, false, true)));
    expect(foot).toHaveLength(12); // the 808's closed hat
    const rim = oscillators(recordNodes(ctx, () => audio.snare(1, 1, false, false, true)));
    // the synthesised rimshot: the snare's six modes and two rim partials, at the stand-in's tune
    expect(rim).toHaveLength(8);
    expect(rim[0].frequency.events[0]).toMatchObject({ value: SAMPLE_STAND_IN.s.tune });
  });

  it("render the machine's own slots, one layer of three takes each", async () => {
    const { audio, ctx } = engineWith(TR909);
    await rendered();
    const slots = Object.values(RENDERED)
      .flat()
      .filter((slot) => machineHas('909', slot));
    expect(FakeOfflineAudioContext.made).toHaveLength(slots.length * VARIATIONS);
    const nodes = recordNodes(ctx, () => audio.kick(2, 1));
    expect(played(nodes)).toHaveLength(1);
    expect(oscillators(nodes)).toHaveLength(0);
  });

  it('render takes that differ only in their noise: a machine is the same every hit', async () => {
    engineWith(TR909);
    await rendered();
    const kicks = FakeOfflineAudioContext.made.slice(0, VARIATIONS);
    const starts = kicks.map((c) => {
      const osc = nodesOfKind<FakeOscillatorNode>(c, 'oscillator')[0];
      return (osc.frequency.events[0] as { value: number }).value;
    });
    expect(new Set(starts).size).toBe(1);
    expect(new Set(kicks.map((c) => c.length)).size).toBe(1);
  });

  it('play a render at velocity times Level times trim, and re-render nothing for Level', async () => {
    const trimmed = { ...TR909, trim: 0.5 };
    const { audio, ctx } = engineWith(trimmed);
    await rendered();
    const kick = played(recordNodes(ctx, () => audio.kick(2, 0.8)))[0];
    const g = kick.outputs[0] as FakeGainNode;
    expect((g.gain.events[0] as { value: number }).value).toBeCloseTo(0.8 * TR909.k.level * 0.5, 9);

    const before = FakeOfflineAudioContext.made.length;
    const sound = withTuning(trimmed, undefined);
    audio.setKit(trimmed, { ...sound, k: { ...sound.k, level: 0.3 } });
    await rendered();
    expect(FakeOfflineAudioContext.made.length).toBe(before);
    const quieter = played(recordNodes(ctx, () => audio.kick(3, 0.8)))[0];
    const g2 = quieter.outputs[0] as FakeGainNode;
    expect((g2.gain.events[0] as { value: number }).value).toBeCloseTo(0.8 * 0.3 * 0.5, 9);
  });

  it('play a rendered fall: the foot hat from the closed hat’s render', async () => {
    const { audio, ctx } = engineWith(TR909);
    await rendered();
    const nodes = recordNodes(ctx, () => audio.hat(2, 1, false, true));
    expect(played(nodes)).toHaveLength(1);
  });

  it('re-render a voice when one of its machine knobs moves', async () => {
    const { audio } = engineWith(TR606);
    await rendered();
    const before = FakeOfflineAudioContext.made.length;
    const sound = withTuning(TR606, undefined);
    audio.setKit(TR606, { ...sound, k: { ...sound.k, tune: 0.9 } });
    await rendered();
    expect(FakeOfflineAudioContext.made.length - before).toBe(VARIATIONS);
  });
});
