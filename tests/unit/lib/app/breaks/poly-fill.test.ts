/**
 * Polyrhythmic fills (Phase 12, 12-c): a drummer's own figure over the bar
 * line, from a device the drummer's record sources, landing on the next 1.
 *
 * What it must not do is as important as what it does: draw anything for a
 * style without poly fills (the goldens hold that), lose to the critic's taste
 * for grooves, cross a clave, or survive into a meter where its notes leave
 * the grid.
 */

import { describe, expect, it } from 'vitest';

import { HANDS_CHECK, critique, generateGood, playability } from '@/lib/app/breaks/critic';
import { doctor } from '@/lib/app/breaks/doctor';
import { fitHands, generatePattern, toRide } from '@/lib/app/breaks/generate';
import { bbValue, handLanes, handsAt } from '@/lib/app/breaks/lanes';
import { reduceBar, reducePattern } from '@/lib/app/breaks/layers';
import { meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { clonePattern, emptyBar } from '@/lib/app/breaks/pattern';
import {
  accentLanesIn,
  clearPlainAt,
  keptPolySpans,
  plainAt,
  polyFillFits,
  polyFillsIn,
  spanStepsIn,
  withPlainSpans,
  writePolyFill,
} from '@/lib/app/breaks/poly-fill';
import { packPattern, patternFromPacked } from '@/lib/app/breaks/share';
import { patternSchema, sharePayloadSchema } from '@/lib/app/breaks/schema';
import { songOf, withSong } from '@/lib/app/breaks/songs';
import { styleIn } from '@/lib/app/breaks/styles';
import type { LaneKey, Pattern, PolyFill, ResolvedStyle, Style } from '@/lib/app/breaks/types';
import { styleParamsSchema } from '@/lib/app/breaks/catalogue/schemas';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { DRUMMER_MODEL_DIR, readCorpus } from '@/scripts/lineage/read-corpus';
import { testStyle } from '@/tests/helpers/catalogue';

const OPTS = { bars: 4, density: 50, ghosts: 50 };

/** A catalogue style with its params changed, for a test. */
function withParams(key: string, params: Partial<Style>): ResolvedStyle {
  const st = testStyle(key);
  return { ...st, params: { ...st.params, ...params } };
}

const THREES: PolyFill = { device: 'grouping', cell: { s: '311' }, cells: 4 };

/** Every style and song that draws for a poly fill, with its rate. */
const DRAWN: Array<{ key: string; song?: string; rate: number }> = Object.entries(STYLES).flatMap(
  ([key, st]) => {
    const parts = [
      ...(st.polyFill && !st.songs?.length ? [{ key, rate: st.polyFill }] : []),
      ...(st.songs ?? []).flatMap((song) => {
        const merged = withSong(st, song.key);
        return merged.polyFill && merged.polyFills && !song.sections
          ? [{ key, song: song.key, rate: merged.polyFill }]
          : [];
      }),
    ];
    return parts;
  }
);

describe('a style without poly fills', () => {
  it('generates exactly what it did, vocabulary or not, while the chance is 0', () => {
    for (const key of ['funk', 'son', 'swing', 'tonyallen']) {
      for (const seed of [1, 7, 20261004]) {
        const plain = generatePattern({ style: testStyle(key), seed, ...OPTS });
        const silent = generatePattern({
          style: withParams(key, { polyFills: [[THREES, 1]], polyFill: 0 }),
          seed,
          ...OPTS,
        });
        expect(silent, `${key} ${seed}`).toEqual(plain);
        expect(plain.polySpans).toBeUndefined();
      }
    }
  });

  it('is every style but the six drummers with a sourced device', () => {
    const withFills = Object.entries(STYLES)
      .filter(([, st]) => st.polyFills || st.songs?.some((s) => s.params.polyFills))
      .map(([key]) => key)
      .sort();
    expect(withFills).toEqual(['collins', 'elvinjones', 'gadd', 'klek', 'shrieve', 'tonywilliams']);
  });
});

describe("Elvin Jones's three-beat cycle", () => {
  const ELVIN = testStyle('elvinjones');
  const pat = generatePattern({ style: ELVIN, song: 'resolution', seed: 2, ...OPTS });

  it('writes a three-over-four tom figure across the bar line, landing on the 1', () => {
    expect(pat.meter).toBe('4/4-6');
    const [span] = pat.polySpans ?? [];
    expect(span).toMatchObject({ bar: 2, at: 12, span: 36, device: 'polymeter', every: 18 });
    // the floor tom and the kick every three beats: beat 3 of bar 3, beat 2 of bar 4…
    expect(pat.bars[2].t3[12]).toBe(2);
    expect(pat.bars[2].k[12]).toBeGreaterThan(0);
    expect(pat.bars[3].t3[6]).toBe(2);
    expect(pat.bars[3].k[6]).toBeGreaterThan(0);
    // …and the next is the 1, where the loop comes round: a crash and the kick
    expect(pat.bars[0].c[0]).toBe(1);
    expect(pat.bars[0].k[0]).toBeGreaterThan(0);
    // the ride and the foot keep time under it
    expect(pat.bars[3].r.filter(Boolean).length).toBeGreaterThanOrEqual(3);
    expect(pat.bars[3].hf.filter(Boolean).length).toBeGreaterThan(0);
  });

  it('passes playability', () => {
    expect(playability(pat, 160).hard).toBe(true);
  });

  it('records what the span played before it, for the layers below 4', () => {
    const [span] = pat.polySpans!;
    expect(span.plain.t3).toHaveLength(36);
    expect(withPlainSpans(pat, 0)[3].t3[6]).toBe(span.plain.t3![18]);
  });
});

describe('poly fills over many seeds', () => {
  /* No new failure: a check the poly fill trips is one the plain fill it
     replaced trips as well (Elvin's own cross-rhythms can put a kick beside
     two of the groove's, before any poly fill is drawn). */
  it.each(DRAWN)('$key $song: adds nothing unplayable and lands on the 1', ({ key, song }) => {
    const m = meterOf(withSong(STYLES[key], song).meter ?? '4/4');
    const failed = (p: Pattern) =>
      playability(p, 120)
        .checks.filter((c) => !c.ok)
        .map((c) => c.label);
    for (let seed = 1; seed <= 60; seed++) {
      const pat = generatePattern({ style: testStyle(key), song, seed, ...OPTS });
      if (!pat.polySpans) continue;
      const plain: Pattern = { ...clonePattern(pat), bars: withPlainSpans(pat, 0) };
      delete plain.polySpans;
      for (const label of failed(pat))
        expect(failed(plain), `${key} ${song} ${seed}`).toContain(label);
      for (const span of pat.polySpans) expect((span.at + span.span) % stepsOf(m)).toBe(0);
      expect(pat.bars[0].c[0]).toBe(1);
    }
  });

  it.each(DRAWN)('$key $song: appears at its rate over 200 seeds', ({ key, song, rate }) => {
    let n = 0;
    for (let seed = 1; seed <= 200; seed++) {
      if (generatePattern({ style: testStyle(key), song, seed, ...OPTS }).polySpans) n++;
    }
    expect(Math.abs(n / 200 - rate)).toBeLessThanOrEqual(0.1);
  });

  it('is not chosen against by the critic: generateGood keeps them at the rate', () => {
    for (const [key, song] of [
      ['elvinjones', 'resolution'],
      ['collins', undefined],
    ] as const) {
      const rate = withSong(STYLES[key], song).polyFill!;
      let n = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const opts = { style: testStyle(key), song, seed, ...OPTS };
        if (generateGood(opts, 120).pattern.polySpans) n++;
      }
      expect(Math.abs(n / 200 - rate), key).toBeLessThanOrEqual(0.1);
    }
  });
});

