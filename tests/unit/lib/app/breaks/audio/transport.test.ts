/**
 * The transport, driven against a fake audio engine and a fake MIDI port.
 *
 * Two findings from the gates are pinned here: the metronome was only right in
 * 4/4 (H3), and muting a lane also silenced it on MIDI out (H4).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BreakAudio } from '@/lib/app/breaks/audio/engine';
import type { MidiSink } from '@/lib/app/breaks/audio/midi-out';
import {
  type PlayEvent,
  Transport,
  type ScheduledStep,
  type TransportSnapshot,
  beatOf,
  isClickStep,
  laneGain,
  soloInPlay,
  maxBpm,
  maxBpmOf,
  playableSlots,
  playableFrom,
  skipSlot,
} from '@/lib/app/breaks/audio/transport';
import { METER_KEYS, groupsOf, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { MIDI_MAP } from '@/lib/app/breaks/midi';
import { emptyBar, styleAttrs } from '@/lib/app/breaks/pattern';
import type { Pattern, StyleAttrs } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

/**
 * Rock's own attributes, snapshotted the way the generator snapshots them.
 *
 * The transport used to read `pat.style` and look the style up; from Phase 2 it
 * reads `pat.attrs`, the snapshot the pattern carries. Feeding it the real
 * Rock row keeps this fixture the same pattern it has always been — `hatDepth`
 * and `targetDensity` included — rather than quietly becoming a style with no
 * attributes at all.
 */
const ROCK_ATTRS = styleAttrs(testStyle('rock').params);

function patternIn(meter: string, attrs: StyleAttrs = ROCK_ATTRS): Pattern {
  const n = stepsOf(meterOf(meter));
  return {
    name: 't',
    style: 'rock',
    /* Not from the catalogue: a hand-built fixture has no version to point at. */
    styleVersionId: null,
    attrs,
    meter,
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 'h', 'r', 'c'],
    perc: {},
    backbeats: [],
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    bars: [emptyBar(n)],
  };
}

function fakeAudio() {
  const ctx = { currentTime: 0 };
  const audio = {
    ctx,
    init: () => ctx,
    resume: vi.fn(),
    click: vi.fn<(t: number, strong?: boolean) => void>(),
    kick: vi.fn(),
    snare: vi.fn(),
    hat: vi.fn(),
    ride: vi.fn(),
    crash: vi.fn(),
    tom: vi.fn(),
    perc: vi.fn(),
    reseed: vi.fn<(seed: number) => void>(),
    /* The lane channel: records the fader level each note played at, then
       plays the voice, as the engine does. */
    playIn: vi.fn((_lane: string, _level: number, _t: number, play: () => void) => play()),
  };
  // a structural fake of the engine's public surface — not external data
  return { audio, ctx, engine: audio as unknown as BreakAudio };
}

function snapshot(pat: Pattern, over: Partial<TransportSnapshot> = {}): TransportSnapshot {
  return {
    patterns: { A: pat, B: null },
    arrangement: ['A'],
    solo: null,
    bpm: 120,
    swing: 0,
    feel: 0,
    hats: 100,
    humanise: { amount: 0, seed: 1 },
    click: true,
    clickSub: 4,
    countIn: 0,
    ramp: 0,
    ceiling: 200,
    mix: {},
    mute: {},
    laneSolo: {},
    ...over,
  };
}

