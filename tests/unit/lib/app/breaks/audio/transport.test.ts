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
  Transport,
  type TransportSnapshot,
  beatOf,
  isClickStep,
  maxBpm,
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
    click: true,
    clickSub: 4,
    countIn: 0,
    ramp: 0,
    ceiling: 200,
    mix: {},
    mute: {},
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
    onLoop: vi.fn<(loops: number) => void>(),
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
    expect(cb.onLoop).toHaveBeenCalledWith(1);
    // 120 + 4 would pass the 122 ceiling, so it stops there
    expect(cb.onBpm).toHaveBeenCalledWith(122);
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

  it('knows which beat a step falls on', () => {
    expect(beatOf(patternIn('4/4'), 5)).toBe(2);
    expect(beatOf(patternIn('7/8'), 9)).toBe(3);
    expect(beatOf(null, 15)).toBe(4);
  });
});