describe('on a clave style', () => {
  const SON = withParams('son', { polyFill: 1, polyFills: [[THREES, 1]] });
  const strokes = STYLES.son.backbeats!;

  it('a poly fill leaves every stroke of the clave as it was', () => {
    let filled = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const pat = generatePattern({ style: SON, seed, ...OPTS });
      if (!pat.polySpans) continue;
      filled++;
      for (const [bi, b] of pat.bars.entries()) {
        for (const x of strokes) expect(b.s[x], `seed ${seed} bar ${bi} step ${x}`).toBe(4);
      }
    }
    expect(filled).toBeGreaterThan(40);
  });

  it('a cross-rhythm leaves them as well', () => {
    const clave = Array.from({ length: 16 }, (_, i) => (strokes.includes(i) ? '4' : '.')).join('');
    const style = withParams('son', {
      figures: [[{ k: '1.......1.......', s: clave }, 1]],
      crossRhythm: 1,
      crossRhythms: [[{ every: 3, lanes: { s: 3 } }, 1]],
      // no fill to end on, so the cross-rhythm is the only thing written over the clave
      fillChance: 0,
    });
    for (let seed = 1; seed <= 20; seed++) {
      const pat = generatePattern({ style, seed, ...OPTS });
      for (const b of pat.bars)
        for (const x of strokes) expect(b.s[x]).toBe(bbValue('s', STYLES.son));
    }
  });
});

