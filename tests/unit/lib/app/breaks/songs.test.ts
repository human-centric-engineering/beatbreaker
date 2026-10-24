/**
 * A style's songs: picking one, laying it over the style, and the song
 * travelling with the pattern it wrote — through a B, a share code and the
 * catalogue schema.
 */

import { describe, expect, it } from 'vitest';

import { styleParamsSchema } from '@/lib/app/breaks/catalogue/schemas';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { makeRng } from '@/lib/app/breaks/rng';
import { packPattern, patternFromPacked } from '@/lib/app/breaks/share';
import {
  partKey,
  pickSection,
  pickSong,
  songMeter,
  songOf,
  songParts,
  songTempo,
  withSong,
} from '@/lib/app/breaks/songs';
import type { Style, StyleSong } from '@/lib/app/breaks/types';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testStyle } from '@/tests/helpers/catalogue';

const MITCH = testStyle('mitchell');
const FUNK = testStyle('funk');
const song = (key: string): StyleSong => {
  const s = songOf(MITCH.params, key);
  if (!s) throw new Error(`no song ${key}`);
  return s;
};

describe('withSong', () => {
  it("lays the song's params over the style's and keeps the rest", () => {
    // a section of a song in sections: the song's params, then the section's
    const md = song('manic-depression');
    const st = withSong(MITCH.params, 'manic-depression:A');
    expect(st.meter).toBe('9/8');
    expect(st.bpm).toEqual(md.params.bpm);
    expect(st.backbeatLane).toBe('hf');
    expect(st.figures).toBe(md.sections?.[0].params.figures);
    // not named by the song: the style's
    expect(st.kit).toBe(MITCH.params.kit);
    expect(st.label).toBe('Mitch Mitchell');
  });

  it('holds a song to the tempo its unbroken runs stay playable at (`playableBpm`)', () => {
    // In from the Storm: the record's 140–160, its runs held to 150
    expect(song('in-from-the-storm').params.bpm).toEqual([140, 160]);
    expect(withSong(MITCH.params, 'in-from-the-storm').bpm).toEqual([140, 150]);
  });

  it("drops the style's swing range for a song that names one swing and no range", () => {
    expect(MITCH.params.swingRange).toBeDefined();
    const fire = withSong(MITCH.params, 'fire');
    expect(fire.swing).toBe(0);
    expect(fire.swingRange).toBeUndefined();
    // and keeps the song's own range where it names one
    expect(withSong(MITCH.params, 'hey-joe').swingRange).toEqual([18, 34]);
  });

  it('gives back the style itself for no song or an unknown one, and the same object twice', () => {
    expect(withSong(MITCH.params, undefined)).toBe(MITCH.params);
    expect(withSong(MITCH.params, 'stairway')).toBe(MITCH.params);
    expect(withSong(FUNK.params, 'fire')).toBe(FUNK.params);
    expect(withSong(MITCH.params, 'fire')).toBe(withSong(MITCH.params, 'fire'));
  });
});

describe('pickSong and songTempo', () => {
  it('picks a section of a song in sections by the weight of its grooves, in the meter asked', () => {
    const lombardo = testStyle('lombardo').params;
    const rb = songOf(lombardo, 'raining-blood');
    if (!rb) throw new Error('no Raining Blood');
    const count: Record<string, number> = {};
    const rng = makeRng(5);
    for (let i = 0; i < 3000; i++) {
      const x = pickSection(lombardo, rb, rng)?.letter ?? '-';
      count[x] = (count[x] ?? 0) + 1;
    }
    // the skank beat's figures weigh 3.2 of 5.6, the riff's 1, the ending's 1.4
    expect(Object.keys(count).sort()).toEqual(['A', 'B', 'C']);
    expect(count.B).toBeGreaterThan(count.C);
    expect(count.C).toBeGreaterThan(count.A);
    // Sherpa picked in 12/8 writes only its 12/8 section
    const klek = testStyle('klek').params;
    const sherpa = songOf(klek, 'sherpa');
    if (!sherpa) throw new Error('no Sherpa');
    for (let i = 0; i < 200; i++) {
      const x = pickSection(klek, sherpa, rng, '12/8');
      expect(x && songMeter(klek, sherpa, x)).toBe('12/8');
    }
    expect(pickSection(MITCH.params, song('little-wing'), rng)).toBeUndefined();
  });

  it('picks every song in time, and only those in the meter asked for', () => {
    const seen = new Set<string>();
    const rng = makeRng(7);
    for (let i = 0; i < 2000; i++) seen.add(pickSong(MITCH.params, rng)!.key);
    expect(seen.size).toBe(MITCH.params.songs!.length);
    for (let i = 0; i < 200; i++) {
      const s = pickSong(MITCH.params, rng, '12/8')!;
      expect(songMeter(MITCH.params, s)).toBe('12/8');
    }
  });

  it('picks nothing for a style without songs, or a meter none of them is in', () => {
    expect(pickSong(FUNK.params, makeRng(1))).toBeUndefined();
    expect(pickSong(MITCH.params, makeRng(1), '7/8')).toBeUndefined();
  });

  it("sets a whole-number tempo inside the song's range, else the style's", () => {
    const rng = makeRng(3);
    for (let i = 0; i < 200; i++) {
      const t = songTempo(MITCH.params, song('little-wing'), rng);
      expect(Number.isInteger(t)).toBe(true);
      expect(t).toBeGreaterThanOrEqual(68);
      expect(t).toBeLessThanOrEqual(74);
    }
    const t = songTempo(FUNK.params, undefined, () => 0);
    expect(t).toBe(FUNK.params.bpm[0]);
  });
});

