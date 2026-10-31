/**
 * Written sections and a record's own tempo ratios: a passage of a song that
 * plays its bars in order, as the drummer played them, at the tempo the record
 * goes to — not a pool of grooves drawn at random, and not the nearest ratio
 * the Studio offers.
 */

import { describe, expect, it } from 'vitest';

import { maxBpmOf, minBpmOf } from '@/lib/app/breaks/audio/transport';
import { styleParamsSchema } from '@/lib/app/breaks/catalogue/schemas';
import { generateGood, playability } from '@/lib/app/breaks/critic';
import { generatePattern } from '@/lib/app/breaks/generate';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import {
  MAX_BREAK_BARS,
  isOfferedRatio,
  isTempoRatio,
  ratioLabel,
  ratiosFit,
  totalBars,
} from '@/lib/app/breaks/sections';
import { breakPayload, decodeBreak, encodeBreak } from '@/lib/app/breaks/share';
import { songBreak } from '@/lib/app/breaks/song-break';
import type { Figure, ResolvedStyle, Style, StyleSong } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const FUNK = testStyle('funk');

/** Four bars of a record: a groove, its answer, a tom fill, and a stop. */
const RECORD: Figure[] = [
  { h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1...1.....' },
  { h: '1.1.1.1.1.1.1.1.', s: '....2.......2.2.', k: '1.1.......1.....' },
  { s: '2222............', t1: '....1111........', t3: '........11111111', k: '1...1...1...1...' },
  { c: '1...............', k: '1...............' },
];

function songStyle(
  song: Partial<StyleSong>,
  sectionMore: Record<string, unknown> = {}
): ResolvedStyle {
  const params: Style = {
    ...FUNK.params,
    songs: [
      {
        key: 'record',
        title: 'Record',
        feel: 'a record, bar for bar',
        weight: 1,
        params: { bpm: [150, 150] },
        sections: [
          { letter: 'A', label: 'the verse', params: {}, written: RECORD, ...sectionMore },
          { letter: 'B', label: 'the chorus', params: {}, bars: 2 },
        ],
        arrangement: ['A', 'B', 'A'],
        ...song,
      },
    ],
  };
  return { ...FUNK, params };
}

const gen = (style: ResolvedStyle, seed: number) =>
  generatePattern({ style, song: 'record:A', seed, bars: 2, density: 50, ghosts: 50 });

describe('a written section', () => {
  it('plays its bars in order, as written, whatever the seed', () => {
    const style = songStyle({});
    const first = gen(style, 1);
    expect(first.bars).toHaveLength(4);
    expect(first.bars[0].k.join('')).toBe('1000001000100000');
    expect(first.bars[2].t3.join('')).toBe('0000000011111111');
    expect(first.bars[3].c[0]).toBe(1);
    for (const seed of [2, 77, 4242]) expect(gen(style, seed).bars).toEqual(first.bars);
  });

  it('adds nothing of its own: no ghosts, crash, fill or articulation', () => {
    const p = gen(songStyle({}), 9);
    const notes = p.bars.flatMap((b) => Object.values(b).flatMap((row) => row.filter(Boolean)));
    const written = RECORD.flatMap((f) => Object.values(f).flatMap((r) => [...(r ?? '')])).filter(
      (c) => c !== '.'
    ).length;
    expect(notes).toHaveLength(written);
    expect(p.fills).toBeUndefined();
    expect(p.tuplets).toBeUndefined();
  });

  it('is written in its own meter, whatever meter the caller is in', () => {
    const waltz: Figure[] = [{ h: '1.1.1.1.1.1.', s: '....2...2...', k: '1...........' }];
    const style = songStyle({}, { written: waltz, params: { meter: '3/4' } });
    const p = generatePattern({
      style,
      song: 'record:A',
      meter: '4/4',
      seed: 1,
      bars: 2,
      density: 50,
      ghosts: 50,
    });
    expect(p.meter).toBe('3/4');
    expect(p.bars).toHaveLength(1);
    expect(p.bars[0].s.join('')).toBe('000020002000');
  });

  it('puts every lane it plays on the roster, the toms too', () => {
    const p = gen(songStyle({}), 1);
    expect(p.lanes).toEqual(expect.arrayContaining(['t1', 't3', 'c']));
  });

  it('keeps its length in a whole song, beside a section the picker sizes', () => {
    const made = songBreak({
      style: songStyle({}),
      song: 'record',
      seed: 3,
      bars: 8,
      density: 50,
      ghosts: 50,
      bpm: 150,
    });
    expect(made.sections.A.bars).toHaveLength(4);
    expect(made.sections.B.bars).toHaveLength(2);
    expect(made.arrangement).toEqual(['A', 'B', 'A']);
  });

  it('is never shortened to fit a break; only a section the picker sizes is', () => {
    // fifteen written sections of eight, and two the picker sizes at eight: 136, over the limit
    const eight = Array.from({ length: 8 }, () => RECORD[0]);
    const sections = 'ABCDEFGHIJKLMNOPQ'
      .split('')
      .map((L, i) =>
        i < 15
          ? { letter: L, label: `part ${L}`, params: {}, written: eight }
          : { letter: L, label: `part ${L}`, params: {} }
      );
    const style = songStyle({ sections, arrangement: undefined } as Partial<StyleSong>);
    expect(styleParamsSchema.safeParse(style.params).success).toBe(true);
    const made = songBreak({
      style,
      song: 'record',
      seed: 1,
      bars: 8,
      density: 50,
      ghosts: 50,
      bpm: 150,
    });
    expect(totalBars(made.sections)).toBe(MAX_BREAK_BARS);
    // the record's sections keep every bar; the picker's give way
    for (const L of ['A', 'G', 'O'] as const) expect(made.sections[L]?.bars).toHaveLength(8);
    expect((made.sections.P?.bars.length ?? 0) + (made.sections.Q?.bars.length ?? 0)).toBe(8);
  });
});

describe('the schema', () => {
  const parses = (style: ResolvedStyle) => styleParamsSchema.safeParse(style.params).success;

  it('takes a written section', () => {
    expect(parses(songStyle({}))).toBe(true);
  });

  it('refuses a written section that also names its bars, or draws on grooves or fills', () => {
    expect(parses(songStyle({}, { bars: 4 }))).toBe(false);
    expect(parses(songStyle({}, { params: { figures: [[RECORD[0], 1]] } }))).toBe(false);
    expect(parses(songStyle({}, { params: { fills: [[RECORD[2], 1]] } }))).toBe(false);
  });

  it("refuses a written bar that is not one bar of the section's meter", () => {
    expect(parses(songStyle({}, { written: [{ k: '1.......' }] }))).toBe(false);
    expect(
      parses(songStyle({}, { written: [{ k: '1...........' }], params: { meter: '3/4' } }))
    ).toBe(true);
  });

  it('counts written bars against the break', () => {
    const eight = Array.from({ length: 8 }, () => RECORD[0]);
    const sections = 'ABCDEFGHIJKLMNOPQ'.split('').map((L) => ({
      letter: L,
      label: `part ${L}`,
      params: {},
      written: eight,
    }));
    // seventeen of eight is 136
    expect(parses(songStyle({ sections, arrangement: undefined } as Partial<StyleSong>))).toBe(
      false
    );
  });
});

describe('serving a song', () => {
  const opts = (style: ResolvedStyle, song: string) => ({
    style,
    song,
    seed: 3,
    bars: 2,
    density: 50,
    ghosts: 50,
  });

  it('serves a written section as it is, a groove rule broken or not', () => {
    // bar 4 of the record is a stop: no backbeat
    const made = generateGood(opts(songStyle({}), 'record:A'), 150);
    expect(playability(made.pattern, 150).groove).toBe(false);
    expect(made.tries).toBe(1);
    expect(made.pattern.bars).toHaveLength(RECORD.length);
  });

  it("holds a section of figures to the groove rules, and serves the record's own where none passes", () => {
    const stop: Figure = { c: '1...............', k: '1...............' };
    const groove = RECORD[0];
    const mixed = songStyle({
      sections: [
        {
          letter: 'A',
          label: 'verse',
          params: {
            figures: [
              [stop, 1],
              [groove, 1],
            ],
          },
          bars: 2,
        },
        { letter: 'B', label: 'stop', params: { figures: [[stop, 1]] }, bars: 2 },
      ],
      arrangement: ['A', 'B'],
    });
    for (const seed of [1, 2, 3, 4, 5]) {
      const made = generateGood({ ...opts(mixed, 'record:A'), seed }, 150);
      expect(playability(made.pattern, 150).groove).toBe(true);
    }
    const stops = generateGood(opts(mixed, 'record:B'), 150);
    expect(stops.pattern.song).toBe('record:B');
    expect(playability(stops.pattern, 150).hard).toBe(true);
  });
});

describe('the bar budget', () => {
  it('counts a section the picker sizes as a bar, as the break gives it one', () => {
    const eight = Array.from({ length: 8 }, () => RECORD[0]);
    const seven = eight.slice(0, 7);
    // fifteen of eight and one of seven is 127, and two the picker sizes make 129
    const sections = 'ABCDEFGHIJKLMNOPQR'
      .split('')
      .map((L, i) =>
        i < 16
          ? { letter: L, label: `part ${L}`, params: {}, written: i < 15 ? eight : seven }
          : { letter: L, label: `part ${L}`, params: {} }
      );
    const style = songStyle({ sections, arrangement: undefined } as Partial<StyleSong>);
    expect(styleParamsSchema.safeParse(style.params).success).toBe(false);
    const fits = songStyle({
      sections: sections.slice(0, 17),
      arrangement: undefined,
    } as Partial<StyleSong>);
    expect(styleParamsSchema.safeParse(fits.params).success).toBe(true);
  });
});

describe('the spread of ratios', () => {
  it('leaves the break a tempo: two octaves at most, ×1 counted in', () => {
    expect(ratiosFit([0.25])).toBe(true);
    expect(ratiosFit([0.5, 2])).toBe(true);
    expect(ratiosFit([4, undefined])).toBe(true);
    expect(ratiosFit([0.25, 2])).toBe(false);
    expect(ratiosFit([0.3, 3])).toBe(false);
  });

  it('is refused in a song and on the wire', () => {
    const wide = songStyle({
      sections: [
        { letter: 'A', label: 'slow', params: {}, written: RECORD, tempoRatio: 0.25 },
        { letter: 'B', label: 'fast', params: {}, bars: 2, tempoRatio: 2 },
      ],
    });
    expect(styleParamsSchema.safeParse(wide.params).success).toBe(false);

    const A = gen(songStyle({}, { tempoRatio: 0.25 }), 1);
    const B = { ...generatePattern({ style: FUNK, seed: 2, bars: 1, density: 50, ghosts: 50 }) };
    B.tempoRatio = 2;
    const payload = breakPayload({
      bpm: 200,
      swing: 0,
      level: 5,
      arrangement: ['A' as const, 'B' as const],
      A,
      B,
    });
    const parsed = sharePayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toContain('within ×4 of each other');
  });

  it('never leaves the slider an empty range, whatever reaches it', () => {
    const paces = [
      { meter: '4/4', tempoRatio: 0.25 },
      { meter: '4/4', tempoRatio: 2 },
    ];
    expect(minBpmOf(paces)).toBeLessThanOrEqual(maxBpmOf(paces));
    expect(minBpmOf([{ meter: '4/4', tempoRatio: 0.5 }])).toBe(100);
  });
});

describe("a record's own tempo ratio", () => {
  it('is any ratio from ×¼ to ×4 but ×1, and reads as its fraction', () => {
    expect(isTempoRatio(16 / 15)).toBe(true);
    expect(isTempoRatio(1)).toBe(false);
    expect(isTempoRatio(0.2)).toBe(false);
    expect(isTempoRatio(4.5)).toBe(false);
    expect(isOfferedRatio(16 / 15)).toBe(false);
    expect(isOfferedRatio(2)).toBe(true);
    expect(ratioLabel(16 / 15)).toBe('×16/15');
    expect(ratioLabel(2)).toBe('×2');
    expect(ratioLabel(0.5)).toBe('×½');
  });

  it('plays a section at the record’s tempo, and a share code carries it from version 9', () => {
    const style = songStyle({}, { tempoRatio: 16 / 15 });
    const A = gen(style, 1);
    expect(A.tempoRatio).toBe(16 / 15);
    const B = generatePattern({ style: FUNK, seed: 2, bars: 1, density: 50, ghosts: 50 });
    const doc = { bpm: 150, swing: 0, level: 5, arrangement: ['A' as const, 'B' as const], A, B };
    const payload = breakPayload(doc);
    expect(payload.ver).toBe(9);
    expect(decodeBreak(encodeBreak(doc)).A.tempoRatio).toBe(16 / 15);
    // a v8 header may only carry the ratios the Studio offers
    expect(sharePayloadSchema.safeParse({ ...payload, ver: 8 }).success).toBe(false);
  });

  it('leaves a break at the offered ratios on the version it was', () => {
    const A = gen(songStyle({}, { tempoRatio: 1.5 }), 1);
    const B = generatePattern({ style: FUNK, seed: 2, bars: 1, density: 50, ghosts: 50 });
    const doc = { bpm: 100, swing: 0, level: 5, arrangement: ['A' as const, 'B' as const], A, B };
    expect(breakPayload(doc).ver).toBe(8);
  });
});
