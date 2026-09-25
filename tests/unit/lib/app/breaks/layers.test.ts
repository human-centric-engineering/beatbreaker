/**
 * `reduceBar` at layer 1 on the cymbals — the one place the layers do not just
 * drop notes by grid position. A written ride or a shuffle hat that lands on
 * every pulse is thinned to the pulses; one that does not is left to the
 * ordinary eighth-note rule. The rest of the layer rules are exercised through
 * the engraver and the transport.
 *
 * @see lib/app/breaks/layers.ts
 */

import { describe, expect, it } from 'vitest';

import { FULL_LAYER, reduceBar } from '@/lib/app/breaks/layers';
import { M44, groupsOf } from '@/lib/app/breaks/meter';
import { emptyBar } from '@/lib/app/breaks/pattern';

const PULSES = groupsOf(M44).map((g) => g.start);
const onSteps = (row: number[]) => row.flatMap((v, i) => (v ? [i] : []));

describe('reduceBar', () => {
  it('leaves the bar whole at the full layer', () => {
    const bar = emptyBar();
    bar.h = bar.h.map(() => 1);
    bar.s[5] = 1;

    expect(reduceBar(bar, FULL_LAYER, M44, false, true)).toEqual(bar);
  });

  describe('layer 1, a ride on every pulse', () => {
    it('keeps the pulses and turns the bell into a plain ride note', () => {
      const bar = emptyBar();
      bar.r = bar.r.map((_, i) => (i % 2 === 0 ? 1 : 0));
      bar.r[PULSES[1]] = 2; // the bell
      bar.r[3] = 1; // an off-grid swing note

      const out = reduceBar(bar, 1, M44, true, false);

      expect(onSteps(out.r)).toEqual(PULSES);
      expect(out.r[PULSES[1]]).toBe(1);
    });
  });

  describe('layer 1, a ride that misses a pulse', () => {
    it('falls back to eighths rather than to the pulses it happens to hit', () => {
      const bar = emptyBar();
      bar.r = bar.r.map((_, i) => (i % 2 === 0 ? 1 : 0));
      bar.r[PULSES[2]] = 0;
      const eighths = onSteps(bar.r);
      bar.r[3] = 1; // off the eighth grid

      const out = reduceBar(bar, 1, M44, true, false);

      // the eighths between the pulses stay; only the sixteenth goes
      expect(onSteps(out.r)).toEqual(eighths);
      expect(eighths.length).toBeGreaterThan(PULSES.length - 1);
    });
  });

  describe('layer 1, a hat on every pulse', () => {
    it('keeps only the pulses, and closes an open one — a straight beat', () => {
      const bar = emptyBar();
      bar.h = bar.h.map(() => 1);
      bar.h[PULSES[3]] = 3; // open

      const out = reduceBar(bar, 1, M44, false, true);

      expect(onSteps(out.h)).toEqual(PULSES);
      expect(out.h[PULSES[3]]).toBe(1);
    });
  });
});
