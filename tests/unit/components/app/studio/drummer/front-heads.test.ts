/**
 * `front-heads.ts` — the outlines a player's own kick front head is painted
 * from, and `tracePath()`, which turns one into canvas calls.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  FRONT_HEAD_ART,
  type FrontHeadPaths,
  tracePath,
} from '@/components/app/studio/drummer/front-heads';

/** A context that records each path call, in order, with its arguments. */
function recorder() {
  const calls: [string, ...number[]][] = [];
  const ctx = {
    moveTo: (...a: number[]) => void calls.push(['moveTo', ...a]),
    lineTo: (...a: number[]) => void calls.push(['lineTo', ...a]),
    bezierCurveTo: (...a: number[]) => void calls.push(['bezierCurveTo', ...a]),
    closePath: vi.fn(() => void calls.push(['closePath'])),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe('tracePath', () => {
  it('turns moves, lines, curves and closes into the canvas calls, coordinates in order', () => {
    const { ctx, calls } = recorder();
    tracePath(ctx, 'M1 2L3 4C5 6 7 8 9.5 10L11 12Z');
    expect(calls).toEqual([
      ['moveTo', 1, 2],
      ['lineTo', 3, 4],
      ['bezierCurveTo', 5, 6, 7, 8, 9.5, 10],
      ['lineTo', 11, 12],
      ['closePath'],
    ]);
  });

  it('refuses a command it does not draw, rather than dropping part of the shape', () => {
    const { ctx, calls } = recorder();
    for (const d of ['M0 0H5V5Z', 'M0 0l1 1Z', 'M0 0S1 1 2 2Z', 'M0 0Q1 1 2 2Z'])
      expect(() => tracePath(ctx, d)).toThrow(/does not draw/);
    expect(calls).toEqual([]);
  });

  it('runs several curves under one C', () => {
    const { ctx, calls } = recorder();
    tracePath(ctx, 'M0 0C1 1 2 2 3 3 4 4 5 5 6 6Z');
    expect(calls.filter((c) => c[0] === 'bezierCurveTo')).toHaveLength(2);
  });
});

/** The art traced as outlines, not painted in its own colours. */
const TRACED = Object.entries(FRONT_HEAD_ART).filter(
  (e): e is [string, FrontHeadPaths] => 'paths' in e[1]
);

describe('FRONT_HEAD_ART', () => {
  it.each(TRACED)('%s: closed outlines, every point inside its box', (_, art) => {
    expect(art.paths.length).toBeGreaterThan(0);
    // and any outlines in a second ink, by the same rules
    for (const d of [...art.paths, ...(art.accentPaths ?? [])]) {
      expect(d).toMatch(/^M/);
      expect(d).toMatch(/Z$/);
      const { ctx, calls } = recorder();
      tracePath(ctx, d);
      for (const [, ...n] of calls)
        for (let i = 0; i + 1 < n.length; i += 2) {
          expect(n[i]).toBeGreaterThanOrEqual(0);
          expect(n[i]).toBeLessThanOrEqual(art.width);
          expect(n[i + 1]).toBeGreaterThanOrEqual(0);
          expect(n[i + 1]).toBeLessThanOrEqual(art.height);
        }
    }
  });

  it("keeps the Beatles' lettering on the head, its box the head's nine-tenths", () => {
    const art = FRONT_HEAD_ART['the-beatles'] as FrontHeadPaths;
    expect(art.width).toBe(art.height);
    // the head's radius in the box's units: the box is nine-tenths of the head across
    const radius = art.width / 0.9 / 2;
    const c = art.width / 2;
    for (const d of art.paths) {
      const { ctx, calls } = recorder();
      tracePath(ctx, d);
      for (const [, ...n] of calls)
        for (let i = 0; i + 1 < n.length; i += 2)
          expect(Math.hypot(n[i] - c, n[i + 1] - c)).toBeLessThan(radius * 0.9);
    }
  });

  it("fills most of its box, as Sly and the Family Stone's name does the head", () => {
    // the lettering is the trace's own bounds: it reaches every edge of the box
    const art = FRONT_HEAD_ART['sly-and-the-family-stone'] as FrontHeadPaths;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const d of art.paths) {
      const { ctx, calls } = recorder();
      tracePath(ctx, d);
      for (const [, ...n] of calls)
        for (let i = 0; i + 1 < n.length; i += 2) {
          xs.push(n[i]);
          ys.push(n[i + 1]);
        }
    }
    expect(Math.min(...xs)).toBeLessThan(art.width * 0.02);
    expect(Math.max(...xs)).toBeGreaterThan(art.width * 0.98);
    expect(Math.min(...ys)).toBeLessThan(art.height * 0.02);
    expect(Math.max(...ys)).toBeGreaterThan(art.height * 0.98);
  });
});
