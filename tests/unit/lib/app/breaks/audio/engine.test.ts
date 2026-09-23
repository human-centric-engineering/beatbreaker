// @vitest-environment happy-dom

/**
 * `BreakAudio` — the drum synth and the master chain every kit plays through.
 *
 * There is no Web Audio in the test environment, so `FakeAudioContext`
 * (`tests/helpers/fake-audio-context.ts`) stands in: it records the graph the
 * engine builds and the automation it schedules on every `AudioParam`, rather
 * than just swallowing the calls. Every assertion below reads that recording —
 * never "a mock was called" on its own, always the node it produced, the
 * value/time it scheduled, or the edge it wired.
 *
 * `Math.random` is pinned to 0.5 for the whole file. Every jitter/detune
 * formula in `engine.ts` is of the shape `1 + (Math.random() - 0.5) * k`, so
 * at 0.5 every one of them resolves to exactly 1 — the numbers below are the
 * kit table's own values with no random noise folded in, which is what makes
 * them worth pinning as exact expectations.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BreakAudio,
  driveCurve,
  SourceStack,
  type SampleSource,
} from '@/lib/app/breaks/audio/engine';
import {
  RATIOS,
  SAMPLE_STAND_IN,
  SYNTH_FALLBACK,
  withTuning,
  type ResolvedKit,
} from '@/lib/app/breaks/kit';
import { testKit } from '@/tests/helpers/catalogue';
import {
  FakeAudioBufferSourceNode,
  FakeAudioContext,
  FakeAudioNode,
  FakeBiquadFilterNode,
  FakeConvolverNode,
  FakeDynamicsCompressorNode,
  FakeGainNode,
  FakeOscillatorNode,
  FakeWaveShaperNode,
} from '@/tests/helpers/fake-audio-context';

/* ---------------------------------------------------------------------- */
/* local helpers                                                          */
/* ---------------------------------------------------------------------- */

function pick<T extends FakeAudioNode>(nodes: FakeAudioNode[], kind: string): T[] {
  return nodes.filter((n): n is T => (n as { kind?: string }).kind === kind);
}

/** Nodes the context created while `fn` ran — isolates one voice call from init(). */
function recordNodes(ctx: FakeAudioContext, fn: () => void): FakeAudioNode[] {
  const before = ctx.nodes.length;
  fn();
  return ctx.nodes.slice(before);
}

/** Pins `mkEnv`'s three-event envelope shape against the values it was called with. */
function expectEnvelope(
  g: FakeGainNode,
  t: number,
  peak: number,
  attack: number,
  decay: number
): void {
  const p = Math.max(0.0005, peak);
  const a = Math.max(0.0003, attack);
  const evs = g.gain.events;
  expect(evs[0]).toMatchObject({ type: 'setValueAtTime', value: 0.0001 });
  expect(evs[0].time).toBeCloseTo(t, 9);
  expect(evs[1].type).toBe('linearRampToValueAtTime');
  expect((evs[1] as { value: number }).value).toBeCloseTo(p, 9);
  expect(evs[1].time).toBeCloseTo(t + a, 9);
  expect(evs[2].type).toBe('exponentialRampToValueAtTime');
  expect((evs[2] as { value: number }).value).toBeCloseTo(0.0001, 9);
  expect(evs[2].time).toBeCloseTo(t + Math.max(0.0006, attack) + decay, 9);
}

/** The gain node a source sends to the convolver through, if any — and how much. */
function roomSend(source: FakeAudioNode, convolver: FakeConvolverNode): number | null {
  const send = source.outputs.find((n) => n.outputs.includes(convolver)) as
    FakeGainNode | undefined;
  return send ? send.gain.value : null;
}

/* The kits these tests play through, resolved from the seed data exactly as the
   catalogue resolves them. Kits are `Kit` rows from Phase 2 — `KITS` is gone
   from `lib/app/breaks/kit.ts` and playback receives a `ResolvedKit` object
   rather than looking one up by key — so the numbers asserted below are the
   same numbers, reached through the new argument rather than through the table
   this file used to import. Module constants rather than per-call `testKit()`
   so identity comparisons (`expect(audio.kit).toBe(MACHINE)`) mean something. */
const STUDIO70: ResolvedKit = testKit('studio70');
const MACHINE: ResolvedKit = testKit('machine');
const LIVEROOM: ResolvedKit = testKit('liveroom');
const TR909: ResolvedKit = testKit('tr909');

function newEngine(): BreakAudio {
  return new BreakAudio();
}

/**
 * A freshly initialised engine, with its fake context available for inspection.
 *
 * The kit is chosen explicitly. A new `BreakAudio` starts with `kit: null`
 * now — a real state, since the kits are rows fetched from the server and the
 * catalogue may not have arrived — so "the kit the engine happens to default
 * to" is no longer a thing to lean on. Every voice test below is about the
 * Studio '70s kit, and now says so.
 */
function initEngine(kit: ResolvedKit | null = STUDIO70): {
  audio: BreakAudio;
  ctx: FakeAudioContext;
} {
  const audio = newEngine();
  audio.setKit(kit, null);
  const ctx = audio.init() as unknown as FakeAudioContext;
  return { audio, ctx };
}

