/**
 * The polyrhythms library's data (Phase 12, D54, D60): each entry written so
 * that its two streams are what it says they are — the cross pulse every
 * `beat` steps, the cycle a whole number of bars — and so that the layers,
 * the hands and the critic treat it as the exercise it is.
 */

import { describe, expect, it } from 'vitest';

import { playability } from '@/lib/app/breaks/critic';
import { assignBar } from '@/lib/app/breaks/drummer/sticking';
import { LANES } from '@/lib/app/breaks/lanes';
import { reducePattern } from '@/lib/app/breaks/layers';
import { POLYRHYTHM_STYLE, libraryDoc, patternFromLibrary } from '@/lib/app/breaks/library';
import { METERS, meterOf, stepSeconds, stepsOf } from '@/lib/app/breaks/meter';
import { packedPatternSchema, polySchema } from '@/lib/app/breaks/schema';
import { packPattern, patternFromPacked } from '@/lib/app/breaks/share';
import { sectionBpm } from '@/lib/app/breaks/sections';
import { tupletHands, tupletLanes, tupletPos, tupletsOf } from '@/lib/app/breaks/tuplets';
import type { Bar, LaneKey, Pattern } from '@/lib/app/breaks/types';
import { POLYRHYTHMS } from '@/prisma/seeds/app-beatbreaker/data/polyrhythms';

/** The value each lane writes an accent as. */
const ACCENT: Partial<Record<LaneKey, number>> = {
  k: 2,
  s: 3,
  h: 2,
  r: 2,
  t1: 2,
  t2: 2,
  t3: 2,
  p1: 2,
  p2: 2,
};

const entries = POLYRHYTHMS.map((item, i) => [item.title, item, i] as const);
/** The entries with two streams: everything but a written fill and the metric modulations. */
const streamed = entries.filter(([, item]) => !!item.poly);
const modulations = entries.filter(([, item]) => !!item.then);

/**
 * Every note of the given lanes, as global steps from the pattern's first —
 * a tuplet's (12-d) where it falls between the steps.
 */
function notesOf(pat: Pattern, lanes: LaneKey[], accented = false): number[] {
  const n = pat.bars[0].k.length;
  const out = new Set<number>();
  pat.bars.forEach((bar, bi) => {
    for (const L of lanes) {
      bar[L].forEach((v, i) => {
        if (v && (!accented || v === ACCENT[L])) out.add(bi * n + i);
      });
    }
  });
  for (const t of tupletsOf(pat)) {
    for (const L of lanes) {
      t.notes[L]?.forEach((v, j) => {
        if (v && (!accented || v === ACCENT[L])) out.add(t.bar * n + tupletPos(t, j));
      });
    }
  }
  return [...out].sort((a, b) => a - b);
}

function lanesWithNotes(pat: Pattern): LaneKey[] {
  return LANES.filter(
    (L) =>
      pat.bars.some((b) => b[L].some(Boolean)) ||
      tupletsOf(pat).some((t) => t.notes[L]?.some(Boolean))
  );
}

