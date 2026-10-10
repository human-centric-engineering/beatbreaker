/**
 * A style's songs: picking one, laying it over the style, and the song
 * travelling with the pattern it wrote — through a B, a share code and the
 * catalogue schema.
 */

import { describe, expect, it } from 'vitest';

import { styleParamsSchema } from '@/lib/app/breaks/catalogue/schemas';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { makeRng } from '@/lib/app/breaks/rng';
import { packPattern, patternFromPacked } from '@/lib/app/breaks/share';
import { pickSong, songMeter, songOf, songTempo, withSong } from '@/lib/app/breaks/songs';
import type { Style, StyleSong } from '@/lib/app/breaks/types';
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
    const st = withSong(MITCH.params, 'manic-depression');
    expect(st.meter).toBe('9/8');
    // the record's 210–240, held where its unbroken runs stay playable (`playableBpm`)
    expect(song('manic-depression').params.bpm).toEqual([210, 240]);
    expect(st.bpm).toEqual([150, 150]);
    expect(st.backbeatLane).toBe('hf');
    expect(st.figures).toBe(song('manic-depression').params.figures);
    // not named by the song: the style's
    expect(st.kit).toBe(MITCH.params.kit);
    expect(st.label).toBe('Mitch Mitchell');
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
    const pat = generatePattern({ style: MITCH, song: 'manic-depression', seed: 11, ...opts });
    expect(pat.song).toBe('manic-depression');
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
    expect(packPattern(a).sg).toBe('fire');
    expect(patternFromPacked(packPattern(a)).song).toBe('fire');
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
});
