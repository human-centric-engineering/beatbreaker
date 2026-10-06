import { describe, expect, it } from 'vitest';

import { expressionAt } from '@/lib/app/breaks/drummer/expression';
import type { Hit } from '@/lib/app/breaks/drummer/timeline';

const DUR = 0.11;

function hit(time: number, piece: Hit['piece'], limb: Hit['limb'] = 'lead'): Hit {
  return {
    time,
    step: time,
    limb,
    lane: piece === 'crash' ? 'c' : piece === 'hat' ? 'h' : 's',
    piece,
    contact: 'centre',
    strength: piece === 'crash' ? 0.95 : 0.6,
    sure: true,
  };
}

/** A bar of hats and backbeat, or (as a fill) its second half on the toms, from `t0`. */
function barOf(t0: number, fill: boolean): Hit[] {
  const out: Hit[] = [];
  for (let i = 0; i < 16; i++) {
    const t = t0 + i * DUR;
    if (fill && i >= 8) out.push(hit(t, i < 12 ? 'tom1' : 'floor', i % 2 ? 'lead' : 'other'));
    else if (i % 2 === 0) out.push(hit(t, 'hat'));
    if (i === 4 || i === 12) out.push(hit(t, 'snare', 'other'));
  }
  return out;
}

/** The peak extra nod in the moment after `t`. */
function nodAfter(hits: Hit[], t: number): number {
  return Math.max(...[0.05, 0.08, 0.12].map((d) => expressionAt(hits, t + d).nod));
}

/** `count` passes of fill-then-crash and groove-then-crash, each crash's nod peak. */
function landings(count: number) {
  const afterFill: number[] = [];
  const afterGroove: number[] = [];
  for (let p = 0; p < count; p++) {
    const t0 = p * 40 * 16 * DUR;
    const fillCrash = t0 + 16 * DUR;
    const grooveCrash = t0 + 20 * 16 * DUR;
    const hits = [
      ...barOf(t0, true),
      hit(fillCrash, 'crash'),
      ...barOf(t0 + 19 * 16 * DUR, false),
      hit(grooveCrash, 'crash'),
    ].sort((a, b) => a.time - b.time);
    afterFill.push(nodAfter(hits, fillCrash));
    afterGroove.push(nodAfter(hits, grooveCrash));
  }
  return { afterFill, afterGroove };
}

describe('expressionAt — landings', () => {
  const { afterFill, afterGroove } = landings(80);
  const fired = (xs: number[]) => xs.filter((x) => x > 0.06).length / xs.length;

  it('throws the head into the one after a fill more often than not, but not every time', () => {
    expect(fired(afterFill)).toBeGreaterThan(0.5);
    expect(fired(afterFill)).toBeLessThan(0.9);
  });

  it('does it only now and then on a crash out of a plain groove', () => {
    expect(fired(afterGroove)).toBeGreaterThan(0.1);
    expect(fired(afterGroove)).toBeLessThan(0.45);
  });

  it('makes a fill’s landing bigger than a plain crash’s', () => {
    const peak = (xs: number[]) => Math.max(...xs);
    expect(peak(afterFill)).toBeGreaterThan(peak(afterGroove) * 1.5);
  });

  it('lets a landing go within about half a second', () => {
    const hits = [...barOf(0, true), hit(16 * DUR, 'crash')];
    const late = expressionAt(hits, 16 * DUR + 0.6);
    expect(late.nod).toBeLessThan(0.06);
  });
});

describe('expressionAt — busy passages and mood', () => {
  it('follows the sticks through a fill and not through a groove', () => {
    const hits = barOf(0, true);
    expect(expressionAt(hits, 14 * DUR).focus).toBeGreaterThan(0.8);
    expect(expressionAt(hits, 4 * DUR).focus).toBe(0);
  });

  it('drifts the nod and tilt slowly with nothing played, never far', () => {
    const scales = Array.from({ length: 200 }, (_, i) => expressionAt([], i * 0.1));
    for (const e of scales) {
      expect(e.nodScale).toBeGreaterThanOrEqual(0.75);
      expect(e.nodScale).toBeLessThanOrEqual(1.25);
      expect(Math.abs(e.tilt)).toBeLessThan(0.04);
    }
    expect(new Set(scales.map((e) => e.nodScale.toFixed(3))).size).toBeGreaterThan(20);
    // slowly: a tenth of a second apart, never a jump
    for (let i = 1; i < scales.length; i++) {
      expect(Math.abs(scales[i].nodScale - scales[i - 1].nodScale)).toBeLessThan(0.05);
    }
  });

  it('is the same at the same moment, so a redrawn frame does not flicker', () => {
    const hits = [...barOf(0, true), hit(16 * DUR, 'crash')];
    expect(expressionAt(hits, 16 * DUR + 0.1)).toEqual(expressionAt(hits, 16 * DUR + 0.1));
  });
});

