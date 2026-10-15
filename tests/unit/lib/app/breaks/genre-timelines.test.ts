/**
 * The two genre styles of 12-f keep their timeline in every bar they write.
 *
 * Agbekor's bell never stops: it is `held`, so a fill does not lift it, and
 * the fills are the left hand's alone, as the lead drum calls over the bell.
 * The mozambique's clave is another player's, on the claves, so nothing lifts
 * or moves it; its bell is the drummer's right hand, which a fill takes away
 * from the fill on and never changes. Sources are in `drumming-research.md`
 * § AI.
 */

import { describe, expect, it } from 'vitest';

import { HANDS_CHECK, playability } from '@/lib/app/breaks/critic';
import { generatePattern } from '@/lib/app/breaks/generate';
import { emptyBar, markFill, writePerc } from '@/lib/app/breaks/pattern';
import type { Bar, Pattern, Style } from '@/lib/app/breaks/types';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testStyle } from '@/tests/helpers/catalogue';

const lit = (row: number[]) => row.flatMap((v, i) => (v ? [i] : []));
const OPTS = [2, 4, 8].flatMap((bars) => [30, 50, 90].map((density) => ({ bars, density })));

/** Every pattern the style writes over 100 seeds and nine shapes. */
function* patterns(key: string): Generator<Pattern> {
  const style = testStyle(key);
  for (let seed = 1; seed <= 100; seed++) {
    for (const o of OPTS)
      yield generatePattern({ style, meter: style.params.meter, seed, ghosts: 50, ...o });
  }
}

const hasToms = (b: Bar) => [...b.t1, ...b.t2, ...b.t3].some(Boolean);

describe('agbekor', () => {
  const BELL = [0, 4, 8, 10, 14, 18, 22];
  const AXATSE = [0, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

  it('plays the bell and the rattle whole in every bar, fills included', () => {
    let filled = 0;
    for (const pat of patterns('agbekor')) {
      expect(pat.meter).toBe('12/8');
      for (const b of pat.bars) {
        expect(lit(b.p1)).toEqual(BELL);
        expect(b.p1[0]).toBe(2);
        expect(lit(b.p2)).toEqual(AXATSE);
        if (hasToms(b)) filled++;
      }
    }
    // the fills were there to cross it
    expect(filled).toBeGreaterThan(100);
  });

  it('never asks for three hands, the bell under every fill', () => {
    for (const pat of patterns('agbekor')) {
      const labels = playability(pat, 150).checks.map((c) => c.label);
      expect(labels).not.toContain(HANDS_CHECK);
    }
  });

  it('has no crash, as the ensemble has no cymbal', () => {
    for (const pat of patterns('agbekor')) for (const b of pat.bars) expect(lit(b.c)).toEqual([]);
  });
});

describe('mozambique', () => {
  const SON_2_3 = [2, 4, 8, 11, 14];
  const BELL = [0, 2, 4, 5, 7, 9, 10, 12, 13, 15];

  it('keeps 2-3 son clave in every bar, and never turns it round', () => {
    for (const pat of patterns('mozambique')) {
      for (const b of pat.bars) expect(lit(b.p2)).toEqual(SON_2_3);
    }
  });

  it('plays the bell in 2-3, or stops it for a fill, and never moves it', () => {
    let cut = 0;
    for (const pat of patterns('mozambique')) {
      for (const b of pat.bars) {
        const bell = lit(b.p1);
        expect(bell).toEqual(BELL.slice(0, bell.length));
        if (bell.length < BELL.length) cut++;
      }
    }
    expect(cut).toBeGreaterThan(100);
  });

  it('accents the snare only on a stroke of the clave', () => {
    for (const pat of patterns('mozambique')) {
      for (const b of pat.bars) {
        for (const [i, v] of b.s.entries()) if (v === 3) expect(SON_2_3).toContain(i);
      }
    }
  });
});

describe('a held timeline', () => {
  const BELL = { inst: 'cowbell', steps: [0, 4, 8, 12, 14] };
  /** A bar of mambo, empty, with a fill from step 12, and the bell written over it. */
  const bellAfterFill = (spec: typeof BELL & { held?: boolean }): number[] => {
    const style: Style = { ...STYLES.mambo, perc: [spec] };
    const pat = generatePattern({
      style: testStyle('mambo'),
      seed: 1,
      bars: 1,
      density: 50,
      ghosts: 0,
    });
    const bar = emptyBar(16);
    markFill(bar, 12);
    pat.bars = [bar];
    pat.perc = { p1: 'cowbell' };
    writePerc(pat, style);
    return lit(pat.bars[0].p1);
  };

  it('keeps playing through a fill on the kit', () => {
    expect(bellAfterFill({ ...BELL, held: true })).toEqual([0, 4, 8, 12, 14]);
  });

  it('is lifted from the fill on when it is not held', () => {
    expect(bellAfterFill(BELL)).toEqual([0, 4, 8]);
  });
});
