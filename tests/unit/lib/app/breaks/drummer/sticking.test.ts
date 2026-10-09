import { describe, expect, it } from 'vitest';

import { FLAM, RIMSHOT, TOM_FLAM } from '@/lib/app/breaks/lanes';
import { assignBar, assignStep, type StepHands } from '@/lib/app/breaks/drummer/sticking';
import type { Bar, LaneKey } from '@/lib/app/breaks/types';

/**
 * Which limb plays each note — the rules documented at the top of
 * sticking.ts, exercised directly: priority order for cymbals, leftmost-x
 * for two drums, alternation (or side) for one drum with both hands free,
 * and the grace hand for a flam/drag.
 */

const N = 16;

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

/** A full-length bar with a single value placed at `step` on each named lane — everything else zero. */
function hitAt(step: number, hits: Partial<Record<LaneKey, number>>): Bar {
  const b = bar();
  for (const [lane, v] of Object.entries(hits) as [LaneKey, number][]) b[lane][step] = v;
  return b;
}

describe('assignStep — feet', () => {
  it('assigns the kick lane to kickFoot and the hat-foot lane to hatFoot, independent of the hands', () => {
    const b = bar({ k: [1, ...Array(N - 1).fill(0)], hf: [1, ...Array(N - 1).fill(0)] });
    const out = assignStep(b, 0, null);
    expect(out.k).toBe('kickFoot');
    expect(out.hf).toBe('hatFoot');
  });
});

describe('assignStep — cymbals', () => {
  it('gives the lead hand a lone cymbal, whichever one it is', () => {
    expect(assignStep(bar({ c: [1] }), 0, null).c).toBe('lead');
    expect(assignStep(bar({ r: [1] }), 0, null).r).toBe('lead');
    expect(assignStep(bar({ h: [1] }), 0, null).h).toBe('lead');
  });

  it('splits crash and ride by side when both sound together, rather than crossing the arms', () => {
    // crash on the left (x = -0.4), ride on the right (x = 0.6)
    const out = assignStep(bar({ c: [1], r: [1] }), 0, null);
    expect(out.c).toBe('other');
    expect(out.r).toBe('lead');
  });

  it('keeps the lead hand crossed over on the hats with the other on the snare', () => {
    const out = assignStep(bar({ h: [1], s: [2] }), 0, null);
    expect(out.h).toBe('lead');
    expect(out.s).toBe('other');
  });

  it('takes a crash straight after a ride note with the other hand, not the one just off the ride', () => {
    const b = bar({ r: [1, 0, 1, 0, 1, 0], s: [0, 0, 0, 0, 2, 0], c: [0, 0, 0, 0, 0, 1] });
    const steps = assignBar(b);
    expect(steps[4].r).toBe('lead');
    expect(steps[4].s).toBe('other');
    expect(steps[5].c).toBe('other');
  });

  it('gives ride the lead hand and hat the other hand, when both sound together (no crash)', () => {
    const out = assignStep(bar({ r: [1], h: [1] }), 0, null);
    expect(out.r).toBe('lead');
    expect(out.h).toBe('other');
  });

  it('leaves the third cymbal unplayed when crash, ride and hat all land on the same step', () => {
    const out = assignStep(bar({ c: [1], r: [1], h: [1] }), 0, null);
    expect(out.c).toBe('other');
    expect(out.r).toBe('lead');
    expect(out.h).toBeUndefined();
  });
});

describe('assignStep — two drums', () => {
  it('sends the leftmost drum (lower x) to the other hand and the rightmost to the lead', () => {
    // snare x = -0.07 (left of centre), tom2 x = 0.18 (right of centre)
    const out = assignStep(bar({ s: [2], t2: [1] }), 0, null);
    expect(out.s).toBe('other');
    expect(out.t2).toBe('lead');
  });

  it('keeps the other hand on the snare when the second drum is the tom just beside it', () => {
    // tom1 x = -0.12 is a touch left of the snare's -0.07: the lead hand reaches it over the snare
    const out = assignStep(bar({ s: [2], t1: [1] }), 0, null);
    expect(out.s).toBe('other');
    expect(out.t1).toBe('lead');
  });

  it('alternates a tom fill hand to hand, the other hand reaching the floor tom', () => {
    const b = bar({ t2: [1, 1, 0, 0], t3: [0, 0, 1, 1] });
    const hands = assignBar(b)
      .slice(0, 4)
      .map((s) => s.t2 ?? s.t3);
    for (let i = 1; i < 4; i++) expect(hands[i]).not.toBe(hands[i - 1]);
  });
});

