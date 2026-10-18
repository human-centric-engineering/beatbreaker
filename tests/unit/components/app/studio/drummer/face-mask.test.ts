// @vitest-environment happy-dom

/**
 * The masks `face-mask.ts` moulds on the head's skull and paints on a canvas:
 * Joey Jordison's over the face, and the hoods over the whole head (Skinny's,
 * II's under its cowl, the Locust's). `drummer-model.test.ts` runs in Node,
 * where there is no canvas and a mask takes its plain colour; here a recording
 * stand-in for a 2D context (happy-dom has none) is handed to each mask's
 * paint, so where the paint lands, and that the back of a hood never takes
 * the face's paint, is checked for real.
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type FaceMaskSpec,
  faceMask,
  JORDISON_MASK,
  LOCUST_HOOD,
  SKINNY_HOOD,
  SLEEPTOKEN_MASK,
} from '@/components/app/studio/drummer/face-mask';

/**
 * Every point the paint touched, in canvas pixels — bar those drawn inside a
 * clip, which cannot land outside the shape clipped to (the Locust's fishnet,
 * ruled across its eye) — and how many times it filled or stroked.
 */
interface Drawn {
  points: [number, number][];
  fills: number;
  strokes: number;
}

let drawn: Drawn;

beforeEach(() => {
  drawn = { points: [], fills: 0, strokes: 0 };
  let clipped = 0;
  const at = (x: number, y: number) => void (clipped || drawn.points.push([x, y]));
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    filter: 'none',
    fillRect: () => undefined,
    beginPath: () => undefined,
    closePath: () => undefined,
    moveTo: at,
    lineTo: at,
    arc: (x: number, y: number) => at(x, y),
    ellipse: (x: number, y: number) => at(x, y),
    quadraticCurveTo: (_cx: number, _cy: number, x: number, y: number) => at(x, y),
    bezierCurveTo: (_a: number, _b: number, _c: number, _d: number, x: number, y: number) =>
      at(x, y),
    fill: () => void drawn.fills++,
    stroke: () => void drawn.strokes++,
    clip: () => void clipped++,
    save: () => undefined,
    restore: () => void (clipped = 0),
    createRadialGradient: () => ({ addColorStop: () => undefined }),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A stand-in for the sculpted skull: the head's egg, scaled and set where the skull is. */
const skull = () =>
  new THREE.SphereGeometry(0.1, 56, 42).scale(0.84, 1.12, 0.98).translate(0, 0.1, 0);

const MASKS: [string, FaceMaskSpec][] = [
  ['Jordison', JORDISON_MASK],
  ['Skinny', SKINNY_HOOD],
  ['II', SLEEPTOKEN_MASK],
  ['the Locust', LOCUST_HOOD],
];

describe.each(MASKS)("%s's mask", (_who, spec) => {
  it('paints its face onto a canvas the mask wears, in colour', () => {
    const mask = faceMask(skull(), spec);
    const mat = mask.material as THREE.MeshStandardMaterial;
    expect(mat.map).toBeInstanceOf(THREE.CanvasTexture);
    expect(mat.map!.colorSpace).toBe(THREE.SRGBColorSpace);
    // the colour is the paint's, not tinted over it
    expect(mat.color.getHexString()).toBe('ffffff');
    expect(drawn.fills).toBeGreaterThanOrEqual(4);
  });

  it('keeps its paint on the face: inside the canvas, below the crown and clear of its sides', () => {
    faceMask(skull(), spec);
    expect(drawn.points.length).toBeGreaterThan(20);
    for (const [x, y] of drawn.points) {
      // the canvas is 512 across 0.18 m: the paint stays within 0.07 m of the middle
      expect(Math.abs(x - 256)).toBeLessThan((0.07 / 0.18) * 512);
      // and below 0.205 m, the top row the back of a hood takes
      expect(y).toBeGreaterThan(((0.21 - 0.205) / 0.21) * 512);
    }
  });
});

describe('a hood', () => {
  it('maps every point of the back of the head to the top row, which no paint reaches', () => {
    for (const spec of [SKINNY_HOOD, SLEEPTOKEN_MASK, LOCUST_HOOD]) {
      const g = faceMask(skull(), spec).geometry;
      const p = g.getAttribute('position');
      const uv = g.getAttribute('uv');
      let back = 0;
      for (let i = 0; i < p.count; i++) {
        if (p.getZ(i) > 0.03) {
          back++;
          expect(uv.getY(i)).toBeCloseTo(0.999, 6);
        }
      }
      expect(back).toBeGreaterThan(100);
    }
  });

  it("hangs II's cowl over the hood, its rim rolled round the face", () => {
    const mask = faceMask(skull(), SLEEPTOKEN_MASK);
    const cowl = mask.getObjectByName('cowl') as THREE.Mesh;
    expect(cowl).toBeDefined();
    // the rolled rim, a tube round the opening
    expect(
      cowl.children.some((c) => (c as THREE.Mesh).geometry instanceof THREE.TubeGeometry)
    ).toBe(true);
    expect(mask.getObjectByName('hood neck')).toBeDefined();
  });
});

describe('without a canvas', () => {
  it('takes its plain colour, painted nothing', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    const mat = faceMask(skull(), JORDISON_MASK).material as THREE.MeshStandardMaterial;
    expect(mat.map).toBeNull();
    expect(`#${mat.color.getHexString()}`).toBe(JORDISON_MASK.colour);
  });
});
