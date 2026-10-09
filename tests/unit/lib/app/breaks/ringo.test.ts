/**
 * What Ringo Starr needed from the model: grooves two bars long, fills that
 * come off the floor tom, an 11/8 bar, and the two sounds of his kits — and
 * his songs written with them.
 */

import { describe, expect, it } from 'vitest';

import { maxBpm } from '@/lib/app/breaks/audio/transport';
import { applyFill, generatePattern } from '@/lib/app/breaks/generate';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { meterOf, pulseInfo, stepsOf } from '@/lib/app/breaks/meter';
import { makeRng } from '@/lib/app/breaks/rng';
import { songMeter, withSong } from '@/lib/app/breaks/songs';
import type { Figure, LaneKey, ResolvedStyle, Style } from '@/lib/app/breaks/types';
import { KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';
import { testStyle } from '@/tests/helpers/catalogue';

const RINGO = testStyle('ringo');

describe('two-bar figures', () => {
  const pair: Figure = {
    h: '1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.',
    k: '1...1...1...1...1.......1.1.....',
    s: '2...2...2...2.......2.......2...',
  };
  const style = (over: Partial<Style>): ResolvedStyle => {
    const { songs: _songs, ...params } = RINGO.params;
    return {
      ...RINGO,
      params: { ...params, figures: [[pair, 1]], midFills: 0, anticipate: 0, ...over },
    };
  };

  it('plays the first bar, then the second, in turn through the phrase', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const pat = generatePattern({ style: style({}), seed, bars: 4, density: 50, ghosts: 0 });
      // the snare tells the two bars apart: on every beat, then on 2 and 4 only
      const hits = (v: number[]) => v.flatMap((x, i) => (x >= 2 ? [i] : []));
      expect(hits(pat.bars[0].s)).toEqual([0, 4, 8, 12]);
      expect(hits(pat.bars[1].s)).toEqual([4, 12]);
      expect(hits(pat.bars[2].s)).toEqual([0, 4, 8, 12]);
    }
  });

  it('leaves one-bar figures exactly as they were', () => {
    const one: Figure = { h: '1.1.1.1.1.1.1.1.', k: '1.......1.......', s: '....2.......2...' };
    const pat = generatePattern({
      style: style({ figures: [[one, 1]] }),
      seed: 4,
      bars: 4,
      density: 50,
      ghosts: 0,
    });
    expect(pat.bars.every((b) => b.s[4] >= 2 && b.s[12] >= 2)).toBe(true);
  });
});

describe('fillOrder', () => {
  const lanes: LaneKey[] = ['k', 's', 'h', 'r', 'c', 't1', 't2', 't3'];
  const first = (order?: LaneKey[]) => {
    const seen: LaneKey[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const b = applyFill(makeRng(seed), emptyBar(16), meterOf('4/4'), lanes, order);
      for (let i = 0; i < 16; i++) {
        const hit = (['t1', 't2', 't3'] as LaneKey[]).find((L) => b[L][i]);
        if (hit) {
          seen.push(hit);
          break;
        }
      }
    }
    return seen;
  };

  it('goes round the toms high to floor by default, and from the floor tom for a left-hander', () => {
    expect(first().every((L) => L === 't1')).toBe(true);
    expect(first(['t3', 't1', 't2']).every((L) => L === 't3')).toBe(true);
  });

  it('is what Ringo sets', () => {
    expect(RINGO.params.fillOrder).toEqual(['t3', 't1', 't2']);
  });
});

describe('11/8', () => {
  it('is three, three, three and two eighths, twenty-two steps', () => {
    const m = meterOf('11/8');
    expect(stepsOf(m)).toBe(22);
    expect(pulseInfo(m)).toBeNull();
    expect(maxBpm('11/8')).toBe(190);
    expect(
      songMeter(
        RINGO.params,
        RINGO.params.songs!.find((s) => s.key === 'here-comes-the-sun-bridge')
      )
    ).toBe('11/8');
  });
});

describe('his kits', () => {
  it('rings in the early sixties and is short and dry under tea towels', () => {
    const sixties = KITS.sixties;
    const towels = KITS.teatowel;
    expect(sixties && towels).toBeTruthy();
    expect(towels.t.decay ?? 0).toBeLessThan((sixties.t.decay ?? 0) / 2);
    expect(towels.master.room ?? 0).toBeLessThan(sixties.master.room ?? 0);
    expect(sixties.h.open ?? 0).toBeGreaterThan(towels.h.open ?? 0);
  });

  it('puts the 1968–69 songs on tea towels and Lady Madonna on brushes', () => {
    expect(RINGO.params.kit).toBe('sixties');
    for (const key of ['come-together', 'hey-jude', 'the-end', 'get-back'])
      expect(withSong(RINGO.params, key).kit).toBe('teatowel');
    expect(withSong(RINGO.params, 'lady-madonna').kit).toBe('brush');
  });
});

describe('his songs', () => {
  it('splits a song that changes meter into its sections', () => {
    expect(withSong(RINGO.params, 'lucy-verse').meter).toBe('3/4');
    expect(withSong(RINGO.params, 'lucy-chorus').meter).toBeUndefined();
    expect(withSong(RINGO.params, 'all-you-need-is-love').meter).toBe('7/4');
    expect(withSong(RINGO.params, 'good-morning').meter).toBe('5/4');
  });

  it("writes Come Together's lick and A Day in the Life's fills in sextuplets", () => {
    for (const key of ['come-together', 'a-day-in-the-life']) {
      const pat = generatePattern({
        style: RINGO,
        song: key,
        seed: 7,
        bars: 4,
        density: 50,
        ghosts: 0,
      });
      expect(pat.meter).toBe('4/4-6');
      expect(pat.song).toBe(key);
      expect(pat.bars[0].k).toHaveLength(24);
    }
  });
});
