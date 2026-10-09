/**
 * The swing a style sets the slider to: somewhere in its range, freshly each
 * time, or its one value where it has none — and, across the whole table, a
 * range that holds the style's own value and is never given to a style whose
 * triplets are written into its meter.
 */

import { describe, expect, it } from 'vitest';

import { swingFor } from '@/lib/app/breaks/styles';
import { meterOf } from '@/lib/app/breaks/meter';
import { TEST_STYLE_KEYS, testStyles } from '@/tests/helpers/catalogue';
import type { Style } from '@/lib/app/breaks/types';

const STYLES = testStyles();

function style(extra: Partial<Style>): Style {
  return { ...STYLES.rock.params, ...extra };
}

describe('swingFor', () => {
  it('gives the style its one value when it has no range', () => {
    expect(swingFor(style({ swing: 37, swingRange: undefined }), '4/4', () => 0.99)).toBe(37);
  });

  it('spans the range from its low end to its high end', () => {
    const st = style({ swing: 80, swingRange: [70, 90] });
    expect(swingFor(st, '4/4', () => 0)).toBe(70);
    expect(swingFor(st, '4/4', () => 0.5)).toBe(80);
    expect(swingFor(st, '4/4', () => 0.999)).toBe(90);
  });

  it('lands somewhere new from press to press', () => {
    const st = style({ swing: 80, swingRange: [60, 100] });
    const seen = new Set(Array.from({ length: 40 }, () => swingFor(st)));
    expect(seen.size).toBeGreaterThan(5);
    for (const v of seen) {
      expect(v).toBeGreaterThanOrEqual(60);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('swings nothing over a compound meter the style was not written in', () => {
    const st = style({ swing: 80, swingRange: [70, 90] });
    expect(swingFor(st, '12/8', () => 0.5)).toBe(0);
    expect(swingFor(st, '6/8', () => 0.5)).toBe(0);
    // a meter whose pulse is not three 8ths still swings
    expect(swingFor(st, '7/8', () => 0.5)).toBe(80);
    // a style written in 12/8 keeps its own value there
    expect(swingFor(style({ meter: '12/8', swing: 0, swingRange: undefined }), '12/8')).toBe(0);
  });

  it('is zero for no style at all', () => {
    expect(swingFor(undefined)).toBe(0);
  });
});

describe('the style table’s swing', () => {
  it('holds each style’s own swing inside its range', () => {
    for (const key of TEST_STYLE_KEYS) {
      const { swing, swingRange } = STYLES[key].params;
      if (!swingRange) continue;
      expect({ key, inside: swingRange[0] <= swing && swing <= swingRange[1] }).toEqual({
        key,
        inside: true,
      });
    }
  });

  it('gives no range to a style whose triplets are its meter', () => {
    for (const key of TEST_STYLE_KEYS) {
      const params = STYLES[key].params;
      // a compound meter has its triplets written in: the slider stays at the style's value
      if (meterOf(params.meter ?? '4/4').sub !== 2) continue;
      expect({ key, range: params.swingRange }).toEqual({ key, range: undefined });
    }
  });
});