/** Run the transport for exactly one bar, returning the step index each click fell on. */
function playOneBar(pat: Pattern, over: Partial<TransportSnapshot> = {}, midi?: MidiSink) {
  const { audio, ctx, engine } = fakeAudio();
  const snap = snapshot(pat, over);
  const t = new Transport(engine, {
    getSnapshot: () => snap,
    onBpm: vi.fn(),
    onLoop: vi.fn(),
    onPaint: vi.fn(),
    onStop: vi.fn(),
  });
  if (midi) t.midi = midi;
  t.start();
  const start = 0.08;
  const dur = 60 / snap.bpm / 4;
  const steps = stepsOf(meterOf(pat.meter));
  // advance the audio clock until the whole bar has been scheduled, and no further
  while (ctx.currentTime + 0.13 < start + steps * dur - dur / 2) {
    ctx.currentTime += 0.02;
    vi.advanceTimersByTime(25);
  }
  t.stop();
  const stepOf = (time: number) => Math.round((time - start) / dur);
  const clicks = audio.click.mock.calls.map(([time]) => stepOf(time)).filter((s) => s < steps);
  return { audio, clicks, stepOf };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('isClickStep (H3)', () => {
  const clicksIn = (meter: string, sub: number) => {
    const m = meterOf(meter);
    return Array.from({ length: stepsOf(m) }, (_, i) => i).filter((i) => isClickStep(m, i, sub));
  };

  it('is unchanged in 4/4', () => {
    expect(clicksIn('4/4', 4)).toEqual([0, 4, 8, 12]);
    expect(clicksIn('4/4', 8)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
  });

  it('clicks quarters in 3/4, not every three sixteenths', () => {
    expect(clicksIn('3/4', 4)).toEqual([0, 4, 8]);
  });

  it('clicks the dotted quarter in 6/8 and 12/8', () => {
    expect(clicksIn('6/8', 4)).toEqual([0, 6]);
    expect(clicksIn('12/8', 4)).toEqual([0, 6, 12, 18]);
  });

  it('clicks the uneven pulse in 7/8 and 5/8', () => {
    expect(clicksIn('7/8', 4)).toEqual([0, 4, 8]);
    expect(clicksIn('5/8', 4)).toEqual([0, 6]);
  });

  it.each(METER_KEYS)(
    'in %s: quarters click once per pulse, eighths once per eighth, all on eighths',
    (meter) => {
      const m = meterOf(meter);
      expect(clicksIn(meter, 4)).toEqual(groupsOf(m).map((g) => g.start));
      expect(clicksIn(meter, 8)).toHaveLength(stepsOf(m) / 2);
      for (const s of [...clicksIn(meter, 4), ...clicksIn(meter, 8)]) expect(s % 2).toBe(0);
    }
  );
});

describe('Transport', () => {
  it('drives the click from isClickStep, accenting only the downbeat', () => {
    const { audio, clicks } = playOneBar(patternIn('3/4'));
    expect(clicks).toEqual([0, 4, 8]);
    expect(audio.click.mock.calls.map(([, strong]) => strong)).toEqual([true, false, false]);
  });

  it('clicks eighths in 6/8 when asked', () => {
    expect(playOneBar(patternIn('6/8'), { clickSub: 8 }).clicks).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('does not click with the click off', () => {
    expect(playOneBar(patternIn('4/4'), { click: false }).clicks).toEqual([]);
  });

  describe('MIDI out (H4)', () => {
    const pat = patternIn('4/4');
    pat.bars[0].k[0] = 1;
    pat.bars[0].s[4] = 2;
    pat.bars[0].h[2] = 1;

    it('sends a muted lane to the port while the kit stays silent on it', () => {
      const hit = vi.fn<MidiSink['hit']>();
      const { audio, stepOf } = playOneBar(pat, { mute: { s: true } }, { hit });
      expect(audio.snare).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the muted lane must be silent in the kit
      expect(audio.kick).toHaveBeenCalledTimes(1);
      const sent = hit.mock.calls.map(([note, , at]) => [note, stepOf(at)]);
      expect(sent).toEqual([
        [MIDI_MAP.k, 0],
        [MIDI_MAP.h, 2],
        [MIDI_MAP.s, 4],
      ]);
    });

    it('plays only soloed lanes once any is soloed, and sends every lane to the port', () => {
      const hit = vi.fn<MidiSink['hit']>();
      const { audio } = playOneBar(pat, { laneSolo: { s: true } }, { hit });
      expect(audio.snare).toHaveBeenCalledTimes(1);
      expect(audio.kick).not.toHaveBeenCalled(); // test-review:accept no_arg_called — an unsoloed lane is silent
      expect(audio.hat).not.toHaveBeenCalled(); // test-review:accept no_arg_called — an unsoloed lane is silent
      expect(hit.mock.calls.map(([note]) => note).sort()).toEqual(
        [MIDI_MAP.k, MIDI_MAP.h, MIDI_MAP.s].sort()
      );
    });

    it('keeps a soloed lane silent when it is muted too: mute wins', () => {
      const { audio } = playOneBar(pat, { laneSolo: { s: true }, mute: { s: true } });
      expect(audio.snare).not.toHaveBeenCalled(); // test-review:accept no_arg_called — mute wins over solo
      expect(audio.kick).not.toHaveBeenCalled(); // test-review:accept no_arg_called — still soloed out
    });

    it('sends a lane whose fader is at zero, at the note’s own velocity', () => {
      const hit = vi.fn<MidiSink['hit']>();
      const { audio } = playOneBar(pat, { mix: { k: 0 } }, { hit });
      expect(audio.kick).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a zeroed fader is silent in the kit
      const kick = hit.mock.calls.find(([note]) => note === MIDI_MAP.k);
      expect(kick?.[1]).toBeCloseTo(0.9);
    });
  });
});

describe('maxBpm', () => {
  it('lets a compound meter run faster, since its clock counts sixteenths of a dotted pulse', () => {
    expect(maxBpm('6/8')).toBe(300);
    expect(maxBpm('4/4')).toBe(190);
    expect(maxBpm('7/8')).toBe(190);
  });
});

describe('maxBpmOf (11-e-ii-a)', () => {
  it('is the lowest of the sections’ ceilings: one tempo plays every section', () => {
    // fast swing in eighths goes to 380 alone, and to 4/4's 190 beside a 4/4 B
    expect(maxBpmOf(['4/4-8', '4/4'])).toBe(190);
    expect(maxBpmOf(['12/8', '4/4-8'])).toBe(300);
    expect(maxBpmOf(['7/8', '7/8'])).toBe(190);
  });

  it('skips a missing section, and is 4/4’s with none', () => {
    expect(maxBpmOf([undefined, '6/8'])).toBe(300);
    expect(maxBpmOf([])).toBe(190);
  });
});

/** Run the transport for `seconds` of audio clock, with every callback observable. */
function drive(snap: TransportSnapshot, seconds: number, withFrames = false) {
  const { audio, ctx, engine } = fakeAudio();
  const frames: FrameRequestCallback[] = [];
  if (withFrames) {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  }
  const cb = {
    getSnapshot: () => snap,
    onBpm: vi.fn<(bpm: number) => void>(),
    onLoop: vi.fn<(loops: number, at: number) => void>(),
    onDownbeat: vi.fn<(at: number) => void>(),
    onPaint: vi.fn(),
    onStop: vi.fn(),
  };
  const t = new Transport(engine, cb);
  const started = t.start();
  const step = (dt: number) => {
    ctx.currentTime += dt;
    vi.advanceTimersByTime(25);
    if (withFrames) frames.splice(0).forEach((f) => f(0));
  };
  while (ctx.currentTime < seconds) step(0.02);
  return { t, cb, audio, ctx, started, step };
}

function twoBarPattern(): Pattern {
  const p = patternIn('4/4');
  p.bars = [emptyBar(16), emptyBar(16)];
  p.bars[0].k[0] = 1;
  p.bars[1].s[4] = 2;
  return p;
}

describe('Transport — the clock', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses to start without an audio context', () => {
    const { engine } = fakeAudio();
    const noAudio = { ...engine, init: () => null } as unknown as BreakAudio;
    const t = new Transport(noAudio, {
      getSnapshot: () => snapshot(patternIn('4/4')),
      onBpm: vi.fn(),
      onLoop: vi.fn(),
      onPaint: vi.fn(),
      onStop: vi.fn(),
    });
    expect(t.start()).toBe(false);
    expect(t.playing).toBe(false);
  });

  it('counts in on the pulse before the first note, and plays nothing meanwhile', () => {
    const pat = patternIn('4/4');
    pat.bars[0].k[0] = 1;
    // 120 bpm: a bar is 2s; one bar of count-in, then the kick on the downbeat after it
    const { audio } = drive(snapshot(pat, { countIn: 1, click: false }), 1.9);
    expect(audio.click).toHaveBeenCalledTimes(4);
    expect(audio.click.mock.calls.map(([, strong]) => strong)).toEqual([true, false, false, false]);
    expect(audio.kick).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the count-in plays only clicks
  });

  it('loops the arrangement, reports each loop, and ramps the tempo up to the ceiling', () => {
    const snap = snapshot(twoBarPattern(), { ramp: 4, ceiling: 122, click: false });
    const { cb } = drive(snap, 4.5);
    expect(cb.onLoop).toHaveBeenCalledWith(1, expect.any(Number));
    // 120 + 4 would pass the 122 ceiling, so it stops there
    expect(cb.onBpm).toHaveBeenCalledWith(122);
  });

  it('reports each loop boundary at its audio-clock time, not when it was scheduled', () => {
    // 120 bpm, two bars of 4/4: a loop is 4s, and the music starts 0.08s after start()
    const { cb } = drive(snapshot(twoBarPattern(), { click: false }), 8.5);
    const [first, second] = cb.onLoop.mock.calls;
    expect(first[0]).toBe(1);
    expect(first[1]).toBeCloseTo(0.08 + 4, 6);
    expect(second[1]).toBeCloseTo(0.08 + 8, 6);
  });

  it('reports the downbeat after the count-in, and at once without one', () => {
    // one bar of count-in at 120 is 2s
    const counted = drive(snapshot(twoBarPattern(), { countIn: 1, click: false }), 2.5);
    expect(counted.cb.onDownbeat).toHaveBeenCalledTimes(1);
    expect(counted.cb.onDownbeat.mock.calls[0][0]).toBeCloseTo(0.08 + 2, 6);

    const straight = drive(snapshot(twoBarPattern(), { countIn: 0, click: false }), 0.5);
    expect(straight.cb.onDownbeat).toHaveBeenCalledTimes(1);
    expect(straight.cb.onDownbeat.mock.calls[0][0]).toBeCloseTo(0.08, 6);
  });

  it('leaves the tempo alone at the ceiling', () => {
    const snap = snapshot(twoBarPattern(), { ramp: 4, ceiling: 120, click: false });
    const { cb } = drive(snap, 4.5);
    expect(cb.onLoop).toHaveBeenCalled();
    expect(cb.onBpm).not.toHaveBeenCalled(); // test-review:accept no_arg_called — already at the ceiling
  });

  it('skips the other section’s bars when soloing, rather than muting them', () => {
    const a = patternIn('4/4');
    a.bars[0].k[0] = 1;
    const b = patternIn('4/4');
    b.bars[0].s[0] = 2;
    const snap = snapshot(a, {
      patterns: { A: a, B: b },
      arrangement: ['A', 'B'],
      solo: 'B',
      click: false,
    });
    const { audio } = drive(snap, 3);
    expect(audio.kick).not.toHaveBeenCalled(); // test-review:accept no_arg_called — A is skipped under solo B
    expect(audio.snare.mock.calls.length).toBeGreaterThan(0);
  });

  it('plays a section past B where the arrangement calls it, in its own meter (11-e-ii)', () => {
    const a = patternIn('4/4');
    const b = patternIn('4/4');
    const c = patternIn('7/8');
    c.bars[0].s[0] = 2;
    const snap = snapshot(a, {
      patterns: { A: a, B: b, C: c },
      arrangement: ['A', 'C'],
      click: false,
      countIn: 0,
    });
    const { audio, cb } = drive(snap, 3, true);
    // only C has a note
    expect(audio.snare.mock.calls.length).toBeGreaterThan(0);
    const painted = cb.onPaint.mock.calls.map((call) => call[0] as PlayEvent);
    const onC = painted.filter((ev) => ev.letter === 'C');
    expect(onC.length).toBeGreaterThan(0);
    // C's bar is seven eighths: fourteen steps, never a sixteenth step 14 or 15
    expect(Math.max(...onC.map((ev) => ev.slot))).toBeLessThanOrEqual(13);
  });

  it('plays only C when C is soloed', () => {
    const a = patternIn('4/4');
    a.bars[0].k[0] = 1;
    const b = patternIn('4/4');
    const c = patternIn('4/4');
    c.bars[0].s[0] = 2;
    const snap = snapshot(a, {
      patterns: { A: a, B: b, C: c },
      arrangement: ['A', 'B', 'C'],
      solo: 'C',
      click: false,
    });
    const { audio } = drive(snap, 3);
    expect(audio.kick).not.toHaveBeenCalled(); // test-review:accept no_arg_called — A is skipped under solo C
    expect(audio.snare.mock.calls.length).toBeGreaterThan(0);
  });

  it('plays a soloed section the arrangement never calls', () => {
    const a = patternIn('4/4');
    const b = patternIn('4/4');
    b.bars[0].k[0] = 1;
    const snap = snapshot(a, {
      patterns: { A: a, B: b },
      arrangement: ['A'],
      solo: 'B',
      click: false,
    });
    expect(drive(snap, 1).audio.kick).toHaveBeenCalled();
  });

  it('swings the off-beats late and leaves the downbeats on the grid', () => {
    const pat = patternIn('4/4');
    pat.bars[0].h = Array(16).fill(1);
    const dur = 0.125;
    const at = (swing: number) => {
      const { audio } = drive(snapshot(pat, { swing, click: false }), 1.9);
      return audio.hat.mock.calls
        .slice(0, 4)
        .map(([t]) => Math.round((((t as number) - 0.08) / dur) * 100) / 100);
    };
    const straight = at(0);
    const swung = at(100);
    expect(straight).toEqual([0, 1, 2, 3]);
    expect(swung[0]).toBe(0);
    expect(swung[2]).toBe(2);
    expect(swung[1]).toBeGreaterThan(1);
  });

  it('applies the style’s feel on top of the grid, never before the clock', () => {
    /* The feel travels *on the pattern* now (`attrs.feel`) rather than being
       looked up from `pat.style` — which is why the key is set alongside the
       snapshot here but is not what the transport reads. */
    const pat = patternIn('4/4', styleAttrs(testStyle('dilla').params));
    pat.style = 'dilla';
    pat.bars[0].s[4] = 2;
    const straight = drive(snapshot(pat, { feel: 0, click: false }), 1).audio.snare.mock
      .calls[0][0];
    const felt = drive(snapshot(pat, { feel: 100, click: false }), 1).audio.snare.mock.calls[0][0];
    // Dilla's snare sits behind the beat
    expect(felt).toBeGreaterThan(straight);
  });

  it('plays every lane it carries, through the kit and the port', () => {
    const pat = patternIn('4/4');
    const bar = pat.bars[0];
    bar.k[0] = 2;
    bar.hf[1] = 1;
    bar.s[2] = 4;
    bar.h[3] = 3;
    bar.r[4] = 2;
    bar.c[5] = 1;
    bar.t1[6] = 2;
    bar.p1[7] = 2;
    bar.p2[8] = 1;
    const hit = vi.fn<MidiSink['hit']>();
    const { audio } = playOneBar(pat, { click: false }, { hit });
    for (const fn of [audio.kick, audio.snare, audio.ride, audio.crash, audio.tom])
      expect(fn).toHaveBeenCalledTimes(1);
    expect(audio.hat).toHaveBeenCalledTimes(2); // the foot chick and the open hat
    expect(audio.perc).toHaveBeenCalledTimes(2);
    expect(hit.mock.calls.map(([note]) => note)).toEqual([
      MIDI_MAP.k,
      MIDI_MAP.hf,
      MIDI_MAP.sCross,
      MIDI_MAP.hOpen,
      MIDI_MAP.rBell,
      MIDI_MAP.c,
      MIDI_MAP.t1,
      expect.any(Number),
      expect.any(Number),
    ]);
  });

  it('paints only the latest due step, and stops painting when stopped', () => {
    const { t, cb } = drive(snapshot(patternIn('4/4')), 0.6, true);
    expect(cb.onPaint).toHaveBeenCalled();
    const last = cb.onPaint.mock.calls.at(-1)?.[0] as { slot: number };
    expect(last.slot).toBeGreaterThan(0);
    t.stop();
    expect(t.playing).toBe(false);
    expect(cb.onStop).toHaveBeenCalledTimes(1);
  });

  it('keeps playing through a change of arrangement', () => {
    const a = twoBarPattern();
    const snap = snapshot(a, { click: false });
    const { t, step, audio } = drive(snap, 0.5);
    snap.arrangement = ['A', 'A'];
    t.resync();
    const before = audio.kick.mock.calls.length;
    for (let i = 0; i < 200; i++) step(0.02);
    expect(t.playing).toBe(true);
    expect(audio.kick.mock.calls.length).toBeGreaterThan(before);
    t.stop();
    t.resync(); // a no-op once stopped
    expect(t.playing).toBe(false);
  });

  describe('Humanise', () => {
    const hats = () => {
      const p = patternIn('4/4');
      p.bars[0].h = p.bars[0].h.map(() => 1);
      return p;
    };
    /** The hat times of a run, as offsets from the step each was written on. */
    const nudges = (audio: ReturnType<typeof fakeAudio>['audio'], from = 0) =>
      audio.hat.mock.calls
        .map(([when]) => (when as number) - 0.08)
        .map((t, n) => Math.round((t - (from + n) * 0.125) * 1e9) / 1e9);

    it('replays the same performance from Play, and reseeds the sampler from the same seed', () => {
      const snap = snapshot(hats(), { click: false, humanise: { amount: 100, seed: 7 } });
      const one = drive(snap, 1.9);
      const two = drive(snap, 1.9);
      expect(one.audio.reseed).toHaveBeenCalledWith(7);
      expect(nudges(one.audio)).toEqual(nudges(two.audio));
      expect(nudges(one.audio).some((x) => x !== 0)).toBe(true);
    });

    it('takes up a new seed at the top of the next pass, not mid-pass', () => {
      const snap = snapshot(hats(), { click: false, humanise: { amount: 100, seed: 7 } });
      const run = drive(snap, 0);
      while (run.ctx.currentTime < 1) run.step(0.02);
      snap.humanise = { amount: 100, seed: 8 }; // 🎲 New take, halfway through the bar
      while (run.ctx.currentTime < 3.9) run.step(0.02);

      const seven = drive(
        snapshot(hats(), { click: false, humanise: { amount: 100, seed: 7 } }),
        1.9
      );
      const eight = drive(
        snapshot(hats(), { click: false, humanise: { amount: 100, seed: 8 } }),
        1.9
      );
      const heard = nudges(run.audio);
      expect(heard.slice(0, 16)).toEqual(nudges(seven.audio).slice(0, 16));
      expect(heard.slice(16, 32)).toEqual(nudges(eight.audio).slice(0, 16));
      expect(run.audio.reseed.mock.calls).toEqual([[7], [8]]);
    });

    it('plays the grid at Amount 0', () => {
      const { audio } = drive(
        snapshot(hats(), { click: false, humanise: { amount: 0, seed: 7 } }),
        1.9
      );
      expect(nudges(audio).every((x) => x === 0)).toBe(true);
    });
  });

  it('knows which beat a step falls on', () => {
    expect(beatOf(patternIn('4/4'), 5)).toBe(2);
    expect(beatOf(patternIn('7/8'), 9)).toBe(3);
    expect(beatOf(null, 15)).toBe(4);
  });
});

describe('laneGain (D23)', () => {
  const mix = { k: 0.8, s: 1.1, h: 0.5 };

  it('is the fader with nothing soloed or muted', () => {
    expect(laneGain({ mix, mute: {}, laneSolo: {} }, 'k')).toBe(0.8);
  });

  it('opens only the soloed lane’s gain when the snare is soloed', () => {
    const snap = { mix, mute: {}, laneSolo: { s: true } };
    expect(['k', 's', 'h'].map((lane) => laneGain(snap, lane))).toEqual([0, 1.1, 0]);
  });

  it('restores the mix when every solo is cleared', () => {
    const snap = { mix, mute: {}, laneSolo: { s: false, k: false } };
    expect(['k', 's', 'h'].map((lane) => laneGain(snap, lane))).toEqual([0.8, 1.1, 0.5]);
  });

  it('is silent on a lane soloed and muted', () => {
    expect(laneGain({ mix, mute: { s: true }, laneSolo: { s: true } }, 's')).toBe(0);
  });
});

describe('soloInPlay (D23)', () => {
  it('drops a solo on a lane the pattern does not play, so it cannot silence the kit', () => {
    const solo = soloInPlay({ p1: true }, ['k', 's', 'h']);
    expect(solo).toEqual({});
    expect(laneGain({ mix: {}, mute: {}, laneSolo: solo }, 'k')).toBe(1);
  });

  it('keeps solos on lanes the pattern plays, and drops ones turned off', () => {
    expect(soloInPlay({ s: true, h: false, p1: true }, ['k', 's', 'h', 'p1'])).toEqual({
      s: true,
      p1: true,
    });
  });
});

describe('onStep (the 3D drummer handoff)', () => {
  it('is called once per count-in step, with no notes and no bar, but the right meter and slot', () => {
    const pat = patternIn('3/4');
    const onStep = vi.fn();
    const snap = snapshot(pat, { countIn: 1, click: false });
    const f = fakeAudio();
    const t = new Transport(f.engine, {
      getSnapshot: () => snap,
      onBpm: vi.fn(),
      onLoop: vi.fn(),
      onPaint: vi.fn(),
      onStop: vi.fn(),
      onStep,
    });
    t.start();
    // 3/4 at 120bpm: a bar is 1.5s; drive through the whole count-in bar
    while (f.ctx.currentTime < 1.6) {
      f.ctx.currentTime += 0.02;
      vi.advanceTimersByTime(25);
    }
    t.stop();

    const countSteps = (onStep.mock.calls.map(([step]) => step) as ScheduledStep[]).filter(
      (s) => s.count
    );
    expect(countSteps.length).toBe(stepsOf(meterOf('3/4')));
    for (const s of countSteps) {
      expect(s.notes).toEqual([]);
      expect(s.bar).toBeNull();
      // the bar the band comes in on
      expect(s.next).toBe(pat.bars[0]);
      expect(s.meter).toEqual(meterOf('3/4'));
    }
    // and how much of the count is left, counting down to the last step
    expect(countSteps.map((s) => s.countLeft)).toEqual(
      Array.from({ length: stepsOf(meterOf('3/4')) }, (_, i) => stepsOf(meterOf('3/4')) - i)
    );
    // the count-in steps are numbered along the grid, one per slot, in order
    expect(countSteps.map((s) => s.slot)).toEqual(
      Array.from({ length: stepsOf(meterOf('3/4')) }, (_, i) => i)
    );
  });

  it('reports every note’s `when` exactly as what the lane channel (playIn) received, for a real bar', () => {
    const pat = patternIn('4/4');
    const bar = pat.bars[0];
    bar.k[0] = 1;
    bar.s[4] = 2;
    bar.h[2] = 1;
    const onStep = vi.fn();
    const snap = snapshot(pat, { click: false });
    const f = fakeAudio();
    const t = new Transport(f.engine, {
      getSnapshot: () => snap,
      onBpm: vi.fn(),
      onLoop: vi.fn(),
      onPaint: vi.fn(),
      onStop: vi.fn(),
      onStep,
    });
    t.start();
    const dur = 60 / snap.bpm / 4;
    const steps = stepsOf(meterOf('4/4'));
    while (f.ctx.currentTime + 0.13 < 0.08 + steps * dur - dur / 2) {
      f.ctx.currentTime += 0.02;
      vi.advanceTimersByTime(25);
    }
    t.stop();

    const playInWhens = f.audio.playIn.mock.calls.map(([lane, , when]) => ({ lane, when }));
    const real = onStep.mock.calls.map(([step]) => step as ScheduledStep).filter((s) => !s.count);
    const reportedNotes = real.flatMap((s) =>
      s.notes.map((n) => ({ lane: n.voice.lane, when: n.when }))
    );

    // every note playIn actually played shows up in onStep's notes at the same lane and time
    for (const played of playInWhens) {
      expect(reportedNotes.some((n) => n.lane === played.lane && n.when === played.when)).toBe(
        true
      );
    }
    // and onStep reports exactly the three written notes (kick, snare, hat), nothing invented
    expect(reportedNotes.map((n) => n.lane).sort()).toEqual(['h', 'k', 's']);
  });

  it('reports the real grid: bar, slot and meter on each step, and null on count-in', () => {
    const pat = patternIn('4/4');
    const onStep = vi.fn();
    const snap = snapshot(pat, { click: false });
    const f = fakeAudio();
    const t = new Transport(f.engine, {
      getSnapshot: () => snap,
      onBpm: vi.fn(),
      onLoop: vi.fn(),
      onPaint: vi.fn(),
      onStop: vi.fn(),
      onStep,
    });
    t.start();
    while (f.ctx.currentTime < 0.5) {
      f.ctx.currentTime += 0.02;
      vi.advanceTimersByTime(25);
    }
    t.stop();
    const first = onStep.mock.calls[0][0] as ScheduledStep;
    expect(first.count).toBeUndefined();
    expect(first.bar).toBe(pat.bars[0]);
    expect(first.slot).toBe(0);
    expect(first.meter).toEqual(meterOf('4/4'));
  });

  it('tells the drummer the next section’s meter and weight, and when each step was scheduled', () => {
    const A = patternIn('7/8', { ...ROCK_ATTRS, weight: 0 });
    const B = patternIn('4/4', { ...ROCK_ATTRS, weight: 1 });
    const f = fakeAudio();
    const seen: { step: ScheduledStep; now: number }[] = [];
    const t = new Transport(f.engine, {
      getSnapshot: () => snapshot(A, { patterns: { A, B }, arrangement: ['A', 'B'], click: false }),
      onBpm: vi.fn(),
      onLoop: vi.fn(),
      onPaint: vi.fn(),
      onStop: vi.fn(),
      onStep: (step) => seen.push({ step, now: f.ctx.currentTime }),
    });
    t.start();
    while (f.ctx.currentTime < 1) {
      f.ctx.currentTime += 0.02;
      vi.advanceTimersByTime(25);
    }
    t.stop();
    const inA = seen.filter((s) => s.step.meter.label === '7/8');
    expect(inA.length).toBeGreaterThan(0);
    for (const { step, now } of inA) {
      expect(step.weight).toBe(0);
      expect(step.nextMeter).toEqual(meterOf('4/4'));
      expect(step.nextWeight).toBe(1);
      expect(step.at).toBe(now);
    }
  });

  it('hands over `next` as the bar the arrangement plays after this one, wrapping at the end', () => {
    const pat = twoBarPattern(); // two bars of 4/4, arrangement ['A']
    const onStep = vi.fn();
    const snap = snapshot(pat, { click: false });
    const f = fakeAudio();
    const t = new Transport(f.engine, {
      getSnapshot: () => snap,
      onBpm: vi.fn(),
      onLoop: vi.fn(),
      onPaint: vi.fn(),
      onStop: vi.fn(),
      onStep,
    });
    t.start();
    // 120bpm, 4/4: one bar is 2s. Drive through the start of bar 1's last step and
    // into bar 2 (the wrap back to bar 1) so both boundary cases are observed.
    while (f.ctx.currentTime < 4.3) {
      f.ctx.currentTime += 0.02;
      vi.advanceTimersByTime(25);
    }
    t.stop();

    const real = onStep.mock.calls.map(([step]) => step as ScheduledStep).filter((s) => !s.count);
    const firstBarStep = real.find((s) => s.bar === pat.bars[0] && s.slot === 0);
    const secondBarStep = real.find((s) => s.bar === pat.bars[1] && s.slot === 0);
    const lastStepOfSecondBar = real.find((s) => s.bar === pat.bars[1] && s.slot === 15);

    expect(firstBarStep?.next).toBe(pat.bars[1]); // bar 1 looks ahead to bar 2
    expect(secondBarStep?.next).toBe(pat.bars[0]); // bar 2 looks ahead to the wrap back to bar 1
    expect(lastStepOfSecondBar?.next).toBe(pat.bars[0]); // still bar 1, at the very end of the loop
  });

  it('still hands the drummer a muted lane’s notes: the speakers skip it, the drummer plays on', () => {
    const pat = patternIn('4/4');
    pat.bars[0].k[0] = 1;
    pat.bars[0].s[0] = 1;
    const onStep = vi.fn();
    const snap = snapshot(pat, { click: false, mute: { k: true } });
    const f = fakeAudio();
    const t = new Transport(f.engine, {
      getSnapshot: () => snap,
      onBpm: vi.fn(),
      onLoop: vi.fn(),
      onPaint: vi.fn(),
      onStop: vi.fn(),
      onStep,
    });
    t.start();
    while (f.ctx.currentTime < 0.3) {
      f.ctx.currentTime += 0.02;
      vi.advanceTimersByTime(25);
    }
    t.stop();

    expect(f.audio.playIn.mock.calls.map(([lane]) => lane)).toEqual(['s']); // the kick is muted
    const real = onStep.mock.calls.map(([step]) => step as ScheduledStep).filter((s) => !s.count);
    const firstStep = real.find((s) => s.slot === 0);
    expect(firstStep?.notes.map((n) => n.voice.lane).sort()).toEqual(['k', 's']);
  });

  it('still hands the drummer the lanes a solo silences', () => {
    const pat = patternIn('4/4');
    pat.bars[0].k[0] = 1;
    pat.bars[0].s[0] = 1;
    const onStep = vi.fn();
    const snap = snapshot(pat, { click: false, laneSolo: { k: true } });
    const f = fakeAudio();
    const t = new Transport(f.engine, {
      getSnapshot: () => snap,
      onBpm: vi.fn(),
      onLoop: vi.fn(),
      onPaint: vi.fn(),
      onStop: vi.fn(),
      onStep,
    });
    t.start();
    while (f.ctx.currentTime < 0.3) {
      f.ctx.currentTime += 0.02;
      vi.advanceTimersByTime(25);
    }
    t.stop();

    expect(f.audio.playIn.mock.calls.map(([lane]) => lane)).toEqual(['k']); // the solo silences the snare
    const real = onStep.mock.calls.map(([step]) => step as ScheduledStep).filter((s) => !s.count);
    const firstStep = real.find((s) => s.slot === 0);
    expect(firstStep?.notes.map((n) => n.voice.lane).sort()).toEqual(['k', 's']);
  });
});

describe('Transport — sections in different meters (11-e-ii-a)', () => {
  // 120 bpm: a sixteenth is 0.125s, so a bar of 7/8 (14 steps) is 1.75s and 4/4 is 2s
  const STEP = 0.125;

  function mixed(): { A: Pattern; B: Pattern } {
    const A = patternIn('7/8');
    A.bars[0].k[0] = 1;
    const B = patternIn('4/4');
    B.bars[0].s[0] = 2;
    return { A, B };
  }

  it('plays each section for its own bar length, so the loop comes round at their sum', () => {
    const { A, B } = mixed();
    const { cb } = drive(
      snapshot(A, { patterns: { A, B }, arrangement: ['A', 'B'], click: false }),
      4
    );
    expect(cb.onLoop.mock.calls[0][1]).toBeCloseTo(0.08 + (14 + 16) * STEP, 6);
  });

  it('counts in a bar of the first section played, in its meter, not A’s', () => {
    const { A, B } = mixed();
    // the arrangement opens on the 4/4 B: four clicks over 16 steps, then the snare
    const { cb, audio } = drive(
      snapshot(A, { patterns: { A, B }, arrangement: ['B', 'A'], countIn: 1, click: false }),
      1.9
    );
    expect(cb.onDownbeat.mock.calls[0][0]).toBeCloseTo(0.08 + 16 * STEP, 6);
    expect(audio.click).toHaveBeenCalledTimes(4);
    expect(audio.snare).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the count-in plays only clicks
  });

  it('counts a restart in on every pulse when the setting is None', () => {
    const pat = patternIn('4/4');
    const { audio, engine, ctx } = fakeAudio();
    const t = new Transport(engine, {
      getSnapshot: () => snapshot(pat, { countIn: 0, click: false }),
      onBpm: vi.fn(),
      onLoop: vi.fn(),
      onPaint: vi.fn(),
      onStop: vi.fn(),
    });
    t.start({ countIn: 1 });
    while (ctx.currentTime < 1.9) {
      ctx.currentTime += 0.02;
      vi.advanceTimersByTime(25);
    }
    t.stop();
    expect(audio.click.mock.calls.map(([, strong]) => strong)).toEqual([true, false, false, false]);
  });

  it('counts in 7/8 on its long-short pulse when the 7/8 section leads', () => {
    const { A, B } = mixed();
    const { cb, audio } = drive(
      snapshot(B, { patterns: { A, B }, arrangement: ['A', 'B'], countIn: 1, click: false }),
      1.7
    );
    expect(cb.onDownbeat.mock.calls[0][0]).toBeCloseTo(0.08 + 14 * STEP, 6);
    // 2 + 2 + 3 eighths: clicks on steps 0, 4 and 8, the first strong
    expect(
      audio.click.mock.calls.map(([t, strong]) => [Math.round((t - 0.08) / STEP), strong])
    ).toEqual([
      [0, true],
      [4, false],
      [8, false],
    ]);
  });
});

describe('a section at a tempo ratio (11-e-ii-g)', () => {
  /** Every step scheduled while the clock runs to `seconds`. */
  function stepsUpTo(snap: TransportSnapshot, seconds: number): ScheduledStep[] {
    const onStep = vi.fn<(s: ScheduledStep) => void>();
    const f = fakeAudio();
    const t = new Transport(f.engine, {
      getSnapshot: () => snap,
      onBpm: vi.fn(),
      onLoop: vi.fn(),
      onPaint: vi.fn(),
      onStop: vi.fn(),
      onStep,
    });
    t.start();
    while (f.ctx.currentTime < seconds) {
      f.ctx.currentTime += 0.02;
      vi.advanceTimersByTime(25);
    }
    t.stop();
    return onStep.mock.calls.map(([s]) => s);
  }

  it('plays its steps at the break tempo times its ratio, and back at the next section', () => {
    const A = patternIn('4/4');
    const B: Pattern = { ...patternIn('4/4'), tempoRatio: 2 };
    // 120: a sixteenth of A is 0.125 s, of B at ×2 0.0625 s; A, B, A is 2 + 1 + 2 s
    const steps = stepsUpTo(
      snapshot(A, { patterns: { A, B }, arrangement: ['A', 'B', 'A'], click: false }),
      4.5
    );
    const durs = steps.slice(0, 48).map((s) => s.dur);
    expect(durs.slice(0, 16).every((d) => d === 0.125)).toBe(true);
    expect(durs.slice(16, 32).every((d) => d === 0.0625)).toBe(true);
    expect(durs.slice(32, 48).every((d) => d === 0.125)).toBe(true);
    // B starts where A's bar ends, and the second A where B's shorter bar ends
    expect(steps[16].t).toBeCloseTo(0.08 + 2, 9);
    expect(steps[32].t).toBeCloseTo(0.08 + 3, 9);
  });

  it('counts in at the speed of the section it leads into', () => {
    const A: Pattern = { ...patternIn('4/4'), tempoRatio: 0.5 };
    const steps = stepsUpTo(snapshot(A, { countIn: 1, click: false }), 4.5);
    const count = steps.filter((s) => s.count);
    expect(count).toHaveLength(16);
    // ×½ at 120 is 60: a sixteenth of 0.25 s, the band in after 4 s
    expect(count.every((s) => s.dur === 0.25)).toBe(true);
    expect(steps.find((s) => !s.count)?.t).toBeCloseTo(0.08 + 4, 9);
  });
});

describe('playableSlots and skipSlot — where Play starts and a skip lands', () => {
  const A = patternIn('4/4');
  const B = patternIn('4/4');

  it('lists every slot, or under one section only the slots that play it', () => {
    expect(playableSlots(['A', 'A', 'B', 'A'], { A, B }, null)).toEqual([0, 1, 2, 3]);
    expect(playableSlots(['A', 'A', 'B', 'A'], { A, B }, 'B')).toEqual([2]);
    // a slot whose section is not there plays nothing
    expect(playableSlots(['A', 'C'], { A, B }, null)).toEqual([0]);
    expect(playableSlots(['A'], { A, B }, 'B')).toEqual([]);
  });

  it('goes forward to the next slot, round to the first after the last', () => {
    expect(skipSlot([0, 1, 2], 0, 0, 1)).toBe(1);
    expect(skipSlot([0, 1, 2], 2, 3, 1)).toBe(0);
    // under one section, over the slots that do not play
    expect(skipSlot([1, 4], 1, 0, 1)).toBe(4);
  });

  it('goes back to the top of the slot once into it, and to the one before from its top', () => {
    expect(skipSlot([0, 1, 2], 2, 1, -1)).toBe(2);
    expect(skipSlot([0, 1, 2], 2, 0, -1)).toBe(1);
    // the first slot's top is as far back as it goes
    expect(skipSlot([0, 1, 2], 0, 0, -1)).toBe(0);
  });

  it('goes from a slot that does not play to the next or the one before that does', () => {
    // under "A only", cued on the B at slot 2 from its chapter
    expect(skipSlot([0, 1, 4], 2, 0, 1)).toBe(4);
    expect(skipSlot([0, 1, 4], 2, 0, -1)).toBe(1);
    expect(skipSlot([2, 3], 0, 0, 1)).toBe(2);
    // round past the last, and no further back than the first
    expect(skipSlot([0, 1], 3, 0, 1)).toBe(0);
    expect(skipSlot([2, 3], 0, 0, -1)).toBe(2);
  });

  it('has nowhere to go when nothing plays, or the section playing is not in the arrangement', () => {
    expect(skipSlot([], 5, 0, 1)).toBeNull();
    expect(skipSlot([0, 1], -1, 0, 1)).toBeNull();
    expect(skipSlot([0, 1], -1, 2, -1)).toBeNull();
  });

  it('cues Play on the slot asked for, or the next that plays, round', () => {
    expect(playableFrom([0, 1, 4], 1)).toBe(1);
    expect(playableFrom([0, 1, 4], 2)).toBe(4);
    expect(playableFrom([0, 1], 3)).toBe(0);
    expect(playableFrom([], 0)).toBeNull();
  });
});

describe('Transport — cued starts and seeking', () => {
  /** Two sections that tell themselves apart: A on 3/4, B on 4/4. */
  function twoSections() {
    const A = patternIn('3/4');
    A.bars[0].k[0] = 1;
    const B = patternIn('4/4');
    B.bars[0].s[4] = 2;
    return { A, B };
  }

  function make(over: Partial<TransportSnapshot> = {}) {
    const { A, B } = twoSections();
    const f = fakeAudio();
    const onStep = vi.fn<(step: ScheduledStep) => void>();
    const snap = snapshot(A, {
      patterns: { A, B },
      arrangement: ['A', 'B'],
      click: false,
      ...over,
    });
    const t = new Transport(f.engine, {
      getSnapshot: () => snap,
      onBpm: vi.fn(),
      onLoop: vi.fn(),
      onPaint: vi.fn(),
      onStop: vi.fn(),
      onStep,
    });
    const run = (until: number) => {
      while (f.ctx.currentTime < until) {
        f.ctx.currentTime += 0.02;
        vi.advanceTimersByTime(25);
      }
    };
    return { t, A, B, onStep, run };
  }

  it('starts at the top of the slot it was cued at, not the top of the arrangement', () => {
    const { t, B, onStep } = make();
    t.start({ from: 1 });
    expect(t.cursor()).toEqual({ slot: 1, barIdx: 0 });
    const first = onStep.mock.calls[0][0];
    expect(first.bar).toBe(B.bars[0]);
    t.stop();
  });

  it('counts in a bar of the section it leads into, in that section’s meter', () => {
    const { t, onStep, run } = make({ countIn: 1 });
    t.start({ from: 1 });
    // B is in 4/4 at 120: the count-in bar is 2s; A's 3/4 would be 1.5s
    run(1.9);
    t.stop();
    const counted = onStep.mock.calls.map(([s]) => s).filter((s) => s.count);
    expect(counted).toHaveLength(stepsOf(meterOf('4/4')));
  });

  it('jumps to the top of another slot on the next step while it plays', () => {
    const { t, B, onStep, run } = make();
    t.start();
    run(0.3);
    expect(t.cursor()?.slot).toBe(0);
    onStep.mockClear();
    expect(t.seekSlot(1)).toBe(true);
    expect(t.cursor()).toEqual({ slot: 1, barIdx: 0 });
    run(0.6);
    expect(onStep.mock.calls[0][0].bar).toBe(B.bars[0]);
    expect(onStep.mock.calls[0][0].slot).toBe(0);
    t.stop();
  });

  it('puts the cursor in the bar being heard, not the one the look-ahead has reached', () => {
    const { t, B, onStep, run } = make();
    t.start();
    // A is a bar of 3/4 at 120 from 0.08s: B starts at 1.58s, scheduled from ~1.45s
    run(1.5);
    // the scheduler is into B already; the speakers are still in A
    expect(onStep.mock.calls.some(([st]) => st.bar === B.bars[0])).toBe(true);
    expect(t.cursor()).toEqual({ slot: 0, barIdx: 0 });
    run(1.7);
    expect(t.cursor()).toEqual({ slot: 1, barIdx: 0 });
    t.stop();
  });

  it('counts a seek during the count-in in the meter of the section it now leads into', () => {
    const { t, B, onStep, run } = make({ countIn: 1 });
    // a count-in into A's 3/4, then a skip to B's 4/4 a few clicks in
    t.start();
    run(0.4);
    const before = onStep.mock.calls.filter(([st]) => st.count).length;
    expect(before).toBeGreaterThan(0);
    expect(before).toBeLessThan(stepsOf(meterOf('3/4')));
    onStep.mockClear();
    t.seekSlot(1);
    run(3);
    const steps = onStep.mock.calls.map(([st]) => st);
    const counted = steps.filter((st) => st.count);
    // a whole bar of 4/4 counted from its 1, and B's first bar straight after it
    expect(counted.map((st) => st.slot)).toEqual(
      Array.from({ length: stepsOf(meterOf('4/4')) }, (_, i) => i)
    );
    expect(steps[counted.length].bar).toBe(B.bars[0]);
    t.stop();
  });

  it('cannot seek, and has no cursor, while stopped', () => {
    const { t } = make();
    expect(t.cursor()).toBeNull();
    expect(t.seekSlot(1)).toBe(false);
  });

  it('passes over a slot that does not play, under one section only', () => {
    const { t } = make({ arrangement: ['A', 'B', 'A'], solo: 'A' });
    t.start();
    // slot 1 is B, which "A only" skips: the seek lands on the next slot that plays
    t.seekSlot(1);
    expect(t.cursor()?.slot).toBe(2);
    t.stop();
  });
});
