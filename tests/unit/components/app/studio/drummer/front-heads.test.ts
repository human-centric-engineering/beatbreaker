/**
 * `front-heads.ts` — the outlines a player's own kick front head is painted
 * from, and `tracePath()`, which turns one into canvas calls.
 */

import { describe, expect, it, vi } from 'vitest';

import { FRONT_HEAD_ART, tracePath } from '@/components/app/studio/drummer/front-heads';

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

  it('runs several curves under one C', () => {
    const { ctx, calls } = recorder();
    tracePath(ctx, 'M0 0C1 1 2 2 3 3 4 4 5 5 6 6Z');
    expect(calls.filter((c) => c[0] === 'bezierCurveTo')).toHaveLength(2);
  });
});

describe('FRONT_HEAD_ART', () => {
  it.each(Object.entries(FRONT_HEAD_ART))(
    '%s: closed outlines, every point inside its box',
    (_, art) => {
      expect(art.paths.length).toBeGreaterThan(0);
      for (const d of art.paths) {
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
    }
  );

  it("fills most of its box, as Sly and the Family Stone's name does the head", () => {
    // the lettering is the trace's own bounds: it reaches every edge of the box
    const art = FRONT_HEAD_ART['sly-and-the-family-stone'];
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