describe('expressionAt — smoothness', () => {
  it('never jumps between frames, even with crash and ride landing together after a fill', () => {
    const t0 = 0;
    const land = 16 * DUR;
    const hits = [
      ...barOf(t0, true),
      hit(land, 'crash'),
      { ...hit(land, 'crash'), piece: 'ride' as const, lane: 'r' as const, limb: 'other' as const },
      ...barOf(land, false).slice(1),
    ].sort((a, b) => a.time - b.time);
    let prev = expressionAt(hits, 0);
    for (let now = 1 / 60; now < 2 * 16 * DUR; now += 1 / 60) {
      const e = expressionAt(hits, now);
      expect(Math.abs(e.nod - prev.nod)).toBeLessThan(0.04);
      expect(Math.abs(e.tilt - prev.tilt)).toBeLessThan(0.03);
      expect(Math.abs(e.focus - prev.focus)).toBeLessThan(0.2);
      prev = e;
    }
  });
});

describe('expressionAt — the one', () => {
  it('gathers up before a one that brings in a crash, and drops into it', () => {
    const ones = [{ time: 10, change: true }];
    const hits = [hit(10, 'crash')];
    const before = expressionAt(hits, 9.89, ones);
    const on = expressionAt(hits, 10.01, ones);
    // up, back, a breath in
    expect(before.dip).toBeGreaterThan(0.008);
    expect(before.nod).toBeLessThan(-0.04);
    expect(before.shrug).toBeGreaterThan(0.008);
    // and let go: down, forward, the head into it
    expect(on.dip).toBeLessThan(-0.009);
    expect(on.nod).toBeGreaterThan(0.07);
    expect(on.shrug).toBeLessThan(0);
    // long after, nothing
    expect(expressionAt([], 11.5, ones).dip).toBeCloseTo(0, 6);
  });

  it('brings the head down on the one, not after it', () => {
    for (let i = 0; i < 20; i++) {
      const one = 10 + i * 2;
      const ones = [{ time: one, change: true }];
      let deepest = -Infinity;
      let when = 0;
      for (let t = one - 0.3; t < one + 0.4; t += 0.005) {
        const nod = expressionAt([], t, ones).nod;
        if (nod > deepest) [deepest, when] = [nod, t];
      }
      expect(when - one).toBeGreaterThan(-0.02);
      expect(when - one).toBeLessThan(0.05);
    }
  });

  it('is already gathering a good way before the one, and fully gathered just ahead of it', () => {
    for (let i = 0; i < 20; i++) {
      const one = 10 + i * 2;
      const ones = [{ time: one, change: true }];
      const full = expressionAt([], one - 0.11, ones).dip;
      expect(full).toBeGreaterThan(0);
      // half a beat at 100 bpm out, well under way
      expect(expressionAt([], one - 0.3, ones).dip).toBeGreaterThan(full * 0.25);
      // over a sixteenth out, all the way there: the one is waited for, not caught up with
      expect(expressionAt([], one - 0.12, ones).dip).toBeCloseTo(full, 6);
      // and not a bar early
      expect(expressionAt([], one - 0.75, ones).dip).toBeCloseTo(0, 6);
    }
  });

  it('marks only some ones where the pattern carries on, each by its own amount', () => {
    const sizes = Array.from({ length: 40 }, (_, i) => {
      const ones = [{ time: 5 + i * 2, change: false }];
      return -expressionAt([], ones[0].time + 0.01, ones).dip;
    });
    const marked = sizes.filter((s) => s > 1e-4);
    expect(marked.length).toBeGreaterThan(8);
    expect(marked.length).toBeLessThan(32);
    expect(new Set(marked.map((s) => s.toFixed(8))).size).toBe(marked.length);
  });

  it("keeps the groove's ones subtle, a new pattern a little more, and a crash with the whole body", () => {
    const drop = (change: boolean, crash: boolean, i: number) => {
      const ones = [{ time: 5 + i * 2, change }];
      const hits = crash ? [hit(ones[0].time, 'crash')] : [];
      return -expressionAt(hits, ones[0].time + 0.01, ones).dip;
    };
    const same = Array.from({ length: 40 }, (_, i) => drop(false, false, i));
    const changed = Array.from({ length: 20 }, (_, i) => drop(true, false, i));
    const crashed = Array.from({ length: 20 }, (_, i) => drop(false, true, i));
    // every change is marked, and above any repeat; every crash well above any change
    expect(Math.min(...changed)).toBeGreaterThan(Math.max(...same));
    expect(Math.min(...crashed)).toBeGreaterThan(0.01);
    expect(Math.min(...crashed)).toBeGreaterThan(Math.max(...changed) * 1.5);
    // in the run of the groove, small
    expect(Math.max(...same)).toBeLessThan(0.004);
  });
});

