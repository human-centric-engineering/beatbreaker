/**
 * The four drummers of 11-c — Jabo Starks, Bernard Purdie, Steve Gadd and
 * Omar Hakim: each filed with his family, and every one of his songs writing,
 * at its own tempo, a break the critic passes, in the tempo range it says.
 *
 * `song-tempo.test.ts` holds every drummer's merged range to `playableBpm`,
 * but the merge has already cut it down, so a range written wider than its
 * runs allow passes there. Here the range as written must need no cutting.
 * Bar lengths for every drummer are held in `songs.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { generateGood, playability } from '@/lib/app/breaks/critic';
import { makeRng } from '@/lib/app/breaks/rng';
import { playableBpm, songMeter, songTempo } from '@/lib/app/breaks/songs';
import { STYLES, STYLE_GROUPS } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testStyle } from '@/tests/helpers/catalogue';

const FAMILIES: Record<string, string> = {
  jabostarks: 'Funk drummers',
  bernardpurdie: 'Funk drummers',
  gadd: 'Fusion drummers',
  hakim: 'Fusion drummers',
};

describe.each(Object.keys(FAMILIES))('%s', (key) => {
  const resolved = testStyle(key);
  const st = resolved.params;
  const songs = st.songs ?? [];

  it('is a drummer, filed with his family', () => {
    expect(STYLES[key].drummer).toBe(true);
    const group = STYLE_GROUPS.find(([, keys]) => keys.includes(key));
    expect(group?.[0]).toBe(FAMILIES[key]);
    expect(songs.length).toBeGreaterThan(0);
  });

  it('gives every song a tempo range its runs allow, so none is cut down', () => {
    for (const song of songs) {
      const asWritten = { ...st, ...song.params };
      expect(playableBpm(asWritten), song.key).toEqual(asWritten.bpm);
    }
  });

  it('writes a break the critic passes in every song, at its own tempo', () => {
    const rng = makeRng(7);
    for (const song of songs) {
      for (const seed of [1, 2]) {
        const bpm = songTempo(st, song, rng);
        const res = generateGood(
          { style: resolved, song: song.key, seed, bars: 4, density: 50, ghosts: 50 },
          bpm
        );
        expect(res.pattern.song).toBe(song.key);
        expect(res.pattern.meter).toBe(songMeter(st, song));
        expect(playability(res.pattern, bpm).hard, `${song.key} at ${bpm}`).toBe(true);
      }
    }
  });
});
