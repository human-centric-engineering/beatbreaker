/**
 * How a practice session climbs to each pattern's target tempo (D30).
 *
 * Pure functions, no mocks. Seeded property sweeps via `makeRng`, following
 * the pattern in `tests/unit/lib/app/breaks/catalogue/schemas.test.ts`.
 *
 * @see lib/app/practice/climb.ts
 */

import { describe, expect, it } from 'vitest';

import { makeRng } from '@/lib/app/breaks/rng';
import {
  CLIMB_SHAPES,
  type ClimbSettings,
  effectiveClimb,
  slotPlan,
  startBpm,
  tempoAt,
} from '@/lib/app/practice/climb';

const RUNS = 1000;

const SESSION: ClimbSettings = {
  startPct: 20,
  climbPct: 67,
  climbShape: 'steady',
  climbSteps: 4,
};

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

describe('startBpm', () => {
  it('floors at 40, even when the percentage would take it lower', () => {
    // 50 * (1 - 0.8) = 10, which is below the floor
    expect(startBpm(50, 80)).toBe(40);
  });

  it('rounds the result', () => {
    // 123 * 0.8 = 98.4
    expect(startBpm(123, 20)).toBe(98);
  });

  it('is exactly the floor right at the boundary', () => {
    // 50 * (1 - 0.2) = 40 exactly
    expect(startBpm(50, 20)).toBe(40);
  });
});

describe('slotPlan', () => {
  it('never starts above the target, even for a very low target', () => {
    // startBpm(40, 20) would be max(40, round(32)) = 40, same as the target
    const plan = slotPlan(5, 40, SESSION);
    expect(plan.startBpm).toBeLessThanOrEqual(plan.targetBpm);
    expect(plan.startBpm).toBe(40);
  });

  it('carries the minutes, target and climb settings through', () => {
    const plan = slotPlan(3, 160, { ...SESSION, climbShape: 'gentle-start', climbSteps: 5 });
    expect(plan).toMatchObject({
      targetBpm: 160,
      seconds: 180,
      climbPct: 67,
      climbShape: 'gentle-start',
      climbSteps: 5,
    });
  });

  it('never has a start above the target (property)', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const rng = makeRng(seed);
      const targetBpm = 40 + Math.floor(rng() * 260);
      const startPct = 5 + Math.floor(rng() * 46); // 5..50
      const plan = slotPlan(10, targetBpm, { ...SESSION, startPct });
      expect(plan.startBpm).toBeLessThanOrEqual(plan.targetBpm);
    }
  });
});

describe('tempoAt — shape invariants (property)', () => {
  const shapes = CLIMB_SHAPES;

  for (const shape of shapes) {
    describe(`shape: ${shape}`, () => {
      it('is monotonic non-decreasing, whole-number, and flat after the climb, over every seed', () => {
        forSeeds(RUNS, (seed) => {
          const rng = makeRng(seed + shapes.indexOf(shape) * 100_000);
          const targetBpm = 60 + Math.floor(rng() * 200);
          const startPct = 5 + Math.floor(rng() * 46);
          const climbPct = 10 + Math.floor(rng() * 91);
          const minutes = 1 + Math.floor(rng() * 10);
          const climbSteps = 2 + Math.floor(rng() * 7);
          const plan = slotPlan(minutes, targetBpm, {
            startPct,
            climbPct,
            climbShape: shape,
            climbSteps,
          });
          const climbSeconds = (plan.seconds * climbPct) / 100;

          // starts at the start tempo, at t=0 and for negative t
          expect(tempoAt(0, plan)).toBe(plan.startBpm);
          expect(tempoAt(-5, plan)).toBe(plan.startBpm);
          expect(tempoAt(-1000, plan)).toBe(plan.startBpm);

          // reaches exactly the target right at the climb boundary, and stays there
          expect(tempoAt(climbSeconds, plan)).toBe(plan.targetBpm);
          expect(tempoAt(climbSeconds + 1, plan)).toBe(plan.targetBpm);
          expect(tempoAt(plan.seconds + 1000, plan)).toBe(plan.targetBpm);

          // monotonic non-decreasing and whole-number, over a fine sweep
          const samples = 50;
          let prev = -Infinity;
          for (let k = 0; k <= samples; k++) {
            const elapsed = (k / samples) * (plan.seconds + 10);
            const tempo = tempoAt(elapsed, plan);
            expect(Number.isInteger(tempo)).toBe(true);
            expect(tempo).toBeGreaterThanOrEqual(prev);
            prev = tempo;
          }
        });
      });
    });
  }
});

