import { describe, expect, it } from 'vitest';

import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import { BUZZ, CHINA, FLAM, HALF_OPEN, RIMSHOT } from '@/lib/app/breaks/lanes';
import { METERS } from '@/lib/app/breaks/meter';
import { LEVELS } from '@/lib/app/breaks/perform';
import type { Voice } from '@/lib/app/breaks/perform';
import {
  StrokeTimeline,
  contactOf,
  gridHits,
  scheduledHits,
  strengthOf,
} from '@/lib/app/breaks/drummer/timeline';
import type { Bar, LaneKey } from '@/lib/app/breaks/types';

const N = 16;
const M44 = METERS['4/4'];

function bar(overrides: Partial<Record<LaneKey, number[]>> = {}): Bar {
  const zeros = () => Array<number>(N).fill(0);
  return {
    k: zeros(),
    s: zeros(),
    h: zeros(),
    r: zeros(),
    c: zeros(),
    t1: zeros(),
    t2: zeros(),
    t3: zeros(),
    hf: zeros(),
    p1: zeros(),
    p2: zeros(),
    ...overrides,
  };
}

function hitAt(step: number, hits: Partial<Record<LaneKey, number>>): Bar {
  const b = bar();
  for (const [lane, v] of Object.entries(hits) as [LaneKey, number][]) b[lane][step] = v;
  return b;
}

function voice(lane: LaneKey, extra: Partial<Voice> = {}): Voice {
  return { lane, note: 0, velocity: 1, offset: 0, ...extra };
}

describe('strengthOf', () => {
  it('reads the base table directly when no velocity is given', () => {
    expect(strengthOf('k', 2)).toBe(0.92); // kick accent
    expect(strengthOf('s', RIMSHOT)).toBe(1); // BASE.s[5] — rimshot is the loudest snare stroke
    expect(strengthOf('s', 4)).toBe(0.22); // cross-stick, played small
  });

  it('falls back to the lane’s "hit" value for a value the base table has no entry for', () => {
    // BASE.k has only indices 0..2; index 5 is undefined, so it falls back to BASE.k[1]
    expect(strengthOf('k', 5)).toBe(0.6);
  });

  it('shades the base strength by velocity relative to the written level, clamped to 0.6x–1.3x', () => {
    const base = 0.55; // BASE.s[2]
    const level = LEVELS.s[2]; // 0.78

    // velocity equal to the level: no shading
    expect(strengthOf('s', 2, level)).toBeCloseTo(base, 9);

    // velocity far above the level: shade clamped to 1.3, strength = base * 1.3^2 (capped at 1)
    expect(strengthOf('s', 2, level * 3)).toBeCloseTo(Math.min(1, base * 1.3 * 1.3), 9);

    // velocity far below the level: shade clamped to 0.6
    expect(strengthOf('s', 2, 0)).toBeCloseTo(base * 0.6 * 0.6, 9);
  });

  it('ignores velocity entirely when the lane/value has no level (silence)', () => {
    expect(strengthOf('s', 0, 0.9)).toBe(strengthOf('s', 0));
  });
});

describe('contactOf', () => {
  it('reads the snare articulations: cross-stick, rimshot, everything else centre', () => {
    expect(contactOf('s', 4)).toBe('cross');
    expect(contactOf('s', RIMSHOT)).toBe('rim');
    expect(contactOf('s', 2)).toBe('centre');
    expect(contactOf('s', FLAM)).toBe('centre');
  });

  it('plays the hat edge for an accent or an open note, centre otherwise', () => {
    expect(contactOf('h', 2)).toBe('edge'); // accent
    expect(contactOf('h', 3)).toBe('edge'); // open
    expect(contactOf('h', 1)).toBe('centre'); // closed
    expect(contactOf('h', HALF_OPEN)).toBe('centre');
  });

  it('plays the ride bell only for value 2', () => {
    expect(contactOf('r', 2)).toBe('bell');
    expect(contactOf('r', 1)).toBe('centre');
  });

  it('plays the china edge on the crash lane, centre for every other cymbal there', () => {
    expect(contactOf('c', CHINA)).toBe('edge');
    expect(contactOf('c', 1)).toBe('centre');
  });

  it('is always centre for lanes with no articulation of their own', () => {
    expect(contactOf('k', 2)).toBe('centre');
    expect(contactOf('t1', 1)).toBe('centre');
    expect(contactOf('p1', 2)).toBe('centre');
  });
});

