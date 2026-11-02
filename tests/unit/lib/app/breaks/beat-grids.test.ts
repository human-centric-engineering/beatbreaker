/**
 * A grid per beat (16-b-iv, D84 and D87): a beat put on a grid of its own —
 * triplets beside sixteenths, a quintuplet — is a span over the whole beat on
 * every lane of the roster. A bar of two beats of sixteenths, a beat of
 * triplets and a quintuplet plays, engraves with each beat beamed as written
 * and round-trips MIDI; a written section carries its spans; a pattern holds
 * so many spans a bar.
 */

import { describe, expect, it } from 'vitest';

import { styleParamsSchema } from '@/lib/app/breaks/catalogue/schemas';
import type { CatalogueStyle } from '@/lib/app/breaks/catalogue/types';
import { engrave } from '@/lib/app/breaks/engrave';
import { generatePattern } from '@/lib/app/breaks/generate';
import { buildMidi } from '@/lib/app/breaks/midi';
import { readMidi } from '@/lib/app/breaks/midi-read';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { patternSchema } from '@/lib/app/breaks/schema';
import { decodeBreak, encodeBreak } from '@/lib/app/breaks/share';
import {
  MAX_TUPLETS,
  TUPLETS_A_BAR,
  addBeatGrid,
  addTuplet,
  beatGridAt,
  maxTuplets,
  ownedBy,
  removeBeatGrid,
  removeTuplet,
  setTupletNote,
  tupletStrokes,
  tupletsOf,
} from '@/lib/app/breaks/tuplets';
import type { Bar, Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

const MIDI_OPTS = { bpm: 100, swing: 0, feel: 0, hats: 100 };

function pattern(bars: Bar[], lanes: Pattern['lanes'] = ['k', 's', 'h']): Pattern {
  return {
    name: '',
    style: 'rock',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes,
    perc: {},
    bbLane: 's',
    hasRide: false,
    hasHat: true,
    backbeats: [],
    pins: null,
    bars,
  };
}

/** Beats 1 and 2 in sixteenths, beat 3 in triplets, beat 4 a quintuplet: the hat on every note, the kick on each beat. */
function mixedBar(): Pattern {
  const bar = emptyBar(16);
  for (let i = 0; i < 16; i++) bar.h[i] = 1;
  for (const i of [0, 4, 8, 12]) bar.k[i] = 1;
  bar.s[4] = 2;
  const pat = pattern([bar]);
  expect(addBeatGrid(pat, 0, 8, 3)).toBe(true);
  expect(addBeatGrid(pat, 0, 12, 5)).toBe(true);
  const [three, five] = tupletsOf(pat);
  three.notes.h = [1, 1, 1];
  five.notes.h = [1, 1, 1, 1, 1];
  five.notes.s = [0, 0, 0, 0, 2];
  return pat;
}

describe('a beat grid', () => {
  it('puts the whole beat, every lane, on a grid of its own, its notes moved to the nearest step', () => {
    const bar = emptyBar(16);
    bar.h[8] = 1;
    bar.h[10] = 1;
    bar.k[8] = 1;
    const pat = pattern([bar]);
    expect(addBeatGrid(pat, 0, 9, 3)).toBe(true);
    const grid = beatGridAt(pat, 0, 11);
    expect(grid).toMatchObject({ bar: 0, start: 8, span: 4, n: 3, grid: true });
    // the + of 3 (two sixteenths in) is nearest the third triplet
    expect(grid!.notes.h).toEqual([1, 0, 1]);
    expect(grid!.notes.k).toEqual([1, 0, 0]);
    // a lane with nothing to play rests in it, and its cells are the grid's
    expect(grid!.notes.s).toBeUndefined();
    expect(ownedBy([grid!], 's', 9)).toBe(grid);
    expect(ownedBy([grid!], 'c', 9)).toBe(grid);
    expect(pat.bars[0].h.slice(8, 12)).toEqual([0, 0, 0, 0]);
  });

  it('is a beat grid whatever lanes the roster gains after', () => {
    const pat = pattern([emptyBar(16)]);
    expect(addBeatGrid(pat, 0, 0, 3)).toBe(true);
    pat.lanes = [...pat.lanes, 'c', 'p1'];
    expect(beatGridAt(pat, 0, 2)).toBeDefined();
    // a crash written there later is the grid's, on its division
    expect(setTupletNote(pat, 0, 'c', 0, 1, 1)).toBe(true);
    expect(beatGridAt(pat, 0, 0)?.notes.c).toEqual([0, 1, 0]);
  });

  it('refuses a division the beat already has, and doubles', () => {
    const pat = pattern([emptyBar(16)]);
    expect(addBeatGrid(pat, 0, 0, 4)).toBe(false);
    expect(addBeatGrid(pat, 0, 0, 2)).toBe(false);
    // eight over a beat of four is two to a step: doubles, a step at a time (13-a)
    expect(addBeatGrid(pat, 0, 0, 8)).toBe(false);
    expect(pat.tuplets).toBeUndefined();
  });

  it('takes in a figure inside the beat, each of its notes to the step nearest it', () => {
    const pat = pattern([emptyBar(16)]);
    expect(addTuplet(pat, 0, 's', 0, 4, 5)).toBe(true);
    expect(setTupletNote(pat, 0, 's', 0, 0, 3)).toBe(true);
    expect(setTupletNote(pat, 0, 's', 0, 2, 2)).toBe(true);
    expect(addBeatGrid(pat, 0, 0, 3)).toBe(true);
    expect(tupletsOf(pat)).toHaveLength(1);
    // the fifths at 0 and 1.6 sixteenths go to the triplets at 0 and 1.33
    expect(beatGridAt(pat, 0, 0)?.notes.s).toEqual([3, 2, 0]);
  });

  it('refuses a beat a figure runs out of', () => {
    const pat = pattern([emptyBar(16)]);
    expect(addTuplet(pat, 0, 's', 0, 8, 5)).toBe(true);
    expect(addBeatGrid(pat, 0, 0, 3)).toBe(false);
    expect(tupletsOf(pat)).toHaveLength(1);
  });

  it('loses no note two would put on one step, and keeps the louder where it must', () => {
    const bar = emptyBar(16);
    // the + (a hit) and the a (an accent) of the beat, both nearest the third triplet
    bar.k[2] = 1;
    bar.k[3] = 2;
    const pat = pattern([bar]);
    expect(addBeatGrid(pat, 0, 0, 3)).toBe(true);
    expect(beatGridAt(pat, 0, 0)?.notes.k).toEqual([0, 1, 2]);
    // four notes into three slots: one shares, and the louder keeps it
    const busy = emptyBar(16);
    busy.s = [3, 2, 2, 6, ...Array<number>(12).fill(0)];
    const p2 = pattern([busy]);
    expect(addBeatGrid(p2, 0, 0, 3)).toBe(true);
    expect(beatGridAt(p2, 0, 0)?.notes.s?.filter(Boolean)).toHaveLength(3);
  });

  it('gives the beat back to the grid, each note to the step nearest it', () => {
    const pat = mixedBar();
    expect(removeBeatGrid(pat, 0, 9)).toBe(true);
    expect(beatGridAt(pat, 0, 9)).toBeUndefined();
    // triplets at 0, 1⅓ and 2⅔ come back on 1, e and a: none lost
    expect(pat.bars[0].h.slice(8, 12)).toEqual([1, 1, 0, 1]);
    expect(pat.bars[0].k.slice(8, 12)).toEqual([1, 0, 0, 0]);
    expect(tupletsOf(pat)).toHaveLength(1);
    expect(removeBeatGrid(pat, 0, 9)).toBe(false);
  });

  it('is not given back a lane at a time', () => {
    const pat = mixedBar();
    expect(removeTuplet(pat, 0, 'h', 9)).toBe(false);
    expect(beatGridAt(pat, 0, 9)).toBeDefined();
  });

  it('travels in a share code, a beat of rests included', () => {
    const pat = mixedBar();
    expect(addBeatGrid(pat, 0, 0, 7)).toBe(true);
    const beat1 = beatGridAt(pat, 0, 0);
    expect(beat1?.notes.h).toBeDefined();
    const back = decodeBreak(
      encodeBreak({ bpm: 90, swing: 0, level: 5, arrangement: ['A'], A: pat, B: pat })
    );
    expect(
      tupletsOf(back.A)
        .filter((t) => t.grid)
        .map((t) => [t.start, t.n])
    ).toEqual([
      [0, 7],
      [8, 3],
      [12, 5],
    ]);
  });
});

describe('a bar of two beats of sixteenths, a beat of triplets and a quintuplet', () => {
  it('plays each beat on its own grid', () => {
    const pat = mixedBar();
    const hats = tupletStrokes(pat, 0)
      .filter((s) => s.lane === 'h')
      .map((s) => s.pos);
    expect(hats).toEqual([8, 8 + 4 / 3, 8 + 8 / 3, 12, 12.8, 13.6, 14.4, 15.2]);
    // beats 1 and 2 stay on the grid
    expect(pat.bars[0].h.slice(0, 8)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(patternSchema.safeParse({ ...pat, perc: { p1: 'cowbell', p2: 'shaker' } }).success).toBe(
      true
    );
  });

  it('engraves the triplets and the quintuplet on the beat’s own beam, numbered', () => {
    const beams = (p: Pattern) => {
      const ys: number[] = [];
      const texts: string[] = [];
      const walk = (
        nodes: {
          tag: string;
          text?: string;
          attrs?: Record<string, unknown>;
          children?: unknown[];
        }[]
      ) => {
        for (const node of nodes) {
          if (node.tag === 'rect' && node.attrs?.height === 0.44 * 10)
            ys.push(Number(node.attrs.y));
          if (node.tag === 'text' && node.text) texts.push(node.text);
          if (node.children) walk(node.children as typeof nodes);
        }
      };
      walk(engrave(p, null, { scale: 1, perSystem: 1 }).nodes);
      return { top: Math.min(...ys), texts };
    };
    const plain = pattern([mixedBar().bars[0]]);
    plain.bars[0].h.fill(1);
    const mixed = beams(mixedBar());
    // no beam above the grid's: each beat is beamed where the sixteenths are
    expect(mixed.top).toBe(beams(plain).top);
    expect(mixed.texts).toEqual(expect.arrayContaining(['3', '5']));
  });

  it('takes a beam of its own where another figure of the voice shares its steps', () => {
    const top = (p: Pattern) => {
      const ys: number[] = [];
      const walk = (
        nodes: { tag: string; attrs?: Record<string, unknown>; children?: unknown[] }[]
      ) => {
        for (const node of nodes) {
          if (node.tag === 'rect' && node.attrs?.height === 0.44 * 10)
            ys.push(Number(node.attrs.y));
          if (node.children) walk(node.children as typeof nodes);
        }
      };
      walk(engrave(p, null, { scale: 1, perSystem: 1 }).nodes);
      return Math.min(...ys);
    };
    const bar = emptyBar(16);
    bar.h.fill(1, 0, 8);
    const one = pattern([bar], ['k', 's', 'h', 'c']);
    one.tuplets = [{ bar: 0, start: 8, span: 4, n: 5, notes: { h: [1, 1, 1, 1, 1] } }];
    const two = {
      ...one,
      tuplets: [...one.tuplets, { bar: 0, start: 8, span: 4, n: 3, notes: { c: [1, 0, 1] } }],
    };
    // alone, the five is on the voice's beam; beside the crash's three, both go above it
    expect(top(two)).toBeLessThan(top(one));
  });

  it('writes MIDI that reads back with each beat on its grid', () => {
    const pat = mixedBar();
    const file = buildMidi([{ pattern: pat, barIdx: 0 }], MIDI_OPTS);
    const read = readMidi(new Uint8Array(file.bytes));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const back = { ...pat, tuplets: read.pattern.tuplets, bars: read.pattern.bars };
    // everything that sounds, grid and spans: a note on a sixteenth may come back on the grid
    const notes = (p: Pattern) => {
      const out = tupletStrokes(p, 0).map((s) => `${s.lane}@${s.pos.toFixed(3)}=${s.value}`);
      for (const L of ['k', 's', 'h'] as const)
        p.bars[0][L].forEach((v, i) => v && out.push(`${L}@${i.toFixed(3)}=${v}`));
      return out.sort();
    };
    expect(notes(back)).toEqual(notes(pat));
    // and the triplets and the quintuplet come back as spans over their beats
    // and the triplets and the quintuplet come back as spans over their beats
    expect(tupletsOf(back).map((t) => [t.start, t.span, t.n])).toEqual([
      [8, 4, 3],
      [12, 4, 5],
    ]);
  });
});

describe('how many spans a pattern holds', () => {
  it('follows its bars, and never holds fewer than any pattern could before', () => {
    expect(maxTuplets(1)).toBe(64);
    expect(maxTuplets(8)).toBe(MAX_TUPLETS);
    expect(maxTuplets(3)).toBe(3 * TUPLETS_A_BAR);
    const pat = pattern([emptyBar(16)]);
    pat.tuplets = Array.from({ length: 65 }, (_, i) => ({
      bar: 0,
      start: i % 16,
      span: 1,
      n: 3,
      notes: { k: [0, 0, 0] },
    }));
    const parsed = () => patternSchema.safeParse({ ...pat, perc: { p1: 'cowbell', p2: 'shaker' } });
    expect(parsed().success).toBe(false);
    pat.bars.push(emptyBar(16), emptyBar(16));
    expect(parsed().success).toBe(true);
  });
});

describe('a written section', () => {
  function withSection(tuplets: unknown): CatalogueStyle['params'] {
    const params = testStyle('funk').params;
    return {
      ...params,
      songs: [
        {
          key: 'mixed',
          title: 'Mixed',
          feel: 'triplets beside sixteenths',
          weight: 1,
          params: {},
          sections: [
            {
              letter: 'A',
              label: 'Verse',
              written: [{ k: '1...1...1...1...', h: '11111111........' }],
              tuplets,
              params: {},
            },
            { letter: 'B', label: 'Chorus', written: [{ k: '1...............' }], params: {} },
          ],
        },
      ],
    } as CatalogueStyle['params'];
  }
  const grids = [
    { bar: 0, start: 8, span: 4, n: 3, notes: { k: '1..', h: '111' }, grid: true },
    { bar: 0, start: 12, span: 4, n: 5, notes: { k: '1....', h: '11111' }, grid: true },
  ];

  it('carries its tuplets and beat grids into the pattern New writes', () => {
    const params = withSection(grids);
    expect(styleParamsSchema.safeParse(params).error?.issues ?? []).toEqual([]);
    const pat = generatePattern({
      style: { ...testStyle('funk'), params },
      song: 'mixed',
      meter: '4/4',
      seed: 1,
      bars: 1,
      density: 50,
      ghosts: 50,
    });
    const hats = tupletStrokes(pat, 0)
      .filter((s) => s.lane === 'h')
      .map((s) => s.pos);
    expect(hats).toEqual([8, 8 + 4 / 3, 8 + 8 / 3, 12, 12.8, 13.6, 14.4, 15.2]);
    // the kick written under a span is the span's, not played twice
    expect(pat.bars[0].k.slice(8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    // and each is the beat's own grid, every lane
    expect(beatGridAt(pat, 0, 9)?.n).toBe(3);
    expect(ownedBy(tupletsOf(pat), 's', 13)?.n).toBe(5);
  });

  it('refuses a tuplet past its bars, off them, or on a lane already in one', () => {
    const issues = (tuplets: unknown) =>
      (styleParamsSchema.safeParse(withSection(tuplets)).error?.issues ?? []).map((i) => i.message);
    expect(issues([{ ...grids[0], bar: 1 }])).toContain(
      'a tuplet inside one of the 1 written bars of 16 steps, off the grid, each value one its lane has'
    );
    expect(issues([{ ...grids[0], n: 4, notes: { h: '1111' } }])).toContain(
      'a tuplet inside one of the 1 written bars of 16 steps, off the grid, each value one its lane has'
    );
    expect(issues([grids[0], { ...grids[0], n: 5, notes: { h: '11111' } }])).toContain(
      'a lane is in one tuplet at a time'
    );
    expect(issues([{ ...grids[0], notes: { h: '11' } }])).toContain('a row of n notes');
    expect(issues([{ ...grids[0], start: 6 }])).toContain(
      "a beat's own grid covers one whole beat of 4/4"
    );
  });
});