describe('tempoAt — shape ordering at mid-climb', () => {
  it('gentle-start <= steady <= gentle-finish, for the same start/target/time', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const rng = makeRng(seed + 0x3000_0000);
      const targetBpm = 60 + Math.floor(rng() * 200);
      const minutes = 1 + Math.floor(rng() * 10);
      const climbPct = 20 + Math.floor(rng() * 70);
      const startPct = 5 + Math.floor(rng() * 46);

      const base = { startPct, climbPct, climbSteps: 4 };
      const gentleStart = slotPlan(minutes, targetBpm, { ...base, climbShape: 'gentle-start' });
      const steady = slotPlan(minutes, targetBpm, { ...base, climbShape: 'steady' });
      const gentleFinish = slotPlan(minutes, targetBpm, { ...base, climbShape: 'gentle-finish' });

      const climbSeconds = (steady.seconds * climbPct) / 100;
      const mid = climbSeconds / 2;

      const atGentleStart = tempoAt(mid, gentleStart);
      const atSteady = tempoAt(mid, steady);
      const atGentleFinish = tempoAt(mid, gentleFinish);

      expect(atGentleStart).toBeLessThanOrEqual(atSteady);
      expect(atSteady).toBeLessThanOrEqual(atGentleFinish);
    }
  });
});

describe('tempoAt — steps shape', () => {
  it('holds exactly climbSteps equal-height, equal-duration values during the climb', () => {
    // 40 -> 200 bpm (delta 160), climbSteps 4, climb = 300s of a 600s slot:
    // boundaries at 0/75/150/225/300s, values 40/80/120/160, then 200 flat.
    const plan = slotPlan(10, 200, {
      startPct: 80,
      climbPct: 50,
      climbShape: 'steps',
      climbSteps: 4,
    });
    expect(plan.startBpm).toBe(40);
    expect(plan.seconds).toBe(600);
    const climbSeconds = (plan.seconds * plan.climbPct) / 100;
    expect(climbSeconds).toBe(300);

    const expectedSteps = [40, 80, 120, 160];
    const stepWidth = climbSeconds / 4;

    for (let k = 0; k < 4; k++) {
      // sample the middle of each step's window; the boundaries themselves
      // are checked separately to pin down duration exactly
      const mid = k * stepWidth + stepWidth / 2;
      expect(tempoAt(mid, plan)).toBe(expectedSteps[k]);
    }

    // exactly climbSteps distinct values appear within [0, climbSeconds)
    const samples = new Set<number>();
    for (let t = 0; t < climbSeconds; t += 1) samples.add(tempoAt(t, plan));
    expect(samples.size).toBe(4);
    expect([...samples].sort((a, b) => a - b)).toEqual(expectedSteps);

    // each step holds for exactly stepWidth seconds — the step changes at
    // the boundary and nowhere else
    for (let k = 1; k < 4; k++) {
      const boundary = k * stepWidth;
      expect(tempoAt(boundary - 0.01, plan)).toBe(expectedSteps[k - 1]);
      expect(tempoAt(boundary, plan)).toBe(expectedSteps[k]);
    }

    // equal heights between consecutive steps
    const heights = expectedSteps.slice(1).map((v, i) => v - expectedSteps[i]);
    expect(new Set(heights).size).toBe(1);
  });

  it('takes climbSteps distinct values, allowing rounding to collapse close ones at low separation', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const rng = makeRng(seed + 0x4000_0000);
      const targetBpm = 100 + Math.floor(rng() * 150);
      const climbSteps = 2 + Math.floor(rng() * 7);
      const plan = slotPlan(10, targetBpm, {
        startPct: 40,
        climbPct: 60,
        climbShape: 'steps',
        climbSteps,
      });
      const climbSeconds = (plan.seconds * plan.climbPct) / 100;
      const stepWidth = climbSeconds / climbSteps;
      const values: number[] = [];
      for (let k = 0; k < climbSteps; k++) {
        values.push(tempoAt(k * stepWidth + stepWidth / 2, plan));
      }
      // never more than the configured number of steps' worth of values
      expect(new Set(values).size).toBeLessThanOrEqual(climbSteps);
      // non-decreasing across the steps
      for (let k = 1; k < values.length; k++)
        expect(values[k]).toBeGreaterThanOrEqual(values[k - 1]);
    }
  });
});

describe('effectiveClimb', () => {
  it('uses the session value for every field left null', () => {
    const result = effectiveClimb(SESSION, {
      startPct: null,
      climbPct: null,
      climbShape: null,
      climbSteps: null,
    });
    expect(result).toEqual(SESSION);
  });

  it('uses the item override for every field that has one', () => {
    const result = effectiveClimb(SESSION, {
      startPct: 10,
      climbPct: 90,
      climbShape: 'gentle-finish',
      climbSteps: 8,
    });
    expect(result).toEqual({
      startPct: 10,
      climbPct: 90,
      climbShape: 'gentle-finish',
      climbSteps: 8,
    });
  });

  it('mixes overrides and session values field by field', () => {
    const result = effectiveClimb(SESSION, { startPct: 15, climbShape: null });
    expect(result).toEqual({
      startPct: 15, // overridden
      climbPct: SESSION.climbPct, // from the session — absent from the partial
      climbShape: SESSION.climbShape, // from the session — explicitly null
      climbSteps: SESSION.climbSteps, // from the session — absent
    });
  });

  it('treats 0 as a real override, not as absent', () => {
    // climbPct's range starts at 10 so 0 is not realistic, but the function
    // itself must not treat a falsy-but-non-null override as "use the session"
    const result = effectiveClimb(SESSION, { startPct: 0 });
    expect(result.startPct).toBe(0);
  });
});
