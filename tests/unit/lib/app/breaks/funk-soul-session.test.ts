/**
 * The four drummers of 11-c — Jabo Starks, Bernard Purdie, Steve Gadd and
 * Omar Hakim: each filed with his family, and every one of his songs written
 * so that what it says is what plays.
 *
 * A figure whose rows are not as long as its song's bar is skipped by the
 * generator without a word, and a tempo range wider than its runs allow is
 * cut down by `playableBpm` just as quietly; both would leave a song playing
 * something other than what it says. And at its own tempo, every song must
 * write a break the critic passes.
 */

import { describe, expect, it } from 'vitest';

import { generateGood, playability } from '@/lib/app/breaks/critic';
import { meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { makeRng } from '@/lib/app/breaks/rng';
import { playableBpm, songMeter, songTempo, withSong } from '@/lib/app/breaks/songs';
import { STYLES, STYLE_GROUPS } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testStyle } from '@/tests/helpers/catalogue';

const FAMILIES: Record<string, string> = {
  jabostarks: 'Funk drummers',
  bernardpurdie: 'Funk drummers',
  gadd: 'Session drummers',
  hakim: 'Session drummers',
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

  it("writes every song's bars at its meter's length", () => {
    for (const song of songs) {
      const steps = stepsOf(meterOf(songMeter(st, song)));
      const merged = withSong(st, song.key);
      for (const [figure] of merged.figures ?? []) {
        for (const [lane, row] of Object.entries(figure)) {
          expect(row, `${song.key} figure, ${lane}`).toHaveLength(steps);
        }
      }
      for (const [fill] of merged.fills ?? []) {
        for (const [lane, row] of Object.entries(fill)) {
          expect(row.length, `${song.key} fill, ${lane}`).toBeLessThanOrEqual(steps);
        }
      }
    }
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