/** A two-bar pattern of 4/4 with a poly fill of threes over the second bar. */
function threesPattern(): Pattern {
  const bars = [emptyBar(16), emptyBar(16)];
  for (const b of bars) {
    for (let i = 0; i < 16; i += 2) b.h[i] = 1;
    b.s[4] = 2;
    b.s[12] = 2;
    b.k[0] = 1;
  }
  const span = writePolyFill(
    bars,
    1,
    { ...THREES, cells: 4 },
    { meter: meterOf('4/4'), lanes: ['k', 's', 'h', 'c'], backbeats: [4, 12] }
  )!;
  return {
    name: 'threes',
    style: 'funk',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 'h', 'c'],
    perc: {},
    backbeats: [4, 12],
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    polySpans: [span],
    bars,
  };
}

describe('the critic', () => {
  it('judges the span as a fill: a run of snare in it, and no air, are the figure', () => {
    const pat = threesPattern();
    expect(pat.bars[1].s.slice(4)).toEqual([3, 1, 1, 3, 1, 1, 3, 1, 1, 3, 1, 1]);
    expect(playability(pat, 100).hard).toBe(true);
    const unmarked = clonePattern(pat);
    delete unmarked.polySpans;
    const failed = playability(unmarked, 100)
      .checks.filter((c) => !c.ok)
      .map((c) => c.label);
    expect(failed).toContain('Snare never runs four 16ths without a break');
  });

  it('still counts the hands in it', () => {
    const pat = threesPattern();
    pat.bars[1].h[5] = 1;
    pat.bars[1].c[5] = 1;
    expect(playability(pat, 100).checks).toContainEqual({ ok: false, label: HANDS_CHECK });
  });

  it('scores it as the plain fill it took the place of', () => {
    const pat = threesPattern();
    const plain = { ...clonePattern(pat), bars: withPlainSpans(pat, 0) };
    delete plain.polySpans;
    expect(critique(pat).score).toBe(critique(plain).score);
  });
});