describe('a pattern written from a song', () => {
  const opts = { bars: 4, density: 50, ghosts: 50 };

  it("is in the song's meter, records the song, and carries the song's feel", () => {
    // the bare key of a song in sections is the section that aliases it
    const pat = generatePattern({ style: MITCH, song: 'manic-depression', seed: 11, ...opts });
    expect(pat.song).toBe('manic-depression:A');
    expect(pat.meter).toBe('9/8');
    expect(pat.bars[0].k).toHaveLength(18);
    expect(pat.bbLane).toBe('hf');
    const joe = generatePattern({ style: MITCH, song: 'hey-joe', seed: 11, ...opts });
    expect(joe.attrs.swingUnit).toBe(16);
  });

  it('picks a song in the meter from the seed when none is named, the same one every time', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const a = generatePattern({ style: MITCH, meter: '12/8', seed, ...opts });
      expect(['voodoo-chile', 'red-house', 'up-from-the-skies', 'catfish-blues']).toContain(a.song);
      expect(generatePattern({ style: MITCH, meter: '12/8', seed, ...opts })).toEqual(a);
    }
  });

  it('records no song for a style without songs', () => {
    const pat = generatePattern({ style: FUNK, seed: 5, ...opts });
    expect('song' in pat).toBe(false);
  });

  it('keeps its song through a B, and plays the B in the same feel', () => {
    const a = generatePattern({ style: MITCH, song: 'up-from-the-skies', seed: 9, ...opts });
    const b = deriveB(a, MITCH.params);
    expect(b.song).toBe('up-from-the-skies');
    expect(b.meter).toBe('12/8');
  });

  it('keeps its song through a share code, and a pattern without one stays without', () => {
    const a = generatePattern({ style: MITCH, song: 'fire', seed: 2, ...opts });
    expect(packPattern(a).sg).toBe('fire:B');
    expect(patternFromPacked(packPattern(a)).song).toBe('fire:B');
    const f = generatePattern({ style: FUNK, seed: 2, ...opts });
    expect('sg' in packPattern(f)).toBe(false);
    expect('song' in patternFromPacked(packPattern(f))).toBe(false);
  });
});

