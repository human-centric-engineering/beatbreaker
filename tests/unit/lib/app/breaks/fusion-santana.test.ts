/**
 * The five drummers of 11-g — Phil Collins, Billy Cobham, Lenny White,
 * Michael Shrieve and Cindy Blackman Santana: each filed with their family,
 * every one of their songs writing, at its own tempo, a break the critic
 * passes, and nothing a song writes needing three hands.
 *
 * `song-tempo.test.ts` holds every drummer's merged range to `playableBpm`,
 * but the merge has already cut it down, so a range written wider than its
 * runs allow passes there. Here the range as written must need no cutting.
 * Bar lengths for every drummer are held in `songs.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { maxBpm } from '@/lib/app/breaks/audio/transport';
import { playability } from '@/lib/app/breaks/critic';
import { generatePattern } from '@/lib/app/breaks/generate';
import { PERC_LANES, handLanes, handsAt, percRoster } from '@/lib/app/breaks/lanes';
import { meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { makeRng } from '@/lib/app/breaks/rng';
import { songBreak } from '@/lib/app/breaks/song-break';
import {
  partKey,
  playableBpm,
  songMeter,
  songParts,
  songTempo,
  withSong,
} from '@/lib/app/breaks/songs';
import type { LaneKey } from '@/lib/app/breaks/types';
import { STYLES, STYLE_GROUPS } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { DRUMMER_MODEL_DIR, readCorpus } from '@/scripts/lineage/read-corpus';
import { testStyle } from '@/tests/helpers/catalogue';

const FAMILIES: Record<string, string> = {
  collins: 'Rock drummers',
  cobham: 'Fusion drummers',
  lennywhite: 'Fusion drummers',
  shrieve: 'Rock drummers',
  cindyblackman: 'Rock drummers',
};

/** The Studio's tempo control stops here. */
const STUDIO_FLOOR = 50;