describe('fitHands', () => {
  it('lifts the cymbal and keeps the accent of the figure', () => {
    const pat = threesPattern();
    const [i] = accentLanesIn(pat, 1).keys();
    pat.bars[1].h[i] = 2;
    pat.bars[1].t1[i] = 2;
    pat.lanes.push('t1');
    fitHands(pat);
    expect(handsAt(pat.bars[1], i, handLanes(pat.perc))).toBe(2);
    expect(pat.bars[1].s[i]).toBe(3);
    expect(pat.bars[1].h[i]).toBe(0);
  });

  it('takes the hand off a crash before the figure’s tom accent, on a backbeat', () => {
    const bars = [emptyBar(16), emptyBar(16)];
    for (const b of bars) b.s[4] = b.s[12] = 2;
    const lanes: LaneKey[] = ['k', 's', 'h', 'c', 't1'];
    const span = writePolyFill(
      bars,
      1,
      { ...THREES, orchestrate: ['t1'] },
      { meter: meterOf('4/4'), lanes, backbeats: [4, 12] }
    )!;
    const pat: Pattern = { ...threesPattern(), lanes, bars, polySpans: [span] };
    // the first accent is bar 2's backbeat, with the snare and a crash on it too
    expect(span).toMatchObject({ bar: 1, at: 4 });
    expect(bars[1].t1[4]).toBe(2);
    bars[1].s[4] = 2;
    bars[1].c[4] = 1;
    fitHands(pat);
    expect(bars[1].t1[4]).toBe(2);
    expect(bars[1].s[4]).toBe(2);
    expect(bars[1].c[4]).toBe(0);
  });
});

describe('writing a cell', () => {
  it('plays a tom the pattern has not got on the snare, as a snare value', () => {
    const bars = [emptyBar(16), emptyBar(16)];
    writePolyFill(
      bars,
      1,
      { device: 'grouping', cell: { s: '3..', t1: '.2.', k: '..1' }, cells: 4 },
      { meter: meterOf('4/4'), lanes: ['k', 's', 'h', 'c'], backbeats: [4, 12] }
    );
    expect(bars[1].t1.every((v) => v === 0)).toBe(true);
    // the tom's accent is the snare's accent
    expect(bars[1].s[5]).toBe(3);
  });
});

describe('keeping a span', () => {
  it('keeps it when bars are added after its own', () => {
    const pat = threesPattern();
    const longer = clonePattern(pat);
    longer.bars.push(emptyBar(16));
    expect(keptPolySpans(pat, longer)).toEqual(pat.polySpans);
  });

  it('drops it when a bar it covers is taken away', () => {
    const pat = threesPattern();
    const shorter = clonePattern(pat);
    shorter.bars.pop();
    expect(keptPolySpans(pat, shorter)).toBeNull();
  });
});

describe('a plain row', () => {
  it('reads and clears the note the layers below 4 play, which the bars do not hold', () => {
    const pat = threesPattern();
    // the hat on bar 2's 8th that the figure took the hand off
    expect(pat.bars[1].h[6]).toBe(0);
    expect(plainAt(pat, 1, 'h', 6)).toBe(1);
    clearPlainAt(pat, 1, 'h', 6);
    expect(plainAt(pat, 1, 'h', 6)).toBe(0);
    expect(withPlainSpans(pat, 3)[1].h[6]).toBe(0);
    // outside the span there is no plain row to read
    expect(plainAt(pat, 0, 'h', 6)).toBe(0);
  });
});

describe('toRide', () => {
  it('turns the hats the span played before into ride, so the layers below 4 do not bring them back', () => {
    const pat = threesPattern();
    const [span] = pat.polySpans!;
    expect(span.plain.h?.some(Boolean)).toBe(true);
    toRide(pat);
    expect(span.plain.h?.some(Boolean)).toBe(false);
    expect(span.plain.r?.some(Boolean)).toBe(true);
    for (const b of withPlainSpans(pat, 3)) expect(b.h.every((v) => v === 0)).toBe(true);
  });
});

