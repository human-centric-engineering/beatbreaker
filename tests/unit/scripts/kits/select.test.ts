/**
 * Choosing layers and takes by loudness (`scripts/kits/select.ts`).
 *
 * Every shipped slot's dynamics come out of these two functions, from
 * libraries that each name their strokes differently. The cases are the
 * shapes those libraries actually have.
 */

import { describe, expect, it } from 'vitest';

import { chooseLayers, layerVelocities, type Measured } from '@/scripts/kits/select';

/** Karoryfer's shape: `steps` velocity steps of `rr` takes, 3 dB apart, takes within ±0.3 dB. */
function stepped(steps: number, rr: number): Measured[] {
  const out: Measured[] = [];
  for (let v = 1; v <= steps; v++) {
    for (let r = 1; r <= rr; r++) {
      out.push({ id: `vl${String(v).padStart(2, '0')}_rr${r}`, db: -30 + v * 3 + (r - 2) * 0.2 });
    }
  }
  return out;
}

describe('chooseLayers()', () => {
  it('spreads the layers evenly across the range, softest first, with the takes nearest each', () => {
    const chosen = chooseLayers(stepped(10, 4), 4, 3, [0, 14]);
    expect(chosen).toHaveLength(4);
    // the loudest step is 0 dB here; the range reaches 14 dB under it
    const dbs = chosen.map((l) => l.db);
    expect(dbs[3]).toBeCloseTo(-0.2, 0);
    expect(dbs[0]).toBeGreaterThanOrEqual(-15);
    for (let i = 1; i < dbs.length; i++) expect(dbs[i]).toBeGreaterThan(dbs[i - 1]);
    // the top layer is the loudest step's three loudest takes
    expect(chosen[3].ids).toEqual(['vl10_rr2', 'vl10_rr3', 'vl10_rr4']);
  });

  it('never gives one stroke to two layers', () => {
    const ids = chooseLayers(stepped(3, 2), 3, 4).flatMap((l) => l.ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('turns neighbouring single strokes into takes when a library has no round-robins', () => {
    // Virtuosity's snare: thirty strokes, each one louder than the last
    const strokes = Array.from({ length: 30 }, (_, i) => ({ id: `vl${i + 1}`, db: -40 + i * 1.4 }));
    const chosen = chooseLayers(strokes, 4, 3, [0, 18]); // thirteen strokes in range
    expect(chosen.map((l) => l.ids.length)).toEqual([3, 3, 3, 3]);
    for (const layer of chosen) {
      const spread = layer.ids.map((id) => strokes.find((s) => s.id === id)?.db ?? NaN);
      expect(Math.max(...spread) - Math.min(...spread)).toBeLessThanOrEqual(2.8 + 1e-9);
    }
  });

  it('keeps a ghost slot in its own range, under the hits', () => {
    const chosen = chooseLayers(stepped(10, 4), 2, 3, [14, 26]);
    for (const l of chosen) expect(l.db).toBeLessThanOrEqual(-14 + 0.5);
  });

  it('gives fewer layers, not repeats, when there are fewer strokes than asked for', () => {
    const chosen = chooseLayers([{ id: 'only', db: -10 }], 4, 3);
    expect(chosen).toEqual([{ db: -10, ids: ['only'] }]);
  });

  it('chooses the same way whatever order the strokes arrive in', () => {
    const hits = stepped(6, 4);
    const a = chooseLayers(hits, 3, 3);
    const b = chooseLayers([...hits].reverse(), 3, 3);
    expect(b).toEqual(a);
  });

  it('ignores a stroke that measured as silence', () => {
    const chosen = chooseLayers(
      [
        { id: 'dead', db: -Infinity },
        { id: 'ok', db: -6 },
      ],
      1,
      2
    );
    expect(chosen).toEqual([{ db: -6, ids: ['ok'] }]);
  });

  it('returns nothing for nothing', () => {
    expect(chooseLayers([], 4, 3)).toEqual([]);
  });
});

describe('layerVelocities()', () => {
  it('is each layer as an amplitude against the loudest, which is exactly 1', () => {
    const v = layerVelocities([
      { db: -12, ids: ['a'] },
      { db: -6, ids: ['b'] },
      { db: 0, ids: ['c'] },
    ]);
    expect(v).toEqual([0.25, 0.5, 1]);
  });

  it('keeps the velocities strictly rising when two layers round to the same value', () => {
    const v = layerVelocities([
      { db: -0.05, ids: ['a'] },
      { db: -0.04, ids: ['b'] },
      { db: 0, ids: ['c'] },
    ]);
    expect(v[2]).toBe(1);
    expect(v[1]).toBeLessThan(v[2]);
    expect(v[0]).toBeLessThan(v[1]);
  });
});
