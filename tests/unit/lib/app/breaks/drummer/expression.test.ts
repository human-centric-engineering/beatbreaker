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