describe.each(Object.keys(FAMILIES))('%s', (key) => {
  const resolved = testStyle(key);
  const st = resolved.params;
  const songs = st.songs ?? [];

  it('is a drummer, filed with their family', () => {
    expect(STYLES[key].drummer).toBe(true);
    const group = STYLE_GROUPS.find(([, keys]) => keys.includes(key));
    expect(group?.[0]).toBe(FAMILIES[key]);
    expect(songs.length).toBeGreaterThan(0);
  });

  it('gives every song a tempo range its runs allow and the Studio can set', () => {
    // each part as written: a song in one part, or each section laid over its song
    for (const { song, section } of songParts(st)) {
      const key = partKey(song, section);
      const asWritten = { ...st, ...song.params, ...section?.params };
      expect(playableBpm(asWritten), key).toEqual(asWritten.bpm);
      expect(asWritten.bpm[0], key).toBeGreaterThanOrEqual(STUDIO_FLOOR);
      expect(asWritten.bpm[1], key).toBeLessThanOrEqual(maxBpm(songMeter(st, song, section)));
    }
  });

  /* `fitHands` would quietly drop a note from a bar that asks for three hands,
     so a figure written that way never plays as written; the critic cannot
     see it. Each bar here is the figure with the song's percussion slots
     under it, as `writePerc` lays them; a fill is written to the end of the
     bar, as `applyFigureFill` puts it, with the percussion under it too. */
  it('writes no bar that needs three hands with its percussion under it', () => {
    for (const { song, section } of songParts(st)) {
      const key = partKey(song, section);
      const merged = withSong(st, key);
      const n = stepsOf(meterOf(songMeter(st, song, section)));
      const hands = handLanes(percRoster(merged));
      for (const [figure] of merged.figures ?? []) {
        const rows = Object.entries(figure) as Array<[LaneKey, string]>;
        for (let bar = 0; bar * n < (rows[0]?.[1].length ?? 0); bar++) {
          const b = emptyBar(n);
          for (const [lane, row] of rows)
            for (let i = 0; i < n; i++)
              b[lane][i] = row[bar * n + i] === '.' ? 0 : Number(row[bar * n + i]);
          (merged.perc ?? []).forEach((spec, li) => {
            for (const i of spec.steps ?? []) if (i < n) b[PERC_LANES[li]][i] ||= 1;
          });
          for (let i = 0; i < n; i++)
            expect(handsAt(b, i, hands), `${key}, step ${i}`).toBeLessThanOrEqual(2);
        }
      }
      for (const [fill] of merged.fills ?? []) {
        const rows = Object.entries(fill) as Array<[LaneKey, string]>;
        const b = emptyBar(n);
        for (const [lane, row] of rows)
          [...row].forEach((ch, j) => {
            if (ch !== '.') b[lane][n - row.length + j] = Number(ch);
          });
        (merged.perc ?? []).forEach((spec, li) => {
          for (const i of spec.steps ?? []) if (i < n) b[PERC_LANES[li]][i] ||= 1;
        });
        for (let i = 0; i < n; i++)
          expect(handsAt(b, i, hands), `${key}, fill, step ${i}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('writes a break the critic passes in every song, at its own tempo', () => {
    const rng = makeRng(7);
    for (const song of songs) {
      for (const seed of [1, 2]) {
        const bpm = songTempo(st, song, rng);
        const made = songBreak({
          style: resolved,
          song: song.key,
          seed,
          bars: 4,
          density: 50,
          ghosts: 50,
          bpm,
        });
        // every section of a song in sections, each in its own meter; an A of one in one part
        const parts = song.sections ?? [undefined];
        for (const section of parts) {
          const pat = made.sections[section?.letter ?? 'A'];
          const key = partKey(song, section);
          expect(pat?.song, key).toBe(key);
          expect(pat?.meter, key).toBe(songMeter(st, song, section));
          expect(pat && playability(pat, bpm).hard, `${key} at ${bpm}`).toBe(true);
        }
      }
    }
  });
});

describe('Cobham’s two bass drums', () => {
  /* Two Fibes bass drums, not a double pedal; to the generator, the critic
     and the 3D drummer that is `doubleKick`, and Quadrant 4's shuffle is on
     both. */
  it('are on every one of his songs', () => {
    const st = STYLES.cobham;
    expect(st.doubleKick).toBe(true);
    for (const { song, section } of songParts(st)) {
      const pat = generatePattern({
        style: testStyle('cobham'),
        song: partKey(song, section),
        seed: 1,
        bars: 4,
        density: 50,
        ghosts: 50,
      });
      expect(pat.attrs?.doubleKick, song.key).toBe(true);
    }
  });
});

describe('the In the Air Tonight break', () => {
  /* Drumeo's notation: two toms struck together and a kick, in threes down
     the kit, then the floor tom and the kick in turn. */
  it('is two toms together and a kick in threes, then the floor and the kick', () => {
    const song = (STYLES.collins.songs ?? []).find((x) => x.key === 'in-the-air-tonight');
    const [[fill]] = song?.params.fills ?? [];
    const at = (i: number) =>
      (['t1', 't2', 't3', 'k'] as const).filter((l) => (fill[l] ?? '')[i] && fill[l]![i] !== '.');
    for (const i of [0, 1, 3, 4, 6, 7, 9, 10]) expect(at(i), `step ${i}`).toHaveLength(2);
    for (const i of [2, 5, 8, 11, 13, 15]) expect(at(i), `step ${i}`).toEqual(['k']);
    for (const i of [12, 14]) expect(at(i), `step ${i}`).toEqual(['t3']);
  });
});

describe('Cindy Blackman Santana', () => {
  const corpus = readCorpus(DRUMMER_MODEL_DIR);

  /* Tony Williams's record named her `drummer:cindy-blackman-santana` and
     Yussef Dayes's `drummer:cindy-blackman`: two nodes for one person, the
     fault 11-a fixed for Cozy Cole. Her record keeps the first. */
  it('is one person in the model', () => {
    const text = JSON.stringify([...corpus.drummers, ...corpus.recordings]);
    expect(text).not.toMatch(/"drummer:cindy-blackman"/);
    expect(corpus.drummers.map(({ record }) => record.meta.id)).toContain(
      'drummer:cindy-blackman-santana'
    );
  });
});
