/**
 * "Make this a 3:2" (Phase 13-b): a cross-rhythm written from its ratio, its
 * two lanes and one cycle's length — on the grid where the grid holds it, a
 * tuplet span where it does not — as a study of the whole section, learnt a
 * stream a layer like a Polyrhythms entry, or as a fill at the end of a bar
 * of a groove, which the layers play whole from 4.
 */

import { describe, expect, it } from 'vitest';

import {
  type CrossRhythmSpec,
  crossRhythm,
  crossRhythmProblem,
  cycleChoices,
} from '@/lib/app/breaks/cross-rhythm';
import { reducePattern } from '@/lib/app/breaks/layers';
import { patternFromLibrary } from '@/lib/app/breaks/library';
import { meterOf } from '@/lib/app/breaks/meter';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { type BreakDoc, decodeBreak, encodeBreak } from '@/lib/app/breaks/share';
import { POLYRHYTHM_STYLE } from '@/lib/app/breaks/style-keys';
import { tupletStrokes } from '@/lib/app/breaks/tuplets';
import type { Bar, Pattern } from '@/lib/app/breaks/types';
import { POLYRHYTHMS } from '@/prisma/seeds/app-beatbreaker/data/polyrhythms';

function pattern(meter = '4/4', bars = 2): Pattern {
  const steps = meter === '4/4-6' ? 24 : 16;
  return {
    name: 'xr',
    style: 'funk',
    styleVersionId: null,
    attrs: {},
    meter,
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 'h', 'r', 'c'],
    perc: {},
    backbeats: [4, 12],
    bbLane: 's',
    hasRide: false,
    hasHat: true,
    pins: null,
    bars: Array.from({ length: bars }, () => emptyBar(steps)),
  };
}

/** A two-bar groove: hats on eighths, kick on 1 and 3, snare on 2 and 4. */
function groove(): Pattern {
  const pat = pattern();
  for (const bar of pat.bars) {
    for (let i = 0; i < 16; i += 2) bar.h[i] = 1;
    bar.k[0] = 1;
    bar.k[8] = 1;
    bar.s[4] = 2;
    bar.s[12] = 2;
  }
  return pat;
}

const at = (row: number[]) => row.flatMap((v, i) => (v ? [i] : []));

const threeTwo: CrossRhythmSpec = {
  cross: 3,
  pulse: 2,
  crossLane: 't3',
  pulseLane: 's',
  cycle: 8,
  hands: { t3: 'R', s: 'L' },
  as: 'study',
};

