/**
 * Songs written in sections (11-e-ii-d): a section's key and the old keys it
 * answers to, a section laid over its song, the one tempo a song in sections
 * plays at, and `songBreak` writing every section of a song in its own meter
 * with the song's arrangement — while a song in one part is the A and the B it
 * always was.
 */

import { describe, expect, it } from 'vitest';

import { generateGood } from '@/lib/app/breaks/critic';
import { deriveB } from '@/lib/app/breaks/generate';
import {
  MAX_BREAK_BARS,
  type SectionLetter,
  lettersOf,
  totalBars,
} from '@/lib/app/breaks/sections';
import { type SongBreak, songBreak, songForSeed } from '@/lib/app/breaks/song-break';
import {
  partKey,
  songBpm,
  songMeter,
  songPaces,
  songOf,
  songPartOf,
  withSong,
} from '@/lib/app/breaks/songs';
import type { Bar, Style, StyleSong } from '@/lib/app/breaks/types';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testStyle } from '@/tests/helpers/catalogue';

const opts = { bars: 2, density: 50, ghosts: 50, bpm: 104 };

function songIn(style: string, key: string): StyleSong {
  const s = songOf(STYLES[style], key);
  if (!s) throw new Error(`no song ${style}/${key}`);
  return s;
}

/** A style of one song, in the sections given, for the cases the catalogue does not hold. */
function styleWith(song: Partial<StyleSong>): Style {
  return {
    ...STYLES.funk,
    swing: 10,
    swingRange: [0, 20],
    songs: [{ key: 'tune', title: 'Tune', feel: 'a tune', weight: 1, params: {}, ...song }],
  };
}

/** The first bar of a section the break must have. */
function first(made: SongBreak, letter: SectionLetter): Bar {
  const bar = made.sections[letter]?.bars[0];
  if (!bar) throw new Error(`no section ${letter}`);
  return bar;
}

const hits = (lane: number[]) => lane.filter(Boolean).length;

describe('a key naming a section', () => {
  it('names a section by its song and letter', () => {
    const part = songPartOf(STYLES.lombardo, 'hell-awaits:B');
    expect(part?.song.key).toBe('hell-awaits');
    expect(part?.section?.label).toBe('the main groove');
  });

  it('is nothing for a letter the song has not got', () => {
    expect(songPartOf(STYLES.lombardo, 'hell-awaits:C')).toBeUndefined();
    expect(songPartOf(STYLES.lombardo, 'no-such-song:A')).toBeUndefined();
  });

  it('reads a bare key of a song in sections as its first section', () => {
    expect(songPartOf(STYLES.lombardo, 'hell-awaits')?.section?.letter).toBe('A');
  });

  /* A pattern saved before the merge recorded one of these. Each must still lay
     the grooves it was written with over the style: the same meter, the same
     figures. */
  it.each([
    ['ringo', 'lucy-verse', 'lucy-in-the-sky:A', '3/4'],
    ['ringo', 'lucy-chorus', 'lucy-in-the-sky:B', '4/4'],
    ['klek', 'sherpa-triplets', 'sherpa:A', '12/8'],
    // the song's own old key was its 4/4 cycle, which is now B
    ['klek', 'sherpa', 'sherpa:B', '4/4'],
    ['klek', 'sarniezz', 'sarniezz:A', '12/8'],
    ['klek', 'sarniezz-modulation', 'sarniezz:B', '4/4'],
    ['klek', 'fabienk', 'fabienk:A', '7/8'],
    ['klek', 'fabienk-part-2', 'fabienk:C', '4/4'],
    // 11-e-ii-f: a song's own key goes to the part most of its one pool was
    ['lombardo', 'raining-blood', 'raining-blood:B', '4/4-8'],
    ['tonywilliams', 'autumn-leaves', 'autumn-leaves:B', '4/4-8'],
    ['klek', 'mata-zyklek', 'mata-zyklek:B', '5/8'],
    ['copeland', 'roxanne', 'roxanne:A', '4/4'],
  ])('reads %s’s old key %s as %s', (style, old, now, meter) => {
    const st = STYLES[style];
    const part = songPartOf(st, old);
    expect(part && partKey(part.song, part.section)).toBe(now);
    expect(withSong(st, old)).toBe(withSong(st, now));
    expect(withSong(st, old).meter ?? '4/4').toBe(meter);
  });

  it('records the section, not the old key, on a pattern written from one', () => {
    const made = generateGood(
      { style: testStyle('klek'), song: 'sherpa-triplets', seed: 3, ...opts },
      180
    );
    expect(made.pattern.song).toBe('sherpa:A');
    expect(made.pattern.meter).toBe('12/8');
  });
});

