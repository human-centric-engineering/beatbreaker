/**
 * The rudiments library's data (Phase 10, D43–D45): the forty, each written
 * so that what the chart prints, what the drummer plays and what every layer
 * keeps is the rudiment as written.
 */

import { describe, expect, it } from 'vitest';

import { playability } from '@/lib/app/breaks/critic';
import { assignBar } from '@/lib/app/breaks/drummer/sticking';
import { reducePattern } from '@/lib/app/breaks/layers';
import { libraryDoc, patternFromLibrary } from '@/lib/app/breaks/library';
import { METERS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { tupletStrokes } from '@/lib/app/breaks/tuplets';
import { RUDIMENTS } from '@/prisma/seeds/app-beatbreaker/data/rudiments';

const numberOf = (artist: string) => Number(/^PAS #(\d+)/.exec(artist)?.[1]);

describe('the forty', () => {
  it('are the PAS forty, each once, on six shelves', () => {
    expect(RUDIMENTS.map((r) => numberOf(r.artist))).toEqual(
      Array.from({ length: 40 }, (_, i) => i + 1)
    );
    expect(new Set(RUDIMENTS.map((r) => r.title)).size).toBe(40);
    expect(new Set(RUDIMENTS.map((r) => r.group)).size).toBe(6);
  });

  it('name the twenty-six that were the original American rudiments', () => {
    expect(RUDIMENTS.filter((r) => r.artist.includes('original 26'))).toHaveLength(26);
  });

  it.each(RUDIMENTS.map((r) => [r.title, r] as const))(
    '%s: every bar is its meter long, with a hand under every note and nowhere else',
    (_, r) => {
      expect(METERS[r.meter ?? '4/4']).toBeDefined();
      const n = stepsOf(meterOf(r.meter));
      for (const bar of r.bars) {
        expect(bar.s).toHaveLength(n);
        expect(bar.hands).toHaveLength(n);
        for (let i = 0; i < n; i++) {
          expect(bar.s?.[i] !== '.', `step ${i}`).toBe(bar.hands?.[i] !== '.');
        }
      }
    }
  );

  it.each(RUDIMENTS.map((r, i) => [r.title, r, i] as const))(
    '%s: playable, whole at every layer, and played with the hands written',
    (_, r, index) => {
      const pat = patternFromLibrary(r, index);
      expect(pat.lanes).toEqual(['s']);
      expect(playability(pat, r.bpm).hard).toBe(true);
      for (let level = 1; level <= 5; level++) {
        expect(reducePattern(pat, level).bars, `layer ${level}`).toEqual(pat.bars);
      }
      pat.bars.forEach((bar, bi) => {
        const row = pat.sticking?.[bi] ?? '';
        const played = assignBar(bar, null, false, false, { bar: row })
          .map((step, i) => (bar.s[i] ? (step.s === 'lead' ? 'R' : 'L') : '.'))
          .join('');
        expect(played, `bar ${bi + 1}`).toBe(row.toUpperCase());
      });
    }
  );
});

describe('the rolls closed (13-a)', () => {
  const closed = RUDIMENTS.map((r, i) => [r.title, r, i] as const).filter(([, r]) => r.then);

  /** A section's strokes in order, as hand and value: `R2 R2 L2 L2 R3`. */
  const strokes = (pat: ReturnType<typeof patternFromLibrary>): string[] =>
    pat.bars.flatMap((bar, bi) => {
      const out: Array<{ pos: number; s: string }> = [];
      bar.s.forEach((v, i) => {
        if (v) out.push({ pos: i, s: `${pat.sticking?.[bi]?.[i]}${v}` });
      });
      for (const t of tupletStrokes(pat, bi)) out.push({ pos: t.pos, s: `${t.hand}${t.value}` });
      return out.sort((a, b) => a.pos - b.pos).map((x) => x.s);
    });

  it('every double-stroke roll, and only those, has its closed form as B', () => {
    expect(closed.map(([, r]) => numberOf(r.artist))).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it.each(closed)(
    '%s: B is the same strokes, each double a pair of 32nds on one step',
    (_, r, index) => {
      const a = patternFromLibrary(r, index);
      const then = r.then;
      if (!then) throw new Error('no B');
      expect(then.ratio).toBeUndefined();
      const b = patternFromLibrary({ ...r, bars: then.bars, tuplets: then.tuplets }, index);
      /* the same strokes, figure for figure: a continuous roll closed is the
         open one twice over, in the same bar */
      const times = strokes(b).length / strokes(a).length;
      expect(Number.isInteger(times)).toBe(true);
      expect(strokes(b)).toEqual(Array.from({ length: times }, () => strokes(a)).flat());
      expect(b.tuplets?.length).toBeGreaterThan(0);
      for (const t of b.tuplets ?? []) {
        // doubles side by side in a beat are one span, each step a written hand
        expect(t.n).toBe(2 * t.span);
        expect(t.notes.s).toEqual(Array<number>(t.n).fill(2));
        for (let i = t.start; i < t.start + t.span; i++) {
          expect(b.sticking?.[t.bar]?.[i]).toMatch(/[RL]/);
        }
      }
      expect(b.fixed).toBe(true);
      expect(playability(b, r.bpm).hard).toBe(true);
      for (let level = 1; level <= 5; level++) {
        expect(reducePattern(b, level), `layer ${level}`).toEqual(b);
      }
    }
  );

  it('opens as A then B: the document carries B at the same tempo', () => {
    const [, r, index] = closed[0];
    const doc = libraryDoc(r, index);
    expect(doc.th).toBeDefined();
    expect(doc.th?.tr).toBeUndefined();
  });
});