describe('a study', () => {
  it('writes a 3:2 in plain 4/4 as a span of three over the pulse’s two', () => {
    const r = crossRhythm(pattern(), threeTwo);
    if (!r.ok) throw new Error(r.reason);
    const p = r.pattern;
    for (const bar of p.bars) {
      expect(at(bar.s)).toEqual([0, 4, 8, 12]);
      expect(bar.s[0]).toBe(3);
      expect(bar.s[4]).toBe(2);
      expect(at(bar.t3)).toEqual([]);
    }
    expect(p.tuplets?.map((t) => [t.bar, t.start, t.span, t.n])).toEqual([
      [0, 0, 8, 3],
      [0, 8, 8, 3],
      [1, 0, 8, 3],
      [1, 8, 8, 3],
    ]);
    expect(p.tuplets?.[0].notes.t3).toEqual([2, 1, 1]);
    expect(p.poly).toEqual({
      device: 'cross-rhythm',
      ratio: '3:2',
      pulse: ['s'],
      cross: ['t3'],
      beat: 8,
      count: 3,
      tuplet: 3,
      hands: { t3: 'R', s: 'L' },
    });
    expect(p.lanes).toContain('t3');
    expect(p.style).toBe(POLYRHYTHM_STYLE);
  });

  it('writes the same 3:2 on the grid in sextuplet 4/4: the library’s own entry', () => {
    const index = POLYRHYTHMS.findIndex((p) =>
      p.title.startsWith('3:2, hands — the three on the floor')
    );
    const entry = patternFromLibrary(POLYRHYTHMS[index], index);
    const r = crossRhythm(pattern('4/4-6', 1), { ...threeTwo, cycle: 12 });
    if (!r.ok) throw new Error(r.reason);
    expect(r.pattern.tuplets).toBeUndefined();
    expect(r.pattern.bars[0].t3).toEqual(entry.bars[0].t3);
    expect(r.pattern.bars[0].s).toEqual(entry.bars[0].s);
    expect(r.pattern.poly).toEqual(entry.poly);
    // the hands are written into the sticking, as a library entry's are (D60)
    expect(r.pattern.sticking).toEqual(entry.sticking);
  });

  it('is the 12-d library entry exactly: 5:4, five on the snare against four on the kick', () => {
    const index = POLYRHYTHMS.findIndex((p) => p.title.startsWith('5:4 — five on the snare'));
    const entry = patternFromLibrary(POLYRHYTHMS[index], index);
    const r = crossRhythm(pattern('4/4', 1), {
      cross: 5,
      pulse: 4,
      crossLane: 's',
      pulseLane: 'k',
      cycle: 16,
      hands: { s: 'R' },
      as: 'study',
    });
    if (!r.ok) throw new Error(r.reason);
    expect(r.pattern.bars[0].k).toEqual(entry.bars[0].k);
    expect(r.pattern.bars[0].s).toEqual(entry.bars[0].s);
    expect(r.pattern.tuplets).toEqual(entry.tuplets);
    expect(r.pattern.poly).toEqual(entry.poly);
  });

  it('builds up a stream a layer: the pulse, the cross-rhythm, both (D54)', () => {
    const r = crossRhythm(pattern(), threeTwo);
    if (!r.ok) throw new Error(r.reason);
    const one = reducePattern(r.pattern, 1);
    expect(at(one.bars[0].s)).toEqual([0, 4, 8, 12]);
    expect(one.tuplets).toBeUndefined();
    const two = reducePattern(r.pattern, 2);
    expect(at(two.bars[0].s)).toEqual([]);
    expect(two.tuplets).toHaveLength(4);
    const three = reducePattern(r.pattern, 3);
    expect(at(three.bars[0].s)).toEqual([0, 4, 8, 12]);
    expect(three.tuplets).toHaveLength(4);
  });

  it('replaces what the section held, and leaves the pattern it was given alone', () => {
    const before = { ...groove(), song: 'hell-awaits:B' };
    const r = crossRhythm(before, threeTwo);
    if (!r.ok) throw new Error(r.reason);
    expect(at(r.pattern.bars[0].h)).toEqual([]);
    expect(at(r.pattern.bars[0].k)).toEqual([]);
    expect(at(before.bars[0].h)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    expect(before.poly).toBeUndefined();
    // the notes are the exercise's, not the song's
    expect(r.pattern.song).toBeUndefined();
  });
});

describe('a fill', () => {
  const fill: CrossRhythmSpec = {
    cross: 3,
    pulse: 2,
    crossLane: 't1',
    pulseLane: 'k',
    cycle: 8,
    as: 'fill',
    bar: 1,
  };

  it('takes the last cycle of its bar, the hands leaving it to the figure', () => {
    const r = crossRhythm(groove(), fill);
    if (!r.ok) throw new Error(r.reason);
    const [first, last] = r.pattern.bars as [Bar, Bar];
    // bar 1 and the first half of bar 2 are the groove
    expect(first).toEqual(groove().bars[0]);
    expect(at(last.h)).toEqual([0, 2, 4, 6]);
    expect(at(last.s)).toEqual([4]);
    // the kick is the pulse, the tom's three a span
    expect(at(last.k)).toEqual([0, 8, 12]);
    expect(r.pattern.tuplets).toEqual([
      { bar: 1, start: 8, span: 8, n: 3, notes: { t1: [2, 1, 1] } },
    ]);
    expect(r.pattern.poly).toBeUndefined();
    expect(r.pattern.lanes).toContain('t1');
  });

  it('is marked as a poly fill, so the layers play the groove below 4 and the figure from 4', () => {
    const r = crossRhythm(groove(), fill);
    if (!r.ok) throw new Error(r.reason);
    expect(r.pattern.polySpans).toEqual([
      expect.objectContaining({ bar: 1, at: 8, span: 8, device: 'tuplet', ratio: '3:2' }),
    ]);
    const three = reducePattern(r.pattern, 3);
    expect(three.tuplets).toBeUndefined();
    expect(three.bars[1].s[12]).toBe(groove().bars[1].s[12]);
    const four = reducePattern(r.pattern, 4);
    expect(four.tuplets).toHaveLength(1);
    expect(at(four.bars[1].h)).toEqual([0, 2, 4, 6]);
  });

  it('writes a cross-rhythm the grid holds on the grid, and names its hands', () => {
    const r = crossRhythm(groove(), {
      ...fill,
      cross: 2,
      pulse: 4,
      crossLane: 's',
      cycle: 8,
      hands: { s: 'L' },
    });
    if (!r.ok) throw new Error(r.reason);
    expect(at(r.pattern.bars[1].s)).toEqual([4, 8, 12]);
    expect(r.pattern.polySpans?.[0]).toMatchObject({ device: 'cross-rhythm', every: 4 });
    expect(r.pattern.sticking?.[1]).toBe('........L...L...');
  });

  it('is refused on a study or a rudiment, which a fill would break', () => {
    const study = crossRhythm(pattern(), threeTwo);
    if (!study.ok) throw new Error(study.reason);
    expect(crossRhythm(study.pattern, fill)).toEqual({
      ok: false,
      reason: expect.stringMatching(/already a cross-rhythm study/),
    });
    expect(crossRhythm({ ...groove(), fixed: true }, fill)).toEqual({
      ok: false,
      reason: expect.stringMatching(/rudiment/),
    });
  });
});

describe('a fill in what the groove already holds', () => {
  const fill: CrossRhythmSpec = {
    cross: 3,
    pulse: 2,
    crossLane: 's',
    pulseLane: 't3',
    cycle: 8,
    hands: { s: 'L' },
    as: 'fill',
    bar: 1,
  };

  it('plays an off-grid figure with the hands it names, carried on its mark', () => {
    const r = crossRhythm(groove(), fill);
    if (!r.ok) throw new Error(r.reason);
    expect(r.pattern.polySpans?.[0].hands).toEqual({ s: 'L' });
    const snare = tupletStrokes(r.pattern, 1).filter((t) => t.lane === 's');
    expect(snare.map((t) => t.hand)).toEqual(['L', 'L', 'L']);
    // and the hands survive a share code
    const doc: BreakDoc = {
      bpm: 90,
      swing: 0,
      level: 5,
      arrangement: ['A', 'B'],
      A: r.pattern,
      B: r.pattern,
    };
    const back = decodeBreak(encodeBreak(doc));
    expect(back.A?.polySpans?.[0].hands).toEqual({ s: 'L' });
  });

  it('refuses a tuplet that starts before the fill and runs into it, rather than cutting it', () => {
    const pat = groove();
    pat.tuplets = [{ bar: 1, start: 4, span: 8, n: 5, notes: { s: [3, 2, 2, 2, 2] } }];
    expect(crossRhythm(pat, fill)).toEqual({
      ok: false,
      reason: expect.stringMatching(/tuplet that starts before the fill/),
    });
  });

  it('keeps a tuplet’s lanes the fill does not clear: the feet under it', () => {
    const pat = groove();
    pat.tuplets = [
      { bar: 1, start: 12, span: 4, n: 5, notes: { s: [2, 2, 2, 2, 2], k: [1, 0, 0, 0, 1] } },
    ];
    const r = crossRhythm(pat, { ...fill, pulseLane: undefined });
    if (!r.ok) throw new Error(r.reason);
    expect(r.pattern.tuplets).toEqual([
      { bar: 1, start: 12, span: 4, n: 5, notes: { k: [1, 0, 0, 0, 1] } },
      expect.objectContaining({ start: 8, span: 8, n: 3 }),
    ]);
  });

  it('takes over a poly fill on its steps, and plays what that one’s low layers did', () => {
    const pat = groove();
    const plainSnare = pat.bars[1].s.slice(8);
    pat.bars[1].s.fill(2, 8);
    pat.polySpans = [
      { bar: 1, at: 8, span: 8, device: 'grouping', every: 4, plain: { s: plainSnare } },
    ];
    const r = crossRhythm(pat, fill);
    if (!r.ok) throw new Error(r.reason);
    expect(r.pattern.polySpans).toHaveLength(1);
    expect(r.pattern.polySpans?.[0].plain.s).toEqual(plainSnare);
  });

  it('refuses a poly fill that starts before it', () => {
    const pat = groove();
    pat.polySpans = [
      { bar: 1, at: 4, span: 12, device: 'grouping', every: 4, plain: { s: Array(12).fill(0) } },
    ];
    expect(crossRhythm(pat, fill)).toEqual({
      ok: false,
      reason: expect.stringMatching(/fill that starts before this one/),
    });
  });

  it('leaves a percussionist’s part playing, and the bar’s hands before it', () => {
    const pat = groove();
    pat.perc = { p2: 'shaker' };
    pat.lanes = [...pat.lanes, 'p2'];
    pat.bars[1].p2.fill(1);
    pat.sticking = [null, 'RLRLRLRLRLRLRLRL'];
    const r = crossRhythm(pat, { ...fill, hands: undefined });
    if (!r.ok) throw new Error(r.reason);
    expect(r.pattern.bars[1].p2.every((v) => v === 1)).toBe(true);
    expect(r.pattern.sticking?.[1]).toBe('RLRLRLRL........');
  });

  it('keeps a clave style’s strokes, and will not lay a tuplet over its snare', () => {
    const clave = { clave: true, claveValue: 4 };
    expect(crossRhythm(groove(), fill, clave)).toEqual({
      ok: false,
      reason: expect.stringMatching(/clave/),
    });
    const r = crossRhythm(groove(), { ...fill, crossLane: 't1', pulseLane: 'k' }, clave);
    if (!r.ok) throw new Error(r.reason);
    // the backbeat on 12 is the clave's, and comes back over the fill
    expect(r.pattern.bars[1].s[12]).toBe(4);
  });
});

describe('what it refuses, and says why', () => {
  it.each<[string, Partial<CrossRhythmSpec>, RegExp]>([
    ['the same count both sides', { cross: 3, pulse: 3 }, /one rhythm/],
    ['a count past nine', { cross: 11 }, /from 2 to 9/],
    ['one lane for both', { pulseLane: 't3' }, /two lanes/],
    ['a study with no pulse lane', { pulseLane: undefined }, /lane for the pulse/],
    ['a cycle the bar does not divide', { cycle: 6 }, /divide the bar/],
    ['a pulse off the grid', { cross: 2, pulse: 3, cycle: 8 }, /do not fall on the grid/],
    ['a bar there is not', { as: 'fill', bar: 5 }, /no bar 6/],
  ])('%s', (_, change, reason) => {
    expect(crossRhythmProblem({ ...threeTwo, ...change }, 16, 2)).toMatch(reason);
  });

  it('a study whose spans would pass the most a pattern holds', () => {
    // three over every eighth for nine bars: 72 spans
    const r = crossRhythm(pattern('4/4', 9), { ...threeTwo, cycle: 2 });
    expect(r).toEqual({ ok: false, reason: expect.stringMatching(/past the 64/) });
  });
});

describe('the cycles offered', () => {
  it('are the bar, half of it and a beat, each once', () => {
    expect(cycleChoices(meterOf('4/4')).map((c) => c.steps)).toEqual([16, 8, 4]);
    expect(cycleChoices(meterOf('4/4-6')).map((c) => c.steps)).toEqual([24, 12, 6]);
    const sixEight = cycleChoices(meterOf('6/8')).map((c) => c.steps);
    expect(new Set(sixEight).size).toBe(sixEight.length);
  });
});
