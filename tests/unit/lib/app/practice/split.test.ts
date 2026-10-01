/**
 * How a practice session's time is shared between its patterns (D31).
 *
 * Pure functions, no mocks. Driven by seeded property tests — `makeRng` gives
 * a reproducible stream so a failure is a fixed, re-runnable seed rather than
 * a flake. No property-testing library is installed; cases are hand-rolled
 * generators built from `makeRng`, following the pattern in
 * `tests/unit/lib/app/breaks/catalogue/schemas.test.ts`.
 *
 * @see lib/app/practice/split.ts
 */

import { describe, expect, it } from 'vitest';

import { makeRng, type Rng } from '@/lib/app/breaks/rng';
import { nudgeCeiling, nudgeMinutes, splitMinutes, type SplitSlot } from '@/lib/app/practice/split';

const RUNS = 3000;

/** Run `body` for seeds 1..`runs`; a failure names the seed, so it can be re-run alone. */
function forSeeds(runs: number, body: (seed: number) => void): void {
  for (let seed = 1; seed <= runs; seed++) {
    try {
      body(seed);
    } catch (e) {
      if (e instanceof Error) e.message = `seed ${seed}: ${e.message}`;
      throw e;
    }
  }
}

/** Partition `total` non-negative integers into `count` random-sized parts. */
function distribute(rng: Rng, count: number, total: number): number[] {
  if (count === 0) return [];
  if (count === 1) return [total];
  const cuts = Array.from({ length: count - 1 }, () => Math.floor(rng() * (total + 1))).sort(
    (a, b) => a - b
  );
  const parts: number[] = [];
  let prev = 0;
  for (const c of cuts) {
    parts.push(c - prev);
    prev = c;
  }
  parts.push(total - prev);
  return parts;
}

/** A random feasible case: pinned slots never force a give-back. */
function feasibleCase(rng: Rng): { total: number; slots: SplitSlot[] } {
  const n = 1 + Math.floor(rng() * 7); // 1..7 slots
  const total = n + Math.floor(rng() * 50); // always >= n
  const pinnedFlags = Array.from({ length: n }, () => rng() < 0.5);
  const freeCount = pinnedFlags.filter((p) => !p).length;
  const pinnedCount = n - freeCount;

  // The most the pinned slots can sum to without forcing a give-back.
  const cap = total - freeCount;
  // Spend somewhere between the pinned floor (1 each) and the cap. With no
  // free slots to absorb slack, the budget must be spent exactly — any less
  // and the "all pinned and short" branch kicks in and moves the last pin,
  // which is its own documented behaviour (tested separately below).
  const pinnedSum =
    pinnedCount === 0
      ? 0
      : freeCount === 0
        ? cap
        : pinnedCount + Math.floor(rng() * (cap - pinnedCount + 1));
  const extras = distribute(rng, pinnedCount, pinnedSum - pinnedCount);

  let ei = 0;
  const slots = pinnedFlags.map((pinned): SplitSlot =>
    pinned ? { minutes: 1 + extras[ei++], pinned: true } : { minutes: 1, pinned: false }
  );
  return { total, slots };
}

/** A random infeasible case: the pinned slots' own minutes overrun the budget. */
function infeasibleCase(rng: Rng): { total: number; slots: SplitSlot[] } {
  const freeCount = 1 + Math.floor(rng() * 3);
  const pinnedCount = 1 + Math.floor(rng() * 5);
  const n = freeCount + pinnedCount;
  const total = n + Math.floor(rng() * 20);
  // Budget left for the pinned slots once every free slot takes its minute.
  const budget = total - freeCount;
  // Deliberately overrun it by a random amount, so give-back is forced.
  const overrun = 1 + Math.floor(rng() * 20);
  const pinnedSum = budget + overrun;
  const extras = distribute(rng, pinnedCount, pinnedSum - pinnedCount);

  let ei = 0;
  const pinnedSlots: SplitSlot[] = Array.from({ length: pinnedCount }, () => ({
    minutes: 1 + extras[ei++],
    pinned: true,
  }));
  const freeSlots: SplitSlot[] = Array.from({ length: freeCount }, () => ({
    minutes: 1,
    pinned: false,
  }));
  // Interleave pinned and free slots in a random order, keeping both lists' relative order.
  const slots: SplitSlot[] = [];
  let pi = 0;
  let fi = 0;
  while (pi < pinnedSlots.length || fi < freeSlots.length) {
    const takePinned = fi >= freeSlots.length || (pi < pinnedSlots.length && rng() < 0.5);
    slots.push(takePinned ? pinnedSlots[pi++] : freeSlots[fi++]);
  }
  return { total, slots };
}

