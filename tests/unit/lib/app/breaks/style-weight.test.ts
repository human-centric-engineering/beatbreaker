/**
 * How heavily each style is hit (its `weight`, 0–1): what the 3D drummer puts
 * of the arm and the wrist into every downstroke. A style says it, or the
 * drummer plays it from the fingers alone — which is only right for brushes.
 */

import { describe, expect, it } from 'vitest';

import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';

/** The styles played from the fingers and wrist alone, with nothing of the arm. */
const FINGERS_ONLY = new Set(['brushes']);

describe('a style’s weight', () => {
  it('is said by every style but brushes, between 0 and 1', () => {
    const unsaid: string[] = [];
    for (const [key, st] of Object.entries(STYLES)) {
      if (FINGERS_ONLY.has(key)) {
        expect(st.weight, key).toBeUndefined();
        continue;
      }
      if (st.weight === undefined) unsaid.push(key);
      else {
        expect(st.weight, key).toBeGreaterThan(0);
        expect(st.weight, key).toBeLessThanOrEqual(1);
      }
    }
    expect(unsaid).toEqual([]);
  });

  it('puts more arm into a backbeat than a ride, and most into metal', () => {
    const w = (k: string) => STYLES[k].weight ?? 0;
    expect(w('funk')).toBeGreaterThan(w('swing'));
    expect(w('rock')).toBeGreaterThan(w('funk'));
    expect(w('metal')).toBe(1);
    expect(w('jazzballad')).toBeLessThan(w('bebop'));
  });

  it("hits Klek's math rock hard, from the arms", () => {
    expect(STYLES.klek.weight).toBeGreaterThanOrEqual(0.7);
  });
});
