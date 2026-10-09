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
import { LANES, LANE_VALUES, handLanes, handsAt } from '@/lib/app/breaks/lanes';
import { METER_KEYS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { TEST_STYLE_KEYS, testStyles } from '@/tests/helpers/catalogue';
import type { Figure, Pattern, ResolvedStyle, Style } from '@/lib/app/breaks/types';
import { styleParamsSchema } from '@/lib/app/breaks/catalogue/schemas';
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
  it('is 62 styles in 12 meters — the numbers the site copy quotes', () => {
    expect(TEST_STYLE_KEYS).toHaveLength(62);
    expect(METER_KEYS).toHaveLength(12);
    expect(COMBOS).toHaveLength(744);
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
    // the lane's own values (a style that writes its bars out can ask for a half-open hat or a china)
    const max = Object.fromEntries(LANES.map((L) => [L, LANE_VALUES[L].length]));
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
    expect(
      ['gallop', 'thrash', 'doublekick', 'groove'].every((k) => STYLES[k].params.doubleKick)
    ).toBe(true);
    // heavy metal and doom are one pedal, the left foot on the hats
    expect(['metal', 'doom'].some((k) => STYLES[k].params.doubleKick)).toBe(false);
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

describe('written-out bars (figures)', () => {
  const row = (v: number[]) => v.map((x) => (x ? String(x) : '.')).join('');
  /** A style with one figure, or two, and nothing else to choose from. */
  function figureStyle(
    figures: Array<[Figure, number]>,
    extra: Partial<Style> = {}
  ): ResolvedStyle {
    const base = STYLES.rock;
    return {
      ...base,
      // rock writes its own fills; a test figure ends on the generic ones unless it says otherwise
      params: { ...base.params, figures, fills: undefined, ...extra },
    };
  }

  it('plays the figure as written, with a crash on the one', () => {
    const fig: Figure = { h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1.1...1.1.1...1.' };
    const st = figureStyle([[fig, 1]]);
    const pat = generatePattern({ style: st, seed: 3, bars: 1, density: 50, ghosts: 0 });
    const b = pat.bars[0];
    expect(row(b.s)).toBe('....3.......3...');
    expect(row(b.k)).toBe('1.1...1.1.1...1.');
    // the hand leaves the hats for the crash on the one
    expect(b.c[0]).toBe(1);
    expect(row(b.h)).toBe('..4.4.4.4.4.4.4.');
    expect(pat.backbeats).toEqual([4, 12]);
  });

  it('reads the backbeat off the figures: half-time on 3, a skank on every "and"', () => {
    const half = figureStyle([
      [{ c: '3...3...3...3...', s: '........3.......', k: '1111111111111111' }, 1],
    ]);
    expect(
      generatePattern({ style: half, seed: 1, bars: 2, density: 50, ghosts: 0 }).backbeats
    ).toEqual([8]);
    const skank = figureStyle([
      [{ c: '1...1...1...1...', s: '..3...3...3...3.', k: '1...1...1...1...' }, 1],
    ]);
    const pat = generatePattern({ style: skank, seed: 1, bars: 2, density: 50, ghosts: 0 });
    expect(pat.backbeats).toEqual([2, 6, 10, 14]);
    expect(playability(pat, 200).checks[3].ok).toBe(true);
  });

  it('ends a phrase on a written fill, right-aligned to the bar, the kick running on under it', () => {
    const fill: Figure = { s: '33......', t1: '..22....', t2: '....22..', t3: '......22' };
    const st = figureStyle(
      [[{ c: '1...1...1...1...', s: '....3.......3...', k: '1111111111111111' }, 1]],
      { fills: [[fill, 1]], doubleKick: true }
    );
    // some seed fills the phrase: a fill goes in four times in five
    const filled = [1, 2, 3, 4, 5, 6]
      .map((seed) => generatePattern({ style: st, seed, bars: 2, density: 50, ghosts: 0 }).bars[1])
      .find((b) => b.t3[15]);
    expect(filled).toBeDefined();
    const b = filled!;
    expect(row(b.s.slice(8))).toBe('33......');
    expect(row(b.t1.slice(8))).toBe('..22....');
    expect(row(b.t3.slice(8))).toBe('......22');
    // the crash stops for the fill; the feet do not
    expect(row(b.c.slice(8))).toBe('........');
    expect(row(b.k)).toBe('1111111111111111');
  });

  it('falls back on the kick cells in a meter the figures are not written for', () => {
    const st = figureStyle([
      [{ c: '1...1...1...1...', s: '....3.......3...', k: '1111111111111111' }, 1],
    ]);
    const pat = generatePattern({
      style: st,
      meter: '7/8',
      seed: 4,
      bars: 2,
      density: 50,
      ghosts: 0,
    });
    expectBarsFit(pat, 2);
    expect(pat.bars[0].c.some((v, i) => v && i > 0)).toBe(false);
  });

  it('writes every metal style out as figures, playable and with nothing closed on the hats over a kick run', () => {
    for (const key of ['metal', 'gallop', 'thrash', 'doublekick', 'groove', 'doom']) {
      const params = STYLES[key].params;
      expect(params.figures?.length).toBeGreaterThan(3);
      expect(params.kit).toBeTruthy();
      for (const [f] of [...(params.figures ?? []), ...(params.fills ?? [])]) {
        const rows = Object.values(f);
        // a figure's rows all one length; a whole-bar figure is the bar
        expect(new Set(rows.map((r) => r?.length)).size).toBe(1);
      }
      for (const [f] of params.figures ?? []) {
        expect(f.k?.length).toBe(16);
        /* With the left foot gone to the second pedal, the hats are either a
           wash left half-open or not played: a closed 8th is a single-pedal
           verse. */
        if (params.doubleKick && /111/.test(f.k ?? '')) expect(f.h ?? '').not.toMatch(/1/);
      }
      for (let seed = 1; seed <= 40; seed++) {
        const pat = generatePattern({ style: STYLES[key], seed, bars: 4, density: 50, ghosts: 50 });
        const bpm = (params.bpm[0] + params.bpm[1]) / 2;
        expect(playability(pat, bpm).hard).toBe(true);
      }
    }
  });

  it('gives a metal phrase more than one beat in it', () => {
    const shapes = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const pat = generatePattern({
        style: STYLES.doublekick,
        seed,
        bars: 4,
        density: 50,
        ghosts: 0,
      });
      for (const b of pat.bars)
        shapes.add(`${row(b.c)}|${row(b.r)}|${row(b.h)}|${row(b.s)}|${row(b.k)}`);
    }
    expect(shapes.size).toBeGreaterThan(10);
  });
});

describe('the rock, jazz and blues styles', () => {
  // every style written out as figures, bar metal, which has its own tests above
  const METAL = ['metal', 'gallop', 'thrash', 'doublekick', 'groove', 'doom'];
  const ROCK = TEST_STYLE_KEYS.filter((k) => STYLES[k].params.figures && !METAL.includes(k));

  it('covers the rock, jazz and blues groups', () => {
    for (const k of ['rock', 'rockabilly', 'bebop', 'modal', 'brushes', 'slowblues', 'boogie'])
      expect(ROCK).toContain(k);
  });
  const row = (v: number[]) => v.map((x) => (x ? String(x) : '.')).join('');

  it('writes every one out as figures and fills that play, in its own meter', () => {
    for (const key of ROCK) {
      const params = STYLES[key].params;
      const n = stepsOf(meterOf(params.meter ?? '4/4'));
      expect(params.figures?.length).toBeGreaterThan(3);
      expect(params.fills?.length).toBeGreaterThan(2);
      for (const [f] of params.figures ?? []) {
        for (const r of Object.values(f)) expect(r?.length).toBe(n);
      }
      // nobody outside metal plays a china
      for (const [f] of [...(params.figures ?? []), ...(params.fills ?? [])])
        expect(f.c ?? '').not.toMatch(/3/);
      for (let seed = 1; seed <= 40; seed++) {
        const pat = generatePattern({
          style: STYLES[key],
          meter: params.meter,
          seed,
          bars: 4,
          density: 50,
          ghosts: 50,
        });
        const bpm = (params.bpm[0] + params.bpm[1]) / 2;
        expect({ key, seed, hard: playability(pat, bpm).hard }).toEqual({ key, seed, hard: true });
        for (const b of pat.bars) expect(b.c.includes(3)).toBe(false);
      }
    }
  });

  it('keeps a jazz backbeat on 2 and 4 when the hat foot plays every beat', () => {
    // post-bop's foot chicks on all four; its backbeats are still the style's own
    for (let seed = 1; seed <= 10; seed++) {
      const pat = generatePattern({
        style: STYLES.postbop,
        seed,
        bars: 4,
        density: 50,
        ghosts: 50,
      });
      for (const b of pat.backbeats) expect(STYLES.postbop.params.backbeats).toContain(b);
    }
  });

  it('gives a different break on each press of New', () => {
    for (const key of ROCK) {
      const params = STYLES[key].params;
      const breaks = new Set<string>();
      for (let seed = 1; seed <= 12; seed++) {
        const { pattern } = generateGood(
          { style: STYLES[key], meter: params.meter, seed, bars: 4, density: 50, ghosts: 50 },
          (params.bpm[0] + params.bpm[1]) / 2
        );
        breaks.add(
          pattern.bars.map((b) => `${row(b.h)}|${row(b.r)}|${row(b.s)}|${row(b.k)}`).join('/')
        );
      }
      expect({ key, distinct: breaks.size >= 10 }).toEqual({ key, distinct: true });
    }
  });
});

describe('the figure schema', () => {
  const parse = (figures: unknown) =>
    styleParamsSchema.safeParse({ ...STYLES.rock.params, figures }).success;

  it('takes a figure in the lanes’ own values', () => {
    expect(parse([[{ c: '3...', h: '4.4.', k: '1111' }, 1]])).toBe(true);
  });

  it('refuses rows of different lengths, values a lane does not have, and anything but digits and rests', () => {
    expect(parse([[{ s: '....3...', k: '1111' }, 1]])).toBe(false);
    expect(parse([[{ c: '5...' }, 1]])).toBe(false);
    expect(parse([[{ k: 'x.x.' }, 1]])).toBe(false);
  });
});

describe('the swing range schema', () => {
  const parse = (extra: Partial<Style>) =>
    styleParamsSchema.safeParse({ ...STYLES.rock.params, ...extra }).success;

  it('takes a range, low end first, with the style’s own swing inside it', () => {
    expect(parse({ swing: 70, swingRange: [60, 80] })).toBe(true);
    expect(parse({ swing: 60, swingRange: [60, 60] })).toBe(true);
    expect(parse({ swing: 10, swingRange: undefined })).toBe(true);
  });

  it('refuses a range high end first, or one the style’s own swing is outside', () => {
    expect(parse({ swing: 70, swingRange: [80, 60] })).toBe(false);
    expect(parse({ swing: 40, swingRange: [60, 80] })).toBe(false);
    expect(parse({ swing: 90, swingRange: [60, 80] })).toBe(false);
  });
});