describe('gridHits', () => {
  it('produces one hit per sounding lane that has an assigned hand, at the given grid time', () => {
    // a lone closed hat (-> lead) plus a kick (-> kickFoot); nothing else
    const b = hitAt(3, { h: 1, k: 1 });
    const hits = gridHits(b, 3, 10.5);
    const byLane = new Map(hits.map((h) => [h.lane, h]));

    expect(hits).toHaveLength(2);
    expect(byLane.get('k')).toMatchObject({
      time: 10.5,
      limb: 'kickFoot',
      piece: 'kick',
      contact: 'centre',
      strength: strengthOf('k', 1),
      sure: false,
    });
    expect(byLane.get('h')).toMatchObject({
      time: 10.5,
      limb: 'lead',
      piece: 'hat',
      contact: 'centre',
      strength: strengthOf('h', 1),
      hat: 'closed',
      sure: false,
    });
  });

  it('marks an open hat note with hat: "open" and the edge contact', () => {
    const hits = gridHits(hitAt(0, { h: 3 }), 0, 0);
    expect(hits[0]).toMatchObject({ contact: 'edge', hat: 'open' });
  });

  it('drops a note from a lane that could not get a hand assigned', () => {
    // crash + ride + hat together: hat gets no hand (only two exist)
    const hits = gridHits(hitAt(0, { c: 1, r: 1, h: 1 }), 0, 0);
    expect(hits.map((h) => h.lane).sort()).toEqual(['c', 'r']);
  });

  it('plays nothing on an empty step', () => {
    expect(gridHits(bar(), 0, 0)).toEqual([]);
  });
});

describe('scheduledHits', () => {
  it('voices every note the transport handed it, on the limb sticking assigned', () => {
    const b = hitAt(2, { s: 2 }); // snare alone, no history -> 'other'
    const step: ScheduledStep = {
      t: 5,
      dur: 0.1,
      slot: 2,
      meter: M44,
      bar: b,
      next: null,
      notes: [{ voice: voice('s'), when: 5.01 }],
    };
    const hits = scheduledHits(step);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      time: 5.01,
      step: 5,
      limb: 'other',
      lane: 's',
      piece: 'snare',
      contact: 'centre',
      sure: true,
    });
  });

  it('plays a flam’s grace on the other hand from the note, at the grace strength, not the note’s', () => {
    const b = hitAt(2, { s: FLAM }); // snare alone -> 'other'; a flam also sets hands.grace = 'lead'
    const step: ScheduledStep = {
      t: 5,
      dur: 0.1,
      slot: 2,
      meter: M44,
      bar: b,
      next: null,
      notes: [
        { voice: voice('s', { velocity: 1 }), when: 5.02 },
        { voice: voice('s', { velocity: 1, ornament: 'grace', ghost: true }), when: 5.0 },
      ],
    };
    const hits = scheduledHits(step);
    expect(hits).toHaveLength(2);

    const main = hits.find((h) => h.time === 5.02);
    const grace = hits.find((h) => h.time === 5.0);
    expect(main?.limb).toBe('other');
    expect(grace?.limb).toBe('lead');
    expect(grace?.strength).toBeCloseTo(0.07, 9); // GRACE_STRENGTH, not strengthOf(...)
    expect(grace?.strength).not.toBe(main?.strength);
  });

  it('plays a buzz at the fixed buzz strength, regardless of the written velocity', () => {
    const b = hitAt(2, { s: BUZZ });
    const step: ScheduledStep = {
      t: 5,
      dur: 0.1,
      slot: 2,
      meter: M44,
      bar: b,
      next: null,
      notes: [{ voice: voice('s', { velocity: 1, ornament: 'buzz' }), when: 5.0 }],
    };
    const hit = scheduledHits(step)[0];
    expect(hit.strength).toBeCloseTo(0.03, 9); // BUZZ_STRENGTH
  });

  it('drops a note whose lane got no hand this step', () => {
    const b = hitAt(2, { c: 1, r: 1, h: 1 });
    const step: ScheduledStep = {
      t: 5,
      dur: 0.1,
      slot: 2,
      meter: M44,
      bar: b,
      next: null,
      notes: [{ voice: voice('h'), when: 5 }],
    };
    expect(scheduledHits(step)).toEqual([]);
  });

  describe('count-in steps', () => {
    it('clicks both hands’ sticks together on a pulse start, and nothing on any other step', () => {
      const pulseStep: ScheduledStep = {
        t: 1,
        dur: 0.1,
        slot: 0,
        count: true,
        meter: M44,
        bar: null,
        next: null,
        notes: [],
      };
      const hits = scheduledHits(pulseStep);
      expect(hits).toHaveLength(2);
      expect(hits.map((h) => h.limb).sort()).toEqual(['lead', 'other']);
      for (const h of hits) {
        expect(h).toMatchObject({ lane: 's', piece: 'sticks', contact: 'centre', sure: true });
      }

      const offPulseStep: ScheduledStep = { ...pulseStep, slot: 1 };
      expect(scheduledHits(offPulseStep)).toEqual([]);
    });
  });
});

