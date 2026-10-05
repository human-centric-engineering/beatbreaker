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

describe('assignStep — cymbal priority (crash > ride > hat)', () => {
  it('gives the lead hand a lone cymbal, whichever one it is', () => {
    expect(assignStep(bar({ c: [1] }), 0, null).c).toBe('lead');
    expect(assignStep(bar({ r: [1] }), 0, null).r).toBe('lead');
    expect(assignStep(bar({ h: [1] }), 0, null).h).toBe('lead');
  });

  it('gives crash the lead hand and ride the other hand, when both sound together', () => {
    const out = assignStep(bar({ c: [1], r: [1] }), 0, null);
    expect(out.c).toBe('lead');
    expect(out.r).toBe('other');
  });

  it('gives ride the lead hand and hat the other hand, when both sound together (no crash)', () => {
    const out = assignStep(bar({ r: [1], h: [1] }), 0, null);
    expect(out.r).toBe('lead');
    expect(out.h).toBe('other');
  });

  it('leaves the third cymbal unplayed when crash, ride and hat all land on the same step', () => {
    const out = assignStep(bar({ c: [1], r: [1], h: [1] }), 0, null);
    expect(out.c).toBe('lead');
    expect(out.r).toBe('other');
    expect(out.h).toBeUndefined();
  });
});

describe('assignStep — two drums: leftmost x goes to the other hand', () => {
  it('sends the leftmost drum (lower x) to the other hand and the rightmost to the lead', () => {
    // snare x = -0.07 (left of centre), tom2 x = 0.18 (right of centre)
    const out = assignStep(bar({ s: [2], t2: [1] }), 0, null);
    expect(out.s).toBe('other');
    expect(out.t2).toBe('lead');
  });

  it('orders purely by x, regardless of which lane is named first', () => {
    // tom1 x = -0.12 (further left than snare's -0.07)
    const out = assignStep(bar({ s: [2], t1: [1] }), 0, null);
    expect(out.t1).toBe('other');
    expect(out.s).toBe('lead');
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
    // previous step played only a cymbal; lastDrum() should find nothing there
    const prevCymbalOnly: StepHands = { h: 'lead' };
    // falls back to tom2's own side (x > 0.1 => lead)
    const out = assignStep(hitAt(5, { t2: 1 }), 5, prevCymbalOnly);
    expect(out.t2).toBe('lead');
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
    // step 0: snare on the other hand (its side); step 1: the block, which alternation would give the lead
    bar.s[0] = 2;
    bar.p2[1] = 1;
    const steps = assignBar(bar);
    expect(steps[0].s).toBe('other');
    expect(steps[1].p2).toBe('other');
  });
});
