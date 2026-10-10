/**
 * What Tony Williams needed from the model: a meter in eighths so fast swing
 * plays at its real tempo, swing that follows the tempo, and accent cycles that
 * run across the bar line — and his songs written with them.
 */

import { describe, expect, it } from 'vitest';

import { maxBpm } from '@/lib/app/breaks/audio/transport';
import { playability } from '@/lib/app/breaks/critic';
import { engrave } from '@/lib/app/breaks/engrave';
import { generatePattern } from '@/lib/app/breaks/generate';
import {
  METERS,
  isEighths,
  meterOf,
  pulseInfo,
  remapList,
  stepSeconds,
  stepsOf,
  stepsPerQuarter,
} from '@/lib/app/breaks/meter';
import { performStep } from '@/lib/app/breaks/perform';
import { songOf, withSong } from '@/lib/app/breaks/songs';
import { swingAtTempo } from '@/lib/app/breaks/styles';
import type { Figure, ResolvedStyle, Style } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const TONY = testStyle('tonywilliams');
const E8 = meterOf('4/4-8');

describe('4/4 in eighths', () => {
  it('is eight steps of an eighth, the quarter its pulse, up to 380', () => {
    expect(METERS['4/4-8']).toBeDefined();
    expect(stepsOf(E8)).toBe(8);
    expect(stepsPerQuarter(E8)).toBe(2);
    expect(isEighths(E8)).toBe(true);
    expect(isEighths(meterOf('6/8'))).toBe(false);
    expect(pulseInfo(E8)).toBeNull();
    expect(stepSeconds(E8, 300)).toBeCloseTo(0.1);
    expect(maxBpm('4/4-8')).toBe(380);
    // the others keep their ceilings
    expect(maxBpm('4/4')).toBe(190);
    expect(maxBpm('12/8')).toBe(300);
  });

  it('carries a 4/4 beat and its "and" over, and drops the "e" and the "a"', () => {
    expect(remapList([0, 1, 2, 3, 4, 6, 12, 14], meterOf('4/4'), E8)).toEqual([0, 1, 2, 3, 6, 7]);
    expect(remapList([0, 1, 2, 7], E8, meterOf('4/4'))).toEqual([0, 2, 4, 14]);
  });

  it('swings at 100 to a triplet: a third of an eighth, as two thirds of a sixteenth is in 4/4', () => {
    const pat = generatePattern({
      style: TONY,
      song: 'walkin',
      seed: 3,
      bars: 4,
      density: 50,
      ghosts: 0,
    });
    expect(pat.meter).toBe('4/4-8');
    const bar = pat.bars[0];
    bar.r = bar.r.map(() => 1);
    const off = (i: number) =>
      performStep(pat, bar, i, { swing: 100, feel: 0, hats: 0 }).find((v) => v.lane === 'r')!
        .offset;
    expect(off(0)).toBe(0);
    expect(off(1)).toBeCloseTo(0.33, 2);
  });

  it('engraves as the 4/4 it is, with one anchor per eighth', () => {
    const pat = generatePattern({
      style: TONY,
      song: 'so-what',
      seed: 5,
      bars: 2,
      density: 50,
      ghosts: 0,
    });
    const e = engrave(pat, null, { scale: 1, perSystem: 2, guides: false, sticking: false });
    expect(e.steps).toBe(8);
    expect(e.map).toHaveLength(16);
  });
});

describe('swingAtTempo', () => {
  it('is even at 300 and up, a triplet at 200 and below, and widens in between', () => {
    expect(swingAtTempo(360)).toBe(0);
    expect(swingAtTempo(300)).toBe(0);
    expect(swingAtTempo(270)).toBeGreaterThan(20);
    expect(swingAtTempo(270)).toBeLessThan(40);
    expect(swingAtTempo(240)).toBe(60);
    expect(swingAtTempo(200)).toBe(100);
    expect(swingAtTempo(60)).toBe(100);
    for (let b = 100; b < 380; b += 10)
      expect(swingAtTempo(b)).toBeGreaterThanOrEqual(swingAtTempo(b + 10));
  });

  it('is what his swing songs follow, and not his straight ones', () => {
    expect(withSong(TONY.params, 'seven-steps').swingCurve).toBe(true);
    expect(withSong(TONY.params, 'nefertiti').swingCurve).toBe(true);
    expect(withSong(TONY.params, 'cantaloupe-island').swingCurve).toBeFalsy();
    expect(withSong(TONY.params, 'fred').swingCurve).toBeFalsy();
  });
});

describe('cross-rhythms', () => {
  const plain: Figure = { r: '1...1.1.1...1.1.' };
  const style = (over: Partial<Style>): ResolvedStyle => {
    const { songs: _songs, ...params } = TONY.params;
    return {
      ...TONY,
      params: { ...params, figures: [[plain, 1]], fills: undefined, midFills: 0, ...over },
    };
  };
  const opts = { bars: 4, density: 50, ghosts: 0 };

  it('runs a dotted-quarter accent straight over the bar lines', () => {
    const pat = generatePattern({
      style: style({ crossRhythm: 1, crossRhythms: [[{ every: 6, lanes: { s: 5 }, bars: 3 }, 1]] }),
      seed: 2,
      ...opts,
    });
    const steps = pat.bars
      .slice(1)
      .flatMap((b, bi) => b.s.flatMap((v, i) => (v === 5 ? [bi * 16 + i] : [])));
    // every six sixteenths from the start of bar 2: 0, 6, 12, 18 …, crossing into bars 3 and 4
    expect(steps.slice(0, 8)).toEqual([0, 6, 12, 18, 24, 30, 36, 42]);
  });

  it('draws nothing at 0, so a style without one is untouched', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const off = generatePattern({ style: style({ crossRhythm: 0 }), seed, ...opts });
      expect(generatePattern({ style: style({}), seed, ...opts })).toEqual(off);
    }
  });
});

describe('his songs', () => {
  it('writes the fast tunes in eighths at their real tempo, and the rest in their own meters', () => {
    for (const key of ['seven-steps', 'so-what', 'walkin', 'madness']) {
      const st = withSong(TONY.params, key);
      expect(st.meter).toBe('4/4-8');
      expect(st.bpm[1]).toBeGreaterThan(190);
      expect(st.bpm[1]).toBeLessThanOrEqual(maxBpm('4/4-8'));
    }
    expect(withSong(TONY.params, 'footprints').meter).toBe('12/8');
    expect(withSong(TONY.params, 'frankenstein').meter).toBe('3/4');
    expect(withSong(TONY.params, 'maiden-voyage').meter).toBeUndefined();
  });

  it('leaves the foot off most of the 1964 bars, as Goodman hears it', () => {
    const fig = songOf(TONY.params, 'so-what')!.params.figures!;
    expect(fig[0][0].hf).toBeUndefined();
    expect(fig.some(([f]) => f.hf)).toBe(true);
  });

  it('serves a playable pattern for every song at its own tempo', () => {
    for (const song of TONY.params.songs ?? []) {
      const st = withSong(TONY.params, song.key);
      const bpm = (st.bpm[0] + st.bpm[1]) / 2;
      let soft = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const pat = generatePattern({
          style: TONY,
          song: song.key,
          seed,
          bars: 4,
          density: 50,
          ghosts: 50,
        });
        if (!playability(pat, bpm).hard) soft++;
      }
      expect({ song: song.key, soft: soft <= 3 }).toEqual({ song: song.key, soft: true });
    }
  });
});
