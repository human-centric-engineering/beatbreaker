/**
 * Sections as long as the part of the record they are (16-b-i, D76): past the
 * eight bars a section was a container of, up to `MAX_SECTION_BARS`; a bar a
 * section plays again written once — `{ again, times }` in the catalogue,
 * `=k` on the wire (v11) — and counted once against what a break holds.
 */

import { describe, expect, it } from 'vitest';

import { styleParamsSchema } from '@/lib/app/breaks/catalogue/schemas';
import { generatePattern } from '@/lib/app/breaks/generate';
import { clonePattern, emptyBar } from '@/lib/app/breaks/pattern';
import { patternSchema, sharePayloadSchema, storedPayloadSchema } from '@/lib/app/breaks/schema';
import {
  MAX_BREAK_BARS,
  MAX_SECTION_BARS,
  distinctBars,
  totalBars,
} from '@/lib/app/breaks/sections';
import {
  SHARE_VERSION,
  SHARE_VERSION_TEMPO_MAPS,
  type BreakDoc,
  breakDocFromPayload,
  breakPayload,
  decodeBreak,
  encodeBreak,
} from '@/lib/app/breaks/share';
import { isWrittenRepeat, playWritten, songBars, writtenLength } from '@/lib/app/breaks/songs';
import type { Figure, Pattern, ResolvedStyle, Style, WrittenBar } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const FUNK = testStyle('funk');

/** A theme that alternates two bars, as Mirage's does. */
const THEME: Figure[] = [
  { h: '1.1.1.1.1.1.1.1.', s: '........2.......', k: '1.............1.' },
  { h: '1.1.1.1.1.1.1.1.', s: '........2.......', k: '1.....1.......1.' },
];

/** A tuplet on the theme's first bar: a quintuplet on the toms, over its last beat. */
const QUINT = { bar: 0, start: 12, span: 4, n: 5, notes: { t1: '11111' } };

function songWith(written: WrittenBar[], tuplets?: unknown[]): ResolvedStyle {
  const params: Style = {
    ...FUNK.params,
    songs: [
      {
        key: 'record',
        title: 'Record',
        feel: 'a record, bar for bar',
        weight: 1,
        params: { bpm: [120, 120] },
        sections: [
          {
            letter: 'A',
            label: 'the theme',
            params: {},
            written,
            ...(tuplets ? { tuplets: tuplets as never } : {}),
          },
          { letter: 'B', label: 'the chorus', params: {}, bars: 2 },
        ],
        arrangement: ['A', 'B'],
      },
    ],
  };
  return { ...FUNK, params };
}

const gen = (style: ResolvedStyle) =>
  generatePattern({ style, song: 'record:A', seed: 1, bars: 2, density: 50, ghosts: 50 });

/** A section of `n` bars that all differ: bar i's crash row spells i. */
function distinctSection(n: number): Pattern {
  const p = generatePattern({
    style: FUNK,
    meter: '4/4',
    seed: 3,
    bars: 1,
    density: 50,
    ghosts: 0,
  });
  p.bars = Array.from({ length: n }, (_, i) => {
    const bar = emptyBar(16);
    bar.k[0] = 2;
    bar.c = bar.c.map((_, j) => (i >> j) & 1);
    return bar;
  });
  return p;
}

function docOf(A: Pattern, B: Pattern = clonePattern(A)): BreakDoc {
  return { bpm: 120, swing: 0, level: 5, arrangement: ['A', 'B'], A, B };
}

describe('a section past eight bars', () => {
  it('is a pattern, up to the most a section holds', () => {
    const forty = distinctSection(40);
    const parse = (p: Pattern) =>
      patternSchema.safeParse({ ...p, perc: { p1: 'cowbell', p2: 'shaker' } }).success;
    expect(parse(forty)).toBe(true);
    expect(parse(distinctSection(MAX_SECTION_BARS))).toBe(true);
    expect(parse(distinctSection(MAX_SECTION_BARS + 1))).toBe(false);
  });

  it('holds its fills and tuplets past bar 8', () => {
    const p = distinctSection(40);
    p.fills = [{ bar: 39, from: 8 }];
    p.tuplets = [{ bar: 30, start: 12, span: 4, n: 5, notes: { t1: [1, 1, 1, 1, 1] } }];
    p.lanes = [...p.lanes, 't1'];
    expect(patternSchema.safeParse({ ...p, perc: { p1: 'cowbell', p2: 'shaker' } }).success).toBe(
      true
    );
    const back = decodeBreak(encodeBreak(docOf(p)));
    expect(back.A.fills).toEqual([{ bar: 39, from: 8 }]);
    expect(back.A.tuplets?.[0]).toMatchObject({ bar: 30, n: 5 });
  });

  it('travels as v11, and comes back bar for bar', () => {
    const doc = docOf(distinctSection(40));
    const payload = breakPayload(doc);
    expect(payload.ver).toBe(SHARE_VERSION);
    expect(SHARE_VERSION).toBe(11);
    expect(decodeBreak(encodeBreak(doc)).A.bars).toEqual(doc.A.bars);
  });

  it('leaves a break that fits v10 as the code it was, with no pointers', () => {
    const doc = docOf(distinctSection(8));
    doc.A.bars[7] = doc.A.bars[0];
    const payload = breakPayload(doc);
    expect(payload.ver).toBeLessThan(SHARE_VERSION);
    expect(payload.A.b.some((b) => b.startsWith('='))).toBe(false);
    expect(SHARE_VERSION_TEMPO_MAPS).toBe(10);
  });
});