describe('the song schema', () => {
  const base = (songs: unknown): unknown => ({ ...MITCH.params, songs });
  const one = (params: Partial<Style>, key = 'one') => ({
    key,
    title: 'One',
    feel: 'a feel',
    weight: 1,
    params,
  });

  it("passes Mitchell's songs", () => {
    expect(styleParamsSchema.safeParse(MITCH.params).success).toBe(true);
  });

  it('refuses two songs with one key', () => {
    const r = styleParamsSchema.safeParse(base([one({}), one({})]));
    expect(r.success).toBe(false);
  });

  it("refuses a song whose swing is outside the range it ends up with, and takes one that drops the style's", () => {
    expect(
      styleParamsSchema.safeParse(base([one({ swing: 50, swingRange: [0, 20] })])).success
    ).toBe(false);
    // the style's range is [0, 20]: a song naming swing 50 and no range drops it
    expect(styleParamsSchema.safeParse(base([one({ swing: 50 })])).success).toBe(true);
    // a song naming only a range is held to the style's swing
    expect(styleParamsSchema.safeParse(base([one({ swingRange: [30, 40] })])).success).toBe(false);
  });

  it('refuses a song key that is not a slug', () => {
    expect(styleParamsSchema.safeParse(base([one({}, 'Hey Joe')])).success).toBe(false);
  });

  describe('a song in sections', () => {
    const section = (letter: string, params: Partial<Style> = {}, more = {}) => ({
      letter,
      label: `part ${letter}`,
      params,
      ...more,
    });
    const inSections = (sections: unknown[], more = {}, key = 'one') => ({
      ...one({}, key),
      sections,
      ...more,
    });
    const parses = (songs: unknown[]) => styleParamsSchema.safeParse(base(songs)).success;

    it('passes every shipped song in sections', () => {
      for (const key of ['ringo', 'copeland', 'baker', 'lombardo', 'klek'])
        expect(styleParamsSchema.safeParse(STYLES[key]).success, key).toBe(true);
    });

    it('takes sections lettered A, B, C… in order, and refuses a gap or one alone', () => {
      expect(parses([inSections([section('A'), section('B'), section('C')])])).toBe(true);
      expect(parses([inSections([section('A'), section('C')])])).toBe(false);
      expect(parses([inSections([section('B'), section('A')])])).toBe(false);
      expect(parses([inSections([section('A')])])).toBe(false);
    });

    it('refuses an arrangement naming a section the song has not got, or one without sections', () => {
      const two = [section('A'), section('B')];
      expect(parses([inSections(two, { arrangement: ['A', 'B', 'A'] })])).toBe(true);
      expect(parses([inSections(two, { arrangement: ['A', 'C'] })])).toBe(false);
      expect(parses([{ ...one({}), arrangement: ['A'] }])).toBe(false);
    });

    it('refuses sections holding more bars than a break', () => {
      const long = ['A', 'B', 'C', 'D', 'E'].map((L) => section(L, {}, { bars: 7 }));
      expect(parses([inSections(long)])).toBe(false);
    });

    it('refuses a key too long to carry its letter in a pattern', () => {
      const two = [section('A'), section('B')];
      expect(parses([inSections(two, {}, 'a'.repeat(38))])).toBe(true);
      expect(parses([inSections(two, {}, 'a'.repeat(39))])).toBe(false);
    });

    it('refuses an old key another song or section already answers to', () => {
      const aliased = (a: string) => [section('A', {}, { aliases: [a] }), section('B')];
      // a song's own old key is its section's to answer to
      expect(parses([inSections(aliased('one'))])).toBe(true);
      expect(parses([inSections(aliased('two')), one({}, 'two')])).toBe(false);
      expect(parses([inSections(aliased('old')), inSections(aliased('old'), {}, 'three')])).toBe(
        false
      );
    });

    it('refuses a section whose swing is outside the range it ends up with', () => {
      // the style's range is [0, 20]; a section naming swing 50 alone drops it
      expect(parses([inSections([section('A', { swing: 50 }), section('B')])])).toBe(true);
      expect(
        parses([inSections([section('A', { swing: 50, swingRange: [0, 20] }), section('B')])])
      ).toBe(false);
      // a section naming a range only is held to the swing outside it
      expect(parses([inSections([section('A', { swingRange: [30, 40] }), section('B')])])).toBe(
        false
      );
    });
  });
});

describe("a drummer's songs", () => {
  /* A figure whose rows are not one bar of its song's meter, or two (a groove
     whose second bar answers its first, as in I Feel Fine), is skipped by the
     generator without a word, so a row one character short would leave a song
     playing something other than what it says. */
  it("write every figure one or two bars of the song's meter long, and no fill longer than a bar", () => {
    for (const key of Object.keys(STYLES).filter((k) => STYLES[k].drummer)) {
      const st = testStyle(key).params;
      for (const { song, section } of songParts(st)) {
        const steps = stepsOf(meterOf(songMeter(st, song, section)));
        const merged = withSong(st, partKey(song, section));
        for (const [figure] of merged.figures ?? []) {
          const rows = Object.entries(figure);
          const len = rows[0]?.[1].length;
          expect([steps, 2 * steps], `${key}/${song.key} figure`).toContain(len);
          for (const [lane, row] of rows) {
            expect(row, `${key}/${song.key} figure, ${lane}`).toHaveLength(len);
          }
        }
        for (const [fill] of merged.fills ?? []) {
          for (const [lane, row] of Object.entries(fill)) {
            expect(row.length, `${key}/${song.key} fill, ${lane}`).toBeLessThanOrEqual(steps);
          }
        }
      }
    }
  });
});