describe('assignStep — one drum, both hands free', () => {
  it('plays a lead-side drum (x > 0.1) with the lead hand when there is no history', () => {
    // tom2's x = 0.18
    expect(assignStep(bar({ t2: [1] }), 0, null).t2).toBe('lead');
  });

  it('plays an other-side drum (x <= 0.1) with the other hand when there is no history', () => {
    // snare's x = -0.07
    expect(assignStep(bar({ s: [2] }), 0, null).s).toBe('other');
  });

  it('alternates from the previous step’s drum hand, overriding the drum’s own side', () => {
    const prevHadLead: StepHands = { s: 'lead' };
    // tom1 (x = -0.12, its own side would be 'other') — alternation should still flip to 'other'
    const out = assignStep(hitAt(5, { t1: 1 }), 5, prevHadLead);
    expect(out.t1).toBe('other');
  });

  it('alternates the other way when the previous drum hand was "other"', () => {
    const prevHadOther: StepHands = { t2: 'other' };
    const out = assignStep(hitAt(5, { s: 2 }), 5, prevHadOther);
    expect(out.s).toBe('lead');
  });

  it('ignores a cymbal hand in the previous step — only a DRUM hand counts for alternation', () => {
    // the other hand just played the hat: were that counted as its last drum, the
    // snare would alternate to the lead; instead it stays on the hand already there
    const prevCymbalOnly: StepHands = { h: 'other' };
    const out = assignStep(hitAt(5, { s: 2 }), 5, prevCymbalOnly);
    expect(out.s).toBe('other');
  });

  it('gives a drum to the free hand rather than the one just off a stroke across the kit', () => {
    const out = assignStep(hitAt(5, { t2: 1 }), 5, { h: 'lead' });
    expect(out.t2).toBe('other');
  });
});

describe('assignStep — one free hand, several drums', () => {
  it('gives the single free hand the snare, when the snare is among the drums', () => {
    // hat takes the lead hand, leaving only 'other' free for the drums
    const out = assignStep(bar({ h: [1], s: [2], t1: [1], t2: [1] }), 0, null);
    expect(out.h).toBe('lead');
    expect(out.s).toBe('other');
    // the toms get no hand at all — only two hands exist
    expect(out.t1).toBeUndefined();
    expect(out.t2).toBeUndefined();
  });

  it('gives the single free hand the first (leftmost) drum, when the snare is not among them', () => {
    const out = assignStep(bar({ h: [1], t1: [1], t2: [1] }), 0, null);
    expect(out.h).toBe('lead');
    // t1 (x = -0.12) sorts before t2 (x = 0.18)
    expect(out.t1).toBe('other');
    expect(out.t2).toBeUndefined();
  });
});

describe('assignStep — grace hand', () => {
  it('gives a snare flam’s grace to the other hand from the one playing the note', () => {
    // snare alone, no history: its own side is 'other' (x = -0.07)
    const out = assignStep(bar({ s: [FLAM] }), 0, null);
    expect(out.s).toBe('other');
    expect(out.grace).toBe('lead');
  });

  it('gives a tom flam’s grace to the other hand too', () => {
    // tom2 alone, no history: its own side is 'lead' (x = 0.18)
    const out = assignStep(bar({ t2: [TOM_FLAM] }), 0, null);
    expect(out.t2).toBe('lead');
    expect(out.grace).toBe('other');
  });

  it('does not set a grace hand for a plain hit or a rimshot', () => {
    expect(assignStep(bar({ s: [2] }), 0, null).grace).toBeUndefined();
    expect(assignStep(bar({ s: [RIMSHOT] }), 0, null).grace).toBeUndefined();
  });
});

