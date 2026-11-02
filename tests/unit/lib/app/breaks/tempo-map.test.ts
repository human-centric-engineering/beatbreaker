/**
 * A section's tempo map (16-b-ii, D82): a bar that steps to a new tempo, a
 * run of bars that speeds up or slows down, against the section's own tempo.
 * What it changes is how long each step lasts — so the clock, the critic's
 * limbs, the MIDI file both ways, the share code, the chart and the
 * catalogue. A section without one is what it was.
 */

import { describe, expect, it } from 'vitest';

import { maxBpmOf, minBpmOf } from '@/lib/app/breaks/audio/transport';
import { playability } from '@/lib/app/breaks/critic';
import { previewApart, withPreview } from '@/lib/app/breaks/drummer/corner-chart';
import { engrave, tempoMarks } from '@/lib/app/breaks/engrave';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { type ImportedPattern, importedDoc } from '@/lib/app/breaks/import';
import { meterOf, stepSeconds } from '@/lib/app/breaks/meter';
import { buildMidi } from '@/lib/app/breaks/midi';
import { readMidi } from '@/lib/app/breaks/midi-read';
import { clonePattern, emptyBar } from '@/lib/app/breaks/pattern';
import { limbProblems } from '@/lib/app/breaks/physical';
import { readImport } from '@/lib/app/breaks/read-import';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { type BreakDoc, breakPayload, decodeBreak, encodeBreak } from '@/lib/app/breaks/share';
import {
  type TempoPoint,
  barClock,
  fitTempoMap,
  mapRatioAt,
  offsetSeconds,
  paceRange,
  rangesFit,
  stepClock,
  tempoAt,
  tempoMapOf,
  tempoMapProblem,
} from '@/lib/app/breaks/tempo-map';
import type { Pattern, SongSection } from '@/lib/app/breaks/types';
import { styleParamsSchema } from '@/lib/app/breaks/catalogue/schemas';
import { testStyle } from '@/tests/helpers/catalogue';

/** A section of `bars` bars of 4/4, the kick on every beat, with `tempo` as its map. */
function section(bars: number, tempo?: TempoPoint[], kick = '1...1...1...1...'): Pattern {
  const out: Pattern = {
    name: 't',
    style: 'rock',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 'h', 'r', 'c'],
    perc: {},
    backbeats: [4, 12],
    bbLane: 's',
    hasRide: false,
    hasHat: true,
    pins: null,
    ...(tempo ? { tempo } : {}),
    bars: Array.from({ length: bars }, () => {
      const bar = emptyBar(16);
      [...kick].forEach((c, i) => (bar.k[i] = c === '1' ? 1 : 0));
      return bar;
    }),
  };
  return out;
}

/** The tempo each step of a section starts at, a row a bar. */
function series(bpm: number, pat: Pattern): number[][] {
  return pat.bars.map((bar, b) => bar.k.map((_, i) => tempoAt(bpm, pat, b, i)));
}

function doc(A: Pattern, bpm = 100): BreakDoc {
  return { bpm, swing: 0, level: 5, arrangement: ['A'], A, B: clonePattern(A) };
}

/** Try a Little Tenderness's crescendo, at a section's scale: ×1 to ×1.1 over eight bars. */
const CRESCENDO: TempoPoint[] = [{ bar: 0, ratio: 1, to: 1.1 }];
/** Limelight's end: four bars at the tempo, then a ritardando to half over the last four. */
const RITARDANDO: TempoPoint[] = [{ bar: 4, ratio: 1, to: 0.5 }];