describe('the polyrhythms', () => {
  it('are thirty-nine, each once, on seven shelves, none of them a style', () => {
    expect(POLYRHYTHMS).toHaveLength(39);
    expect(new Set(POLYRHYTHMS.map((p) => p.title)).size).toBe(39);
    expect([...new Set(POLYRHYTHMS.map((p) => p.group))]).toEqual([
      'Two against three',
      'Three and four',
      'Groupings over four',
      'Polymeter',
      'Timelines and clave',
      'Tuplets',
      'Metric modulation',
    ]);
    expect(POLYRHYTHMS.every((p) => p.style === POLYRHYTHM_STYLE)).toBe(true);
  });

  it.each(entries)('%s: every row its meter long, on the lanes it lists', (_, item) => {
    expect(METERS[item.meter ?? '4/4']).toBeDefined();
    const parts = [
      { meter: item.meter, bars: item.bars, tuplets: item.tuplets },
      ...(item.then ? [{ ...item.then, meter: item.then.meter ?? item.meter }] : []),
    ];
    for (const part of parts) {
      const n = stepsOf(meterOf(part.meter));
      for (const bar of part.bars) {
        for (const [key, row] of Object.entries(bar)) {
          expect(row, key).toHaveLength(n);
          if (key !== 'hands') expect(item.lanes).toContain(key);
        }
      }
      for (const t of part.tuplets ?? []) {
        expect(t.start + t.span).toBeLessThanOrEqual(n);
        expect(new Set(Object.values(t.notes).map((r) => r?.length)).size, 'one n').toBe(1);
        for (const lane of Object.keys(t.notes)) expect(item.lanes).toContain(lane);
      }
    }
    // every span the entry writes is kept: none fails to fit its bar
    const pat = patternFromLibrary(item, 0);
    expect(tupletsOf(pat)).toHaveLength(item.tuplets?.length ?? 0);
  });

  it.each(streamed)('%s: its streams read, and its cycle is whole bars', (_, item, index) => {
    const poly = polySchema.parse(item.poly);
    const pat = patternFromLibrary(item, index);
    const n = pat.bars[0].k.length;
    expect([...poly.pulse, ...poly.cross].every((L) => item.lanes?.includes(L))).toBe(true);
    const cycle = (poly.beat * poly.count) / (poly.tuplet ?? 1);
    expect((pat.bars.length * n) % cycle, 'pattern length').toBe(0);
  });

  it.each(streamed)('%s: the cross stream is where its count says', (_, item, index) => {
    const pat = patternFromLibrary(item, index);
    const poly = pat.poly!;
    const total = pat.bars.length * pat.bars[0].k.length;
    const gap = poly.beat / (poly.tuplet ?? 1);
    const beats = Array.from({ length: Math.round(total / gap) }, (_, k) => k * gap);
    const cross = notesOf(pat, poly.cross);
    switch (poly.device) {
      case 'cross-rhythm':
      case 'hemiola':
        // even, and nothing else: three is three, not three and a bit
        expect(cross.length).toBe(beats.length);
        cross.forEach((x, k) => expect(x).toBeCloseTo(beats[k], 9));
        break;
      case 'grouping':
        // a note on every group's start, and the accents nowhere else
        expect(beats.every((g) => cross.includes(g))).toBe(true);
        expect(
          notesOf(pat, poly.cross, true).every((g) => g % poly.beat === 0),
          'accents'
        ).toBe(true);
        break;
      case 'polymeter': {
        // each cycle of the laid-over meter starts with the accent
        const cycle = poly.beat * poly.count;
        const accents = notesOf(pat, poly.cross, true);
        for (let g = 0; g < total; g += cycle) expect(accents, `cycle at ${g}`).toContain(g);
        break;
      }
      case 'timeline':
        expect(cross[0]).toBe(0);
        break;
      default:
        throw new Error(`no rule for ${poly.device}`);
    }
  });

  it.each(entries)('%s: playable as written', (_, item, index) => {
    const doc = libraryDoc(item, index);
    for (const packed of [doc, ...(doc.th ? [doc.th] : [])]) {
      const pat = patternFromPacked(packed);
      const checks = playability(pat, item.bpm);
      expect(checks.checks.filter((c) => !c.ok)).toEqual([]);
      expect(checks.hard).toBe(true);
    }
  });

  it.each(entries)(
    '%s: a tuplet in a lane with a hand is played with that hand',
    (_, item, index) => {
      const pat = patternFromLibrary(item, index);
      const named = pat.poly?.hands ?? {};
      for (const t of tupletsOf(pat)) {
        for (let j = 0; j < t.n; j++) {
          const hands = tupletHands(pat, t, j);
          for (const L of tupletLanes(t)) {
            if (!t.notes[L]?.[j] || L === 'k' || L === 'hf') continue;
            expect(hands[L], `${L} note ${j}`).toBe(named[L] ?? hands[L]);
            expect(hands[L]).toMatch(/^[RL]$/);
          }
        }
      }
    }
  );

  it.each(streamed)('%s: the drummer plays each lane with the hand it names', (_, item, index) => {
    const pat = patternFromLibrary(item, index);
    const hands = pat.poly?.hands ?? {};
    let before: Bar | null = null;
    pat.bars.forEach((bar, bi) => {
      const played = assignBar(bar, before, false, false, {
        bar: pat.sticking?.[bi] ?? null,
        before: bi ? (pat.sticking?.[bi - 1] ?? null) : null,
      });
      for (const [lane, hand] of Object.entries(hands) as Array<[LaneKey, 'R' | 'L']>) {
        bar[lane].forEach((v, i) => {
          if (!v) return;
          expect(played[i][lane], `bar ${bi + 1} step ${i} ${lane}`).toBe(
            hand === 'R' ? 'lead' : 'other'
          );
        });
      }
      before = bar;
    });
  });

  it.each(streamed)('%s: the layers build it up a stream at a time', (_, item, index) => {
    const pat = patternFromLibrary(item, index);
    const { pulse, cross } = pat.poly!;
    const at = (level: number, feelCross = false) =>
      lanesWithNotes(reducePattern(pat, level, feelCross));
    expect(at(1)).toEqual(LANES.filter((L) => pulse.includes(L)));
    expect(at(2)).toEqual(LANES.filter((L) => cross.includes(L)));
    expect(at(3)).toEqual(LANES.filter((L) => pulse.includes(L) || cross.includes(L)));
    expect(reducePattern(pat, 5).bars).toEqual(pat.bars);
    // felt the other way round, the cross-rhythm comes first
    expect(at(1, true)).toEqual(at(2));
    expect(at(2, true)).toEqual(at(1));
  });

  it.each(entries)('%s: survives the trip into a library row and out', (_, item, index) => {
    const pat = patternFromLibrary(item, index);
    const back = patternFromPacked(packPattern(pat));
    expect(back.poly).toEqual(pat.poly);
    expect(back.perc).toEqual(pat.perc);
    expect(back.sticking ?? null).toEqual(pat.sticking ?? null);
    expect(back.tuplets).toEqual(pat.tuplets);
    expect(back.bars).toEqual(pat.bars);
    // and the row's document is one the catalogue reads
    expect(packedPatternSchema.safeParse(libraryDoc(item, index)).success).toBe(true);
  });

  it.each(modulations)('%s: the ride keeps its speed across the modulation', (_, item, index) => {
    /* What a metric modulation teaches: the notes the hand plays do not
       change speed; the beat under them does. So the ride's spacing in
       seconds is the same in A, at the entry's tempo, and in B, at its
       ratio. */
    const doc = libraryDoc(item, index);
    const [a, b] = [patternFromPacked(doc), patternFromPacked(doc.th!)];
    expect(b.tempoRatio).toBe(item.then!.ratio);
    const gapOf = (p: Pattern) => {
      const ride = notesOf(p, ['r']);
      return (ride[1] - ride[0]) * stepSeconds(meterOf(p.meter), sectionBpm(item.bpm, p));
    };
    expect(gapOf(b)).toBeCloseTo(gapOf(a), 9);
  });

  it('gives every two-hand cross-rhythm its other handing', () => {
    /* D60: "right hand three, left hand two", then the hands swapped. A twin
       is the same ratio on the same drums, the streams changed over. */
    const twoHand = POLYRHYTHMS.filter((p) => {
      const h = p.poly?.hands ?? {};
      return (
        p.poly?.device === 'cross-rhythm' &&
        p.poly.pulse.length === 1 &&
        p.poly.cross.length === 1 &&
        h[p.poly.pulse[0]] &&
        h[p.poly.cross[0]] &&
        h[p.poly.pulse[0]] !== h[p.poly.cross[0]]
      );
    });
    expect(twoHand.length).toBeGreaterThanOrEqual(4);
    for (const p of twoHand) {
      const twin = twoHand.find(
        (q) =>
          q !== p &&
          q.poly!.ratio === p.poly!.ratio &&
          q.poly!.pulse[0] === p.poly!.cross[0] &&
          q.poly!.cross[0] === p.poly!.pulse[0]
      );
      expect(twin, p.title).toBeDefined();
    }
  });

  it('says where an idea came from without claiming more than the sources do', () => {
    // the two named after drummers credit the device, not a transcription
    const after = POLYRHYTHMS.filter((p) => /after|plays one/.test(p.artist));
    expect(after.map((p) => p.title)).toEqual([
      'Fours across the triplets (after Elvin Jones)',
      'A five-sixteenth kick under 4/4 hands',
      'Kick in sevens under a half-time frame (after Tomas Haake)',
    ]);
  });
});