describe('StrokeTimeline', () => {
  function step(over: Partial<ScheduledStep>): ScheduledStep {
    return {
      t: 0,
      dur: 0.1,
      slot: 0,
      meter: M44,
      bar: null,
      next: null,
      notes: [],
      ...over,
    };
  }

  it('records the clock from the most recently ingested step', () => {
    const tl = new StrokeTimeline();
    tl.ingest(step({ t: 3, dur: 0.2, slot: 4, meter: M44 }));
    expect(tl.clock).toEqual({ t: 3, dur: 0.2, slot: 4, meter: M44 });
  });

  it('merges the scheduled hit and the forecast of the rest of the bar, in time order', () => {
    const b = hitAt(5, { k: 1 });
    const tl = new StrokeTimeline();
    tl.ingest(step({ t: 0, dur: 0.1, slot: 0, bar: b, notes: [] }));
    const all = tl.all();
    const forecastKick = all.find((h) => h.lane === 'k');
    expect(forecastKick).toBeDefined();
    expect(forecastKick?.time).toBeCloseTo(0.5, 9); // step 5 at 0.1s/step
    expect(forecastKick?.sure).toBe(false);
    // time-ordered
    for (let i = 1; i < all.length; i++)
      expect(all[i].time).toBeGreaterThanOrEqual(all[i - 1].time);
  });

  it('forecasts into the next bar once the current bar runs out', () => {
    const current = bar(); // 16 empty steps
    const next = hitAt(0, { c: 1 });
    const tl = new StrokeTimeline();
    tl.ingest(step({ t: 0, dur: 0.1, slot: 15, bar: current, next, notes: [] }));
    const all = tl.all();
    const crash = all.find((h) => h.lane === 'c');
    expect(crash).toBeDefined();
    // one step (0.1s) after the current (last) step of the current bar
    expect(crash?.time).toBeCloseTo(0.1, 9);
  });

  it('drops every forecast hit when the step duration is zero, since none of them lies strictly after "now"', () => {
    const b = hitAt(5, { k: 1 });
    const tl = new StrokeTimeline();
    tl.ingest(step({ t: 1, dur: 0, slot: 0, bar: b, notes: [] }));
    expect(tl.all()).toEqual([]);
  });

  it('keeps scheduled hits for 3 seconds and prunes them once they age out', () => {
    const b = hitAt(0, { k: 1 });
    const tl = new StrokeTimeline();
    tl.ingest(
      step({
        t: 0,
        dur: 0.1,
        slot: 0,
        bar: b,
        notes: [{ voice: voice('k'), when: 0 }],
      })
    );
    expect(tl.all().some((h) => h.sure && h.lane === 'k')).toBe(true);

    // advance well past the 3s keep window
    tl.ingest(step({ t: 4, dur: 0.1, slot: 0, bar: bar(), notes: [] }));
    expect(tl.all().some((h) => h.sure && h.lane === 'k')).toBe(false);
  });

  it('filters forLimb to just that limb’s strokes', () => {
    const b = hitAt(0, { k: 1, h: 1 }); // kickFoot + lead
    const tl = new StrokeTimeline();
    tl.ingest(
      step({
        t: 0,
        dur: 0.1,
        slot: 0,
        bar: b,
        notes: [
          { voice: voice('k'), when: 0 },
          { voice: voice('h'), when: 0 },
        ],
      })
    );
    expect(tl.forLimb('kickFoot').every((h) => h.limb === 'kickFoot')).toBe(true);
    expect(tl.forLimb('lead').every((h) => h.limb === 'lead')).toBe(true);
    expect(tl.forLimb('kickFoot')).not.toHaveLength(0);
    expect(tl.forLimb('lead')).not.toHaveLength(0);
  });

  it('grows the percussion set when a bar carries p1/p2, and keeps it across reset()', () => {
    const tl = new StrokeTimeline();
    expect(tl.percussion.size).toBe(0);
    tl.ingest(step({ t: 0, bar: hitAt(0, { p1: 1 }), notes: [] }));
    expect(tl.percussion.has('perc1')).toBe(true);
    expect(tl.percussion.has('perc2')).toBe(false);

    tl.reset();
    expect(tl.all()).toEqual([]);
    expect(tl.clock).toBeNull();
    expect(tl.percussion.has('perc1')).toBe(true); // survives reset
  });

  it('also picks up percussion from the "next" bar', () => {
    const tl = new StrokeTimeline();
    tl.ingest(step({ t: 0, bar: bar(), next: hitAt(0, { p2: 1 }), notes: [] }));
    expect(tl.percussion.has('perc2')).toBe(true);
  });

  it('reset() clears every stroke and the clock', () => {
    const tl = new StrokeTimeline();
    tl.ingest(step({ t: 0, bar: hitAt(0, { k: 1 }), notes: [{ voice: voice('k'), when: 0 }] }));
    expect(tl.all().length).toBeGreaterThan(0);
    tl.reset();
    expect(tl.all()).toEqual([]);
    expect(tl.forLimb('lead')).toEqual([]);
    expect(tl.clock).toBeNull();
  });
});