describe('the map itself', () => {
  it('plays at ×1 before its first point, holds a point, and ramps from `ratio` on its first step to `to` on its last', () => {
    const held = section(4, [{ bar: 2, ratio: 1.25 }]);
    expect(tempoAt(100, held, 1, 15)).toBe(100);
    expect(tempoAt(100, held, 2, 0)).toBe(125);
    expect(tempoAt(100, held, 3, 15)).toBe(125);

    const rit = section(8, RITARDANDO);
    expect(tempoAt(120, rit, 3, 15)).toBe(120);
    expect(tempoAt(120, rit, 4, 0)).toBe(120);
    // the ramp's 64 steps go evenly from 120 to 60: its last step is at 60
    expect(tempoAt(120, rit, 7, 15)).toBeCloseTo(60, 9);
    expect(tempoAt(120, rit, 5, 15)).toBeCloseTo(120 - (60 * 31) / 63, 9);
    // and every step is slower than the one before it
    const steps = series(120, rit).slice(4).flat();
    expect(steps.every((t, i) => i === 0 || t < steps[i - 1])).toBe(true);
  });

  it('writes a ritardando and then a tempo as two points: the ramp gets to its own `to`, and the next point takes over', () => {
    const pat = section(6, [
      { bar: 1, ratio: 1, to: 0.8 },
      { bar: 4, ratio: 1 },
    ]);
    expect(tempoAt(100, pat, 3, 15)).toBeCloseTo(80, 9);
    expect(tempoAt(100, pat, 4, 0)).toBe(100);
  });

  it('is relative to the section: a section at ×2 ramps from twice the break', () => {
    const pat = { ...section(2, [{ bar: 0, ratio: 1, to: 1.5 }]), tempoRatio: 2 };
    expect(tempoAt(100, pat, 0, 0)).toBe(200);
    expect(tempoAt(100, pat, 1, 15)).toBeCloseTo(300, 9);
    expect(paceRange(pat)).toEqual([2, 3]);
  });

  it('refuses a point outside the bars, out of order, or past ×¼ to ×4', () => {
    expect(tempoMapProblem(CRESCENDO, 8)).toBeNull();
    expect(tempoMapProblem([{ bar: 8, ratio: 1 }], 8)).toMatch(/8 bars/);
    expect(
      tempoMapProblem(
        [
          { bar: 3, ratio: 1 },
          { bar: 3, ratio: 2 },
        ],
        8
      )
    ).toMatch(/bar order/);
    expect(tempoMapProblem([{ bar: 0, ratio: 5 }], 8)).toMatch(/×¼ to ×4/);
    expect(tempoMapProblem([{ bar: 0, ratio: 1, to: 0.1 }], 8)).toMatch(/×¼ to ×4/);
  });

  it('counts ×1 into the range only where the map does not start on the first bar', () => {
    expect(paceRange(section(4, [{ bar: 0, ratio: 1.5 }]))).toEqual([1.5, 1.5]);
    expect(paceRange(section(4, [{ bar: 1, ratio: 1.5 }]))).toEqual([1, 1.5]);
    expect(paceRange(section(8, RITARDANDO))).toEqual([0.5, 1]);
    expect(
      rangesFit([
        [0.5, 1],
        [1, 2],
      ])
    ).toBe(true);
    expect(
      rangesFit([
        [0.5, 1],
        [1, 2.5],
      ])
    ).toBe(false);
  });

  it('keeps the points a shorter section still has, and a cut ramp still gets where it was going', () => {
    expect(fitTempoMap(RITARDANDO, 6)).toEqual(RITARDANDO);
    expect(fitTempoMap(RITARDANDO, 4)).toEqual([]);
    const short = section(6, fitTempoMap(RITARDANDO, 6));
    expect(tempoAt(120, short, 5, 15)).toBeCloseTo(60, 9);
  });

  it('times each step at the tempo it starts at', () => {
    const rit = section(8, RITARDANDO);
    const clock = stepClock(120, rit);
    const m = meterOf('4/4');
    const plain = 16 * stepSeconds(m, 120);
    // the first four bars at 120, the step after them where four bars of it end
    expect(clock.at[4][0]).toBeCloseTo(4 * plain, 9);
    const ramp = series(120, rit)
      .slice(4)
      .flat()
      .reduce((t, bpm) => t + stepSeconds(m, bpm), 0);
    expect(clock.length).toBeCloseTo(4 * plain + ramp, 9);
    // slower is longer: the ramp's four bars take longer than four at 120
    expect(ramp).toBeGreaterThan(4 * plain);
  });
});