describe('the layers', () => {
  const pat = generatePattern({
    style: testStyle('elvinjones'),
    song: 'resolution',
    seed: 2,
    ...OPTS,
  });
  const steps = (bi: number) => [...spanStepsIn(pat, bi)];

  it('play the figure whole at 5 and at 4', () => {
    for (const level of [4, 5]) {
      const at = reducePattern(pat, level);
      for (const bi of [2, 3]) {
        for (const i of steps(bi)) {
          for (const L of ['s', 't3', 'k', 'r'] as LaneKey[]) {
            expect(at.bars[bi][L][i], `L${level} ${bi}:${i} ${L}`).toBe(pat.bars[bi][L][i]);
          }
        }
      }
    }
  });

  it('play the plain fill it took the place of below 4, reduced as any bar is', () => {
    const plain = withPlainSpans(pat, 0);
    for (const level of [1, 2, 3]) {
      const at = reducePattern(pat, level);
      for (const bi of [2, 3]) {
        const want = reduceBar(plain[bi], level, meterOf(pat.meter), pat.hasRide, pat.hasHat);
        expect(at.bars[bi]).toEqual(want);
      }
    }
    expect(reducePattern(pat, 3).bars[3].t3[6]).toBe(0);
  });

  it('keep a note you pinned in the span', () => {
    const pinned = clonePattern(pat);
    pinned.pins = [undefined, undefined, undefined, { t1: Array<number>(24).fill(0) }];
    pinned.bars[3].t1[10] = 2;
    pinned.pins[3]!.t1![10] = 2;
    expect(reducePattern(pinned, 2).bars[3].t1[10]).toBe(2);
  });
});

describe('another meter', () => {
  const E8 = meterOf('4/4-8');
  const M44 = meterOf('4/4');

  it('carries a cell by the quarter note, and drops one whose notes leave the grid', () => {
    const tony = STYLES.tonywilliams.polyFills!;
    const carried = polyFillsIn(tony, M44, E8);
    expect(carried.map(([pf]) => pf.cell)).toEqual([
      { s: '3.....', k: '2.....' },
      { s: '3..', k: '1..' },
    ]);
    expect(polyFillsIn(STYLES.collins.polyFills!, M44, E8)).toEqual([]);
    expect(styleIn(STYLES.collins, '4/4-8').polyFills).toBeUndefined();
    expect(styleIn(STYLES.collins, '4/4-6').polyFills).toBeUndefined();
  });

  it('a song in another meter takes the style’s only where they still fit', () => {
    const elvin = STYLES.elvinjones;
    // a waltz with none of its own: the three-beat cycle in sextuplets leaves the grid
    expect(withSong(elvin, 'juju').polyFills).toBeUndefined();
    expect(withSong(elvin, 'afro-blue').polyFills?.[0][0].device).toBe('hemiola');
    expect(withSong(elvin, 'resolution').polyFills?.[0][0].device).toBe('polymeter');
  });

  it('a figure that is the meter’s own pulse is not written as one', () => {
    const threeFour: PolyFill = { device: 'polymeter', cell: { s: '3...........' }, cells: 2 };
    expect(polyFillFits(threeFour, M44, 4)).toBe(true);
    expect(polyFillFits(threeFour, meterOf('3/4'), 4)).toBe(false);
    const dotted: PolyFill = {
      device: 'cross-rhythm',
      ratio: '2:3',
      cell: { s: '3.....' },
      cells: 4,
    };
    expect(polyFillFits(dotted, meterOf('12/8'), 4)).toBe(false);
    expect(polyFillFits(dotted, meterOf('3/4'), 4)).toBe(true);
    // never into the first bar
    expect(polyFillFits(dotted, M44, 2)).toBe(false);
  });
});

