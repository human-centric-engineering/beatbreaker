/**
 * A saved break's top tempo, read from its document (11-e-ii-a): `Break.meter`
 * is A's, and a break in two meters plays at the lower of their ceilings.
 */

import { describe, expect, it } from 'vitest';

import { generatePattern } from '@/lib/app/breaks/generate';
import { breakTopBpm } from '@/lib/app/breaks/saved/top-bpm';
import { breakPayload } from '@/lib/app/breaks/share';
import { testStyle } from '@/tests/helpers/catalogue';

function doc(aMeter: string, bMeter: string) {
  const at = (meter: string) =>
    generatePattern({ style: testStyle('funk'), meter, seed: 4, bars: 1, density: 50, ghosts: 50 });
  return breakPayload({
    bpm: 120,
    swing: 0,
    level: 5,
    arrangement: ['A', 'B'],
    A: at(aMeter),
    B: at(bMeter),
  });
}

describe('breakTopBpm', () => {
  it('is the lower of the sections’ ceilings, whatever the column says', () => {
    expect(breakTopBpm('12/8', doc('12/8', '4/4'))).toBe(190);
    expect(breakTopBpm('4/4-8', doc('4/4-8', '12/8'))).toBe(300);
  });

  it('is the one meter’s ceiling when both sections share it', () => {
    expect(breakTopBpm('6/8', doc('6/8', '6/8'))).toBe(300);
  });

  it('falls back to the column’s meter when the document does not read', () => {
    expect(breakTopBpm('6/8', null)).toBe(300);
    expect(breakTopBpm('4/4', { ver: 99 })).toBe(190);
  });
});
