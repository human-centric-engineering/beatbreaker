// @vitest-environment happy-dom

/**
 * Afro hair: tight coils, matt, with a soft, broken edge. The coils are drawn
 * onto a canvas, and the fuzz over the hair is cut out of them, so neither
 * exists in Node (`drummer-model.test.ts` sees the hair without them); here a
 * browser-like environment hands them a small 2D context (happy-dom has none),
 * so the coils, the fuzz and the hairline are checked for real.
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDrummer } from '@/components/app/studio/drummer/drummer-model';
import { makeMaterials } from '@/components/app/studio/drummer/parts';
import { LIKENESSES } from '@/lib/app/breaks/drummer/likenesses';
import type { Persona } from '@/lib/app/breaks/drummer/personas';

let coils: number;

beforeEach(() => {
  coils = 0;
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: () => undefined,
    beginPath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    arc: () => undefined,
    ellipse: () => void coils++,
    quadraticCurveTo: () => undefined,
    bezierCurveTo: () => undefined,
    stroke: () => undefined,
    fill: () => undefined,
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    rotate: () => undefined,
    scale: () => undefined,
    fillText: () => undefined,
    measureText: (t: string) => ({ width: 50 * t.length }),
    createImageData: (w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    }),
    putImageData: () => undefined,
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    }),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

const named = (root: THREE.Object3D, name: string) => {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.name === name) out.push(o);
  });
  return out;
};

const dress = (who: Persona) => {
  const { root } = buildDrummer(makeMaterials(who), who);
  root.updateMatrixWorld(true);
  return root;
};

/** Each point of `o`, in the frame of `frame`. */
const pointsIn = (o: THREE.Mesh, frame: THREE.Object3D) => {
  const pos = o.geometry.getAttribute('position');
  const v = new THREE.Vector3();
  return Array.from({ length: pos.count }, (_, i) =>
    frame.worldToLocal(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone())
  );
};

/** How far a mesh's points lie from `centre` (its own frame), on average. */
const meanReach = (o: THREE.Mesh, centre = new THREE.Vector3()) => {
  const pos = o.geometry.getAttribute('position');
  const v = new THREE.Vector3();
  let sum = 0;
  for (let i = 0; i < pos.count; i++) sum += v.fromBufferAttribute(pos, i).distanceTo(centre);
  return sum / pos.count;
};