describe('assignBar', () => {
  function barAt(step: number, values: Partial<Record<LaneKey, number[]>>): Bar {
    const b = bar();
    for (const [lane, vals] of Object.entries(values) as [LaneKey, number[]][]) {
      vals.forEach((v, i) => {
        b[lane][step + i] = v;
      });
    }
    return b;
  }

  it('assigns step 0 exactly as assignStep would with no history', () => {
    const b = barAt(0, { c: [1] });
    expect(assignBar(b)[0]).toEqual(assignStep(b, 0, null));
  });

  it('threads each step’s own computed hands into the next step, producing real alternation across a bar', () => {
    const b = bar();
    // three consecutive snare hits and nothing else: 'other', then alternate 'lead', then 'other'
    b.s[0] = 2;
    b.s[1] = 2;
    b.s[2] = 2;
    const steps = assignBar(b);
    expect(steps[0].s).toBe('other'); // no history — snare's own side
    expect(steps[1].s).toBe('lead'); // alternates from step 0
    expect(steps[2].s).toBe('other'); // alternates from step 1
  });

  it('caches per Bar object: the same array instance comes back for the same bar', () => {
    const b = bar({ c: [1] });
    const first = assignBar(b);
    const second = assignBar(b);
    expect(second).toBe(first);
  });

  it('does not share a cache between two different Bar objects with identical contents', () => {
    const a = bar({ c: [1] });
    const b = bar({ c: [1] });
    expect(assignBar(a)).not.toBe(assignBar(b));
    expect(assignBar(a)).toEqual(assignBar(b));
  });
});

describe('reach overrides alternation', () => {
  it('gives the far-left block to the other hand even when alternation says lead', async () => {
    const { assignBar } = await import('@/lib/app/breaks/drummer/sticking');
    const lanes = ['k', 's', 'h', 'r', 'c', 't1', 't2', 't3', 'hf', 'p1', 'p2'] as const;
    const bar = Object.fromEntries(lanes.map((l) => [l, new Array<number>(16).fill(0)])) as Record<
      (typeof lanes)[number],
      number[]
    >;
    // step 0: snare; step 1: the block, out past the other hand's side. Whichever hand
    // takes the snare, the block is the other hand's — the lead takes the snare to free it
    bar.s[0] = 2;
    bar.p2[1] = 1;
    const steps = assignBar(bar);
    expect(steps[0].s).toBe('lead');
    expect(steps[1].p2).toBe('other');
  });
});

describe('assignBar — from the bar before', () => {
  it('starts a bar with the hands where the bar before left them', () => {
    // a ride pattern, then a bar that opens on a lone tom: the lead hand is
    // over on the ride, so the floor tom beside it is its own
    const ride = bar({ r: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] });
    const tom = bar({ t3: [1] });
    expect(assignBar(tom, ride)[0].t3).toBe('lead');
  });

  it('gives the crash after a fill to the hand that did not play its last note', () => {
    const fill = bar({ s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2] });
    const last = assignBar(fill)[15].s;
    const crash = bar({ c: [1] });
    expect(assignBar(crash, fill)[0].c).not.toBe(last);
  });

  it('is deterministic per pair of bars, and caches it', () => {
    const a = bar({ s: [2, 2] });
    const b = bar({ c: [1] });
    expect(assignBar(b, a)).toBe(assignBar(b, a));
    expect(assignBar(b, a)).toEqual(assignBar(bar({ c: [1] }), bar({ s: [2, 2] })));
  });
});

describe('assignBar — the hands keep their jobs', () => {
  it('keeps a groove with ghost notes right hand on the hats, left on the snare, bar after bar', () => {
    // 8th hats; backbeats; ghosts on the "a" of 1, the "e" of 3 and a double before 4
    const b = bar({
      h: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      s: [0, 0, 0, 1, 2, 0, 0, 0, 0, 1, 0, 1, 2, 0, 0, 1],
    });
    for (const steps of [assignBar(b), assignBar(b, b)]) {
      steps.forEach((s) => {
        if (s.h) expect(s.h).toBe('lead');
        if (s.s) expect(s.s).toBe('other');
      });
    }
  });

  it('goes back to its job after a fill that ended with the hands swapped', () => {
    const fill = bar({ t3: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1] });
    const groove = bar({ h: [1, 0, 1, 0, 1, 0, 1, 0], s: [0, 0, 0, 0, 2, 0, 0, 0] });
    const steps = assignBar(groove, fill);
    expect(steps[2].h).toBe('lead');
    expect(steps[4].s).toBe('other');
  });

  it('leaves percussion unplayed rather than take the lead hand off the hats', () => {
    const out = assignStep(bar({ h: [1], p1: [1] }), 0, null);
    expect(out.h).toBe('lead');
    expect(out.p1).toBeUndefined();
  });

  it('plays percussion when no cymbal is keeping time', () => {
    const out = assignStep(bar({ p1: [1], s: [2] }), 0, null);
    expect(out.p1).toBe('lead');
    expect(out.s).toBe('other');
  });

  it('lifts off the hats through a tom fill on the lead side, rather than swap hands', () => {
    const out = assignStep(bar({ h: [1, 1], t3: [1, 1] }), 0, null);
    expect(out.h).toBeUndefined();
    expect(out.t3).toBe('lead');
  });

  it('splits the hands for a lone floor tom under the hats, rather than drop either', () => {
    const out = assignStep(bar({ h: [1], t3: [1] }), 0, null);
    expect(out.t3).toBe('lead');
    expect(out.h).toBe('other');
  });
});

