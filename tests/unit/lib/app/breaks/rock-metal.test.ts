/**
 * The four drummers of 11-e — Ginger Baker, Klek de Poitrine, Dave Lombardo
 * and Adrienne Davies: each filed with their family, every one of their songs
 * writing, at its own tempo, a break the critic passes. The two who played two
 * bass drums say so in every song; Earth's songs stay where the Studio's tempo
 * goes, and the ones counted in eighths keep the kick off the record's
 * sixteenths; Klek's record still keeps the persona's identity private.
 *
 * `song-tempo.test.ts` holds every drummer's written bars to two hands and
 * two feet at the top of the song's range.
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
import { partKey, songMeter, songParts, songTempo, withSong } from '@/lib/app/breaks/songs';
import type { LaneKey } from '@/lib/app/breaks/types';
import { STYLES, STYLE_GROUPS } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { DRUMMER_MODEL_DIR, readCorpus } from '@/scripts/lineage/read-corpus';
import { testStyle } from '@/tests/helpers/catalogue';

const FAMILIES: Record<string, string> = {
  baker: 'Blues and psychedelic rock drummers',
  // by the music they play, not what they wear: Klek's math rock and the Ghoul's hard rock
  klek: 'Progressive and math rock drummers',
  ghoul: 'Hard rock drummers',
  lombardo: 'Thrash metal drummers',
  davies: 'Modern and extreme metal drummers',
  jordison: 'Modern and extreme metal drummers',
  skinny: 'Modern and extreme metal drummers',
  jizmak: 'Thrash metal drummers',
  sleeptoken: 'Modern and extreme metal drummers',
  locust: 'Modern and extreme metal drummers',
};

/** The Studio's tempo control stops here. */
const STUDIO_FLOOR = 50;

/**
 * Earth's songs slower than the floor, counted in eighths: a quarter here is
 * the record's eighth, so an offbeat eighth here is the record's sixteenth,
 * which her grid never reaches. See `drumming-research.md`, §V.
 */
const COUNTED_IN_EIGHTHS = [
  'an-inquest-concerning-teeth',
  'rise-to-glory',
  'rooks-across-the-gate',
];

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

  it('gives every song a tempo range the Studio can set', () => {
    // each part as written: a song in one part, or each section laid over its song
    for (const { song, section } of songParts(st)) {
      const key = partKey(song, section);
      const asWritten = { ...st, ...song.params, ...section?.params };
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

describe('the two bass drums', () => {
  /* Baker and Lombardo played two bass drums, not a double pedal; to the
     generator, the critic and the 3D drummer that is `doubleKick`, and no song
     of theirs leaves one drum behind. */
  it.each(['baker', 'lombardo'])('are on every one of %s’s songs', (key) => {
    const st = STYLES[key];
    expect(st.doubleKick).toBe(true);
    for (const { song, section } of songParts(st)) {
      expect(withSong(st, partKey(song, section)).doubleKick, song.key).toBe(true);
      const pat = generatePattern({
        style: testStyle(key),
        song: partKey(song, section),
        seed: 1,
        bars: 4,
        density: 50,
        ghosts: 50,
      });
      expect(pat.attrs?.doubleKick, song.key).toBe(true);
    }
  });

  it('are on nobody else’s style of the four', () => {
    for (const key of ['klek', 'davies']) expect(STYLES[key].doubleKick).toBeFalsy();
  });
});

describe('Earth’s songs counted in eighths', () => {
  it('names songs Davies has, and nothing else', () => {
    const keys = (STYLES.davies.songs ?? []).map((s) => s.key);
    for (const key of COUNTED_IN_EIGHTHS) expect(keys).toContain(key);
  });

  it.each(COUNTED_IN_EIGHTHS)('%s keeps the kick off the record’s sixteenths', (song) => {
    for (const seed of [1, 2, 3]) {
      const pat = generatePattern({
        style: testStyle('davies'),
        song,
        seed,
        bars: 4,
        density: 50,
        ghosts: 50,
      });
      for (const b of pat.bars) {
        const offbeats = b.k.flatMap((v, i) => (v && i % 2 ? [i] : []));
        expect(offbeats, `${song}, seed ${seed}`).toEqual([]);
      }
    }
  });
});

describe('Klek’s record', () => {
  const corpus = readCorpus(DRUMMER_MODEL_DIR);
  const klek = corpus.drummers.find(({ record }) => record.meta.id === 'drummer:klek-de-poitrine');

  /* `checkCorpus` refuses a stored name, birth or death for any private
     persona; this holds that Klek's record is still one, now it has a style. */
  it('keeps the persona private now it plays', () => {
    expect(klek?.record.beatbreaker?.style_key).toBe('klek');
    const identity: Record<string, unknown> = klek!.record.identity;
    expect(identity.persona).toMatchObject({ real_identity_policy: 'private_do_not_research' });
    for (const f of ['full_name', 'born', 'died']) expect(identity).not.toHaveProperty(f);
  });

  it('gives the style the stage name', () => {
    expect(STYLES.klek.label).toBe(klek?.record.identity.name);
  });
});
