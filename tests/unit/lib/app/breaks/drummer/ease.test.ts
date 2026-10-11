import { describe, expect, it } from 'vitest';

import { clamp01, smoothstep } from '@/lib/app/breaks/drummer/ease';
import { smoothstep as fromStrokes } from '@/lib/app/breaks/drummer/strokes';

describe('smoothstep', () => {
  it('is 0 at and before a, 1 at and after b, and monotonic in between', () => {
    expect(smoothstep(0, 1, -0.5)).toBe(0);
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 1.5)).toBe(1);
    const xs = [0, 0.25, 0.5, 0.75, 1];
    const ys = xs.map((x) => smoothstep(0, 1, x));
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1]);
  });

  it('is symmetric about the midpoint', () => {
    expect(smoothstep(0, 1, 0.3)).toBeCloseTo(1 - smoothstep(0, 1, 0.7), 9);
  });

  it('treats a degenerate interval (b <= a) as a step function at b', () => {
    expect(smoothstep(1, 1, 0.9)).toBe(0);
    expect(smoothstep(1, 1, 1)).toBe(1);
    expect(smoothstep(1, 0.5, 2)).toBe(1); // b < a
  });
});

describe('clamp01', () => {
  it('holds a value to 0–1', () => {
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(3)).toBe(1);
  });
});

describe('strokes', () => {
  it('still offers the same smoothstep to the modules that import it from there', () => {
    expect(fromStrokes).toBe(smoothstep);
  });
});