describe('splitMinutes — basics', () => {
  it('returns [] for zero slots', () => {
    expect(splitMinutes(10, [])).toEqual([]);
  });

  it('throws RangeError when there are more slots than minutes', () => {
    const slots: SplitSlot[] = [
      { minutes: 1, pinned: false },
      { minutes: 1, pinned: false },
      { minutes: 1, pinned: false },
    ];
    expect(() => splitMinutes(2, slots)).toThrow(RangeError);
  });

  it('throws RangeError for a non-integer total', () => {
    const slots: SplitSlot[] = [{ minutes: 1, pinned: false }];
    expect(() => splitMinutes(1.5, slots)).toThrow(RangeError);
  });
});

describe('splitMinutes — feasible inputs (property)', () => {
  it('keeps the total, the pins and the free-slot spread, over 3000 seeds', () => {
    forSeeds(RUNS, (seed) => {
      const rng = makeRng(seed);
      const { total, slots } = feasibleCase(rng);
      const originalPinned = slots.map((s) =>
        s.pinned ? Math.max(1, Math.floor(s.minutes)) : null
      );

      const result = splitMinutes(total, slots);

      // the total always holds
      expect(result.reduce((a, b) => a + b, 0)).toBe(total);
      // every slot gets at least a minute
      expect(result.every((m) => m >= 1)).toBe(true);
      // no pinned slot moved
      slots.forEach((s, i) => {
        if (s.pinned) expect(result[i]).toBe(originalPinned[i]);
      });
      // free slots differ by at most 1, the extra going to the first ones
      const freeIdx = slots.flatMap((s, i) => (s.pinned ? [] : [i]));
      if (freeIdx.length > 0) {
        const freeValues = freeIdx.map((i) => result[i]);
        expect(Math.max(...freeValues) - Math.min(...freeValues)).toBeLessThanOrEqual(1);
        const left = total - slots.reduce((a, s, i) => a + (s.pinned ? result[i] : 0), 0);
        const each = Math.floor(left / freeIdx.length);
        const extra = left - each * freeIdx.length;
        freeIdx.forEach((i, k) => {
          expect(result[i]).toBe(each + (k < extra ? 1 : 0));
        });
      }
    });
  });
});

describe('splitMinutes — infeasible pins (property)', () => {
  it('still holds the total and gives way from the last pin, over 3000 seeds', () => {
    forSeeds(RUNS, (seed) => {
      const rng = makeRng(seed + 0x1000_0000); // distinct stream from the feasible-case suite
      const { total, slots } = infeasibleCase(rng);
      const originalPinned = slots.map((s) =>
        s.pinned ? Math.max(1, Math.floor(s.minutes)) : null
      );

      const result = splitMinutes(total, slots);

      expect(result.reduce((a, b) => a + b, 0)).toBe(total);
      expect(result.every((m) => m >= 1)).toBe(true);

      // pins give way from the last back: if an earlier pin was touched, every
      // later pin must already be fully drained to 1
      const pinnedIdx = slots.flatMap((s, i) => (s.pinned ? [i] : []));
      pinnedIdx.forEach((pi, k) => {
        const touched = result[pi] < (originalPinned[pi] as number);
        if (touched) {
          for (const pj of pinnedIdx.slice(k + 1)) {
            expect(result[pj]).toBe(1);
          }
        }
      });
    });
  });
});