beforeEach(() => {
  FakeAudioContext.instances.length = 0;
  FakeAudioContext.throwOnConstruct = false;
  window.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

/* ---------------------------------------------------------------------- */
/* pure helpers: driveCurve, SourceStack                                  */
/* ---------------------------------------------------------------------- */

describe('driveCurve', () => {
  it('is odd-length with the midpoint pinned to silence', () => {
    const c = driveCurve(2);
    expect(c.length).toBe(1025);
    expect(c[512]).toBeCloseTo(0, 9); // x = 0 at the exact centre
  });

  it('is monotonically increasing (a soft-clip curve, not noise)', () => {
    const c = driveCurve(3);
    expect(c[0]).toBeLessThan(c[512]);
    expect(c[512]).toBeLessThan(c[1024]);
    expect(c[1024]).toBeCloseTo(1, 9); // tanh(a)/tanh(a) at x = 1
  });

  it('clamps amount to a minimum of 1 (a value below 1 would divide by ~0)', () => {
    const low = driveCurve(0.2);
    const one = driveCurve(1);
    expect(low[1024]).toBeCloseTo(one[1024], 9);
  });
});

describe('SourceStack', () => {
  function fakeSource(hitReturn: boolean, percReturn = false): SampleSource {
    return {
      hit: vi.fn(() => hitReturn),
      percHit: vi.fn(() => percReturn),
      refresh: vi.fn(),
    };
  }

  it('asks each source in order and stops at the first that plays', () => {
    const a = fakeSource(false);
    const b = fakeSource(true);
    const c = fakeSource(true);
    const stack = new SourceStack([a, b, c]);
    const engine = {} as BreakAudio;

    expect(stack.hit(engine, 0, 'k', 1)).toBe(true);
    expect(a.hit).toHaveBeenCalledWith(engine, 0, 'k', 1);
    expect(b.hit).toHaveBeenCalledWith(engine, 0, 'k', 1);
    expect(c.hit).not.toHaveBeenCalled(); // b already returned true
  });

  it('returns false when nothing in the stack covers the slot', () => {
    const stack = new SourceStack([fakeSource(false), fakeSource(false)]);
    expect(stack.hit({} as BreakAudio, 0, 'k', 1)).toBe(false);
  });

  it('percHit tries each source in order, same as hit', () => {
    const a = fakeSource(false, false);
    const b = fakeSource(false, true);
    const stack = new SourceStack([a, b]);
    expect(stack.percHit({} as BreakAudio, 0, 'tamb', 1, false)).toBe(true);
    expect(a.percHit).toHaveBeenCalled();
    expect(b.percHit).toHaveBeenCalled();
  });

  it('percHit returns false when nothing in the stack covers the instrument', () => {
    const stack = new SourceStack([
      fakeSource(false, false),
      { hit: vi.fn(() => false) }, // no percHit at all — optional per SampleSource
    ]);
    expect(stack.percHit({} as BreakAudio, 0, 'tamb', 1, false)).toBe(false);
  });

  it('refresh forwards to every source', () => {
    const a = fakeSource(false);
    const b = fakeSource(false);
    const stack = new SourceStack([a, b]);
    const engine = {} as BreakAudio;
    stack.refresh(engine);
    expect(a.refresh).toHaveBeenCalledWith(engine);
    expect(b.refresh).toHaveBeenCalledWith(engine);
  });
});

/* ---------------------------------------------------------------------- */
/* lifecycle: init / close / resume / setKit                              */
/* ---------------------------------------------------------------------- */

describe('init()', () => {
  it('is idempotent: a second call returns the same context and builds nothing new', () => {
    const audio = newEngine();
    const ctx1 = audio.init();
    const ctx2 = audio.init();
    expect(ctx1).toBe(ctx2);
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it('returns null with no window', () => {
    vi.stubGlobal('window', undefined);
    try {
      expect(newEngine().init()).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('returns null with no AudioContext constructor', () => {
    window.AudioContext = undefined as unknown as typeof AudioContext;
    expect(newEngine().init()).toBeNull();
  });

  it('returns null rather than throwing when the constructor throws', () => {
    FakeAudioContext.throwOnConstruct = true;
    const audio = newEngine();
    expect(() => audio.init()).not.toThrow();
    expect(audio.init()).toBeNull();
    expect(audio.ready).toBe(false);
  });

  it('builds the master chain and wires it to destination', () => {
    const { audio, ctx } = initEngine();
    const bus = audio.bus as unknown as FakeGainNode;
    expect(bus.kind).toBe('gain');
    expect(bus.gain.value).toBeCloseTo(0.9, 9);

    // bus -> drive (waveshaper) -> lowpass -> compressor -> master -> destination
    const shaper = bus.outputs[0] as FakeWaveShaperNode;
    expect(shaper.kind).toBe('waveshaper');
    expect(shaper.oversample).toBe('2x');
    const lp = shaper.outputs[0] as FakeBiquadFilterNode;
    expect(lp.kind).toBe('biquad');
    expect(lp.type).toBe('lowpass');
    const comp = lp.outputs[0] as FakeDynamicsCompressorNode;
    expect(comp.kind).toBe('compressor');
    expect(comp.threshold.value).toBeCloseTo(-13, 9);
    expect(comp.ratio.value).toBeCloseTo(3.5, 9);
    expect(comp.attack.value).toBeCloseTo(0.004, 9);
    expect(comp.release.value).toBeCloseTo(0.2, 9);
    const master = comp.outputs[0] as FakeGainNode;
    expect(master.kind).toBe('gain');
    expect(master.gain.value).toBeCloseTo(0.82, 9);
    expect(master.outputs).toContain(ctx.destination);

    // the applied kit's own lowpass, via setTargetAtTime rather than a hard-set
    const m = STUDIO70.master;
    const lpEvent = lp.frequency.events.at(-1);
    expect(lpEvent).toMatchObject({ type: 'setTargetAtTime', value: m.lp, timeConstant: 0.01 });
  });

  it('builds the reverb send: convolver -> wet -> bus, never back into the convolver', () => {
    const { audio, ctx } = initEngine();
    const bus = audio.bus as unknown as FakeGainNode;
    const convolver = pick<FakeConvolverNode>(ctx.nodes, 'convolver')[0];
    expect(convolver).toBeDefined();
    const wet = convolver.outputs[0] as FakeGainNode;
    expect(wet.kind).toBe('gain');
    expect(wet.outputs).toContain(bus);
    expect(bus.outputs).not.toContain(convolver); // the send is one-way
  });

  it('calls samples.refresh() once the graph exists', () => {
    const audio = newEngine();
    const refresh = vi.fn();
    audio.samples = { hit: vi.fn(() => false), refresh };
    audio.init();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith(audio);
  });
});

describe('close()', () => {
  it('releases the context and nulls the public graph handles', () => {
    const { audio, ctx } = initEngine();
    audio.close();
    expect(audio.ctx).toBeNull();
    expect(audio.bus).toBeNull();
    expect(audio.ready).toBe(false);
    expect(ctx.state).toBe('closed');
    expect(ctx.closeCalls).toBe(1);
  });

  it('is safe to call twice', () => {
    const { audio, ctx } = initEngine();
    audio.close();
    expect(() => audio.close()).not.toThrow();
    expect(ctx.closeCalls).toBe(1); // the second call had no live ctx to close
  });

  it('is safe on an already-closed context', async () => {
    const { audio, ctx } = initEngine();
    await ctx.close(); // close it out from under the engine
    expect(ctx.closeCalls).toBe(1);
    expect(() => audio.close()).not.toThrow();
    // engine guards on ctx.state !== 'closed', so it never calls close() again
    expect(ctx.closeCalls).toBe(1);
  });

  it('does not reject when close() itself rejects', async () => {
    const { audio, ctx } = initEngine();
    ctx.closeShouldReject = true;
    expect(() => audio.close()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    // reaching here without vitest reporting an unhandled rejection is the assertion
    expect(audio.ctx).toBeNull();
  });

  it('is a no-op when the engine was never initialised', () => {
    const audio = newEngine();
    expect(() => audio.close()).not.toThrow();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it('makes init() build a fresh graph rather than reviving the old one', () => {
    const audio = newEngine();
    const ctx1 = audio.init();
    audio.close();
    const ctx2 = audio.init();
    expect(ctx2).not.toBeNull();
    expect(ctx2).not.toBe(ctx1);
    expect(FakeAudioContext.instances).toHaveLength(2);
    expect(audio.ready).toBe(true);
    expect(audio.bus).not.toBeNull();
  });
});

describe('resume()', () => {
  it('resumes only a suspended context', () => {
    const { audio, ctx } = initEngine();
    ctx.state = 'running';
    const resumeSpy = vi.spyOn(ctx, 'resume');
    audio.resume();
    expect(resumeSpy).not.toHaveBeenCalled();

    ctx.state = 'suspended';
    audio.resume();
    expect(resumeSpy).toHaveBeenCalledTimes(1);
  });

  it('does nothing before init()', () => {
    const audio = newEngine();
    expect(() => audio.resume()).not.toThrow();
  });
});

describe('setKit()', () => {
  it('records the kit and sound before init(), without touching audio', () => {
    const audio = newEngine();
    audio.setKit(MACHINE, null);
    // the resolved row itself, not a key into a table this module no longer owns
    expect(audio.kit).toBe(MACHINE);
    expect(audio.sound).toBeNull();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it('reapplies the kit and refreshes samples after init()', () => {
    const { audio, ctx } = initEngine();
    const refresh = vi.fn();
    audio.samples = { hit: vi.fn(() => false), refresh };

    audio.setKit(MACHINE, null);

    const lp = pick<FakeBiquadFilterNode>(ctx.nodes, 'biquad')[0];
    expect(lp.frequency.events.at(-1)).toMatchObject({ value: MACHINE.master.lp });
    expect(refresh).toHaveBeenCalledWith(audio);
  });
});

/* ---------------------------------------------------------------------- */
/* P() / roomOf()                                                         */
/* ---------------------------------------------------------------------- */

describe('P()', () => {
  it('reads a synth kit’s own numbers with no sound override', () => {
    const audio = newEngine();
    audio.setKit(STUDIO70, null);
    expect(audio.P('k')).toEqual(STUDIO70.k);
  });

  it('layers a sound override over the kit defaults, leaving the rest untouched', () => {
    const audio = newEngine();
    const sound = withTuning(STUDIO70, { k: { tune: 999 } });
    audio.setKit(STUDIO70, sound);
    expect(audio.P('k').tune).toBe(999);
    expect(audio.P('k').decay).toBe(STUDIO70.k.decay);
  });

  it('stands in with SAMPLE_STAND_IN for a non-synth-lane voice on a non-synth kit', () => {
    const audio = newEngine();
    audio.setKit(TR909, null); // engine: 'drift' — not yet implemented as its own synth
    /* The same numbers this test always asserted — they were the Machine kit's
       — but they are `SAMPLE_STAND_IN` in `kit.ts` now rather than a row, and
       deliberately so: a drum-machine or sample kit stores 0..1 knobs and the
       synth only understands Hz and seconds, so what stands in while one loads
       must not move because somebody retuned an unrelated kit. */
    expect(audio.P('k')).toEqual(SAMPLE_STAND_IN.k);
    expect(audio.P('s')).toEqual(SAMPLE_STAND_IN.s);
    expect(audio.P('k')).toEqual({ tune: 42, decay: 0.52, tone: 0.62, room: 0 });
  });

  it('reads toms and percussion from the kit itself even on a non-synth kit (SYNTH_ONLY)', () => {
    const audio = newEngine();
    audio.setKit(TR909, null);
    expect(audio.P('t')).toEqual(TR909.t);
    expect(audio.P('p')).toEqual(TR909.p);
  });

  it('falls back to SYNTH_FALLBACK when there is no kit at all', () => {
    /* The old shape of this test was "an unknown kit key". A key cannot be
       unknown any more — playback takes the resolved row — but the state it
       stood for is still real and is now `null`: the catalogue has not arrived
       yet, or the saved kit no longer names a row. The fallback is the
       synthesiser's own numbers rather than any catalogue kit, because a row
       can be edited or deleted and what plays meanwhile must not move with it. */
    const audio = newEngine();
    audio.setKit(null, null);
    expect(audio.kit).toBeNull();
    expect(audio.P('k')).toEqual(SYNTH_FALLBACK.k);
    expect(audio.P('s')).toEqual(SYNTH_FALLBACK.s);

    // never initialised at all is the same state, and just as quiet
    expect(newEngine().P('k')).toEqual(SYNTH_FALLBACK.k);
  });
});

describe('roomOf()', () => {
  it('reads the live sound override when present', () => {
    const audio = newEngine();
    audio.setKit(STUDIO70, withTuning(STUDIO70, { k: { room: 0.77 } }));
    expect(audio.roomOf('k')).toBeCloseTo(0.77, 9);
  });

  it('falls back to the kit’s own room when there is no override', () => {
    const audio = newEngine();
    audio.setKit(STUDIO70, null);
    expect(audio.roomOf('k')).toBeCloseTo(STUDIO70.k.room, 9);
  });
});

/* ---------------------------------------------------------------------- */
/* drive and reverb caches                                                */
/* ---------------------------------------------------------------------- */

describe('drive cache (driveAt)', () => {
  it('does not splice a new waveshaper when the drive amount is unchanged', () => {
    const { audio, ctx } = initEngine();
    const before = pick<FakeWaveShaperNode>(ctx.nodes, 'waveshaper').length;
    audio.setKit(STUDIO70, null); // same master.drive as the kit already applied
    expect(pick<FakeWaveShaperNode>(ctx.nodes, 'waveshaper')).toHaveLength(before);
  });

  it('splices in a new waveshaper — and detaches the old one — when drive moves', () => {
    const { audio, ctx } = initEngine();
    const bus = audio.bus as unknown as FakeGainNode;
    const oldShaper = bus.outputs[0] as FakeWaveShaperNode;
    const before = pick<FakeWaveShaperNode>(ctx.nodes, 'waveshaper').length;

    audio.setKit(MACHINE, null); // machine.master.drive (1.35) differs from studio70's (1.25)

    const shapers = pick<FakeWaveShaperNode>(ctx.nodes, 'waveshaper');
    expect(shapers).toHaveLength(before + 1);
    const newShaper = bus.outputs[0] as FakeWaveShaperNode;
    expect(newShaper).not.toBe(oldShaper);
    expect(bus.outputs).not.toContain(oldShaper);
    expect(oldShaper.outputs).toHaveLength(0); // fully detached
  });

  it('falls back to a full bus disconnect if the old shaper was already detached', () => {
    const { audio, ctx } = initEngine();
    const bus = audio.bus as unknown as FakeGainNode;
    const oldShaper = bus.outputs[0] as FakeWaveShaperNode;
    bus.disconnect(oldShaper); // simulate external tampering: already gone

    expect(() => audio.setKit(MACHINE, null)).not.toThrow();
    const newShaper = bus.outputs[0] as FakeWaveShaperNode;
    expect(newShaper).not.toBe(oldShaper);
    expect(pick<FakeWaveShaperNode>(ctx.nodes, 'waveshaper')).toContain(newShaper);
  });

  it('a waveshaper curve can only be assigned once, which is why a new node is spliced in', () => {
    const { ctx } = initEngine();
    const shaper = pick<FakeWaveShaperNode>(ctx.nodes, 'waveshaper')[0];
    expect(() => {
      shaper.curve = new Float32Array(4);
    }).toThrow(/curve already set/);
  });
});

describe('reverb IR cache (irRoom)', () => {
  it('builds a room impulse sized from the kit’s room amount', () => {
    const { ctx } = initEngine();
    const convolver = pick<FakeConvolverNode>(ctx.nodes, 'convolver')[0];
    const room = STUDIO70.master.room as number;
    const expectedLen = Math.floor(ctx.sampleRate * (0.35 + room * 2.0));
    expect(convolver.buffer).not.toBeNull();
    expect(convolver.buffer?.length).toBe(expectedLen);
    expect(convolver.buffer?.numberOfChannels).toBe(2);
  });

  it('does not rebuild the impulse when room is unchanged (rounds to the same 1/100)', () => {
    const { audio, ctx } = initEngine();
    const convolver = pick<FakeConvolverNode>(ctx.nodes, 'convolver')[0];
    const before = convolver.buffer;
    audio.setKit(STUDIO70, null); // same master.room
    expect(convolver.buffer).toBe(before);
  });

  it('rebuilds the impulse when room actually moves', () => {
    const { audio, ctx } = initEngine();
    const convolver = pick<FakeConvolverNode>(ctx.nodes, 'convolver')[0];
    const before = convolver.buffer;
    audio.setKit(MACHINE, null); // machine.master.room = 0, studio70's is 0.16
    expect(convolver.buffer).not.toBe(before);
    const expectedLen = Math.floor(ctx.sampleRate * 0.35); // room = 0
    expect(convolver.buffer?.length).toBe(expectedLen);
  });

  it('reads a sound override on master, not just the kit default', () => {
    const audio = newEngine();
    const sound = withTuning(STUDIO70, { master: { room: 0.5 } });
    audio.setKit(STUDIO70, sound);
    const ctx = audio.init() as unknown as FakeAudioContext;
    const convolver = pick<FakeConvolverNode>(ctx.nodes, 'convolver')[0];
    const expectedLen = Math.floor(ctx.sampleRate * (0.35 + 0.5 * 2.0));
    expect(convolver.buffer?.length).toBe(expectedLen);
  });
});

/* ---------------------------------------------------------------------- */
/* voices: kick                                                           */
/* ---------------------------------------------------------------------- */

describe('kick()', () => {
  it('schedules the pitch-drop oscillator and envelope from the kit table', () => {
    const { audio, ctx } = initEngine();
    const t = 0.5;
    const P = STUDIO70.k;
    const nodes = recordNodes(ctx, () => audio.kick(t, 1));

    const osc = pick<FakeOscillatorNode>(nodes, 'oscillator')[0];
    expect(osc.type).toBe('sine');
    expect(osc.frequency.events[0]).toMatchObject({ type: 'setValueAtTime', time: t });
    expect((osc.frequency.events[0] as { value: number }).value).toBeCloseTo(P.tune * 5.2, 9);
    expect((osc.frequency.events[1] as { value: number }).value).toBeCloseTo(P.tune * 1.32, 9);
    expect(osc.frequency.events[1].time).toBeCloseTo(t + 0.021, 9);
    expect((osc.frequency.events[2] as { value: number }).value).toBeCloseTo(P.tune, 9);
    expect(osc.frequency.events[2].time).toBeCloseTo(t + 0.105, 9);
    expect(osc.startedAt).toBeCloseTo(t, 9);
    expect(osc.stoppedAt).toBeCloseTo(t + P.decay + 0.12, 9);

    const g = osc.outputs[0] as FakeGainNode;
    expectEnvelope(g, t, 1 * 1.05, 0.002, P.decay);

    const bus = audio.bus as unknown as FakeGainNode;
    expect(g.outputs).toContain(bus);
    const convolver = pick<FakeConvolverNode>(ctx.nodes, 'convolver')[0];
    expect(roomSend(g, convolver)).toBeCloseTo(P.room, 9);
  });

  it('adds the beater noise layer only when tone is above the floor', () => {
    const { audio, ctx } = initEngine();
    const t = 0.2;
    const P = STUDIO70.k;

    const withBeater = recordNodes(ctx, () => audio.kick(t, 1));
    const beaterNoise = pick<FakeAudioBufferSourceNode>(withBeater, 'bufferSource')[0];
    expect(beaterNoise).toBeDefined();
    expect(beaterNoise.playbackRate.value).toBeCloseTo(1, 9); // 0.85 + 0.5*0.3, jitter pinned
    const bp = beaterNoise.outputs[0] as FakeBiquadFilterNode;
    expect(bp.type).toBe('bandpass');
    expect(bp.frequency.value).toBeCloseTo(2000 + P.tone * 2800, 9);
    expect(bp.Q.value).toBeCloseTo(0.8, 9);
    const g2 = bp.outputs[0] as FakeGainNode;
    expectEnvelope(g2, t, 1 * P.tone * 0.45, 0.0004, 0.013);

    audio.setKit(STUDIO70, withTuning(STUDIO70, { k: { tone: 0 } }));
    const noBeater = recordNodes(ctx, () => audio.kick(t, 1));
    expect(pick(noBeater, 'bufferSource')).toHaveLength(0);
  });

  it('reads its numbers from whichever kit is loaded, not a hardcoded constant', () => {
    const { audio, ctx } = initEngine();
    audio.setKit(MACHINE, null);
    const t = 0.1;
    const nodes = recordNodes(ctx, () => audio.kick(t, 1));
    const osc = pick<FakeOscillatorNode>(nodes, 'oscillator')[0];
    expect((osc.frequency.events[0] as { value: number }).value).toBeCloseTo(
      MACHINE.k.tune * 5.2,
      9
    );
  });

  it('plays the sampled voice instead when the sample source has this slot', () => {
    const { audio, ctx } = initEngine();
    const hit = vi.fn(() => true);
    audio.samples = { hit };
    const nodes = recordNodes(ctx, () => audio.kick(0.3, 0.8));
    expect(hit).toHaveBeenCalledWith(audio, 0.3, 'k', 0.8);
    expect(nodes).toHaveLength(0); // no synth voice was built
  });

  it('falls through to the synthesised voice when the sample source has nothing for it', () => {
    const { audio, ctx } = initEngine();
    const hit = vi.fn(() => false);
    audio.samples = { hit };
    const nodes = recordNodes(ctx, () => audio.kick(0.3, 0.8));
    expect(hit).toHaveBeenCalledWith(audio, 0.3, 'k', 0.8);
    expect(pick(nodes, 'oscillator')).toHaveLength(1); // synth voice still played
  });
});

/* ---------------------------------------------------------------------- */
/* voices: snare                                                          */
/* ---------------------------------------------------------------------- */

describe('snare()', () => {
  it('layers six membrane partials and the wire/crack noise for a normal hit', () => {
    const { audio, ctx } = initEngine();
    const t = 0.4;
    const P = STUDIO70.s;
    const nodes = recordNodes(ctx, () => audio.snare(t, 1));

    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    expect(oscs).toHaveLength(6);
    expect(oscs.every((o) => o.type === 'triangle')).toBe(true);
    expect((oscs[0].frequency.events[0] as { value: number }).value).toBeCloseTo(P.tune * 1, 9);
    expect((oscs[5].frequency.events[0] as { value: number }).value).toBeCloseTo(P.tune * 2.92, 9);
    expect((oscs[0].frequency.events[1] as { value: number }).value).toBeCloseTo(
      P.tune * 1 * 0.84,
      9
    );

    const snareWireHp = pick<FakeBiquadFilterNode>(nodes, 'biquad').find(
      (b) => b.type === 'highpass' && b.frequency.value === 1500
    );
    expect(snareWireHp).toBeDefined(); // not ghost, so hp is 1500 not 2800
    const snareWireBp = snareWireHp!.outputs[0] as FakeBiquadFilterNode;
    expect(snareWireBp.frequency.value).toBeCloseTo(3200 + 1 * 2400, 9); // vel folded in
  });

  it('softens a ghost hit: shorter decay, brighter wire filter, halved peaks', () => {
    const { audio, ctx } = initEngine();
    const t = 0.1;
    const P = STUDIO70.s;
    const nodes = recordNodes(ctx, () => audio.snare(t, 1, true));

    const ghostHp = pick<FakeBiquadFilterNode>(nodes, 'biquad').find(
      (b) => b.type === 'highpass' && b.frequency.value === 2800
    );
    expect(ghostHp).toBeDefined();

    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    const g = oscs[0].outputs[0] as FakeGainNode;
    const decay = P.decay * 0.44;
    expectEnvelope(g, t, 1 * (1 - P.tone * 0.5) * 0.9 * 0.5, 0.001, decay * 0.75);
  });

  it('plays the cross-stick voice entirely differently: no membrane, no wires', () => {
    const { audio, ctx } = initEngine();
    const t = 0.2;
    const P = STUDIO70.s;
    const nodes = recordNodes(ctx, () => audio.snare(t, 1, false, true));

    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    // 2 stick partials (triangle + square) + 1 sine shell tone = 3 oscillators
    expect(oscs).toHaveLength(3);
    expect(oscs[0].type).toBe('triangle');
    expect(oscs[1].type).toBe('square');
    // cross-stick sets frequency directly (`.value =`), not via automation
    expect(oscs[0].frequency.value).toBeCloseTo(P.tune * 3.6 * 1, 9);
    expect(oscs[1].frequency.value).toBeCloseTo(P.tune * 3.6 * 2.72, 9);

    // membrane/wire nodes from the normal path must not appear
    const wireHp = pick<FakeBiquadFilterNode>(nodes, 'biquad').find(
      (b) => b.type === 'highpass' && (b.frequency.value === 1500 || b.frequency.value === 2800)
    );
    expect(wireHp).toBeUndefined();
  });

  it('reads a different kit’s numbers rather than a hardcoded pitch', () => {
    const { audio, ctx } = initEngine();
    audio.setKit(LIVEROOM, null);
    const nodes = recordNodes(ctx, () => audio.snare(0.1, 1));
    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    expect((oscs[0].frequency.events[0] as { value: number }).value).toBeCloseTo(
      LIVEROOM.s.tune,
      9
    );
  });

  it('plays the ghost/cross sample slot when the sample source covers it', () => {
    const { audio, ctx } = initEngine();
    const hit = vi.fn(() => true);
    audio.samples = { hit };
    recordNodes(ctx, () => audio.snare(0.1, 1, true));
    expect(hit).toHaveBeenCalledWith(audio, 0.1, 'sGhost', 1);
    recordNodes(ctx, () => audio.snare(0.2, 1, false, true));
    expect(hit).toHaveBeenCalledWith(audio, 0.2, 'sCross', 1);
  });
});

/* ---------------------------------------------------------------------- */
/* voices: hat                                                            */
/* ---------------------------------------------------------------------- */

describe('hat()', () => {
  it('plays the closed hat as a metal cluster with a noise cap, sized off the kit table', () => {
    const { audio, ctx } = initEngine();
    const t = 0.3;
    const P = STUDIO70.h;
    const nodes = recordNodes(ctx, () => audio.hat(t, 1));

    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    expect(oscs).toHaveLength(RATIOS.length);
    const base = 208 * P.tune;
    // metal()'s cluster sets frequency directly (`.value =`), not via automation
    expect(oscs[0].frequency.value).toBeCloseTo(base * RATIOS[0], 6);

    const bp = pick<FakeBiquadFilterNode>(nodes, 'biquad').find((b) => b.type === 'bandpass');
    expect(bp?.frequency.value).toBeCloseTo(10500, 9);
    expect(bp?.Q.value).toBeCloseTo(1.0, 9);

    const noiseSrc = pick<FakeAudioBufferSourceNode>(nodes, 'bufferSource')[0];
    expect(noiseSrc.loop).toBe(true);
  });

  it('opens: longer decay from P.open, and registers a chokeable tail', () => {
    const { audio, ctx } = initEngine();
    const P = STUDIO70.h;
    const nodes = recordNodes(ctx, () => audio.hat(0, 1, true));
    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    // metal()'s oscillators stop at t + decay + 0.08; decay for an open hat is P.open
    expect(oscs[0].stoppedAt).toBeCloseTo(0 + P.open + 0.08, 9);
  });

  it('closing a hat chokes the previous open one', () => {
    const { audio, ctx } = initEngine();
    const openNodes = recordNodes(ctx, () => audio.hat(0, 1, true));
    const openOsc = pick<FakeOscillatorNode>(openNodes, 'oscillator')[0];
    // metal()'s wiring: oscillator -> bandpass -> highpass -> envelope gain
    const openEnvelope = (openOsc.outputs[0] as FakeBiquadFilterNode)
      .outputs[0] as FakeBiquadFilterNode;
    const envelope = openEnvelope.outputs[0] as FakeGainNode;
    const eventsBefore = envelope.gain.events.length;

    audio.hat(0.1, 1); // closed hat 100ms later, well inside the open hat's decay

    expect(envelope.gain.events.length).toBe(eventsBefore + 2);
    const tail = envelope.gain.events.slice(eventsBefore);
    expect(tail[0].type).toBe('cancelAndHoldAtTime');
    expect(tail[0].time).toBeCloseTo(0.1, 9);
    expect(tail[1]).toMatchObject({ type: 'exponentialRampToValueAtTime', value: 0.0001 });
    expect(tail[1].time).toBeCloseTo(0.122, 9);
  });

  it('does not choke an open hat that has already finished ringing', () => {
    const { audio, ctx } = initEngine();
    const openNodes = recordNodes(ctx, () => audio.hat(0, 1, true));
    const openOsc = pick<FakeOscillatorNode>(openNodes, 'oscillator')[0];
    const openBp = (openOsc.outputs[0] as FakeBiquadFilterNode).outputs[0] as FakeBiquadFilterNode;
    const envelope = openBp.outputs[0] as FakeGainNode;
    const eventsBefore = envelope.gain.events.length;

    audio.hat(10, 1); // long after the open hat's tail has ended

    expect(envelope.gain.events.length).toBe(eventsBefore); // no choke ramp appended
  });

  it('chokes via cancelScheduledValues when cancelAndHoldAtTime is unavailable', () => {
    const { audio } = initEngine();
    const rampSpy = vi.fn();
    const cancelSpy = vi.fn();
    audio.noteHatTail({
      g: { gain: { cancelScheduledValues: cancelSpy, exponentialRampToValueAtTime: rampSpy } },
      end: 5,
    } as unknown as import('@/lib/app/breaks/audio/engine').PlayedBuffer);

    audio.chokeHats(1);

    expect(cancelSpy).toHaveBeenCalledWith(1);
    expect(rampSpy).toHaveBeenCalledWith(0.0001, 1.022);
  });

  it('plays the foot-pedal chick: duller metal plus a low-frequency thump', () => {
    const { audio, ctx } = initEngine();
    const nodes = recordNodes(ctx, () => audio.hat(0, 1, false, true));
    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    // RATIOS.length metal partials + 1 low thump oscillator
    expect(oscs).toHaveLength(RATIOS.length + 1);
    const thump = oscs[oscs.length - 1];
    expect(thump.frequency.value).toBeCloseTo(168, 9);
    expect(thump.stoppedAt).toBeCloseTo(0.09, 9);
  });

  it('reads a different kit’s size (P.tune) rather than a hardcoded base frequency', () => {
    const { audio, ctx } = initEngine();
    audio.setKit(MACHINE, null);
    const nodes = recordNodes(ctx, () => audio.hat(0, 1));
    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    const base = 208 * MACHINE.h.tune;
    expect(oscs[0].frequency.value).toBeCloseTo(base * RATIOS[0], 6);
  });
});

/* ---------------------------------------------------------------------- */
/* voices: ride                                                           */
/* ---------------------------------------------------------------------- */

describe('ride()', () => {
  it('plays the plain ride: metal cluster plus the stick ping, no bell tone', () => {
    const { audio, ctx } = initEngine();
    const P = STUDIO70.r;
    const t = 0.2;
    const nodes = recordNodes(ctx, () => audio.ride(t, 1));

    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    expect(oscs).toHaveLength(RATIOS.length); // no extra bell partial
    const base = 184 * P.tune;
    expect(oscs[0].frequency.value).toBeCloseTo(base * RATIOS[0], 6);

    const stickBp = pick<FakeBiquadFilterNode>(nodes, 'biquad').find(
      (b) => b.type === 'bandpass' && b.frequency.value === 3800
    );
    expect(stickBp).toBeDefined();
  });

  it('adds the bell partial and re-tunes the stick ping when bell is struck', () => {
    const { audio, ctx } = initEngine();
    const P = STUDIO70.r;
    const nodes = recordNodes(ctx, () => audio.ride(0.2, 1, true));

    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    expect(oscs).toHaveLength(RATIOS.length + 1);
    const bellOsc = oscs[oscs.length - 1];
    expect(bellOsc.type).toBe('triangle');
    expect(bellOsc.frequency.value).toBeCloseTo(930 * P.tune, 9);

    const stickBp = pick<FakeBiquadFilterNode>(nodes, 'biquad').find(
      (b) => b.type === 'bandpass' && b.frequency.value === 5000
    );
    expect(stickBp).toBeDefined(); // bell ping is brighter than the plain 3800Hz one
  });

  it('plays the ride-bell sample slot when covered', () => {
    const { audio, ctx } = initEngine();
    const hit = vi.fn(() => true);
    audio.samples = { hit };
    recordNodes(ctx, () => audio.ride(0.1, 1, true));
    expect(hit).toHaveBeenCalledWith(audio, 0.1, 'rBell', 1);
  });
});

/* ---------------------------------------------------------------------- */
/* voices: crash                                                          */
/* ---------------------------------------------------------------------- */

describe('crash()', () => {
  it('plays a closing-filter wash plus a metal cluster with no extra noise layer', () => {
    const { audio, ctx } = initEngine();
    const P = STUDIO70.c;
    const t = 0.15;
    const nodes = recordNodes(ctx, () => audio.crash(t, 1));

    const lpFilters = pick<FakeBiquadFilterNode>(nodes, 'biquad').filter(
      (b) => b.type === 'lowpass'
    );
    expect(lpFilters).toHaveLength(1);
    const lp = lpFilters[0];
    expect(lp.frequency.events[0]).toMatchObject({ type: 'setValueAtTime', value: 14000 });
    expect(lp.frequency.events[1]).toMatchObject({
      type: 'exponentialRampToValueAtTime',
      value: 3200,
    });
    expect(lp.frequency.events[1].time).toBeCloseTo(t + P.decay, 9);

    // metal() here is called with no `noise` option — proves that branch is optional
    const noiseSources = pick<FakeAudioBufferSourceNode>(nodes, 'bufferSource');
    expect(noiseSources).toHaveLength(1); // just the wash noise, no metal-noise layer
  });
});

/* ---------------------------------------------------------------------- */
/* voices: tom                                                            */
/* ---------------------------------------------------------------------- */

describe('tom()', () => {
  it.each([
    ['t1', 1.78, 0.82],
    ['t2', 1.34, 1],
    ['t3', 1, 1.18],
  ] as const)(
    'lane %s reads its multiplier and decay scale from the kit table',
    (lane, mult, decMult) => {
      const { audio, ctx } = initEngine();
      const P = STUDIO70.t;
      const t = 0.25;
      const nodes = recordNodes(ctx, () => audio.tom(t, 1, lane));

      const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
      expect(oscs).toHaveLength(4);
      const f0 = P.tune * mult;
      expect((oscs[0].frequency.events[0] as { value: number }).value).toBeCloseTo(f0 * 1.14, 9);
      expect((oscs[0].frequency.events[1] as { value: number }).value).toBeCloseTo(f0, 9);
      expect(oscs[0].frequency.events[1].time).toBeCloseTo(t + 0.028, 9);
      const dec = P.decay * decMult;
      expect((oscs[0].frequency.events[2] as { value: number }).value).toBeCloseTo(f0 * 0.88, 9);
      expect(oscs[0].frequency.events[2].time).toBeCloseTo(t + dec * 0.9, 9);
    }
  );

  it('adds the stick-noise layer only when tone is above the floor', () => {
    const { audio, ctx } = initEngine();
    const withStick = recordNodes(ctx, () => audio.tom(0.1, 1, 't2'));
    expect(pick(withStick, 'bufferSource')).toHaveLength(1);

    audio.setKit(STUDIO70, withTuning(STUDIO70, { t: { tone: 0 } }));
    const noStick = recordNodes(ctx, () => audio.tom(0.2, 1, 't2'));
    expect(pick(noStick, 'bufferSource')).toHaveLength(0);
  });

  it('plays a tom sample slot when covered', () => {
    const { audio, ctx } = initEngine();
    const hit = vi.fn(() => true);
    audio.samples = { hit };
    recordNodes(ctx, () => audio.tom(0.1, 1, 't3'));
    expect(hit).toHaveBeenCalledWith(audio, 0.1, 't3', 1);
  });
});

/* ---------------------------------------------------------------------- */
/* voices: perc                                                           */
/* ---------------------------------------------------------------------- */

describe('perc()', () => {
  it('shaker: filtered noise burst, longer when accented', () => {
    const { audio, ctx } = initEngine();
    const P = STUDIO70.p;
    const v = 1 * P.level;
    // hiss()'s wiring: noise -> highpass -> bandpass -> envelope gain
    const envelopeOf = (nodes: FakeAudioNode[]) => {
      const n = pick<FakeAudioBufferSourceNode>(nodes, 'bufferSource')[0];
      const hp = n.outputs[0] as FakeBiquadFilterNode;
      const bp = hp.outputs[0] as FakeBiquadFilterNode;
      return bp.outputs[0] as FakeGainNode;
    };

    const short = recordNodes(ctx, () => audio.perc(0.1, 1, 'shaker', false));
    expectEnvelope(envelopeOf(short), 0.1, v * 0.2, 0.0006, 0.038);

    const long = recordNodes(ctx, () => audio.perc(0.2, 1, 'shaker', true));
    expectEnvelope(envelopeOf(long), 0.2, v * 0.2, 0.0006, 0.058);
  });

  it('tamb: a metal cluster tuned to a fixed pitch, plus jingle noise', () => {
    const { audio, ctx } = initEngine();
    const nodes = recordNodes(ctx, () => audio.perc(0.1, 1, 'tamb', false));
    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    expect(oscs).toHaveLength(RATIOS.length);
    expect(oscs[0].frequency.value).toBeCloseTo(620 * RATIOS[0], 6);
  });

  it('clave: two woodblock tones plus a short noise transient', () => {
    const { audio, ctx } = initEngine();
    const nodes = recordNodes(ctx, () => audio.perc(0.1, 1, 'clave', false));
    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    expect(oscs).toHaveLength(2);
    expect(oscs[0].frequency.value).toBeCloseTo(2450, 9);
    expect(oscs[1].frequency.value).toBeCloseTo(3850, 9);
  });

  it('wood: two lower tones than clave', () => {
    const { audio, ctx } = initEngine();
    const nodes = recordNodes(ctx, () => audio.perc(0.1, 1, 'wood', false));
    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    expect(oscs[0].frequency.value).toBeCloseTo(1180, 9);
    expect(oscs[1].frequency.value).toBeCloseTo(2360, 9);
  });

  it('cowbell: two detuned square partials through one narrow band, longer when accented', () => {
    const { audio, ctx } = initEngine();
    const P = STUDIO70.p;
    const v = 1 * P.level;
    const nodes = recordNodes(ctx, () => audio.perc(0.1, 1, 'cowbell', true));
    const oscs = pick<FakeOscillatorNode>(nodes, 'oscillator');
    expect(oscs).toHaveLength(2);
    expect(oscs[0].frequency.value).toBeCloseTo(540, 9);
    expect(oscs[1].frequency.value).toBeCloseTo(810, 9);
    const g0 = (oscs[0].outputs[0] as FakeBiquadFilterNode).outputs[0] as FakeGainNode;
    expectEnvelope(g0, 0.1, v * 0.22, 0.001, 0.42); // accented decay
  });

  it('agogo: two bells, pitch shifts when accented rather than just getting louder', () => {
    const { audio, ctx } = initEngine();
    const noAccent = recordNodes(ctx, () => audio.perc(0.1, 1, 'agogo', false));
    const accent = recordNodes(ctx, () => audio.perc(0.2, 1, 'agogo', true));
    const f0 = (osc: FakeOscillatorNode) => osc.frequency.value;
    expect(f0(pick<FakeOscillatorNode>(noAccent, 'oscillator')[0])).toBeCloseTo(780, 9);
    expect(f0(pick<FakeOscillatorNode>(accent, 'oscillator')[0])).toBeCloseTo(1000, 9);
  });

  it('conga: a tuned membrane, with a hand-slap noise layer only when accented', () => {
    const { audio, ctx } = initEngine();
    const P = STUDIO70.p;
    const v = 1 * P.level;

    const open = recordNodes(ctx, () => audio.perc(0.1, 1, 'conga', false));
    const openOscs = pick<FakeOscillatorNode>(open, 'oscillator');
    expect(openOscs).toHaveLength(3); // membrane's 3 partials, no slap
    expect((openOscs[0].frequency.events[0] as { value: number }).value).toBeCloseTo(196 * 1.1, 9);
    expect(pick(open, 'bufferSource')).toHaveLength(0);

    const slap = recordNodes(ctx, () => audio.perc(0.2, 1, 'conga', true));
    expect(pick(slap, 'bufferSource')).toHaveLength(1);
    const slapOscs = pick<FakeOscillatorNode>(slap, 'oscillator');
    expect((slapOscs[0].frequency.events[0] as { value: number }).value).toBeCloseTo(305 * 1.1, 9);
    void v;
  });

  it('timbale: a tuned membrane with a fixed noise crack', () => {
    const { audio, ctx } = initEngine();
    const nodes = recordNodes(ctx, () => audio.perc(0.1, 1, 'timbale', false));
    expect(pick(nodes, 'oscillator')).toHaveLength(3);
    expect(pick(nodes, 'bufferSource')).toHaveLength(1);
  });

  it('cascara: a short bright knock', () => {
    const { audio, ctx } = initEngine();
    const nodes = recordNodes(ctx, () => audio.perc(0.1, 1, 'cascara', false));
    const osc = pick<FakeOscillatorNode>(nodes, 'oscillator')[0];
    expect(osc.type).toBe('square');
    expect(osc.frequency.value).toBeCloseTo(1650, 9);
  });

  it('clap: four noise bursts, the last one bigger and later, eight milliseconds apart', () => {
    const { audio, ctx } = initEngine();
    const t = 0.1;
    const nodes = recordNodes(ctx, () => audio.perc(t, 1, 'clap', false));
    const bursts = pick<FakeAudioBufferSourceNode>(nodes, 'bufferSource');
    expect(bursts).toHaveLength(4);
    const starts = bursts.map((b) => b.startedAt as number);
    [t, t + 0.008, t + 0.016, t + 0.026].forEach((expected, i) => {
      expect(starts[i]).toBeCloseTo(expected, 9);
    });
    // hiss()'s wiring: noise -> highpass -> bandpass -> envelope gain
    const envelopeOf = (src: FakeAudioBufferSourceNode) => {
      const hp = src.outputs[0] as FakeBiquadFilterNode;
      const bp = hp.outputs[0] as FakeBiquadFilterNode;
      return bp.outputs[0] as FakeGainNode;
    };
    const lastEnvelope = envelopeOf(bursts[3]);
    const firstEnvelope = envelopeOf(bursts[0]);
    const P = STUDIO70.p;
    const v = 1 * P.level;
    expectEnvelope(lastEnvelope, t + 0.026, v * 0.24, 0.0006, 0.14);
    expectEnvelope(firstEnvelope, t, v * 0.17, 0.0006, 0.012);
  });

  it('falls back to a generic hiss for an unrecognised instrument', () => {
    const { audio, ctx } = initEngine();
    const nodes = recordNodes(ctx, () => audio.perc(0.1, 1, 'not-a-real-instrument', false));
    expect(pick(nodes, 'bufferSource')).toHaveLength(1);
    expect(pick(nodes, 'oscillator')).toHaveLength(0);
  });

  it('a slot sample wins over both the sample stack’s percHit and the synth', () => {
    const { audio, ctx } = initEngine();
    const slotHit = vi.fn(() => true);
    const percHit = vi.fn(() => true);
    audio.samples = { hit: slotHit, percHit };
    const nodes = recordNodes(ctx, () => audio.perc(0.1, 1, 'tamb', false, 'p1'));
    expect(slotHit).toHaveBeenCalledWith(audio, 0.1, 'p1', 1);
    expect(percHit).not.toHaveBeenCalled();
    expect(nodes).toHaveLength(0);
  });

  it('percHit on the sample stack wins over the synth when there is no slot', () => {
    const { audio, ctx } = initEngine();
    const percHit = vi.fn(() => true);
    audio.samples = { hit: vi.fn(() => false), percHit };
    const nodes = recordNodes(ctx, () => audio.perc(0.1, 1, 'tamb', true));
    expect(percHit).toHaveBeenCalledWith(audio, 0.1, 'tamb', 1, true);
    expect(nodes).toHaveLength(0);
  });

  it('falls through to the synth when nothing sampled covers the instrument', () => {
    const { audio, ctx } = initEngine();
    audio.samples = {
      hit: vi.fn(() => false),
      percHit: vi.fn(() => false),
    };
    const nodes = recordNodes(ctx, () => audio.perc(0.1, 1, 'clave', false));
    expect(pick(nodes, 'oscillator')).toHaveLength(2);
  });
});

/* ---------------------------------------------------------------------- */
/* click / demo / hit                                                     */
/* ---------------------------------------------------------------------- */

describe('click()', () => {
  it('is louder and higher-pitched on a strong (downbeat) click', () => {
    const { audio, ctx } = initEngine();
    const weak = recordNodes(ctx, () => audio.click(0.1, false));
    const strong = recordNodes(ctx, () => audio.click(0.2, true));

    const weakOsc = pick<FakeOscillatorNode>(weak, 'oscillator')[0];
    const strongOsc = pick<FakeOscillatorNode>(strong, 'oscillator')[0];
    expect(weakOsc.frequency.value).toBeCloseTo(1180, 9);
    expect(strongOsc.frequency.value).toBeCloseTo(1720, 9);

    const weakG = weakOsc.outputs[0] as FakeGainNode;
    const strongG = strongOsc.outputs[0] as FakeGainNode;
    expectEnvelope(weakG, 0.1, 0.14, 0.0005, 0.03);
    expectEnvelope(strongG, 0.2, 0.24, 0.0005, 0.03);
  });

  it('connects straight to the bus, never through the reverb send', () => {
    const { audio, ctx } = initEngine();
    const bus = audio.bus as unknown as FakeGainNode;
    const convolver = pick<FakeConvolverNode>(ctx.nodes, 'convolver')[0];
    const nodes = recordNodes(ctx, () => audio.click(0.1, true));
    const osc = pick<FakeOscillatorNode>(nodes, 'oscillator')[0];
    const g = osc.outputs[0] as FakeGainNode;
    expect(g.outputs).toContain(bus);
    expect(roomSend(g, convolver)).toBeNull();
  });

  it('does nothing before init()', () => {
    const audio = newEngine();
    expect(() => audio.click(0, true)).not.toThrow();
  });
});

describe('demo()', () => {
  it('returns false and plays nothing without an audio context', () => {
    window.AudioContext = undefined as unknown as typeof AudioContext;
    const audio = newEngine();
    const kick = vi.spyOn(audio, 'kick');
    expect(audio.demo()).toBe(false);
    expect(kick).not.toHaveBeenCalled();
  });

  it('plays a full bar exercising every voice, through the real chain', () => {
    const audio = newEngine();
    const kick = vi.spyOn(audio, 'kick');
    const snare = vi.spyOn(audio, 'snare');
    const hat = vi.spyOn(audio, 'hat');
    const ride = vi.spyOn(audio, 'ride');
    const crash = vi.spyOn(audio, 'crash');

    expect(audio.demo()).toBe(true);

    expect(kick).toHaveBeenCalledTimes(2);
    expect(snare).toHaveBeenCalledTimes(3);
    expect(hat).toHaveBeenCalledTimes(4);
    expect(ride).toHaveBeenCalledTimes(2);
    expect(crash).toHaveBeenCalledTimes(1);
  });
});

describe('hit()', () => {
  it('dispatches each voice letter to its own method, with the requested variant', () => {
    const audio = newEngine();
    const kick = vi.spyOn(audio, 'kick');
    const snare = vi.spyOn(audio, 'snare');
    const hat = vi.spyOn(audio, 'hat');
    const ride = vi.spyOn(audio, 'ride');
    const crash = vi.spyOn(audio, 'crash');
    const tom = vi.spyOn(audio, 'tom');
    const perc = vi.spyOn(audio, 'perc');

    audio.hit('k');
    audio.hit('s', 'ghost');
    audio.hit('h', 'open');
    audio.hit('r', 'bell');
    audio.hit('c');
    audio.hit('t', 't1');
    audio.hit('p', 'cowbell');

    expect(kick).toHaveBeenCalledTimes(1);
    expect(snare).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), true, false);
    expect(hat).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), true, false);
    expect(ride).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), true);
    expect(crash).toHaveBeenCalledTimes(1);
    expect(tom).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 't1');
    expect(perc).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'cowbell', false);
  });

  it('defaults the tom lane and the perc instrument when no variant is given', () => {
    const audio = newEngine();
    const tom = vi.spyOn(audio, 'tom');
    const perc = vi.spyOn(audio, 'perc');
    audio.hit('t');
    audio.hit('p');
    expect(tom).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 't2');
    expect(perc).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'tamb', false);
  });

  it('does nothing when there is no audio context', () => {
    window.AudioContext = undefined as unknown as typeof AudioContext;
    const audio = newEngine();
    const kick = vi.spyOn(audio, 'kick');
    audio.hit('k');
    expect(kick).not.toHaveBeenCalled();
  });
});

/* ---------------------------------------------------------------------- */
/* sound-file playback: playBuf and the sample fall-through contract      */
/* ---------------------------------------------------------------------- */

describe('playBuf()', () => {
  it('plays a buffer at the given rate and gain, with an optional brightness shelf', () => {
    const { audio, ctx } = initEngine();
    const buf = ctx.createBuffer(1, 4410, 44100); // 0.1s
    const t = 0.3;
    const nodes = recordNodes(ctx, () => audio.playBuf(t, buf as unknown as AudioBuffer, 0.6, 'k'));
    const src = pick<FakeAudioBufferSourceNode>(nodes, 'bufferSource')[0];
    expect(src.buffer).toBe(buf);
    expect(src.playbackRate.value).toBeCloseTo(1, 9);
    expect(src.startedAt).toBeCloseTo(t, 9);

    const g = src.outputs[0] as FakeGainNode;
    expect(g.gain.events[0]).toMatchObject({ type: 'setValueAtTime', value: 0.6, time: t });
  });

  it('applies a highshelf when a brightness shelf is requested', () => {
    const { audio, ctx } = initEngine();
    const buf = ctx.createBuffer(1, 4410, 44100);
    const nodes = recordNodes(ctx, () =>
      audio.playBuf(0.1, buf as unknown as AudioBuffer, 0.5, 'k', 1, 0, 6)
    );
    const src = pick<FakeAudioBufferSourceNode>(nodes, 'bufferSource')[0];
    const shelf = src.outputs[0] as FakeBiquadFilterNode;
    expect(shelf.type).toBe('highshelf');
    expect(shelf.gain.value).toBeCloseTo(6, 9);
  });

  it('returns the played gain node and its end time, for choking later', () => {
    const { audio, ctx } = initEngine();
    const buf = ctx.createBuffer(1, 44100, 44100); // exactly 1s
    const played = audio.playBuf(0.5, buf as unknown as AudioBuffer, 0.5, 'h', 1, 0);
    expect(played.end).toBeCloseTo(1.5, 9);
    audio.noteHatTail(played);
    // registering the tail is what lets a later closed hat choke it
    const closedNodes = recordNodes(ctx, () => audio.hat(0.6, 1));
    const closedEnvelope = (played.g as unknown as FakeGainNode).gain.events;
    expect(closedEnvelope.some((e) => e.type === 'cancelAndHoldAtTime')).toBe(true);
    void closedNodes;
  });
});