describe('assignBar — sixteenth hats hand to hand', () => {
  const hats = bar({
    h: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    s: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
  });

  it('goes hand to hand, the snare on whichever hand’s go it is', () => {
    // R L R L, then R on the snare and L R L on the hats again
    const steps = assignBar(hats);
    expect(steps.slice(0, 8).map((s) => s.h ?? (s.s && `s:${s.s}`))).toEqual([
      'lead',
      'other',
      'lead',
      'other',
      's:lead',
      'other',
      'lead',
      'other',
    ]);
  });

  it('keeps going hand to hand through a backbeat written without its hat', () => {
    const b = bar({
      h: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
      s: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
    });
    const steps = assignBar(b);
    expect(steps[4].s).toBe('lead');
    expect(steps[12].s).toBe('lead');
    expect(steps[5].h).toBe('other');
  });

  it('plays a ghost on an off step with the other hand, the lead hand keeping the hat there', () => {
    const b = bar({
      h: Array<number>(N).fill(1),
      s: [0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0],
    });
    const steps = assignBar(b);
    expect(steps[7].s).toBe('other');
    expect(steps[7].h).toBe('lead');
    // and the run carries on hand to hand round it
    expect(steps[6].h).toBe('lead');
    expect(steps[8].h).toBe('lead');
    expect(steps[9].h).toBe('other');
  });

  it('plays a ghost on the lead’s go with the other hand, the lead hand staying on the hat', () => {
    const b = bar({
      h: Array<number>(N).fill(1),
      s: [0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 0],
    });
    const steps = assignBar(b);
    for (const i of [6, 10]) {
      expect(steps[i].s).toBe('other');
      expect(steps[i].h).toBe('lead');
    }
    // every hat but the backbeats' is played
    const dropped = steps.flatMap((s, i) => (s.h ? [] : [i]));
    expect(dropped).toEqual([4, 12]);
  });
});

