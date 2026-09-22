/**
 * The seeded RNG. Every generated break is a function of this sequence, so it
 * is pinned: a change here changes what every seed means.
 */

import { describe, expect, it } from 'vitest';

import { clamp, makeRng, wpick } from '@/lib/app/breaks/rng';

const U32 = 4294967296;

function draws(seed: number, n: number): number[] {
  const rng = makeRng(seed);
  return Array.from({ length: n }, () => Math.round(rng() * U32));
}

describe('makeRng', () => {
  it('is xorshift32 (13, 17, 5): matches the reference sequence from Marsaglia’s paper', () => {
    // Marsaglia, "Xorshift RNGs" (2003): seeded with 2463534242, the first
    // output of the 13/17/5 generator is 723471715. The next four are pinned
    // from the same algorithm with an unsigned right shift (H2).
    expect(draws(2463534242, 5)).toEqual([
      723471715, 2497366906, 2064144800, 2008045182, 3532304609,
    ]);
  });

  it('pins the sequence for seed 1', () => {
    expect(draws(1, 5)).toEqual([270369, 67634689, 2647435461, 307599695, 2398689233]);
  });

  it('treats seed 0 as the golden-ratio constant rather than locking at zero', () => {
    expect(draws(0, 3)).toEqual(draws(0x9e3779b9, 3));
    expect(draws(0, 3)).toEqual([1359758873, 3761132862, 2075758394]);
  });

  it('reaches the top bit — the signed shift never set it (H2)', () => {
    const rng = makeRng(12345);
    let high = 0;
    for (let i = 0; i < 1000; i++) if (rng() >= 0.5) high++;
    expect(high).toBeGreaterThan(400);
    expect(high).toBeLessThan(600);
  });

  it('stays in [0, 1)', () => {
    const rng = makeRng(99);
    for (let i = 0; i < 10000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('reduces a seed to 32 bits', () => {
    expect(draws(2 ** 32 + 7, 3)).toEqual(draws(7, 3));
  });
});

describe('wpick', () => {
  it('draws in proportion to the weights', () => {
    const rng = makeRng(4);
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 6000; i++)
      counts[
        wpick(rng, [
          ['a', 1],
          ['b', 2],
          ['c', 3],
        ] as Array<['a' | 'b' | 'c', number]>)
      ]++;
    expect(counts.a / 6000).toBeCloseTo(1 / 6, 1);
    expect(counts.b / 6000).toBeCloseTo(2 / 6, 1);
    expect(counts.c / 6000).toBeCloseTo(3 / 6, 1);
  });

  it('never picks a zero-weight entry', () => {
    const rng = makeRng(5);
    for (let i = 0; i < 1000; i++)
      expect(
        wpick(rng, [
          ['x', 0],
          ['y', 1],
        ])
      ).toBe('y');
  });
});

describe('clamp', () => {
  it('clamps to the range', () => {
    expect([clamp(-1, 0, 10), clamp(5, 0, 10), clamp(11, 0, 10)]).toEqual([0, 5, 10]);
  });
});
