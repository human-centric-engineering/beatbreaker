/**
 * A kit per section (16-b-v, D86): a section may name its own kit, as Jimmy
 * Cobb's So What plays its theme on brushes and Davis's solo on sticks. The
 * section's pattern carries the kit, the wire carries it, and a hand on
 * brushes is judged as one: no rebound, so no stick's double.
 */

import { describe, expect, it } from 'vitest';

import { engrave, playedWith } from '@/lib/app/breaks/engrave';
import { generatePattern } from '@/lib/app/breaks/generate';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { BRUSH_DOUBLE, HAND_DOUBLE, limbProblems } from '@/lib/app/breaks/physical';
import { decodeBreak, encodeBreak } from '@/lib/app/breaks/share';
import { songBreak, writePart } from '@/lib/app/breaks/song-break';
import { breakKit, withSong } from '@/lib/app/breaks/songs';
import type { Bar, LaneKey, Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const COBB = testStyle('jimmycobb');

function breakOf(song: string, seed = 7) {
  return songBreak({
    style: COBB,
    song,
    bars: 8,
    density: 50,
    ghosts: 50,
    seed,
    bpm: 137,
  });
}

describe('a section on a kit of its own', () => {
  it('plays So What’s theme on brushes and Davis’s solo on the break’s kit, the theme again after', () => {
    const made = breakOf('so-what');
    expect(made.arrangement).toEqual(['A', 'B', 'A']);
    expect(made.sections.A.kit).toBe('jazzBrushes');
    // the solo names no kit: it plays the break's, the sticks
    expect(made.sections.B).not.toHaveProperty('kit');
  });

  it('puts All Blues’ theme on brushes and its solos on sticks', () => {
    const made = breakOf('all-blues');
    expect(made.sections.A.kit).toBe('jazzBrushes');
    expect(made.sections.B).not.toHaveProperty('kit');
  });

  it('keeps the break on the song’s kit, not the theme’s, though the theme is the song’s first section', () => {
    // the bare song key names section A to `withSong`, whose kit is the theme's
    expect(withSong(COBB.params, 'so-what').kit).toBe('jazzBrushes');
    expect(breakKit(COBB.params, 'so-what')).toBe('virtuosity');
    expect(breakKit(COBB.params, 'so-what:A')).toBe('virtuosity');
    // a song on brushes throughout is a break on brushes
    expect(breakKit(COBB.params, 'blue-in-green')).toBe('jazzBrushes');
    expect(breakKit(COBB.params, undefined)).toBe('virtuosity');
  });

  it('writes the kit on a section written alone, as New A or Regenerate writes it', () => {
    const part = writePart({
      style: COBB,
      song: 'so-what:A',
      meter: '4/4',
      bars: 8,
      density: 50,
      ghosts: 50,
      seed: 3,
      bpm: 137,
    });
    expect(part.pattern.kit).toBe('jazzBrushes');
  });

  it('adds nothing to a song on one kit: no section of it names one', () => {
    for (const song of ['blue-in-green', 'ah-leu-cha', 'kelly-blue']) {
      const made = breakOf(song);
      for (const pat of Object.values(made.sections)) expect(pat).not.toHaveProperty('kit');
    }
  });

  it('travels in a share code and comes back on the same kit', () => {
    const made = breakOf('so-what');
    const doc = {
      ...made.sections,
      arrangement: made.arrangement ?? ['A', 'B'],
      bpm: 137,
      swing: 100,
      level: 5,
    };
    const back = decodeBreak(encodeBreak(doc), (k) => (k === COBB.key ? COBB : undefined));
    expect(back.A.kit).toBe('jazzBrushes');
    expect(back.B).not.toHaveProperty('kit');
  });
});

/** A pattern of one bar, its lanes written as strings (`.` a rest, a digit a note). */
function pattern(meter: string, lanes: Partial<Record<LaneKey, string>>): Pattern {
  const p = generatePattern({
    style: testStyle('funk'),
    meter,
    seed: 1,
    bars: 1,
    density: 50,
    ghosts: 0,
  });
  const n = Object.values(lanes)[0].length;
  const bar: Bar = emptyBar(n);
  for (const [L, row] of Object.entries(lanes) as Array<[LaneKey, string]>)
    bar[L] = [...row].map((c) => (c === '.' ? 0 : Number(c)));
  return { ...p, attrs: {}, sticking: undefined, bars: [bar] };
}

describe('a hand on brushes', () => {
  // two 32nds on the ride, a beat apart: the ride is the lead hand's alone, so each pair is one hand's double
  const pairs = pattern('4/4-32', { r: '11......11......11......11......' });

  it('cannot play a double a stick rebounds, at 120 a 32nd apart', () => {
    const gap = 60 / 120 / 8;
    expect(gap).toBeGreaterThan(HAND_DOUBLE);
    expect(gap).toBeLessThan(BRUSH_DOUBLE);
    expect(limbProblems(pairs, 120)).toEqual([]);
    const brushed = limbProblems(pairs, 120, { brushes: true });
    expect(brushed.length).toBeGreaterThan(0);
    expect(brushed[0]).toMatchObject({ limbs: 'hands', step: 1 });
    expect(brushed[0].why).toMatch(/brush/);
  });

  it('plays the same pairs where the wrist has time: a 32nd apart at 100', () => {
    expect(60 / 100 / 8).toBeGreaterThanOrEqual(BRUSH_DOUBLE);
    expect(limbProblems(pairs, 100, { brushes: true })).toEqual([]);
  });

  it('plays a groove with the hands alternating as sticks do', () => {
    const groove = pattern('4/4', {
      r: '1...1.1.1...1.1.',
      s: '....2.......2...',
      hf: '....1.......1...',
    });
    expect(limbProblems(groove, 180, { brushes: true })).toEqual([]);
  });
});

describe('the chart', () => {
  const brushes = (k: string | undefined) => k === 'jazzBrushes';
  const texts = (pat: Pattern, played?: string) =>
    engrave(pat, null, { scale: 1, perSystem: 2, played })
      .nodes.filter((n) => n.tag === 'text')
      .map((n) => n.text);

  it('says Brushes over the theme and Sticks over the solo, where a break changes between them', () => {
    const made = breakOf('so-what');
    const played = playedWith(made.sections, brushes);
    expect(played).toEqual({ A: 'Brushes', B: 'Sticks' });
    expect(texts(made.sections.A, played.A)).toContain('Brushes');
    expect(texts(made.sections.B, played.B)).toContain('Sticks');
  });

  it('says nothing for a break on one or the other throughout, so its chart is as it was', () => {
    const made = breakOf('ah-leu-cha');
    expect(playedWith(made.sections, brushes)).toEqual({});
    expect(playedWith(made.sections, () => true)).toEqual({});
    const A = made.sections.A;
    expect(engrave(A, null, { scale: 1, perSystem: 2, played: undefined })).toEqual(
      engrave(A, null, { scale: 1, perSystem: 2 })
    );
  });
});
