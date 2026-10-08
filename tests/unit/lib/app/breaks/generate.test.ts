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
import { deriveB, fitHands, generatePattern } from '@/lib/app/breaks/generate';
import { LANES, handLanes, handsAt } from '@/lib/app/breaks/lanes';
import { METER_KEYS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { TEST_STYLE_KEYS, testStyles } from '@/tests/helpers/catalogue';
import type { Pattern } from '@/lib/app/breaks/types';
import type { SvgNode } from '@/lib/app/breaks/engrave';

/* The same style table the generator used to import, resolved once — the
   generator takes the style as an argument now, so the sweep feeds it in. Built
   once rather than per call so every combo sees the same style object, which is
   what `styleIn`'s per-style remap cache is keyed on. */
const STYLES = testStyles();

const COMBOS = TEST_STYLE_KEYS.flatMap((style) => METER_KEYS.map((meter) => ({ style, meter })));

function gen(style: string, meter: string, seed = 12345, bars = 2): Pattern {
  return generatePattern({ style: STYLES[style], meter, seed, bars, density: 50, ghosts: 50 });
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
  it('is 39 styles in 12 meters — the numbers the site copy quotes', () => {
    expect(TEST_STYLE_KEYS).toHaveLength(39);
    expect(METER_KEYS).toHaveLength(12);
    expect(COMBOS).toHaveLength(468);
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
      const b = deriveB(a, STYLES[style].params);
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
      const res = generateGood(
        { style: STYLES[style], meter, seed: 4242, bars: 2, density: 50, ghosts: 50 },
        100
      );
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
        { style: STYLES[style], meter, seed: 31, bars: 2, density: 50, ghosts: 50 },
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

describe('two hands', () => {
  const tom = (b: Pattern['bars'][number], j: number) => !!(b.t1[j] || b.t2[j] || b.t3[j]);

  it('never writes a step that needs more than two hands on the kit, in any style or meter', () => {
    for (const { style, meter } of COMBOS) {
      for (const seed of [1, 2, 3]) {
        const a = generatePattern({
          style: STYLES[style],
          seed,
          bars: 4,
          density: 80,
          ghosts: 80,
          meter,
        });
        for (const p of [a, deriveB(a, STYLES[style].params)]) {
          const lanes = handLanes(p.perc);
          p.bars.forEach((b) => {
            for (let i = 0; i < b.k.length; i++)
              expect(handsAt(b, i, lanes)).toBeLessThanOrEqual(2);
          });
        }
      }
    }
  });

  it('lifts the hats and ride off through a tom fill', () => {
    for (const style of TEST_STYLE_KEYS) {
      const p = generatePattern({
        style: STYLES[style],
        seed: 7,
        bars: 4,
        density: 60,
        ghosts: 50,
      });
      p.bars.forEach((b) => {
        for (let i = 0; i < b.k.length; i++) {
          if (tom(b, i) && (tom(b, i - 1) || tom(b, i + 1))) {
            expect(b.h[i]).toBe(0);
            expect(b.r[i]).toBe(0);
          }
        }
      });
    }
  });

  it('drops the hand hats where a cowbell on the kit keeps the time, and keeps the backbeat', () => {
    const p = generatePattern({ style: STYLES.mambo, seed: 3, bars: 2, density: 60, ghosts: 50 });
    const bell = (['p1', 'p2'] as const).find((L) => p.perc[L] === 'cowbell')!;
    expect(bell).toBeDefined();
    p.bars.forEach((b) => {
      for (let i = 0; i < b.k.length; i++) if (b[bell][i] && b.s[i]) expect(b.h[i]).toBe(0);
      for (const x of p.backbeats) if (x < b.k.length) expect(b[p.bbLane][x]).toBeGreaterThan(0);
    });
  });

  it('fitting a fitted pattern changes nothing, and never adds a note', () => {
    const p = generatePattern({ style: STYLES.songo, seed: 11, bars: 4, density: 70, ghosts: 70 });
    const before = JSON.stringify(p.bars);
    fitHands(p);
    expect(JSON.stringify(p.bars)).toBe(before);

    const crowded = generatePattern({
      style: STYLES.funk,
      seed: 5,
      bars: 1,
      density: 50,
      ghosts: 50,
    });
    crowded.bars[0].t2[4] = 1;
    crowded.bars[0].t1[4] = 1;
    const notes = (q: Pattern) =>
      q.bars.flatMap((b) => LANES.flatMap((L) => b[L])).filter(Boolean).length;
    const was = notes(crowded);
    fitHands(crowded);
    expect(notes(crowded)).toBeLessThan(was);
    expect(handsAt(crowded.bars[0], 4, handLanes(crowded.perc))).toBeLessThanOrEqual(2);
  });
});

describe('double kick', () => {
  /** The longest run of kicks in a row, anywhere in the pattern. */
  const longestRun = (pat: Pattern) =>
    Math.max(
      ...pat.bars.map((b) => {
        let best = 0;
        let run = 0;
        for (const v of b.k) best = Math.max(best, (run = v ? run + 1 : 0));
        return best;
      })
    );

  it('carries the double pedal with the pattern from every double-kick style, and no other', () => {
    for (const key of TEST_STYLE_KEYS) {
      const pat = gen(key, '4/4');
      expect(!!pat.attrs.doubleKick).toBe(!!STYLES[key].params.doubleKick);
    }
    expect(['metal', 'doublekick', 'gallop'].every((k) => STYLES[k].params.doubleKick)).toBe(true);
  });

  it('writes runs of 16ths on the kick that a single-pedal style never would', () => {
    expect(longestRun(gen('doublekick', '4/4', 7, 4))).toBeGreaterThanOrEqual(8);
    expect(longestRun(gen('rock', '4/4', 7, 4))).toBeLessThanOrEqual(2);
  });

  it('passes the playability check on a double pedal, and fails the same notes without one', () => {
    const pat = gen('doublekick', '4/4', 7, 4);
    const ok = playability(pat, 150);
    expect(ok.hard).toBe(true);
    expect(ok.checks[1]).toEqual({ ok: true, label: 'Kick runs go to the double pedal' });
    // not too fast for the doubles, either: that is what the second pedal is for
    expect(ok.checks[5].ok).toBe(true);

    const single = playability({ ...pat, attrs: { ...pat.attrs, doubleKick: false } }, 150);
    expect(single.hard).toBe(false);
    expect(single.checks[1]).toEqual({ ok: false, label: 'No triple 16ths on the kick' });
    expect(single.checks[4].ok).toBe(false);
    expect(single.checks[5].ok).toBe(false);
  });

  it('keeps the gallop a gallop: an 8th and two 16ths, beat after beat', () => {
    const pat = gen('gallop', '4/4', 7, 4);
    const cells = pat.bars.flatMap((b) => [0, 4, 8, 12].map((s) => b.k.slice(s, s + 4).join('')));
    expect(cells.filter((c) => c === '1011').length).toBeGreaterThan(cells.length / 2);
  });
});