describe('reading a map back from its steps (tempoMapOf)', () => {
  it.each([
    ['the crescendo', 8, CRESCENDO],
    ['the ritardando to the end', 8, RITARDANDO],
    [
      'a step up and back',
      6,
      [
        { bar: 2, ratio: 1.25 },
        { bar: 4, ratio: 1 },
      ],
    ],
    [
      'a ritardando and then a tempo',
      6,
      [
        { bar: 1, ratio: 1, to: 0.8 },
        { bar: 4, ratio: 1 },
      ],
    ],
    [
      'an accelerando straight into a ritardando',
      6,
      [
        { bar: 0, ratio: 1, to: 1.2 },
        { bar: 3, ratio: 1.2, to: 0.9 },
      ],
    ],
  ] as const)('reads %s as the points it was written from', (_label, bars, map) => {
    const pat = section(
      bars,
      map.map((p) => ({ ...p }))
    );
    expect(tempoMapOf(series(100, pat), 100)).toEqual(map);
  });

  it('reads one tempo throughout as no map', () => {
    expect(tempoMapOf(series(100, section(4)), 100)).toEqual([]);
  });
});

describe('how long a section lasts, and a note past its step', () => {
  it("counts a section in bars at the break's tempo: one at ×2 is half as long, one slowing longer", () => {
    expect(barClock(section(8)).length).toBe(8);
    expect(barClock({ ...section(8), tempoRatio: 2 }).length).toBe(4);
    const slowing = section(8, RITARDANDO);
    const bar = 16 * stepSeconds(meterOf('4/4'), 120);
    expect(barClock(slowing).length).toBeCloseTo(stepClock(120, slowing).length / bar, 9);
    expect(barClock(slowing).length).toBeGreaterThan(9);
    // and where each step starts, in the same bars
    expect(barClock(slowing).at[4][0]).toBe(4);
  });

  it('times a note past its step a step at a time across a ramp, into the next bar', () => {
    const m = meterOf('4/4');
    const pat = section(8, RITARDANDO);
    const len = (b: number, i: number) => stepSeconds(m, tempoAt(120, pat, b, i));
    // two and a half steps on from the last step of bar 4
    expect(offsetSeconds(m, 120, pat, 4, 15, 2.5)).toBeCloseTo(
      len(4, 15) + len(5, 0) + 0.5 * len(5, 1),
      12
    );
    // early, at the step's own length
    expect(offsetSeconds(m, 120, pat, 6, 3, -0.2)).toBeCloseTo(-0.2 * len(6, 3), 12);
    // and without a map, as it always was
    const plain = section(8);
    expect(offsetSeconds(m, 120, plain, 4, 15, 2.5)).toBeCloseTo(2.5 * stepSeconds(m, 120), 12);
  });
});

describe('a section built from another', () => {
  it("does not take A's map: Build B plays at A's pace, not where A's record slows", () => {
    const A = generatePattern({
      style: testStyle('funk'),
      meter: '4/4',
      seed: 3,
      bars: 8,
      density: 50,
      ghosts: 50,
    });
    A.tempoRatio = 2;
    A.tempo = RITARDANDO;
    const B = deriveB(A, testStyle('funk').params);
    expect(B.tempo).toBeUndefined();
    expect(B.tempoRatio).toBe(2);
    expect(A.tempo).toEqual(RITARDANDO);
  });
});

