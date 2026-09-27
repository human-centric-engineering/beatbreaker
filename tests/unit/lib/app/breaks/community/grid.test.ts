/**
 * What a pattern's notes are, apart from everything else about it (task 6.9's
 * duplicate check), and how hard it is to play (the community library's
 * difficulty filter).
 *
 * Patterns are built by hand from `emptyBar` rather than through the
 * generator, so exactly which steps carry a hit is pinned rather than left to
 * a style's own choices.
 *
 * @see lib/app/breaks/community/grid.ts
 */

import { describe, expect, it } from 'vitest';

import {
  HARD_FROM,
  MEDIUM_FROM,
  difficultyLabel,
  difficultyOf,
  gridHash,
  sectionHash,
} from '@/lib/app/breaks/community/grid';
import { emptyBar } from '@/lib/app/breaks/pattern';
import type { Bar, LaneKey, Pattern } from '@/lib/app/breaks/types';

function bar(hits: Partial<Record<LaneKey, number[]>> = {}): Bar {
  return { ...emptyBar(), ...hits };
}

function pattern(bars: Bar[], overrides: Partial<Pattern> = {}): Pattern {
  return {
    name: 'Untitled',
    style: 'funk',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 'h'],
    perc: {},
    backbeats: [4, 12],
    bbLane: 's',
    hasRide: false,
    hasHat: true,
    pins: null,
    bars,
    ...overrides,
  };
}

/** Kick on 1 and 3, snare on 2 and 4, hi-hat every eighth — a plain rock beat. */
function eighthRock(): Pattern {
  return pattern([
    bar({
      k: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      s: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
      h: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    }),
  ]);
}

/** Same beat, but the hi-hat plays every sixteenth. */
function sixteenthHats(): Pattern {
  const base = eighthRock();
  return pattern([bar({ ...base.bars[0], h: base.bars[0].h.map(() => 1) })]);
}

/** Kick, snare and hi-hat all on every sixteenth — as busy as this kit gets. */
function veryBusy(): Pattern {
  const all = () => new Array(16).fill(1);
  return pattern([bar({ k: all(), s: all(), h: all() })]);
}

/** A pattern with no notes at all — the quiet section. */
function silent(): Pattern {
  return pattern([bar()]);
}

describe('sectionHash', () => {
  it('matches for identical notes and differs for different ones', async () => {
    const a = await sectionHash(eighthRock());
    const bSameNotes = await sectionHash({ ...eighthRock(), name: 'Renamed', seed: 42 });
    expect(bSameNotes).toBe(a);

    const c = await sectionHash(sixteenthHats());
    expect(c).not.toBe(a);
  });

  it('is a sha-256 hex digest', async () => {
    expect(await sectionHash(eighthRock())).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('gridHash', () => {
  it('is unaffected by the name or an unrelated field carried alongside A and B', async () => {
    const A = eighthRock();
    const B = silent();
    const base = await gridHash({ A, B });
    const renamed = await gridHash({ A: { ...A, name: 'Renamed' }, B });
    expect(renamed).toBe(base);

    // gridHash's type only asks for A and B; a caller may still hand it a
    // whole BreakDoc, and the extra bpm field must not change the hash
    const withExtra = await gridHash({ A, B, bpm: 200 } as never);
    expect(withExtra).toBe(base);
  });

  it('changes when a note moves', async () => {
    const A = eighthRock();
    const B = silent();
    const base = await gridHash({ A, B });

    // the downbeat kick, turned off — one bit flipped, nothing else touched
    const movedK = [0, ...A.bars[0].k.slice(1)];
    const A2 = { ...A, bars: [{ ...A.bars[0], k: movedK }] };
    expect(await gridHash({ A: A2, B })).not.toBe(base);
  });

  it('is order-sensitive: A and B are not interchangeable', async () => {
    const A = eighthRock();
    const B = silent();
    const forward = await gridHash({ A, B });
    const swapped = await gridHash({ A: B, B: A });
    expect(swapped).not.toBe(forward);
  });
});

describe('difficultyOf', () => {
  it('reads an eighth-note rock beat at 100 bpm as easy', () => {
    const A = eighthRock();
    expect(difficultyOf({ A, B: A, bpm: 100 })).toBe(1);
  });

  it('reads the same beat with sixteenth-note hats as medium', () => {
    const A = sixteenthHats();
    expect(difficultyOf({ A, B: A, bpm: 100 })).toBe(2);
  });

  it('reads a very busy pattern as hard', () => {
    const A = veryBusy();
    expect(difficultyOf({ A, B: A, bpm: 100 })).toBe(3);
  });

  it('scores by the busier of the two sections, not just A', () => {
    const quiet = silent();
    const busy = veryBusy();
    expect(difficultyOf({ A: quiet, B: busy, bpm: 100 })).toBe(3);
    expect(difficultyOf({ A: busy, B: quiet, bpm: 100 })).toBe(3);
  });

  it('reads total silence as easy, not a division by zero', () => {
    const A = silent();
    expect(difficultyOf({ A, B: A, bpm: 100 })).toBe(1);
  });

  it('reads a tempo of zero or no bars as easy rather than dividing by zero', () => {
    const busy = veryBusy();
    expect(difficultyOf({ A: busy, B: busy, bpm: 0 })).toBe(1);
    const empty = pattern([]);
    expect(difficultyOf({ A: empty, B: empty, bpm: 100 })).toBe(1);
  });

  it('counts only the lanes the pattern carries, and tolerates a bar missing one', () => {
    // hits in the ride lane of a pattern that carries no ride are not played
    const ridden = pattern([bar({ r: new Array(16).fill(1) })], { lanes: ['k', 's', 'h'] });
    expect(difficultyOf({ A: ridden, B: ridden, bpm: 100 })).toBe(1);
    // a stored bar can be short a lane; it reads as silence, not a crash
    const { t1: _dropped, ...partial } = bar();
    const holed = pattern([partial as Bar], { lanes: ['k', 't1'] });
    expect(difficultyOf({ A: holed, B: holed, bpm: 100 })).toBe(1);
  });

  it('hashes a bar short a lane the same as one with that lane silent', async () => {
    const { t1: _dropped, ...partial } = bar();
    const full = pattern([bar({ t1: [] })]);
    expect(await sectionHash(pattern([partial as Bar]))).toBe(await sectionHash(full));
  });

  it('sits exactly at the medium and hard boundaries as documented', () => {
    // sanity on the thresholds themselves, so a future change to the
    // constants is visible here rather than only in a fixture that silently
    // stops meaning what its name says
    expect(MEDIUM_FROM).toBe(6);
    expect(HARD_FROM).toBe(10);
  });
});

describe('difficultyLabel', () => {
  it('names 1, 2 and 3, and reads anything else a stored column holds as no difficulty', () => {
    expect([1, 2, 3].map(difficultyLabel)).toEqual(['Easy', 'Medium', 'Hard']);
    for (const odd of [null, undefined, 0, 4, 2.5, '2', -1]) {
      expect(difficultyLabel(odd)).toBeNull();
    }
  });
});
