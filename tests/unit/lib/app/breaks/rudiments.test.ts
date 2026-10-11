/**
 * The rudiments library's data (Phase 10, D43–D45): the forty, each written
 * so that what the chart prints, what the drummer plays and what every layer
 * keeps is the rudiment as written.
 */

import { describe, expect, it } from 'vitest';

import { playability } from '@/lib/app/breaks/critic';
import { assignBar } from '@/lib/app/breaks/drummer/sticking';
import { reducePattern } from '@/lib/app/breaks/layers';
import { patternFromLibrary } from '@/lib/app/breaks/library';
import { METERS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
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