describe('assignBar — sixteenth hats in one hand (oneHandHats)', () => {
  // Funky Drummer: the hats opening after 2, ghosts and accents round the backbeat
  const funky = bar({
    h: [1, 1, 1, 1, 1, 3, 1, 3, 1, 1, 1, 1, 1, 3, 1, 1],
    s: [0, 0, 0, 0, 3, 0, 0, 1, 0, 1, 0, 2, 3, 0, 0, 2],
    k: [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
  });

  it('keeps every hat in the lead hand and every snare note in the other', () => {
    const steps = assignBar(funky, null, false, true);
    expect(steps.map((s) => s.h)).toEqual(Array<string>(N).fill('lead'));
    const snares = steps.flatMap((s, i) => (funky.s[i] ? [s.s] : []));
    expect(snares).toEqual(Array<string>(snares.length).fill('other'));
  });

  it('is a different assignment from hand to hand, cached apart from it', () => {
    const two = assignBar(funky);
    const one = assignBar(funky, null, false, true);
    expect(two.some((s) => s.h === 'other')).toBe(true);
    expect(assignBar(funky, null, false, true)).toBe(one);
    expect(assignBar(funky)).toBe(two);
  });

  it('keeps one hand from the bar before too', () => {
    const steps = assignBar(funky, funky, false, true);
    expect(steps.every((s) => s.h === 'lead')).toBe(true);
  });
});

describe('assignBar — fills keep the arms uncrossed', () => {
  /** A groove to come out of: the hands on the hats and the snare. */
  const groove = bar({
    h: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    s: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
  });
  const DRUM_X: Partial<Record<LaneKey, number>> = { s: -0.07, t1: -0.12, t2: 0.18, t3: 0.45 };

  /**
   * Every step where the lead hand is on a drum well left of the other hand's
   * (the high tom, a touch left of the snare and above it, is not a crossing).
   */
  function crossings(steps: StepHands[]): number[] {
    const out: number[] = [];
    const at: Partial<Record<'lead' | 'other', number>> = {};
    steps.forEach((step, i) => {
      for (const [lane, x] of Object.entries(DRUM_X) as [LaneKey, number][]) {
        const hand = step[lane];
        if (hand === 'lead' || hand === 'other') at[hand] = x;
      }
      if (at.lead !== undefined && at.other !== undefined && at.other > at.lead + 0.1) out.push(i);
      // a hand with nothing on this step is free to move: forget where it was
      for (const hand of ['lead', 'other'] as const)
        if (!Object.values(step).includes(hand)) delete at[hand];
    });
    return out;
  }

  it('leads a fill round the toms with the lead hand going right, and the other coming back', () => {
    const up = bar({
      s: [2, 2, 2, 2],
      t1: [0, 0, 0, 0, 1, 1, 1, 1],
      t2: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
      t3: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
    });
    const down = bar({
      t3: [1, 1, 1, 1],
      t2: [0, 0, 0, 0, 1, 1, 1, 1],
      t1: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
      s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2],
    });
    for (const fill of [up, down]) expect(crossings(assignBar(fill, groove))).toEqual([]);
    expect(assignBar(up, groove)[12].t3).toBe('lead');
    expect(assignBar(down, groove)[4].t2).toBe('other');
  });

  it('plays a double where alternating would cross the arms, rather than cross them', () => {
    // threes round the toms: R L R would leave the other hand to reach the next tom first
    const threes = bar({
      t1: [1, 1, 1],
      t2: [0, 0, 0, 1, 1, 1],
      t3: [0, 0, 0, 0, 0, 0, 1, 1, 1],
    });
    const steps = assignBar(threes, groove);
    expect(crossings(steps)).toEqual([]);
    const hands = steps.slice(0, 9).map((s) => s.t1 ?? s.t2 ?? s.t3);
    const doubles = hands.filter((h, i) => i > 0 && h === hands[i - 1]).length;
    expect(doubles).toBeGreaterThan(0);
    // and never three in a row
    hands.forEach((h, i) => {
      if (i > 1) expect(h === hands[i - 1] && h === hands[i - 2]).toBe(false);
    });
  });

  it('still alternates a fill that has no reason not to', () => {
    const snare = bar({ s: [2, 2, 2, 2, 2, 2, 2, 2] });
    const hands = assignBar(snare, groove)
      .slice(0, 8)
      .map((s) => s.s);
    for (let i = 3; i < 8; i++) expect(hands[i]).not.toBe(hands[i - 1]);
  });
});

