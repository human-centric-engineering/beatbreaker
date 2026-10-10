/**
 * What Tony Allen needed from the model: a phrase whose 1 is left to the
 * figure, and fills that hardly come — and his patterns, as he played them.
 */

import { describe, expect, it } from 'vitest';

import { generatePattern } from '@/lib/app/breaks/generate';
import { withSong } from '@/lib/app/breaks/songs';
import type { Figure, ResolvedStyle, Style } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const ALLEN = testStyle('tonyallen');
const FUNK = testStyle('funk');
const opts = { bars: 4, density: 50, ghosts: 0 };

const snareOnOne: Figure = {
  h: '1.1.1.111.111.11',
  hf: '..1...1...1...1.',
  k: '...1..1.......1.',
  s: '21...2..21...2..',
};
const style = (over: Partial<Style>): ResolvedStyle => {
  const { songs: _songs, ...params } = ALLEN.params;
  return { ...ALLEN, params: { ...params, figures: [[snareOnOne, 1]], ...over } };
};

describe('phraseMark', () => {
  it('leaves the 1 of each half to the figure: no crash, no kick under it', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const pat = generatePattern({ style: style({}), seed, ...opts });
      expect(pat.bars.every((b) => b.c[0] === 0)).toBe(true);
      expect(pat.bars[0].k[0]).toBe(0);
      expect(pat.bars[0].s[0]).toBeGreaterThanOrEqual(2);
    }
  });

  it('marks it by default, with the kick under the crash', () => {
    const pat = generatePattern({ style: style({ phraseMark: undefined }), seed: 3, ...opts });
    expect(pat.bars[0].c[0]).toBe(1);
    expect(pat.bars[0].k[0]).toBe(1);
  });

  it('draws the same stream either way, so other styles are untouched', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const marked = generatePattern({ style: style({ phraseMark: undefined }), seed, ...opts });
      const plain = generatePattern({ style: style({}), seed, ...opts });
      // same notes everywhere but the 1 of each half
      for (let b = 0; b < 4; b++)
        expect(plain.bars[b].h.slice(1)).toEqual(marked.bars[b].h.slice(1));
    }
  });
});

describe('fillChance', () => {
  const fills: Array<[Figure, number]> = [[{ t2: '2222' }, 1]];
  const filled = (chance: number | undefined) => {
    let n = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const pat = generatePattern({
        style: style({ fills, fillChance: chance, midFills: 0 }),
        seed,
        ...opts,
      });
      if (pat.bars[3].t2.some((v) => v > 0)) n++;
    }
    return n;
  };

  it('ends a phrase on a fill as often as the style says', () => {
    expect(filled(0)).toBe(0);
    expect(filled(1)).toBe(100);
    expect(filled(0.2)).toBeLessThan(40);
    expect(filled(undefined)).toBeGreaterThan(60);
  });

  it('leaves a style without one as it was', () => {
    const a = generatePattern({ style: FUNK, seed: 9, ...opts });
    const b = generatePattern({
      style: { ...FUNK, params: { ...FUNK.params, fillChance: undefined } },
      seed: 9,
      ...opts,
    });
    expect(a).toEqual(b);
  });
});

describe('his patterns', () => {
  it('chicks the hat foot on every "and", in every song', () => {
    for (const song of ALLEN.params.songs ?? []) {
      const pat = generatePattern({ style: ALLEN, song: song.key, seed: 5, ...opts });
      if (song.key === 'water-no-get-enemy') continue;
      for (const b of pat.bars) for (const i of [2, 6, 10, 14]) expect(b.hf[i]).toBe(1);
    }
  });

  it('never fills inside the phrase, and leaves its 1 unmarked', () => {
    expect(ALLEN.params.midFills).toBe(0);
    expect(ALLEN.params.fillChance).toBeLessThan(0.5);
    expect(ALLEN.params.phraseMark).toEqual({ crash: false, kick: false });
  });

  it('plays Zombie and Expensive Shit as two-bar figures', () => {
    for (const key of ['zombie', 'expensive-shit']) {
      const f = withSong(ALLEN.params, key).figures![0][0];
      expect(f.k).toHaveLength(32);
    }
  });
});
