/**
 * A song's tempo is held where its written bars stay playable: a run of four or
 * more notes without a gap goes no faster than ten notes a second.
 */

import { describe, expect, it } from 'vitest';

import { RUN_RATE, longestRun, playableBpm, songTempo, withSong } from '@/lib/app/breaks/songs';
import { makeRng } from '@/lib/app/breaks/rng';
import type { Style } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const BASE = testStyle('rock').params;
const style = (over: Partial<Style>): Style => ({ ...BASE, figures: [], fills: [], ...over });

describe('longestRun', () => {
  it('counts consecutive steps with a note in any lane', () => {
    expect(longestRun({ h: '1.1.1.1.', k: '.1......' })).toBe(3);
    expect(longestRun({ s: '22.22.', k: '..1..1' })).toBe(6);
    expect(longestRun({ s: '2.2.3.' })).toBe(1);
  });

  it('reads a shorter row of a fill as written to the end', () => {
    // the kick lands on the last step, after the gap, not on the first
    expect(longestRun({ s: '2..', k: '1' })).toBe(1);
    expect(longestRun({ s: '22.', k: '1' })).toBe(3);
  });
});

describe('playableBpm', () => {
  it('leaves a song without a run alone, however fast', () => {
    const st = style({ bpm: [170, 178], fills: [[{ s: '3.3.3.3.' }, 1]] });
    expect(playableBpm(st)).toEqual([170, 178]);
  });

  it('holds a run of sixteenths to 150 and of sextuplets to 100', () => {
    const run = [[{ s: '2222' }, 1]] as Style['fills'];
    expect(playableBpm(style({ bpm: [140, 170], fills: run }))).toEqual([140, 150]);
    expect(playableBpm(style({ meter: '4/4-6', bpm: [166, 174], fills: run }))).toEqual([100, 100]);
    expect((150 * 4) / 60).toBe(RUN_RATE);
  });

  it('brings the low end down with the top', () => {
    const st = style({ meter: '4/4-6', bpm: [120, 130], figures: [[{ k: '1111' }, 1]] });
    expect(playableBpm(st)).toEqual([100, 100]);
  });
});

describe('a song’s tempo', () => {
  it('is drawn from the playable range, and the merged style says so', () => {
    const bonham = testStyle('bonham').params;
    const rnr = withSong(bonham, 'rock-and-roll');
    expect(rnr.bpm).toEqual([166, 174]);
    // its fills leave a gap between every note
    for (const [f] of rnr.fills ?? []) expect(longestRun(f)).toBeLessThan(4);
    const rng = makeRng(1);
    const song = bonham.songs!.find((s) => s.key === 'rock-and-roll');
    for (let i = 0; i < 50; i++) {
      const bpm = songTempo(bonham, song, rng);
      expect(bpm).toBeGreaterThanOrEqual(166);
      expect(bpm).toBeLessThanOrEqual(174);
    }
  });

  it('never asks any drummer’s song for a run faster than ten notes a second', () => {
    for (const key of ['mitchell', 'bonham', 'ringo', 'stubblefield', 'tonywilliams']) {
      const st = testStyle(key).params;
      for (const song of st.songs ?? []) {
        const merged = withSong(st, song.key);
        expect(merged.bpm).toEqual(playableBpm(merged));
      }
    }
  });
});
