/**
 * The generator, the critic's rejection sampler and the engraver, across every
 * style in every meter.
 *
 * These are the invariants the porting commits checked by hand (1ce3714d,
 * 6e2f065c). They are written as sweeps rather than examples because the
 * failure they guard against is one style in one meter quietly producing a bar
 * of the wrong length or a NaN coordinate — nothing a handful of cases would
 * find.
 */

import { describe, expect, it } from 'vitest';

import { CANDIDATES, critique, generateGood, playability } from '@/lib/app/breaks/critic';
import { engrave } from '@/lib/app/breaks/engrave';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { LANES } from '@/lib/app/breaks/lanes';
import { METER_KEYS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { STYLE_KEYS } from '@/lib/app/breaks/styles';
import type { Pattern } from '@/lib/app/breaks/types';
import type { SvgNode } from '@/lib/app/breaks/engrave';

const COMBOS = STYLE_KEYS.flatMap((style) => METER_KEYS.map((meter) => ({ style, meter })));

function gen(style: string, meter: string, seed = 12345, bars = 2): Pattern {
  return generatePattern({ style, meter, seed, bars, density: 50, ghosts: 50 });
}

function expectBarsFit(pat: Pattern, bars: number): void {
  const n = stepsOf(meterOf(pat.meter));
  expect(pat.bars).toHaveLength(bars);
  for (const bar of pat.bars) {
    for (const L of LANES) expect(bar[L]).toHaveLength(n);
  }
}

function hasNaN(nodes: SvgNode[]): boolean {
  return nodes.some(
    (n) =>
      Object.values(n.attrs).some((v) =>
        typeof v === 'number' ? !Number.isFinite(v) : /NaN|Infinity/.test(v)
      ) || (n.children ? hasNaN(n.children) : false)
  );
}

describe('the style table', () => {
  it('is 37 styles in 12 meters — the numbers the site copy quotes', () => {
    expect(STYLE_KEYS).toHaveLength(37);
    expect(METER_KEYS).toHaveLength(12);
    expect(COMBOS).toHaveLength(444);
  });
});

describe('generatePattern', () => {
  it('generates every style in every meter at the meter’s step count', () => {
    for (const { style, meter } of COMBOS) {
      const pat = gen(style, meter);
      expect(pat.style).toBe(style);
      expect(pat.meter).toBe(meter);
      expectBarsFit(pat, 2);
    }
  });

  it('writes only legal values into every lane', () => {
    const max: Record<string, number> = {
      k: 2,
      s: 4,
      h: 3,
      r: 2,
      c: 1,
      t1: 2,
      t2: 2,
      t3: 2,
      hf: 1,
      p1: 2,
      p2: 2,
    };
    for (const { style, meter } of COMBOS) {
      for (const bar of gen(style, meter, 777, 4).bars) {
        for (const L of LANES) {
          for (const v of bar[L]) {
            expect(Number.isInteger(v)).toBe(true);
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(max[L]);
          }
        }
      }
    }
  });

  it('is deterministic: same seed and options give an identical pattern', () => {
    for (const { style, meter } of COMBOS.filter((_, i) => i % 7 === 0)) {
      expect(JSON.stringify(gen(style, meter, 99, 4))).toBe(
        JSON.stringify(gen(style, meter, 99, 4))
      );
    }
  });

  it('gives a different pattern for a different seed', () => {
    const distinct = new Set(
      Array.from({ length: 20 }, (_, i) => JSON.stringify(gen('funk', '4/4', i + 1).bars))
    );
    expect(distinct.size).toBeGreaterThan(10);
  });

  it('honours the bar count from one to eight', () => {
    for (const bars of [1, 2, 3, 4, 8]) expectBarsFit(gen('funk', '4/4', 5, bars), bars);
  });
});

describe('deriveB', () => {
  it('derives a B section from every A without changing its shape or the A', () => {
    for (const { style, meter } of COMBOS) {
      const a = gen(style, meter);
      const before = JSON.stringify(a);
      const b = deriveB(a);
      expect(JSON.stringify(a)).toBe(before);
      expect(b.style).toBe(style);
      expect(b.meter).toBe(meter);
      expect(b.seed).not.toBe(a.seed);
      expectBarsFit(b, a.bars.length);
    }
  });
});

describe('generateGood', () => {
  it('keeps a playable candidate whenever one exists, and counts what it rejected', () => {
    for (const { style, meter } of COMBOS.filter((_, i) => i % 3 === 0)) {
      const res = generateGood({ style, meter, seed: 4242, bars: 2, density: 50, ghosts: 50 }, 100);
      expect(res.tries).toBe(CANDIDATES);
      expect(res.rejected).toBeGreaterThanOrEqual(0);
      expect(res.rejected).toBeLessThanOrEqual(CANDIDATES);
      if (res.rejected < CANDIDATES) expect(playability(res.pattern, 100).hard).toBe(true);
      expectBarsFit(res.pattern, 2);
    }
  });

  it('keeps a findable backbeat in every style in every meter', () => {
    for (const { style, meter } of COMBOS) {
      const { pattern } = generateGood(
        { style, meter, seed: 31, bars: 2, density: 50, ghosts: 50 },
        100
      );
      const backbeat = playability(pattern, 100).checks[3];
      expect(backbeat.label).toMatch(/backbeat|2 and 4/);
      expect({ style, meter, ok: backbeat.ok }).toEqual({ style, meter, ok: true });
    }
  });

  it('scores within 0–100', () => {
    for (const { style, meter } of COMBOS.filter((_, i) => i % 5 === 0)) {
      const { score } = critique(gen(style, meter));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('engrave', () => {
  it('engraves every style in every meter with no NaN and one anchor per step', () => {
    for (const { style, meter } of COMBOS) {
      const pat = gen(style, meter);
      const out = engrave(pat, null, { scale: 1, perSystem: 2, guides: true, sticking: true });
      const steps = stepsOf(meterOf(meter));
      expect(out.steps).toBe(steps);
      expect(out.map).toHaveLength(pat.bars.length * steps);
      for (const a of out.map) {
        for (const v of [a.x, a.y, a.w, a.h]) expect(Number.isFinite(v)).toBe(true);
      }
      expect(Number.isFinite(out.width) && out.width > 0).toBe(true);
      expect(Number.isFinite(out.height) && out.height > 0).toBe(true);
      expect(hasNaN(out.nodes)).toBe(false);
    }
  });

  it('places the playhead anchors left to right within a system', () => {
    const pat = gen('funk', '4/4', 1, 1);
    const { map } = engrave(pat, null, { scale: 1, perSystem: 1 });
    for (let i = 1; i < map.length; i++) expect(map[i].x).toBeGreaterThan(map[i - 1].x);
  });
});