describe('afro hair', () => {
  it('draws the coils as small loops, and wears them as a matt bump, not a strand’s gloss', () => {
    const [afro] = named(dress(LIKENESSES.questlove), 'afro');
    expect(afro).toBeDefined();
    expect(coils).toBeGreaterThan(1000);
    const mat = afro.material as THREE.MeshPhysicalMaterial;
    expect(mat.bumpMap).toBeInstanceOf(THREE.CanvasTexture);
    expect(mat.bumpMap!.colorSpace).toBe(THREE.NoColorSpace);
    expect(mat.roughness).toBeGreaterThan(0.9);
    expect(mat.specularIntensity).toBeLessThan(0.5);
  });

  it('fuzzes a big afro’s edge: shells further out, each with fewer coils, none casting a shadow', () => {
    const root = dress(LIKENESSES.questlove);
    const [afro] = named(root, 'afro');
    const fuzz = named(root, 'afro fuzz');
    expect(fuzz).toHaveLength(4);
    let reach = meanReach(afro);
    let cut = 0;
    for (const shell of fuzz) {
      expect(shell.parent).toBe(afro.parent);
      expect(shell.castShadow).toBe(false);
      const mat = shell.material as THREE.MeshStandardMaterial;
      expect(mat.alphaMap).toBeInstanceOf(THREE.Texture);
      expect(mat.alphaTest).toBeGreaterThan(cut);
      cut = mat.alphaTest;
      const out = meanReach(shell);
      expect(out).toBeGreaterThan(reach);
      reach = out;
    }
    // a centimetre or so beyond the hair, not a second afro round it
    expect(reach - meanReach(afro)).toBeLessThan(0.015);
  });

  it('leaves the forehead bare under a big afro: the hair rises from a hairline over the brows', () => {
    const root = dress(LIKENESSES.questlove);
    const [afro] = named(root, 'afro');
    // the head's frame: the afro moves inside a group that shifts it on the head
    const head = afro.parent!.parent!;
    const inFront = pointsIn(afro, head).filter((v) => Math.abs(v.x) < 0.04 && v.z < -0.07);
    expect(inFront.length).toBeGreaterThan(0);
    // the brows are at 0.138: four centimetres or more of forehead over them
    expect(Math.min(...inFront.map((v) => v.y))).toBeGreaterThan(0.175);
  });

  it('thins a grown afro’s fuzz to nothing at the hairline, where the hair does', () => {
    const root = dress(LIKENESSES.dejohnette);
    const [hair] = named(root, 'fro');
    const fuzz = named(root, 'afro fuzz');
    expect(fuzz).toHaveLength(3);
    const base = hair.geometry.getAttribute('position');
    const amount = hair.geometry.getAttribute('color');
    const outer = fuzz[fuzz.length - 1].geometry.getAttribute('position');
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    // only the points drawn: a sphere's pole has a point no face uses
    const drawn = new Set(Array.from(hair.geometry.getIndex()!.array));
    let edge = 0;
    let full = 0;
    for (const i of drawn) {
      const gap = a.fromBufferAttribute(base, i).distanceTo(b.fromBufferAttribute(outer, i));
      if (amount.getW(i) === 0) {
        expect(gap).toBeLessThan(1e-6);
        edge++;
      } else if (amount.getW(i) === 1) {
        expect(gap).toBeCloseTo(0.008, 4);
        full++;
      }
    }
    expect(edge).toBeGreaterThan(0);
    expect(full).toBeGreaterThan(0);
  });

  it('gives a short rounded afro a closer fuzz than a medium one', () => {
    const fuzzOf = (who: Persona) => named(dress(who), 'afro fuzz').length;
    expect(fuzzOf(LIKENESSES.jabostarks)).toBe(2);
    expect(fuzzOf(LIKENESSES.lennywhite)).toBe(3);
  });
});

describe('coiled hair in any cut', () => {
  const materialOf = (root: THREE.Object3D, name: string) =>
    named(root, name)[0].material as THREE.MeshStandardMaterial;

  it('coils a cut drawn for any hair where the player’s is coiled: Max Roach’s brushed back, matt', () => {
    const roach = dress(LIKENESSES.roach);
    const mat = materialOf(roach, 'slick') as THREE.MeshPhysicalMaterial;
    expect(mat.userData.coils).toBe(true);
    expect(mat.roughness).toBeGreaterThan(0.9);
    // grown from the scalp, so a close fuzz over it
    expect(named(roach, 'afro fuzz')).toHaveLength(1);
  });

  it('leaves straight hair in the same cut its shine: Gene Krupa’s slicked back', () => {
    const krupa = dress(LIKENESSES.krupa);
    expect(materialOf(krupa, 'slick').userData.coils).toBeUndefined();
    expect(named(krupa, 'afro fuzz')).toHaveLength(0);
  });

  it('draws tight curls finer than loose ones: James Gadson’s against Mitch Mitchell’s', () => {
    const repeat = (who: Persona) => materialOf(dress(who), 'curly').bumpMap!.repeat.x;
    expect(repeat(LIKENESSES.gadson)).toBeGreaterThan(repeat(LIKENESSES.mitchell));
    // and both with a fuzz at the edge, coiled once only
    expect(named(dress(LIKENESSES.gadson), 'afro fuzz')).toHaveLength(3);
    expect(named(dress(LIKENESSES.mitchell), 'afro fuzz')).toHaveLength(3);
  });

  it('wears short natural hair coiled, with its own close fuzz: Clyde Stubblefield’s', () => {
    const clyde = dress(LIKENESSES.stubblefield);
    expect(materialOf(clyde, 'natural').userData.coils).toBe(true);
    expect(named(clyde, 'afro fuzz')).toHaveLength(2);
  });
});
