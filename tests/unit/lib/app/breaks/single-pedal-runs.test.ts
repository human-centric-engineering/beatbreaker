/**
 * `singlePedalRuns`: kick runs on one pedal at a double pedal's speed (El
 * Estepario Siberiano). Kept by the generator and passed by the critic as a
 * double pedal's are, without claiming a second pedal.
 */

import { describe, expect, it } from 'vitest';

import { playability } from '@/lib/app/breaks/critic';
import { generatePattern } from '@/lib/app/breaks/generate';
import { emptyBar } from '@/lib/app/breaks/pattern';
import type { Figure, Pattern, ResolvedStyle, Style } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const BASE = testStyle('yussefdayes');
const opts = { bars: 4, density: 50, ghosts: 0 };

// a run of six 16ths on the kick, under a backbeat on 2 and 4
const run: Figure = { h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....111111....' };
const style = (over: Partial<Style>): ResolvedStyle => {
  const { songs: _songs, ...params } = BASE.params;
  return {
    ...BASE,
    params: { ...params, figures: [[run, 1]], fillChance: 0, heelToe: false, ...over },
  };
};

/** A bar of kicks on the given steps, a backbeat on 2 and 4, and the attrs given. */
function kicks(steps: number[], attrs: Pattern['attrs']): Pattern {
  const p = generatePattern({ style: style({}), seed: 1, ...opts, bars: 1 });
  const bar = emptyBar(16);
  for (const i of steps) bar.k[i] = 1;
  bar.s[4] = 2;
  bar.s[12] = 2;
  return { ...p, attrs: { ...p.attrs, ...attrs }, backbeats: [4, 12], bars: [bar] };
}

describe('singlePedalRuns', () => {
  it('keeps a run of six 16ths that a plain single pedal would thin', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const kept = generatePattern({ style: style({ singlePedalRuns: true }), seed, ...opts });
      expect(kept.bars[0].k.slice(6, 12)).toEqual([1, 1, 1, 1, 1, 1]);
      const thinned = generatePattern({ style: style({}), seed, ...opts });
      expect(thinned.bars[0].k.slice(6, 12)).not.toEqual([1, 1, 1, 1, 1, 1]);
    }
  });

  it('passes the run on the critic, which calls it a run without the flag', () => {
    const steps = [0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 13, 14, 15];
    expect(playability(kicks(steps, { singlePedalRuns: true }), 100).hard).toBe(true);
    expect(playability(kicks(steps, {}), 100).hard).toBe(false);
  });

  it('names one pedal, not a double pedal, in the kick check', () => {
    const { checks } = playability(kicks([6, 7, 8, 9], { singlePedalRuns: true }), 100);
    const labels = checks.map((c) => c.label);
    expect(labels).toContain('Kick runs go heel and toe on one pedal');
    expect(labels).not.toContain('Kick runs go to the double pedal');
  });

  it('travels with the pattern and does not turn on the double pedal', () => {
    const pat = generatePattern({ style: style({ singlePedalRuns: true }), seed: 3, ...opts });
    expect(pat.attrs.singlePedalRuns).toBe(true);
    expect(pat.attrs.doubleKick).toBeUndefined();
  });
});