describe('expressionAt — a glance at the camera', () => {
  const sample = (hits: Hit[], from: number, to: number) => {
    const out = [];
    for (let t = from; t < to; t += 0.05) out.push(expressionAt(hits, t).glance);
    return out;
  };

  it('looks now and then — a second at a time, not most of the time', () => {
    const g = sample([], 0, 300);
    const looking = g.filter((x) => x.look > 0.9).length / g.length;
    expect(looking).toBeGreaterThan(0.01);
    expect(looking).toBeLessThan(0.12);
  });

  it('turns smoothly to the camera and back: never snaps', () => {
    const g = sample([], 0, 300);
    for (let i = 1; i < g.length; i++)
      expect(Math.abs(g[i].look - g[i - 1].look)).toBeLessThan(0.35);
  });

  it('throws in a nod, a tilt, a hello with the brows or a wink — sometimes together, a wink least', () => {
    const g = sample([], 0, 1200);
    const nods = g.filter((x) => x.nod > 0.1).length;
    const tilts = g.filter((x) => Math.abs(x.tilt) > 0.1).length;
    const winks = g.filter((x) => x.wink > 0.8).length;
    const hellos = g.filter((x) => x.brows > 0.9).length;
    expect(nods).toBeGreaterThan(0);
    expect(tilts).toBeGreaterThan(0);
    expect(hellos).toBeGreaterThan(0);
    expect(winks).toBeGreaterThan(0);
    expect(winks).toBeLessThan(tilts);
    // gestures combine: a tilt with a wink, the brows with a tilt
    expect(g.some((x) => x.wink > 0.5 && Math.abs(x.tilt) > 0.05)).toBe(true);
    expect(g.some((x) => x.brows > 0.5 && Math.abs(x.tilt) > 0.05)).toBe(true);
  });

  it('lasts a different time each look, up to two seconds', () => {
    const lengths: number[] = [];
    let run = 0;
    for (const x of sample([], 0, 1200)) {
      if (x.look > 0) run += 0.05;
      else if (run) {
        lengths.push(run);
        run = 0;
      }
    }
    expect(lengths.length).toBeGreaterThan(10);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(2.05);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(0.8);
  });

  it('never looks up in the middle of a fill', () => {
    // a solid fill on the toms from start to end
    const fill: Hit[] = [];
    for (let t = 0; t < 120; t += DUR)
      fill.push(hit(t, 'tom1', fill.length % 2 ? 'lead' : 'other'));
    expect(sample(fill, 1, 119).every((x) => x.look === 0)).toBe(true);
  });
});

describe('expressionAt — blinking', () => {
  it('blinks every few seconds, quickly', () => {
    const shut: boolean[] = [];
    for (let t = 0; t < 120; t += 0.02) shut.push(expressionAt([], t).blink > 0.8);
    const blinks = shut.filter((x, i) => x && !shut[i - 1]).length;
    // somewhere between one every eight seconds and one a second
    expect(blinks).toBeGreaterThan(15);
    expect(blinks).toBeLessThan(120);
    // and they are quick: shut a small share of the time
    expect(shut.filter(Boolean).length / shut.length).toBeLessThan(0.05);
  });
});
