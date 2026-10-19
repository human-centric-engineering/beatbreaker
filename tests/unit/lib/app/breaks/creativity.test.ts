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
import type { CustomLanes } from '@/lib/app/breaks/pattern';
import type { LaneKey, Pattern } from '@/lib/app/breaks/types';
import { testStyle, testStyles } from '@/tests/helpers/catalogue';

const STYLES = testStyles();

function faithful(key: string, seed: number): Sections {
  return songBreak({ style: testStyle(key), bars: 2, density: 50, ghosts: 50, seed, bpm: 110 })
    .sections;
}

function twisted(key: string, creativity: number, seed: number, custom?: CustomLanes) {
  const sections = custom
    ? songBreak({ style: testStyle(key), bars: 2, density: 50, ghosts: 50, seed, bpm: 110, custom })
        .sections
    : faithful(key, seed);
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
      custom,
    }),
  };
}

const lane = (p: Pattern, L: LaneKey) => p.bars.map((b) => b[L].join(',')).join('|');
const CYMBALS: LaneKey[] = ['h', 'r', 'hf'];

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
      // a fill is the whole kit for its bar, and says the bar it took
      expect(made.twist?.kept).toMatch(
        made.twist?.title === 'a fill' ? /^every bar of .+ but the last/ : /^everything else of /
      );
    }
  });

  it('says a fill took the last bar, and keeps every bar before it note for note', () => {
    let fills = 0;
    for (let seed = 1; seed <= 60 && fills < 3; seed++) {
      const { sections, made } = twisted('funk', 35, seed);
      if (made.twist?.title !== 'a fill') continue;
      fills++;
      expect(made.twist.kept).toMatch(/^every bar of .+ but the last, where the fill is$/);
      for (const L of lettersOf(sections)) {
        const was = sections[L];
        const now = made.sections[L];
        if (!was || !now) throw new Error(`section ${L} went missing`);
        for (let bi = 0; bi < was.bars.length - 1; bi++) {
          expect(now.bars[bi].k).toEqual(was.bars[bi].k);
          expect(now.bars[bi].s).toEqual(was.bars[bi].s);
        }
      }
    }
    expect(fills).toBeGreaterThan(0);
  });

  it('charts every lane a twist plays in, and keeps what it says it kept', () => {
    for (const key of ['ulrich', 'funk', 'rock', 'bossa']) {
      if (!STYLES[key]) continue;
      for (const creativity of [55, 70, 80, 95, 100]) {
        for (let seed = 1; seed <= 12; seed++) {
          const { sections, made } = twisted(key, creativity, seed);
          if (!made.twist) continue;
          const kept = made.twist.kept;
          for (const L of lettersOf(sections)) {
            const was = sections[L];
            const now = made.sections[L];
            if (!was || !now) throw new Error(`section ${L} went missing`);
            // what is heard is written: a lane with a note in it is on the chart
            for (const ln of Object.keys(now.bars[0]) as LaneKey[]) {
              if (now.bars.some((b) => b[ln].some(Boolean))) expect(now.lanes).toContain(ln);
            }
            if (/cymbal part/.test(kept) && !/^everything else/.test(kept)) {
              for (const c of CYMBALS) expect(lane(now, c)).toBe(lane(was, c));
            }
            if (/kick/.test(kept)) expect(lane(now, 'k')).toBe(lane(was, 'k'));
          }
        }
      }
    }
  });

  it('charts a borrowed ride, and leaves the left foot alone under a borrowed kick', () => {
    // a hats-only break with its own left foot, and a donor that plays the foot too
    const src = testStyle('rock');
    const donor = Object.values(STYLES).find((st) => st.params.foot && st.group !== src.group);
    if (!donor) throw new Error('no donor with a left foot in the catalogue');
    const styles = { rock: src, [donor.key]: donor };
    let rides = 0;
    let kicks = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const written = faithful('rock', seed);
      const sections: Sections = { ...written };
      for (const L of lettersOf(written)) {
        const p = structuredClone(written[L]);
        if (!p) continue;
        p.lanes = [...p.lanes.filter((l) => l !== 'r' && l !== 'hf'), 'hf'];
        for (const b of p.bars) {
          b.r.fill(0);
          b.hf.fill(0);
          b.hf[2] = 1;
          b.hf[10] = 1;
        }
        sections[L] = p;
      }
      const made = creativeBreak({
        sections,
        style: src,
        styles,
        creativity: 95,
        seed,
        density: 50,
        ghosts: 50,
        bpm: 110,
      });
      const title = made.twist?.title ?? '';
      for (const L of lettersOf(sections)) {
        const was = sections[L];
        const now = made.sections[L];
        if (!was || !now) throw new Error(`section ${L} went missing`);
        if (now.bars.some((b) => b.r.some(Boolean))) {
          rides++;
          expect(now.lanes).toContain('r');
        }
        // the toms-for-hats move is the only other one that writes the left foot
        if (title.includes(' kick') && !title.includes('toms for hats')) {
          kicks++;
          expect(lane(now, 'hf')).toBe(lane(was, 'hf'));
        }
      }
    }
    expect(rides).toBeGreaterThan(0);
    expect(kicks).toBeGreaterThan(0);
  });

  it('adds only the floor tom for toms-for-hats, and no left foot your lanes have not got', () => {
    let moved = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const { sections, made } = twisted('rock', 60, seed, { toms: true });
      if (!made.twist?.title.includes('toms for hats')) continue;
      moved++;
      for (const L of lettersOf(made.sections)) {
        const was = sections[L];
        const now = made.sections[L];
        if (!was || !now) throw new Error(`section ${L} went missing`);
        // every lane it ends with was in yours, or is the floor tom it moved the hats onto
        for (const ln of now.lanes) expect([...was.lanes, 't3']).toContain(ln);
        if (!was.lanes.includes('hf'))
          expect(now.bars.every((b) => !b.hf.some(Boolean))).toBe(true);
      }
    }
    expect(moved).toBeGreaterThan(0);
  });

  it('adds no toms to a break whose lanes leave them out', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { made } = twisted('rock', 60, seed, { toms: false });
      expect(made.twist?.title ?? '').not.toContain('toms for hats');
      for (const L of lettersOf(made.sections)) {
        const now = made.sections[L];
        for (const t of ['t1', 't2', 't3'] as const) expect(now?.lanes).not.toContain(t);
      }
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