describe('a bar a section plays again', () => {
  it('is written once on the wire and pointed at', () => {
    const p = distinctSection(2);
    p.bars = Array.from({ length: 32 }, (_, i) => p.bars[i % 2]);
    const payload = breakPayload(docOf(p));
    expect(payload.A.b.filter((b) => !b.startsWith('='))).toHaveLength(2);
    expect(payload.A.b[2]).toBe('=0');
    expect(payload.A.b[3]).toBe('=1');
    expect(decodeBreak(encodeBreak(docOf(p))).A.bars).toEqual(p.bars);
  });

  it('counts once against what a break holds', () => {
    const p = distinctSection(2);
    p.bars = Array.from({ length: 64 }, (_, i) => p.bars[i % 2]);
    expect(distinctBars(p.bars)).toBe(2);
    // four such sections play 256 bars and hold the same 2: a bar is counted once across the break
    const doc: BreakDoc = { ...docOf(p), C: clonePattern(p), D: clonePattern(p) };
    expect(totalBars(doc)).toBe(2);
    expect(sharePayloadSchema.safeParse(breakPayload(doc)).success).toBe(true);
  });

  it('is refused by a v10 code, and so is a section past eight bars', () => {
    const payload = breakPayload(docOf(distinctSection(2)));
    const ten = (A: object) => sharePayloadSchema.safeParse({ ...payload, ver: 10, A }).success;
    expect(ten({ ...payload.A, b: [payload.A.b[0], '=0'] })).toBe(false);
    expect(ten({ ...payload.A, b: Array(9).fill(payload.A.b[0]) })).toBe(false);
  });

  it('points only at a written bar before it', () => {
    const payload = breakPayload(docOf(distinctSection(40)));
    const b = payload.A.b;
    const ok = (bars: string[]) =>
      sharePayloadSchema.safeParse({ ...payload, A: { ...payload.A, b: bars } }).success;
    expect(ok([b[0], '=0', ...b.slice(2)])).toBe(true);
    expect(ok(['=1', ...b.slice(1)])).toBe(false);
    expect(ok([b[0], '=0', '=1', ...b.slice(3)])).toBe(false);
    expect(ok([b[0], '=5', ...b.slice(2)])).toBe(false);
  });

  it('counts each distinct bar against what a break holds, the pointers not', () => {
    // B's one bar is one A has not got: a snare on 2
    const other = distinctSection(1);
    other.bars[0].s[4] = 2;
    const many = docOf(distinctSection(MAX_BREAK_BARS), other);
    expect(sharePayloadSchema.safeParse(breakPayload(many)).success).toBe(false);
  });
});