describe('on the wire', () => {
  const pat = generatePattern({
    style: testStyle('elvinjones'),
    song: 'resolution',
    seed: 2,
    ...OPTS,
  });

  it('round-trips, and a reader that drops `ps` plays the same notes', () => {
    const packed = packPattern(pat);
    expect(packed.ps).toHaveLength(1);
    const back = patternFromPacked(packed);
    expect(back.polySpans).toEqual(pat.polySpans);
    expect(patternSchema.safeParse(back).success).toBe(true);
    const { ps: _dropped, ...older } = packed;
    expect(patternFromPacked(older).bars).toEqual(back.bars);
  });

  it('leaves out a span that does not fit its bars, and refuses a value the lane has not got', () => {
    const packed = packPattern(pat);
    const span = packed.ps![0];
    const moved = patternFromPacked({ ...packed, ps: [{ ...span, b: 3 }] });
    expect(moved.polySpans).toBeUndefined();
    const payload = {
      ver: 7,
      bpm: 160,
      A: { ...packed, ps: [{ ...span, p: { c: '9'.repeat(36) } }] },
    };
    expect(sharePayloadSchema.safeParse(payload).success).toBe(false);
  });
});

describe('the doctor', () => {
  const GADD = testStyle('gadd');
  const pat = generatePattern({ style: GADD, song: 'nite-sprite', seed: 3, ...OPTS });

  it('offers the style’s poly fill on the fill move, as often as not', () => {
    let offered = 0;
    for (let entropy = 1; entropy <= 40; entropy++) {
      const out = doctor(pat, withSong(GADD.params, 'nite-sprite'), 'fill', entropy);
      if (out.polySpans?.some((s) => s.device === 'grouping')) offered++;
    }
    expect(offered).toBeGreaterThan(10);
    expect(offered).toBeLessThan(30);
  });

  it('keeps a span whose accents a move left alone, and drops one it changed', () => {
    const filled = clonePattern(pat);
    const span = writePolyFill(
      filled.bars,
      3,
      { ...THREES, cells: 8 },
      { meter: meterOf('4/4'), lanes: filled.lanes, backbeats: filled.backbeats }
    )!;
    filled.polySpans = [span];
    expect(doctor(filled, GADD.params, 'ghosts-', 1).polySpans).toEqual([span]);
    expect(doctor(filled, GADD.params, 'mirror', 1).polySpans).toBeUndefined();
    const edited = clonePattern(filled);
    edited.bars[span.bar].s[span.at] = 0;
    expect(keptPolySpans(filled, edited)).toBeNull();
  });
});

describe('the style data', () => {
  it('validates', () => {
    for (const key of ['collins', 'elvinjones', 'gadd', 'klek', 'shrieve', 'tonywilliams']) {
      expect(styleParamsSchema.safeParse(STYLES[key]).success, key).toBe(true);
    }
  });

  /* D56: a drummer gets poly fills only from a device the record sources,
     and one they play in fills, solos or comping, not only in the groove. */
  it('writes each poly fill from a device the drummer’s record names, with its source', () => {
    const corpus = readCorpus(DRUMMER_MODEL_DIR);
    for (const [key, st] of Object.entries(STYLES)) {
      const vocab = [
        ...(st.polyFills ?? []),
        ...(st.songs ?? []).flatMap((s) => s.params.polyFills ?? []),
      ];
      if (!vocab.length) continue;
      const record = corpus.drummers.find((d) => d.record.beatbreaker?.style_key === key)?.record;
      expect(record, key).toBeDefined();
      const devices = record!.technique_profile?.coordination?.devices ?? [];
      for (const [pf] of vocab) {
        const named = devices.filter(
          (d) =>
            d.kind === pf.device &&
            (d.where ?? []).some((w) => ['fills', 'solos', 'comping'].includes(w)) &&
            (d.evidence?.source_ids?.length ?? 0) > 0
        );
        expect(named.length, `${key}: ${pf.device}`).toBeGreaterThan(0);
        if (pf.ratio) expect(named.map((d) => d.ratio)).toContain(pf.ratio);
      }
    }
  });

  it('has a song for every Tony Williams rate it sets', () => {
    const tony = STYLES.tonywilliams;
    expect(tony.polyFill).toBeUndefined();
    const drawn = (tony.songs ?? []).filter((s) => s.params.polyFill).map((s) => s.key);
    expect(drawn).toContain('joshua');
    for (const key of drawn) expect(songOf(tony, key)).toBeDefined();
  });
});