describe('a section laid over its song', () => {
  it('takes the song’s params and its own, its own winning', () => {
    const intro = withSong(STYLES.lombardo, 'hell-awaits:A');
    const groove = withSong(STYLES.lombardo, 'hell-awaits:B');
    // the song's fills under both
    expect(intro.fills).toBe(songIn('lombardo', 'hell-awaits').params.fills);
    expect(groove.fills).toBe(intro.fills);
    // the intro lifts the style's forced kick; the groove keeps it
    expect(intro.forceKick).toEqual([]);
    expect(groove.forceKick).toEqual(STYLES.lombardo.forceKick);
    expect(groove.figures).not.toBe(intro.figures);
  });

  it('drops the ranges outside the innermost swing named', () => {
    const st = styleWith({
      params: { swing: 40, swingRange: [30, 50] },
      sections: [
        { letter: 'A', label: 'one', params: { swing: 60 } },
        { letter: 'B', label: 'two', params: {} },
        { letter: 'C', label: 'three', params: { swing: 0, swingRange: [0, 10] } },
      ],
    });
    // A names a swing and no range: neither the song's range nor the style's survives
    expect(withSong(st, 'tune:A').swing).toBe(60);
    expect(withSong(st, 'tune:A').swingRange).toBeUndefined();
    // B names none: the song's swing and range
    expect(withSong(st, 'tune:B').swingRange).toEqual([30, 50]);
    expect(withSong(st, 'tune:C').swingRange).toEqual([0, 10]);
  });
});

describe('the tempo of a song in sections', () => {
  it('is one the slowest section can play: the song’s range held to every section’s top', () => {
    const st = styleWith({
      params: { bpm: [100, 180] },
      sections: [
        { letter: 'A', label: 'slow', params: { bpm: [120, 160] } },
        { letter: 'B', label: 'fast', params: { bpm: [110, 140] } },
      ],
    });
    expect(songBpm(st, st.songs?.[0])).toEqual([120, 140]);
  });

  it('names every meter it plays in, the first first', () => {
    expect(songPaces(STYLES.klek, songIn('klek', 'sherpa')).map((p) => p.meter)).toEqual([
      '12/8',
      '4/4',
      '4/4',
    ]);
    expect(songMeter(STYLES.klek, songIn('klek', 'sherpa'))).toBe('12/8');
  });
});