describe('the clock and the limbs', () => {
  it('holds the slider to the fastest and slowest a map reaches', () => {
    const crescendo = { meter: '4/4', tempo: [{ bar: 0, ratio: 1, to: 2 }] };
    const rit = { meter: '4/4', tempo: RITARDANDO };
    expect(maxBpmOf([crescendo])).toBe(190);
    expect(minBpmOf([rit])).toBe(100);
  });

  it('judges each bar at the tempo it plays: a run fine at 100 is too fast once a ramp reaches 200', () => {
    const run = '1111111111111111';
    expect(limbProblems(section(4, undefined, run), 100)).toEqual([]);
    const ramped = section(4, [{ bar: 2, ratio: 1, to: 2 }], run);
    // the end of the ramp, and the seam where its fastest bar loops back to the first
    expect(limbProblems(ramped, 100).map((p) => `${p.bar}:${p.step}`)).toEqual([
      '0:0',
      '3:14',
      '3:15',
    ]);
    // and the critic names the fastest it gets to
    const feet = playability(ramped, 100).checks.find((c) => c.limbs === 'feet');
    expect(feet?.label).toBe('The feet keep up at up to 200 BPM');
    expect(feet?.ok).toBe(false);
  });
});

describe('a MIDI file', () => {
  /** A section exported, then read back as an import. */
  function roundTrip(pat: Pattern, bpm: number): Pattern {
    const midi = buildMidi(
      pat.bars.map((_, barIdx) => ({ pattern: pat, barIdx })),
      { bpm, swing: 0, feel: 0, hats: 100 }
    );
    const read = readMidi(Uint8Array.from(midi.bytes));
    if (!read.ok) throw new Error(read.error);
    expect(read.pattern.bpm).toBe(bpm);
    const opened = readImport({ kind: 'midi', bytes: Uint8Array.from(midi.bytes) });
    if (!opened.ok) throw new Error(opened.error);
    expect(opened.notes).toContain(
      "The file changes tempo, so each section plays the file's tempo map."
    );
    return opened.doc.A;
  }

  /** Sixteen bars read from a file at `bpm`, each bar at the tempo `at` gives it. */
  function changing(bpm: number, at: (bar: number) => number): ImportedPattern {
    const midi = buildMidi(
      section(16).bars.map((_, barIdx) => ({ pattern: section(16), barIdx })),
      { bpm, swing: 0, feel: 0, hats: 100 }
    );
    const read = readMidi(Uint8Array.from(midi.bytes));
    if (!read.ok) throw new Error(read.error);
    return {
      ...read.pattern,
      tempos: read.pattern.bars.map((bar, b) => bar.k.map(() => at(b))),
    };
  }

  it('plays a file whose sections spread past ×4 of each other at its opening tempo, every section, and says so', () => {
    // the first eight bars slow to 40, the next eight run at 200: ×⅖ and ×2 of 100, ×5 apart
    const imp = changing(100, (b) => (b < 8 ? 100 - b * 8.5 : 200));
    const opened = importedDoc(imp, 'rock');
    expect(opened.A.tempo).toBeUndefined();
    expect(opened.B.tempo).toBeUndefined();
    expect(() => sharePayloadSchema.parse(breakPayload(opened))).not.toThrow();
  });

  it("plays none of a file's map where one section cannot hold its own, rather than half of it", () => {
    // bar 9 jumps to ×5, past what a point may be; A's own change is fine on its own
    const imp = changing(100, (b) => (b === 9 ? 500 : b < 8 ? 100 + b * 5 : 100));
    const opened = importedDoc(imp, 'rock');
    expect(opened.A.tempo).toBeUndefined();
    expect(opened.B.tempo).toBeUndefined();
  });

  it("says a file's tempo was not kept, and the tempo it plays at instead", () => {
    const pat = section(8, [{ bar: 4, ratio: 3.9 }]);
    const fast = { ...section(8, [{ bar: 0, ratio: 0.25 }]) };
    const midi = buildMidi(
      [
        ...pat.bars.map((_, barIdx) => ({ pattern: pat, barIdx })),
        ...fast.bars.map((_, barIdx) => ({ pattern: fast, barIdx })),
      ],
      { bpm: 100, swing: 0, feel: 0, hats: 100 }
    );
    const opened = readImport({ kind: 'midi', bytes: Uint8Array.from(midi.bytes) });
    if (!opened.ok) throw new Error(opened.error);
    expect(opened.doc.A.tempo).toBeUndefined();
    expect(opened.notes).not.toContain(
      "The file changes tempo, so each section plays the file's tempo map."
    );
    expect(opened.notes.join(' ')).toContain('so it plays at 100 bpm throughout');
  });

  it("writes Try a Little Tenderness's crescendo a step at a time, and reads it back the same", () => {
    const pat = section(8, CRESCENDO);
    const back = roundTrip(pat, 100);
    expect(back.tempo).toEqual(CRESCENDO);
    series(100, back)
      .flat()
      .forEach((t, i) => expect(t).toBeCloseTo(series(100, pat).flat()[i], 2));
  });

  it("writes Limelight's ritardando to the end, and reads it back the same", () => {
    const back = roundTrip(section(8, RITARDANDO), 120);
    expect(back.tempo).toEqual(RITARDANDO);
  });

  it('writes one tempo for a section without a map, as it always did', () => {
    const midi = buildMidi([{ pattern: section(1), barIdx: 0 }], {
      bpm: 100,
      swing: 0,
      feel: 0,
      hats: 100,
    });
    const tempos = midi.bytes.filter(
      (b, i) => b === 0x51 && midi.bytes[i - 1] === 0xff && midi.bytes[i + 1] === 0x03
    );
    expect(tempos).toHaveLength(1);
    const read = readMidi(Uint8Array.from(midi.bytes));
    expect(read.ok && importedDoc(read.pattern, 'rock').A.tempo).toBeUndefined();
  });
});

