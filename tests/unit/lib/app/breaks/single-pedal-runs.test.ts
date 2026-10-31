/**
 * `singlePedalRuns`: kick runs on one pedal at a double pedal's speed (El
 * Estepario Siberiano). Kept by the generator and passed by the critic as a
 * double pedal's are, without claiming a second pedal, as fast as one foot
 * heel and toe keeps up.
 * And `exercise`: a lesson's bars, of which the critic asks no air.
 */

import { describe, expect, it } from 'vitest';

import { playability } from '@/lib/app/breaks/critic';
import { generatePattern } from '@/lib/app/breaks/generate';
import { meterOf } from '@/lib/app/breaks/meter';
import { emptyBar, keepsKickRuns } from '@/lib/app/breaks/pattern';
import { polyFillContext } from '@/lib/app/breaks/poly-fill';
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
    const one = playability(kicks(steps, { singlePedalRuns: true }), 100);
    expect([one.hard, one.groove]).toEqual([true, true]);
    // a run is a groove rule: the body can play it, a generated groove may not
    const plain = playability(kicks(steps, {}), 100);
    expect([plain.hard, plain.groove]).toEqual([true, false]);
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

describe('keepsKickRuns', () => {
  it('is one question for both pedals, and asked of the poly fill too', () => {
    expect(keepsKickRuns({ doubleKick: true })).toBe(true);
    expect(keepsKickRuns({ singlePedalRuns: true })).toBe(true);
    expect(keepsKickRuns({})).toBe(false);
    expect(keepsKickRuns(undefined)).toBe(false);
    const meter = meterOf('4/4');
    const one = polyFillContext(style({ singlePedalRuns: true }).params, meter, ['s'], [4, 12]);
    const plain = polyFillContext(style({}).params, meter, ['s'], [4, 12]);
    expect([one.kickRuns, plain.kickRuns]).toEqual([true, false]);
  });
});

describe('one foot has a top speed', () => {
  // two bars of 16th runs on the kick: doubles in every bar
  const fast = (attrs: Pattern['attrs']) => {
    const p = kicks([0, 1, 2, 3, 6, 7, 8, 9, 10, 11], attrs);
    return { ...p, bars: [p.bars[0], p.bars[0]] };
  };
  const label = (pat: Pattern, bpm: number) =>
    playability(pat, bpm).checks.find((c) => c.label.startsWith('Kick'))!;
  const speed = (pat: Pattern, bpm: number) =>
    playability(pat, bpm).checks.find((c) => / keep up /.test(c.label))!;

  it('passes one-pedal runs as fast as a foot heel and toe keeps up, and warns past it', () => {
    // FOOT_RATE_RUNS: four strokes in 0.2 s, sixteenths at 225
    expect(speed(fast({ singlePedalRuns: true }), 220).ok).toBe(true);
    const past = speed(fast({ singlePedalRuns: true }), 240);
    expect(past).toEqual({
      ok: false,
      kind: 'body',
      limbs: 'feet',
      label: 'The feet keep up at 240 BPM',
    });
    // a foot that does not play runs heel and toe tops out sooner
    expect(speed(fast({}), 200).ok).toBe(false);
  });

  it('shares the run between two feet on a double pedal', () => {
    expect(speed(fast({ doubleKick: true }), 240)).toEqual({
      ok: true,
      kind: 'body',
      limbs: 'feet',
      label: 'Two feet keep up with the kick at 240 BPM',
    });
    expect(label(fast({ doubleKick: true }), 240).label).toBe('Kick runs go to the double pedal');
  });
});

describe('exercise', () => {
  // the snare in threes over a kick in threes: two steps of air, where a groove needs four
  const threes = (attrs: Pattern['attrs']) => {
    const p = kicks([0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14], { heelToe: true, ...attrs });
    const bar = { ...p.bars[0], s: p.bars[0].s.map((_, i) => ([3, 9, 15].includes(i) ? 2 : 0)) };
    return { ...p, backbeats: [3, 9, 15], bars: [bar] };
  };

  it('asks no air of a lesson bar, and still asks it of the same bar as a groove', () => {
    expect(playability(threes({ exercise: true }), 101).groove).toBe(true);
    const groove = playability(threes({}), 101);
    expect(groove.groove).toBe(false);
    expect(
      groove.checks.find((c) => c.label === 'At least a quarter of every bar is air')?.ok
    ).toBe(false);
  });

  it('travels with the pattern', () => {
    const pat = generatePattern({ style: style({ exercise: true }), seed: 2, ...opts });
    expect(pat.attrs.exercise).toBe(true);
  });
});
