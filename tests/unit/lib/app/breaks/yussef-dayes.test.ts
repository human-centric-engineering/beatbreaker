/**
 * What Yussef Dayes needed from the model: three 16ths on the kick with one
 * foot (Tioga Pass's 3, 3e, 3&) — and his tracks, as Drum Hub transcribed them.
 */

import { describe, expect, it } from 'vitest';

import { playability } from '@/lib/app/breaks/critic';
import { generatePattern } from '@/lib/app/breaks/generate';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { withSong } from '@/lib/app/breaks/songs';
import type { Figure, Pattern, ResolvedStyle, Style } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const DAYES = testStyle('yussefdayes');
const opts = { bars: 4, density: 50, ghosts: 0 };

const tioga: Figure = { h: '1.1.1.1.1.1.1.3.', s: '...22..2....2.2.', k: '1.......111..1..' };
const style = (over: Partial<Style>): ResolvedStyle => {
  const { songs: _songs, ...params } = DAYES.params;
  return { ...DAYES, params: { ...params, figures: [[tioga, 1]], fillChance: 0, ...over } };
};

/** A bar with kicks on the given steps and a backbeat on 2 and 4. */
function kicks(steps: number[], heelToe: boolean): Pattern {
  const p = generatePattern({ style: style({}), seed: 1, ...opts, bars: 1 });
  const bar = emptyBar(16);
  for (const i of steps) bar.k[i] = 1;
  bar.s[4] = 2;
  bar.s[12] = 2;
  return { ...p, attrs: { ...p.attrs, heelToe }, backbeats: [4, 12], bars: [bar] };
}

describe('heelToe', () => {
  it('keeps three 16ths on the kick, where a single foot would lose the middle one', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const heel = generatePattern({ style: style({}), seed, ...opts });
      expect(heel.bars[0].k.slice(8, 11)).toEqual([1, 1, 1]);
      const flat = generatePattern({ style: style({ heelToe: false }), seed, ...opts });
      expect(flat.bars[0].k.slice(8, 11)).toEqual([1, 0, 1]);
    }
  });

  it('passes three on the critic, and still calls four a run', () => {
    expect(playability(kicks([8, 9, 10], true), 95).hard).toBe(true);
    expect(playability(kicks([8, 9, 10], false), 95).hard).toBe(false);
    expect(playability(kicks([8, 9, 10, 11], true), 95).hard).toBe(false);
  });

  it('travels with the pattern', () => {
    expect(generatePattern({ style: DAYES, seed: 3, ...opts }).attrs.heelToe).toBe(true);
  });
});

describe('his tracks', () => {
  it('plays Turquoise Galaxy in sextuplets', () => {
    const pat = generatePattern({ style: DAYES, song: 'turquoise-galaxy', seed: 4, ...opts });
    expect(pat.meter).toBe('4/4-6');
    expect(pat.bars[0].k).toHaveLength(24);
  });

  it('moves the backbeat: Love Is the Message on the "and" of 2, the half-time tracks on 3', () => {
    const [litm] = withSong(DAYES.params, 'love-is-the-message').figures![0];
    expect(litm.s?.[6]).toBe('2');
    expect(litm.s?.[4]).toBe('.');
    for (const key of ['lift-off', 'jamaican-links', 'encore-babylon-burning']) {
      const [f] = withSong(DAYES.params, key).figures![0];
      expect(f.s).toBe('........2.......');
    }
  });

  it('puts a rim click on dotted 8ths in Pon di Plaza', () => {
    const [f] = withSong(DAYES.params, 'pon-di-plaza').figures![0];
    expect(f.s?.slice(0, 16)).toBe('...4..4..4..4...');
  });

  it('plays every track at its record tempo', () => {
    for (const song of DAYES.params.songs ?? []) {
      expect(withSong(DAYES.params, song.key).bpm).toEqual(song.params.bpm);
    }
  });
});
