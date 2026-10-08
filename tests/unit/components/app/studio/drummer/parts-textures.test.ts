// @vitest-environment happy-dom

/**
 * The textures `parts.ts` draws onto a canvas — the cymbals' lathing, a
 * sparkle kit's metal flake, a beast's fur — which only exist where there is
 * a canvas to draw on. `parts.test.ts` runs in Node and sees them fall back
 * to none; here a browser-like environment hands them a 2D context, a small
 * recording stand-in for the one a browser gives (happy-dom has none), so
 * what they draw and how the textures are set up is checked for real.
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { disposeMaterials, makeMaterials, styleKit } from '@/components/app/studio/drummer/parts';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';

/** What a 2D context was asked to draw: rects, arcs, lines, curves and strokes, by count. */
interface Drawn {
  rects: number;
  arcs: number;
  lines: number;
  curves: number;
  strokes: number;
}

let drawn: Drawn;

beforeEach(() => {
  drawn = { rects: 0, arcs: 0, lines: 0, curves: 0, strokes: 0 };
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    fillRect: () => void drawn.rects++,
    beginPath: () => undefined,
    arc: () => void drawn.arcs++,
    moveTo: () => undefined,
    lineTo: () => void drawn.lines++,
    quadraticCurveTo: () => void drawn.curves++,
    bezierCurveTo: () => void drawn.curves++,
    stroke: () => void drawn.strokes++,
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

const byId = (id: string) => PERSONAS.find((p) => p.id === id)!;

describe('canvas textures', () => {
  it('laths the cymbals: rings round the middle, as bump and roughness', () => {
    const m = makeMaterials(byId('original'));
    expect(m.bronze.bumpMap).toBeInstanceOf(THREE.CanvasTexture);
    expect(m.bronze.roughnessMap).toBe(m.bronze.bumpMap);
    expect(m.bronze.bumpMap!.colorSpace).toBe(THREE.NoColorSpace);
    // a ring every pixel and a half out to the edge of a 512 canvas
    expect(drawn.arcs).toBeGreaterThan(150);
  });

  it('gives a sparkle kit a fine scatter of flake under the lacquer, tiled round the shell', () => {
    const m = makeMaterials(byId('roxy'));
    const flake = m.shell.bumpMap!;
    expect(flake).toBeInstanceOf(THREE.CanvasTexture);
    expect(m.shell.roughnessMap).toBe(flake);
    expect(flake.wrapS).toBe(THREE.RepeatWrapping);
    expect(flake.repeat.x).toBeGreaterThan(flake.repeat.y);
    expect(flake.colorSpace).toBe(THREE.NoColorSpace);
  });

  it('gives a gloss, satin or metal kit no flake', () => {
    for (const id of ['original', 'raj', 'brassbot']) {
      expect(makeMaterials(byId(id)).shell.bumpMap).toBeNull();
    }
  });

  it('keeps one flake across sparkle kits, and frees it when the next kit is not sparkle', () => {
    const m = makeMaterials(byId('roxy'));
    const flake = m.shell.bumpMap!;
    const freed = vi.fn();
    flake.addEventListener('dispose', freed);
    styleKit(m, byId('lola'));
    expect(m.shell.bumpMap).toBe(flake);
    expect(freed).not.toHaveBeenCalled();
    styleKit(m, byId('original'));
    expect(m.shell.bumpMap).toBeNull();
    expect(m.shell.roughnessMap).toBeNull();
    expect(freed).toHaveBeenCalledOnce();
    // and back to sparkle: a new one
    styleKit(m, byId('roxy'));
    expect(m.shell.bumpMap).toBeInstanceOf(THREE.CanvasTexture);
    expect(m.shell.bumpMap).not.toBe(flake);
  });

  it('coats a beast in fur: thousands of short hairs, tiled, in its own colour', () => {
    const beast = byId('bigfuzz');
    const before = drawn.lines;
    const m = makeMaterials(beast);
    const fur = (m.skin as THREE.MeshPhysicalMaterial).map!;
    expect(fur).toBeInstanceOf(THREE.CanvasTexture);
    expect(fur.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(fur.wrapS).toBe(THREE.RepeatWrapping);
    expect((m.skin as THREE.MeshPhysicalMaterial).bumpMap).toBe(fur);
    // every furred material draws its own coat
    expect(drawn.lines - before).toBeGreaterThan(3000);
    // the coat's hairs average under white: the colour is lifted to make up for it
    expect(m.skin.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThan(
      new THREE.Color(beast.skin).getHSL({ h: 0, s: 0, l: 0 }).l
    );
  });

  it('draws hair as long strands running root to tip, with its highlight stretched across them', async () => {
    // a fresh copy of the module: the strands are drawn once and kept, and an earlier test
    // here may already have drawn them
    vi.resetModules();
    const fresh = await import('@/components/app/studio/drummer/parts');
    const who = { ...byId('original'), hair: '#5a3a22' };
    const before = drawn.curves;
    const m = fresh.makeMaterials(who);
    const hair = m.hair as THREE.MeshPhysicalMaterial;
    expect(hair.map).toBeInstanceOf(THREE.CanvasTexture);
    expect(hair.bumpMap).toBe(hair.map);
    expect(hair.map!.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(drawn.curves - before).toBeGreaterThan(5000);
    // drawn once: the next player's hair is a texture of the same strands, not a redraw
    const drawnOnce = drawn.curves;
    const next = fresh.makeMaterials(byId('roxy')).hair as THREE.MeshPhysicalMaterial;
    expect(drawn.curves).toBe(drawnOnce);
    expect(next.map).not.toBe(hair.map);
    expect(next.map!.image).toBe(hair.map!.image);
    // the highlight runs across the strands, which run along v
    expect(hair.anisotropy).toBeGreaterThan(0.5);
    expect(hair.anisotropyRotation).toBeCloseTo(Math.PI / 2, 9);
    // lifted to make up for the strands averaging under white
    expect(hair.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThan(
      new THREE.Color(who.hair).getHSL({ h: 0, s: 0, l: 0 }).l
    );
  });

  it('frees every texture it drew with the materials', () => {
    const m = makeMaterials(byId('bigfuzz'));
    const textures = [m.bronze.bumpMap, m.skin.map, m.shell.bumpMap].filter(
      (t): t is THREE.Texture => !!t
    );
    expect(textures.length).toBeGreaterThanOrEqual(3);
    const freed = textures.map((t) => {
      const f = vi.fn();
      t.addEventListener('dispose', f);
      return f;
    });
    disposeMaterials(m);
    for (const f of freed) expect(f).toHaveBeenCalled();
  });

  it('draws nothing, and falls back to no texture, where the canvas gives no context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const m = makeMaterials(byId('roxy'));
    expect(m.bronze.bumpMap).toBeNull();
    expect(m.shell.bumpMap).toBeNull();
  });
});