describe('a written section that repeats', () => {
  const written: WrittenBar[] = [...THEME, { again: 2, times: 15 }];

  it('plays its repeats out, the record bar for bar', () => {
    expect(writtenLength(written)).toBe(32);
    expect(isWrittenRepeat(written[2])).toBe(true);
    const played = playWritten({ written });
    expect(played?.bars).toHaveLength(32);
    expect(played?.bars[31]).toBe(THEME[1]);
    const p = gen(songWith(written));
    expect(p.bars).toHaveLength(32);
    expect(p.bars[30]).toEqual(p.bars[0]);
    expect(p.bars[31]).toEqual(p.bars[1]);
    expect(distinctBars(p.bars)).toBe(2);
  });

  it('carries the tuplets of the bars it repeats', () => {
    const played = playWritten({ written: [...THEME, { again: 2, times: 2 }], tuplets: [QUINT] });
    expect(played?.tuplets.map((t) => t.bar)).toEqual([0, 2, 4]);
    const p = gen(songWith([...THEME, { again: 2, times: 2 }], [QUINT]));
    expect(p.tuplets?.map((t) => t.bar)).toEqual([0, 2, 4]);
  });

  it('repeats one bar, or bars already repeated', () => {
    const played = playWritten({
      written: [THEME[0], { again: 1, times: 3 }, { again: 4, times: 1 }],
    });
    expect(played?.bars).toHaveLength(8);
    expect(played?.bars.every((b) => b === THEME[0])).toBe(true);
  });

  it('is in the catalogue, held to bars before it and to a section’s length', () => {
    const parses = (w: WrittenBar[]) => styleParamsSchema.safeParse(songWith(w).params).success;
    expect(parses(written)).toBe(true);
    expect(parses([THEME[0], { again: 2, times: 1 }])).toBe(false);
    expect(parses([...THEME, { again: 2, times: 64 }])).toBe(false);
    expect(parses([...THEME, { again: 2, times: 63 }])).toBe(true);
    // a figure is not a repeat with a stray key, nor a repeat a figure
    expect(parses([...THEME, { again: 2, times: 1, k: '1' }])).toBe(false);
  });

  it('counts its distinct bars against the song, not the bars it plays', () => {
    const style = songWith(written);
    const sections = style.params.songs?.[0].sections ?? [];
    // four sections of the theme ×16: 128 bars played, eight held
    const params: Style = {
      ...style.params,
      songs: [
        {
          ...style.params.songs![0],
          sections: [
            ...sections,
            ...(['C', 'D', 'E'] as const).map((letter) => ({ ...sections[0], letter })),
          ],
        },
      ],
    };
    expect(styleParamsSchema.safeParse(params).success).toBe(true);
  });

  it('places a tuplet past the eighth bar, by its written bar', () => {
    // ten written bars, each its own: a kick on step i of bar i
    const ten: Figure[] = Array.from({ length: 10 }, (_, i) => ({
      ...THEME[0],
      k: [...'................'].map((ch, j) => (j === i ? '1' : ch)).join(''),
    }));
    const ok = styleParamsSchema.safeParse(songWith(ten, [{ ...QUINT, bar: 9 }]).params);
    expect(ok.success).toBe(true);
    const past = styleParamsSchema.safeParse(songWith(ten, [{ ...QUINT, bar: 10 }]).params);
    expect(past.success).toBe(false);
  });

  it('counts a tuplet by the written bar, so a repeat’s copy never takes one of its own', () => {
    // bar 0, bar 0 again, then the theme's second bar: written bars 0 and 1, played 0, 1 and 2
    const written: WrittenBar[] = [THEME[0], { again: 1, times: 1 }, THEME[1]];
    const played = playWritten({ written, tuplets: [{ ...QUINT, bar: 1 }] });
    expect(played?.tuplets.map((t) => t.bar)).toEqual([2]);
    expect(played?.problem).toBeUndefined();
    // a tuplet past the written bars is the schema's to refuse, and playWritten names it
    const past = playWritten({ written, tuplets: [{ ...QUINT, bar: 2 }] });
    expect(past?.tuplets).toEqual([]);
    expect(past?.problem).toMatch(/2 written bars/);
  });

  it('names a repeat reaching past the first bar, and plays what there is', () => {
    const played = playWritten({ written: [THEME[0], { again: 3, times: 1 }] });
    expect(played?.bars).toHaveLength(2);
    expect(played?.problem).toMatch(/there are 1/);
  });
});

describe('the distinct bars a song holds', () => {
  it('counts a figure once across its sections, and two that sound alike as one', () => {
    const quiet: Figure = { ...THEME[0], t1: '................' };
    expect(
      songBars([
        { written: [...THEME, { again: 2, times: 3 }], bars: 8 },
        { written: [THEME[1], quiet], bars: 2 },
        { bars: 4 },
      ])
    ).toBe(2 + 4);
  });
});

describe('a break past v10 on the wire', () => {
  it('refuses a v10 code carrying more than eight bars of data', () => {
    const payload = breakPayload(docOf(distinctSection(8)));
    const ten = (A: object) => sharePayloadSchema.safeParse({ ...payload, ver: 10, A }).success;
    expect(ten(payload.A)).toBe(true);
    expect(ten({ ...payload.A, fl: [[9, 0]] })).toBe(false);
    expect(ten({ ...payload.A, sk: Array(9).fill(0) })).toBe(false);
    expect(ten({ ...payload.A, pn: Array(9).fill(0) })).toBe(false);
    expect(ten({ ...payload.A, tu: [{ b: 8, a: 0, s: 4, n: 3, x: { k: '111' } }] })).toBe(false);
  });

  it('keeps a stored break’s pointers, pins and sticking past bar 8', () => {
    const p = distinctSection(2);
    p.bars = Array.from({ length: 12 }, (_, i) => p.bars[i % 2]);
    p.sticking = Array.from({ length: 12 }, (_, i) => (i === 10 ? 'R...............' : null));
    p.pins = Array.from({ length: 12 }, (_, i) => (i === 11 ? { k: [0, 0, 3] } : {}));
    const stored = storedPayloadSchema.parse(breakPayload(docOf(p)));
    const back = breakDocFromPayload(stored);
    expect(back.A.bars).toEqual(p.bars);
    expect(back.A.sticking?.[10]).toMatch(/^R/);
    expect(back.A.pins?.[11]?.k?.[2]).toBe(3);
  });
});