describe('splitMinutes — all pinned', () => {
  it('absorbs a short total into the last slot when every slot is pinned', () => {
    const slots: SplitSlot[] = [
      { minutes: 2, pinned: true },
      { minutes: 2, pinned: true },
      { minutes: 2, pinned: true },
    ];
    // the pins only add up to 6; the total is 9
    const result = splitMinutes(9, slots);
    expect(result).toEqual([2, 2, 5]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(9);
  });

  it('gives every pin back down to 1, last first, when every slot is pinned and too greedy', () => {
    const slots: SplitSlot[] = [
      { minutes: 10, pinned: true },
      { minutes: 10, pinned: true },
      { minutes: 10, pinned: true },
    ];
    const result = splitMinutes(5, slots);
    expect(result.reduce((a, b) => a + b, 0)).toBe(5);
    expect(result.every((m) => m >= 1)).toBe(true);
    // the last one gives way first
    expect(result[2]).toBe(1);
  });
});

describe('splitMinutes — add/remove a slot', () => {
  it('keeps pinned slots when a new free slot is added and re-split', () => {
    const slots: SplitSlot[] = [
      { minutes: 5, pinned: true },
      { minutes: 1, pinned: false },
      { minutes: 1, pinned: false },
    ];
    const before = splitMinutes(10, slots);
    expect(before[0]).toBe(5);

    const withNew: SplitSlot[] = [...slots, { minutes: 1, pinned: false }];
    const after = splitMinutes(11, withNew);

    expect(after[0]).toBe(5); // the pin never moved
    expect(after.reduce((a, b) => a + b, 0)).toBe(11);
  });

  it('keeps pinned slots when a free slot is removed and re-split', () => {
    const slots: SplitSlot[] = [
      { minutes: 5, pinned: true },
      { minutes: 1, pinned: false },
      { minutes: 1, pinned: false },
    ];
    const before = splitMinutes(10, slots);
    expect(before[0]).toBe(5);

    const withoutLast = slots.slice(0, 2);
    const after = splitMinutes(9, withoutLast);

    expect(after[0]).toBe(5); // the pin never moved
    expect(after.reduce((a, b) => a + b, 0)).toBe(9);
  });
});

describe('nudgeCeiling', () => {
  it('is the total less a minute for every other free slot and the minutes of every other pin', () => {
    const slots: SplitSlot[] = [
      { minutes: 7, pinned: true },
      { minutes: 1, pinned: false },
      { minutes: 1, pinned: false },
    ];
    // total 20: nudging index 1 leaves 20 - 7 (other pin) - 1 (other free) = 12
    expect(nudgeCeiling(20, slots, 1)).toBe(12);
  });

  it('never goes below 1', () => {
    const slots: SplitSlot[] = [
      { minutes: 7, pinned: true },
      { minutes: 7, pinned: true },
    ];
    expect(nudgeCeiling(8, slots, 1)).toBe(1);
  });
});

describe('nudgeMinutes', () => {
  it('pins the nudged slot and keeps the total', () => {
    const slots: SplitSlot[] = [
      { minutes: 1, pinned: false },
      { minutes: 1, pinned: false },
      { minutes: 1, pinned: false },
    ];
    const result = nudgeMinutes(10, slots, 0, 5);

    expect(result[0].pinned).toBe(true);
    expect(result[0].minutes).toBe(5);
    expect(result.reduce((a, s) => a + s.minutes, 0)).toBe(10);
  });

  it('never moves another pinned slot', () => {
    const slots: SplitSlot[] = [
      { minutes: 3, pinned: true },
      { minutes: 1, pinned: false },
      { minutes: 1, pinned: false },
    ];
    const result = nudgeMinutes(10, slots, 1, 4);

    expect(result[0].minutes).toBe(3); // the other pin never moved
    expect(result[0].pinned).toBe(true);
    expect(result[1].minutes).toBe(4);
  });

  it('clamps the value to [1, nudgeCeiling]', () => {
    const slots: SplitSlot[] = [
      { minutes: 1, pinned: false },
      { minutes: 1, pinned: false },
    ];
    const ceiling = nudgeCeiling(5, slots, 0);

    expect(nudgeMinutes(5, slots, 0, 1000)[0].minutes).toBe(ceiling);
    expect(nudgeMinutes(5, slots, 0, -50)[0].minutes).toBe(1);
  });

  it('takes whatever fits when every other slot is pinned', () => {
    const slots: SplitSlot[] = [
      { minutes: 1, pinned: false },
      { minutes: 4, pinned: true },
      { minutes: 3, pinned: true },
    ];
    // every OTHER slot is pinned; the nudged slot has nothing left to negotiate with
    const result = nudgeMinutes(10, slots, 0, 2);

    expect(result[0].minutes).toBe(3); // 10 - 4 - 3, whatever is asked
    expect(result[1].minutes).toBe(4);
    expect(result[2].minutes).toBe(3);
  });

  it('throws RangeError for an out-of-range index', () => {
    const slots: SplitSlot[] = [{ minutes: 1, pinned: false }];
    expect(() => nudgeMinutes(5, slots, 3, 2)).toThrow(RangeError);
  });
});

describe('nudgeMinutes — sequences (property)', () => {
  it('keeps the total and every pin after random sequences of nudges, over 3000 seeds', () => {
    forSeeds(RUNS, (seed) => {
      const rng = makeRng(seed + 0x2000_0000);
      const n = 2 + Math.floor(rng() * 5); // 2..6 slots
      const total = n + Math.floor(rng() * 40);
      let slots: SplitSlot[] = Array.from({ length: n }, () => ({ minutes: 1, pinned: false }));
      slots = splitMinutes(total, slots).map((m) => ({ minutes: m, pinned: false }));

      const nudgeCount = 1 + Math.floor(rng() * 4);
      for (let k = 0; k < nudgeCount; k++) {
        const index = Math.floor(rng() * n);
        const to = Math.floor(rng() * (total + 5));
        const before = slots.map((s) => ({ ...s }));

        slots = nudgeMinutes(total, slots, index, to);

        expect(slots.reduce((a, s) => a + s.minutes, 0)).toBe(total);
        expect(slots.every((s) => s.minutes >= 1)).toBe(true);
        expect(slots[index].pinned).toBe(true);
        before.forEach((prev, i) => {
          if (i !== index && prev.pinned) {
            expect(slots[i].minutes).toBe(prev.minutes);
            expect(slots[i].pinned).toBe(true);
          }
        });
      }
    });
  });
});
