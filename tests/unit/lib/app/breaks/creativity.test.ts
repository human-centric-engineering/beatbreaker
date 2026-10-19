/**
 * Creativity: the twist laid over a faithfully written break. Faithful changes
 * nothing; every other band changes something and says what; and however far
 * the slider goes, the kick or the snare of the original comes through
 * untouched — the backbone that keeps it that song.
 */

import { describe, expect, it } from 'vitest';

import { CREATIVE_BANDS, creativeBand, creativeBreak } from '@/lib/app/breaks/creativity';
import { lettersOf, type Sections } from '@/lib/app/breaks/sections';
import { songBreak } from '@/lib/app/breaks/song-break';
import type { Pattern } from '@/lib/app/breaks/types';
import { testStyle, testStyles } from '@/tests/helpers/catalogue';

const STYLES = testStyles();

function faithful(key: string, seed: number): Sections {
  return songBreak({ style: testStyle(key), bars: 2, density: 50, ghosts: 50, seed, bpm: 110 })
    .sections;
}

function twisted(key: string, creativity: number, seed: number) {
  const sections = faithful(key, seed);
  return {
    sections,
    made: creativeBreak({
      sections,
      style: testStyle(key),
      styles: STYLES,
      creativity,
      seed,
      density: 50,
      ghosts: 50,
      bpm: 110,
    }),
  };
}

const lane = (p: Pattern, L: 'k' | 's') => p.bars.map((b) => b[L].join(',')).join('|');

describe('creativeBand', () => {
  it('files the slider into four bands, ends included', () => {
    expect(creativeBand(0).id).toBe('faithful');
    expect(creativeBand(24).id).toBe('faithful');
    expect(creativeBand(25).id).toBe('inspired');
    expect(creativeBand(50).id).toBe('adventurous');
    expect(creativeBand(75).id).toBe('experimental');
    expect(creativeBand(100).id).toBe('experimental');
    // out of range is held to the ends, not undefined
    expect(creativeBand(-5).id).toBe('faithful');
    expect(creativeBand(400).id).toBe('experimental');
    expect(CREATIVE_BANDS.map((b) => b.upTo)).toEqual([24, 49, 74, 100]);
  });
});

describe('creativeBreak', () => {
  it('leaves a Faithful break exactly as it was written', () => {
    const { sections, made } = twisted('ulrich', 10, 7);
    expect(made.twist).toBeNull();
    expect(made.sections).toBe(sections);
  });

  it('makes one named move at Inspired, keeping everything else', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { made } = twisted('funk', 35, seed);
      expect(made.twist?.band).toBe('inspired');
      expect(made.twist?.changed).toHaveLength(1);
      expect(made.twist?.kept).toMatch(/^everything else of /);
    }
  });

  it('always keeps the kick or the snare of the original, at every band and seed', () => {
    for (const key of ['ulrich', 'funk', 'rock', 'bossa']) {
      if (!STYLES[key]) continue;
      for (const creativity of [55, 70, 80, 95, 100]) {
        for (let seed = 1; seed <= 12; seed++) {
          const { sections, made } = twisted(key, creativity, seed);
          for (const L of lettersOf(sections)) {
            const was = sections[L];
            const now = made.sections[L];
            if (!was || !now) throw new Error(`section ${L} went missing`);
            const kickKept = lane(was, 'k') === lane(now, 'k');
            const snareKept = lane(was, 's') === lane(now, 's');
            expect(kickKept || snareKept).toBe(true);
          }
        }
      }
    }
  });

  it('borrows from another drummer at Experimental, and says so', () => {
    let borrowed = 0;
    let layered = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const { made } = twisted('ulrich', 95, seed);
      if (!made.twist) continue;
      expect(made.twist.band).toBe('experimental');
      if (made.twist.from) {
        borrowed++;
        expect(made.twist.from).not.toBe('ulrich');
        // from another shelf entirely, not a kindred style
        expect(STYLES[made.twist.from].group).not.toBe(STYLES.ulrich.group);
        expect(made.twist.changed.join(' ')).toContain(STYLES[made.twist.from].params.label);
      }
      if (made.twist.changed.length >= 2) layered++;
      expect(made.twist.kept).toMatch(/^the .+ of .+/);
    }
    expect(borrowed).toBeGreaterThan(5);
    // and plays it another way on top, almost always
    expect(layered).toBeGreaterThan(7);
  });

  it('is the same twist for the same break, slider and seed', () => {
    const a = twisted('funk', 80, 42).made;
    const b = twisted('funk', 80, 42).made;
    expect(a.twist).toEqual(b.twist);
    expect(a.sections.A.bars).toEqual(b.sections.A.bars);
  });

  it('does not write over the break it was given', () => {
    const { sections } = twisted('rock', 0, 9);
    const before = JSON.stringify(sections);
    creativeBreak({
      sections,
      style: testStyle('rock'),
      styles: STYLES,
      creativity: 100,
      seed: 9,
      density: 50,
      ghosts: 50,
      bpm: 110,
    });
    expect(JSON.stringify(sections)).toBe(before);
  });

  it('leaves a fixed pattern (a rudiment) alone at any setting', () => {
    const { sections } = twisted('rock', 0, 3);
    const fixed: Sections = {
      ...sections,
      A: { ...sections.A, fixed: true },
    };
    const made = creativeBreak({
      sections: fixed,
      style: testStyle('rock'),
      styles: STYLES,
      creativity: 100,
      seed: 3,
      density: 50,
      ghosts: 50,
      bpm: 110,
    });
    expect(made.twist).toBeNull();
    expect(made.sections).toBe(fixed);
  });
});