describe('StrokeTimeline — sticking across the bar line', () => {
  /** Every step of `b`, from `t0`, every lit lane sounding on the grid. */
  function play(tl: StrokeTimeline, b: Bar, next: Bar | null, t0: number, dur: number) {
    for (let i = 0; i < N; i++) {
      const lanes = (Object.keys(b) as LaneKey[]).filter((l) => b[l][i]);
      tl.ingest({
        t: t0 + i * dur,
        dur,
        slot: i,
        meter: M44,
        bar: b,
        next,
        notes: lanes.map((l) => ({ voice: voice(l), when: t0 + i * dur })),
      });
    }
  }

  it('forecasts the next bar with the same hands it is then played with', () => {
    const dur = 0.1;
    const fill = bar({ s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2] });
    const crash = bar({ c: [1], r: [0, 0, 1, 0, 1, 0, 1, 0] });
    const tl = new StrokeTimeline();
    play(tl, fill, crash, 0, dur);
    const forecast = tl.all().filter((h) => h.time >= N * dur - 1e-9 && !h.sure);
    play(tl, crash, null, N * dur, dur);
    const played = tl.all().filter((h) => h.sure && h.time >= N * dur - 1e-9);
    expect(forecast.length).toBeGreaterThan(0);
    for (const f of forecast) {
      const p = played.find((h) => Math.abs(h.time - f.time) < 1e-9 && h.lane === f.lane);
      expect(p?.limb).toBe(f.limb);
    }
  });
});

describe('StrokeTimeline — percussion the drummer plays, and the part he does not', () => {
  function percStep(note: number): ScheduledStep {
    const b = bar({ p1: [1], s: [0, 0, 2] });
    return {
      t: 0,
      dur: 0.1,
      slot: 0,
      meter: M44,
      bar: b,
      next: null,
      notes: [{ voice: { ...voice('p1'), note }, when: 0 }],
    };
  }

  it('leaves a tambourine to the percussionist: no stroke, no piece on the kit', () => {
    const tl = new StrokeTimeline();
    tl.ingest(percStep(54)); // tambourine
    expect(tl.all().filter((h) => h.lane === 'p1')).toEqual([]);
    expect(tl.percussion.has('perc1')).toBe(false);
  });

  it('plays a cowbell on the kit', () => {
    const tl = new StrokeTimeline();
    tl.ingest(percStep(56)); // cowbell
    expect(tl.all().filter((h) => h.lane === 'p1').length).toBe(1);
    expect(tl.percussion.has('perc1')).toBe(true);
  });
});