describe('the share code (v10)', () => {
  it('carries a map, and decodes to the same section', () => {
    const d = doc(section(8, RITARDANDO), 120);
    const code = encodeBreak(d);
    expect(breakPayload(d).ver).toBe(10);
    expect(decodeBreak(code).A.tempo).toEqual(RITARDANDO);
    const ramp = breakPayload(d).A.tm;
    expect(ramp).toEqual([[4, 1, 0.5]]);
  });

  it('writes a break without a map as the version it always was', () => {
    expect(breakPayload(doc(section(2))).ver).toBe(5);
  });

  it('refuses a map under an older version, past the bars, or past the spread', () => {
    const payload = breakPayload(doc(section(8, RITARDANDO), 120));
    expect(sharePayloadSchema.safeParse({ ...payload, ver: 9 }).success).toBe(false);
    const past = { ...payload, A: { ...payload.A, tm: [[8, 1]] } };
    expect(sharePayloadSchema.safeParse(past).success).toBe(false);
    const wide = {
      ...payload,
      A: { ...payload.A, tm: [[0, 1, 0.5]] },
      B: { ...payload.B, tr: 2, tm: [[0, 1.5]] },
    };
    expect(sharePayloadSchema.safeParse(wide).success).toBe(false);
  });
});

describe('the chart', () => {
  it('prints the tempo where a point steps, and rit. with the tempo it gets to where it ramps', () => {
    const marks = tempoMarks(section(8, RITARDANDO), 120);
    expect(marks.slice(0, 4).every((m) => m === undefined)).toBe(true);
    expect(marks[4]).toEqual({ word: 'rit.', ramp: true });
    expect(marks[7]).toEqual({ ramp: true, end: '♩ = 60' });

    const stepped = tempoMarks(
      section(6, [
        { bar: 2, ratio: 1.25 },
        { bar: 4, ratio: 1 },
      ])
    );
    expect(stepped[2]).toEqual({ text: '×5/4' });
    expect(stepped[4]).toEqual({ text: 'a tempo' });
  });

  it('prints a tempo to the tenth, as the Tempo row says it', () => {
    expect(tempoMarks(section(4, [{ bar: 1, ratio: 0.975 }]), 100)[1]).toEqual({
      text: '♩ = 97.5',
    });
  });

  it("stops a section's marks where it ends, when the next section's first bars run on after it", () => {
    const next = section(8, [{ bar: 0, ratio: 2 }]);
    const line = withPreview(section(8, RITARDANDO), next);
    expect(line.bars).toHaveLength(10);
    const marks = tempoMarks(line, 120, 8);
    expect(marks[7]).toEqual({ ramp: true, end: '♩ = 60' });
    expect(marks.slice(8).filter(Boolean)).toEqual([]);
    // and engrave hears it as an option
    const texts = engrave(line, null, { scale: 1, perSystem: 10, bpm: 120, tempoBars: 8 })
      .nodes.filter((n) => n.tag === 'text')
      .map((n) => n.text);
    expect(texts).toContain('♩ = 60');
  });

  it('prints no end on the first bars of a section whose ramp runs on past them', () => {
    const next = section(8, [{ bar: 0, ratio: 1, to: 0.5 }]);
    const apart = previewApart({ ...section(8), meter: '3/4' }, next);
    if (!apart) throw new Error('no preview');
    expect(apart.bars).toHaveLength(2);
    const marks = tempoMarks(apart, 120, next.bars.length);
    expect(marks[0]).toEqual({ word: 'rit.', ramp: true });
    expect(marks[1]).toEqual({ ramp: true });
    // drawn as the whole of itself, the cut ramp says it got there
    expect(tempoMarks(apart, 120)[1]?.end).toBe('♩ = 60');
  });

  it('draws the marks over the staff, and nothing for a section without a map', () => {
    const texts = (p: Pattern) =>
      engrave(p, null, { scale: 1, perSystem: 4, bpm: 100 })
        .nodes.filter((n) => n.tag === 'text')
        .map((n) => n.text);
    expect(texts(section(8, CRESCENDO))).toEqual(expect.arrayContaining(['accel.', '♩ = 110']));
    const plain = engrave(section(8), null, { scale: 1, perSystem: 4 });
    const mapped = engrave(section(8, CRESCENDO), null, { scale: 1, perSystem: 4 });
    expect(texts(section(8))).not.toContain('accel.');
    expect(mapped.height).toBeGreaterThan(plain.height);
  });
});