describe('assignBar — a cross-stick is the other hand’s', () => {
  const CROSS = 4;

  it('gives it to the other hand where alternating would have given it to the lead', () => {
    // a rimshot on the other hand, then straight away a cross-stick: alternating says lead
    const b = bar({
      h: [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      s: [0, 0, 0, 0, 0, 0, RIMSHOT, CROSS, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    expect(assignBar(b)[7].s).toBe('other');
    // the same with a plain note is still alternated
    const plain = bar({ ...b, s: b.s.map((v) => (v === CROSS ? 2 : v)) });
    expect(assignBar(plain)[7].s).toBe('lead');
  });

  it('keeps it on the other hand when hats go hand to hand and it is the lead’s go', () => {
    const b = bar({
      h: Array<number>(N).fill(1),
      s: [0, 0, 0, 0, CROSS, 0, 0, 0, 0, 0, 0, 0, CROSS, 0, 0, 0],
    });
    const steps = assignBar(b);
    expect(steps[4].s).toBe('other');
    expect(steps[12].s).toBe('other');
    // and the lead hand keeps the hats going over it
    expect(steps[4].h).toBe('lead');
  });

  it('plays every cross-stick in a groove with the other hand', () => {
    const b = bar({
      h: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      s: [0, 0, 0, CROSS, 0, 0, CROSS, 0, 0, 0, CROSS, 0, 0, CROSS, 0, 0],
    });
    assignBar(b).forEach((step, i) => {
      if (b.s[i]) expect(step.s).toBe('other');
    });
  });
});

describe('assignBar — cross-sticks', () => {
  const CROSS = 4;
  /** Eighth hats, cross-sticks on 2 and 4, and whatever else `more` adds. */
  const groove = (more: Partial<Record<LaneKey, number[]>> = {}, sixteenths = false) => {
    const b = bar(more);
    for (let i = 0; i < N; i += sixteenths ? 1 : 2) b.h[i] = 1;
    b.s[4] = CROSS;
    b.s[12] = CROSS;
    return b;
  };

  it('never gives a cross-stick to the lead hand — not even on a step with a crash and the hats', () => {
    const b = groove();
    b.c[4] = 1;
    const steps = assignBar(b);
    expect(steps[4].s).toBe('other');
    expect(steps[12].s).toBe('other');
  });

  it('drops a note only the other hand could reach on a cross-stick step, rather than the bar', () => {
    // the block out past the hats, alone with a cross-stick on its step
    const b = groove({ p2: Array<number>(N).fill(0) });
    b.h[4] = 0;
    b.p2[4] = 1;
    const steps = assignBar(b);
    expect(steps).toHaveLength(N);
    expect(steps[4].s).toBe('other');
    expect(steps[4].p2).toBeUndefined();
    // and the rest of the bar is still played
    expect(steps[2].h).toBe('lead');
    expect(steps[12].s).toBe('other');
  });

  it('keeps the hats on the lead hand however fast, the other hand down on the snare', () => {
    const steps = assignBar(groove({}, true));
    for (const [i, step] of steps.entries()) {
      if (step.h) expect(step.h, `step ${i}`).toBe('lead');
      for (const [lane, hand] of Object.entries(step))
        if (hand === 'other') expect(lane, `step ${i}`).toBe('s');
    }
  });

  it('plays the toms with the lead hand, the other coming off the snare only to break up a long run', () => {
    // the last half bar: a run of toms, no hats over it
    const b = groove();
    for (let i = 8; i < N; i++) b.h[i] = 0;
    for (const i of [8, 9, 10, 11, 13, 14, 15]) b[i < 11 ? 't1' : 't2'][i] = 1;
    const steps = assignBar(b);
    const toms = steps.flatMap((step) => [step.t1, step.t2].filter(Boolean));
    const lead = toms.filter((h) => h === 'lead').length;
    expect(lead / toms.length).toBeGreaterThanOrEqual(0.6);
    // and never three in a row on the other hand
    expect(toms.join()).not.toContain('other,other');
  });
});

describe('assignBar — a double pedal', () => {
  const feet = (steps: StepHands[]) => steps.map((s) => s.k ?? '-');

  it('shares a run of kicks between the feet, right foot first', () => {
    const b = bar({ k: [1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0] });
    expect(feet(assignBar(b, null, true))).toEqual([
      'kickFoot',
      'hatFoot',
      'kickFoot',
      'hatFoot',
      '-',
      '-',
      'kickFoot',
      'hatFoot',
      '-',
      '-',
      'kickFoot',
      '-',
      '-',
      '-',
      '-',
      '-',
    ]);
  });

  it('leaves every kick on the right foot without one', () => {
    const b = bar({ k: Array<number>(N).fill(1) });
    expect(feet(assignBar(b)).every((f) => f === 'kickFoot')).toBe(true);
  });

  it('gives a kick on a step the left foot plays a chick on to the right foot', () => {
    const b = bar({ k: [1, 1, 1, 1], hf: [0, 1, 0, 0] });
    expect(feet(assignBar(b, null, true)).slice(0, 4)).toEqual([
      'kickFoot',
      'kickFoot',
      'kickFoot',
      'hatFoot',
    ]);
  });

  it('carries a run on from the bar before', () => {
    const before = bar({ k: [...Array<number>(15).fill(0), 1] });
    const b = bar({ k: [1, 1, 1] });
    expect(feet(assignBar(b, before, true)).slice(0, 3)).toEqual([
      'hatFoot',
      'kickFoot',
      'hatFoot',
    ]);
  });

  it('leaves the hands as they were', () => {
    const b = bar({ k: Array<number>(N).fill(1), h: Array<number>(N).fill(1) });
    const single = assignBar(b);
    const double = assignBar(b, null, true);
    expect(double.map((s) => s.h)).toEqual(single.map((s) => s.h));
  });
});