describe('a tuplet poly fill (12-d)', () => {
  /* No drummer in the roster has a sourced tuplet device yet (research § AC),
     so this is the mechanism the drummers of 12-e and 12-f will use: fives
     round the toms over the last two beats, landing on the 1. */
  const FIVES: PolyFill = {
    device: 'tuplet',
    ratio: '5:4',
    cell: { s: '32222' },
    tupletSteps: 4,
    cells: 2,
    orchestrate: ['s', 't1'],
  };
  const ctx = {
    meter: meterOf('4/4'),
    lanes: ['k', 's', 'h', 'c', 't1'] as LaneKey[],
    backbeats: [4, 12],
  };
  const groove = () =>
    [emptyBar(16), emptyBar(16)].map((b) => {
      for (let i = 0; i < 16; i += 2) b.h[i] = 1;
      b.s[4] = 2;
      b.s[12] = 2;
      b.k[0] = 1;
      return b;
    });

  it('writes its cells as spans, back from the bar line, and lands on the 1', () => {
    const bars = groove();
    const tuplets: NonNullable<Pattern['tuplets']> = [];
    const span = writePolyFill(bars, 1, FIVES, ctx, tuplets);
    expect(span).toMatchObject({ bar: 1, at: 8, span: 8, device: 'tuplet', every: 4 });
    expect(tuplets).toEqual([
      { bar: 1, start: 8, span: 4, n: 5, notes: { s: [3, 2, 2, 2, 2] } },
      { bar: 1, start: 12, span: 4, n: 5, notes: { t1: [2, 1, 1, 1, 1] } },
    ]);
    // the hands leave the grid under it, and the next 1 is the crash
    expect(bars[1].s.slice(8)).toEqual(Array(8).fill(0));
    expect(bars[1].h.slice(8)).toEqual(Array(8).fill(0));
    expect(bars[0].c[0]).toBe(1);
  });

  it('is written only where it has somewhere to put its spans, and never on a clave', () => {
    expect(writePolyFill(groove(), 1, FIVES, ctx)).toBeNull();
    expect(writePolyFill(groove(), 1, FIVES, { ...ctx, clave: true }, [])).toBeNull();
  });

  it('fits a bar its cells divide, and carries into another meter by its steps', () => {
    expect(polyFillFits(FIVES, meterOf('4/4'), 2)).toBe(true);
    expect(polyFillFits({ ...FIVES, tupletSteps: 6 }, meterOf('4/4'), 2)).toBe(false);
    expect(polyFillsIn([[FIVES, 1]], meterOf('4/4'), meterOf('4/4-8'))).toEqual([
      [{ ...FIVES, tupletSteps: 2 }, 1],
    ]);
  });

  it('is a style field the catalogue holds to its steps', () => {
    const ok = styleParamsSchema.safeParse({
      ...STYLES.funk,
      polyFill: 0.2,
      polyFills: [[FIVES, 1]],
    });
    expect(ok.success).toBe(true);
    const { tupletSteps: _steps, ...noSteps } = FIVES;
    const bad = styleParamsSchema.safeParse({
      ...STYLES.funk,
      polyFill: 0.2,
      polyFills: [[noSteps, 1]],
    });
    expect(bad.success).toBe(false);
  });

  it('is generated whole, and the critic keeps it', () => {
    const style = withParams('funk', { polyFill: 1, polyFills: [[FIVES, 1]] });
    const pat = generatePattern({ style, seed: 7, ...OPTS });
    expect(pat.polySpans?.[0].device).toBe('tuplet');
    expect(pat.tuplets).toHaveLength(2);
    expect(playability(pat, 100).hard).toBe(true);
    // below layer 4 the plain fill it took the place of, with no tuplet
    expect(reducePattern(pat, 3).tuplets).toBeUndefined();
  });
});