describe('songBreak', () => {
  it('writes Hell Awaits as its intro and its main groove, the forced kick on the groove only', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const made = songBreak({ style: testStyle('lombardo'), song: 'hell-awaits', seed, ...opts });
      expect(lettersOf(made.sections)).toEqual(['A', 'B']);
      expect(made.sections.A.song).toBe('hell-awaits:A');
      expect(made.sections.B.song).toBe('hell-awaits:B');
      expect(made.arrangement).toEqual(['A', 'A', 'B', 'B']);
      // the intro's 1 has no kick in any bar; the groove's has one in every bar
      expect(made.sections.A.bars.map((b) => b.k[0])).not.toContain(1);
      expect(made.sections.B.bars.every((b) => b.k[0] > 0)).toBe(true);
    }
  });

  /* 11-e-ii-f: a song's grooves were one pool, drawn into the same phrase. Each
     section now draws only its own, so a mark of one part never shows in the
     other. */
  it.each([
    // a kick or two under the verse, a rock kick under the chorus
    [
      'copeland',
      'roxanne',
      (s: SongBreak) => hits(first(s, 'A').k) <= 3 && hits(first(s, 'B').k) >= 5,
    ],
    // the bridge rides the floor tom on the eighths, and nothing else does
    [
      'copeland',
      'king-of-pain',
      (s: SongBreak) =>
        hits(first(s, 'C').t3) >= 8 && hits(first(s, 'A').t3) + hits(first(s, 'B').t3) === 0,
    ],
    // the ending crashes on every beat; the skank beat rides
    [
      'lombardo',
      'raining-blood',
      (s: SongBreak) => hits(first(s, 'C').c) >= 4 && hits(first(s, 'B').c) <= 1,
    ],
    // double bass under the snare on every beat, only in the second part
    [
      'lombardo',
      'south-of-heaven',
      (s: SongBreak) => first(s, 'B').k.every(Boolean) && !first(s, 'A').k.every(Boolean),
    ],
    // hats in the verse, the ride in the chorus
    [
      'mitchell',
      'stone-free',
      (s: SongBreak) => hits(first(s, 'A').r) === 0 && hits(first(s, 'B').r) > 0,
    ],
    // no kick on 3 in the verse; four on the floor in the chorus
    [
      'copeland',
      'walking-on-the-moon',
      (s: SongBreak) => first(s, 'A').k[8] === 0 && first(s, 'B').k[8] > 0,
    ],
    // the bridge's snare on the "and" of 3, which the verse never plays
    ['baker', 'badge', (s: SongBreak) => first(s, 'A').s[10] === 0 && first(s, 'B').s[10] > 0],
    // the ride in the verse, the crash ridden in the heavy section
    [
      'davies',
      'torn-by-the-fox',
      (s: SongBreak) => hits(first(s, 'A').c) <= 1 && hits(first(s, 'B').c) >= 4,
    ],
    // the ride in the pre-chorus only
    [
      'klek',
      'mata-zyklek',
      (s: SongBreak) => hits(first(s, 'A').r) > 0 && hits(first(s, 'B').r) === 0,
    ],
    // the snare march with no ride, then the ride section
    [
      'mitchell',
      'are-you-experienced',
      (s: SongBreak) => hits(first(s, 'A').r) === 0 && hits(first(s, 'B').r) > 0,
    ],
    // the ride on the beats in two, the skip beat in double time
    [
      'tonywilliams',
      'autumn-leaves',
      (s: SongBreak) => hits(first(s, 'A').r) <= 4 && hits(first(s, 'B').r) >= 5,
    ],
  ])('writes %s’s %s with each part from its own grooves', (style, song, holds) => {
    for (const seed of [1, 2, 3, 4, 5]) {
      expect(
        holds(songBreak({ style: testStyle(style), song, seed, ...opts })),
        `seed ${seed}`
      ).toBe(true);
    }
  });

  it('writes every section of every song in sections, each in its own meter, in the song’s order', () => {
    for (const key of Object.keys(STYLES).filter((k) => STYLES[k].drummer)) {
      const style = testStyle(key);
      for (const song of style.params.songs ?? []) {
        if (!song.sections) continue;
        const made = songBreak({ style, song: song.key, seed: 9, ...opts });
        const label = `${key}/${song.key}`;
        expect(lettersOf(made.sections), label).toEqual(song.sections.map((x) => x.letter));
        for (const section of song.sections) {
          const pat = made.sections[section.letter];
          expect(pat?.song, label).toBe(partKey(song, section));
          expect(pat?.meter, label).toBe(songMeter(style.params, song, section));
          expect(pat?.bars, label).toHaveLength(section.bars ?? opts.bars);
        }
        expect(made.arrangement, label).toEqual(
          song.arrangement ?? song.sections.map((x) => x.letter)
        );
        expect(made.meter, label).toBe(songMeter(style.params, song));
      }
    }
    // a hundred and more songs in sections now, each written whole
  }, 180_000);

  it('is the A and the B it always was for a song in one part, and for a style without songs', () => {
    for (const [key, song] of [
      ['funk', undefined],
      ['mitchell', 'red-house'],
    ] as const) {
      const style = testStyle(key);
      const meter = song ? songMeter(style.params, songOf(style.params, song)) : '4/4';
      const made = songBreak({ style, song, meter, seed: 11, ...opts });
      const direct = generateGood({ style, song, meter, seed: 11, ...opts }, opts.bpm);
      expect(made.sections.A.bars).toEqual(direct.pattern.bars);
      expect(made.sections.B.bars).toEqual(deriveB(direct.pattern, style.params).bars);
      expect(lettersOf(made.sections)).toEqual(['A', 'B']);
      expect(made.arrangement).toBeNull();
    }
  });

  it('picks the song a seed picks, as generatePattern does, when none is named', () => {
    const style = testStyle('lombardo');
    for (let seed = 0; seed < 40; seed++) {
      const song = songForSeed(style.params, seed, '4/4');
      const made = songBreak({ style, seed, meter: '4/4', ...opts, exact: true });
      expect(made.song?.key).toBe(song?.key);
      expect(lettersOf(made.sections).length).toBe(song?.sections?.length ?? 2);
    }
  });

  it('writes every candidate of an unseeded New in the one song it picked', () => {
    // without `exact`, sixteen candidates are drawn; each picking its own song would
    // write a song in sections as its first section alone
    const style = testStyle('lombardo');
    for (let seed = 0; seed < 30; seed++) {
      const song = songForSeed(style.params, seed, '4/4');
      const made = songBreak({ style, seed, meter: '4/4', ...opts });
      expect(made.song?.key).toBe(song?.key);
      expect(made.sections.A.song).toBe(song?.sections ? `${song.key}:A` : song?.key);
      expect(lettersOf(made.sections)).toHaveLength(song?.sections?.length ?? 2);
    }
  });

  it('writes a named song in its own meter, whatever meter the caller defaulted to', () => {
    const made = songBreak({
      style: testStyle('mitchell'),
      song: 'manic-depression',
      meter: '4/4',
      seed: 1,
      ...opts,
      exact: true,
    });
    expect(made.meter).toBe('9/8');
    expect(made.sections.A.meter).toBe('9/8');
  });

  it('brings the longest sections down until the break fits its bars', () => {
    const st = styleWith({
      sections: (['A', 'B', 'C', 'D', 'E'] as const).map((letter) => ({
        letter,
        label: letter,
        params: {},
      })),
    });
    const made = songBreak({
      style: { key: 'test', versionId: null, version: 1, params: st },
      song: 'tune',
      seed: 1,
      ...opts,
      bars: 8,
      exact: true,
    });
    expect(lettersOf(made.sections)).toHaveLength(5);
    expect(totalBars(made.sections)).toBe(MAX_BREAK_BARS);
  });
});