describe('a song section with a map', () => {
  const rock = testStyle('rock');
  const withSection = (x: Partial<SongSection>) => ({
    ...rock.params,
    songs: [
      {
        key: 'ramped',
        title: 'Ramped',
        feel: 'a ritardando to the end',
        weight: 1,
        params: {},
        sections: [
          { letter: 'A' as const, label: 'the verse', bars: 2, params: {} },
          { letter: 'B' as const, label: 'the end', bars: 8, params: {}, ...x },
        ],
      },
    ],
  });

  it('is written with its map', () => {
    const params = withSection({ tempo: RITARDANDO });
    const pat = generatePattern({
      style: { ...rock, params },
      song: 'ramped:B',
      bars: 8,
      density: 60,
      ghosts: 40,
      seed: 7,
    });
    expect(pat.tempo).toEqual(RITARDANDO);
    expect(mapRatioAt(pat, 7, 15)).toBeCloseTo(0.5, 9);
  });

  it('names its bars, and stays within the spread, or the catalogue refuses it', () => {
    const ok = styleParamsSchema.safeParse(withSection({ tempo: RITARDANDO }));
    expect(ok.success).toBe(true);
    const unsized = withSection({ tempo: RITARDANDO, bars: undefined });
    expect(styleParamsSchema.safeParse(unsized).success).toBe(false);
    const past = withSection({ tempo: [{ bar: 8, ratio: 1 }] });
    expect(styleParamsSchema.safeParse(past).success).toBe(false);
    const wide = withSection({ tempoRatio: 2, tempo: [{ bar: 0, ratio: 1, to: 2.5 }] });
    expect(styleParamsSchema.safeParse(wide).success).toBe(false);
  });
});
