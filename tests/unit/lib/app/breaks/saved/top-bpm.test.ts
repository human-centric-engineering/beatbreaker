/**
 * A saved break's top tempo, read from its document (11-e-ii-a): `Break.meter`
 * is A's, and a section at a tempo ratio holds the break to the top over it.
 */

import { describe, expect, it } from 'vitest';

import { TEMPO_TOP } from '@/lib/app/breaks/audio/transport';
import { generatePattern } from '@/lib/app/breaks/generate';
import { breakTopBpm } from '@/lib/app/breaks/saved/top-bpm';
import type { TempoRatio } from '@/lib/app/breaks/sections';
import { breakPayload } from '@/lib/app/breaks/share';
import { testStyle } from '@/tests/helpers/catalogue';

function doc(aMeter: string, bMeter: string, bRatio?: TempoRatio) {
  const at = (meter: string) =>
    generatePattern({ style: testStyle('funk'), meter, seed: 4, bars: 1, density: 50, ghosts: 50 });
  return breakPayload({
    bpm: 120,
    swing: 0,
    level: 5,
    arrangement: ['A', 'B'],
    A: at(aMeter),
    B: bRatio ? { ...at(bMeter), tempoRatio: bRatio } : at(bMeter),
  });
}

describe('breakTopBpm', () => {
  it('is the Studio’s top in any mix of meters, whatever the column says', () => {
    expect(breakTopBpm('12/8', doc('12/8', '4/4'))).toBe(TEMPO_TOP);
    expect(breakTopBpm('4/4-8', doc('4/4-8', '12/8'))).toBe(TEMPO_TOP);
  });

  it('is half the top when a section plays at ×2', () => {
    expect(breakTopBpm('4/4', doc('4/4', '4/4', 2))).toBe(TEMPO_TOP / 2);
  });

  it('falls back to the column’s meter when the document does not read', () => {
    expect(breakTopBpm('6/8', null)).toBe(TEMPO_TOP);
    expect(breakTopBpm('4/4', { ver: 99 })).toBe(TEMPO_TOP);
  });
});
