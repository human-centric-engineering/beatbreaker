// @vitest-environment happy-dom

/**
 * `buildKit().dress()` and the kick's front head: BeatBreaker's name round it,
 * or a player's own head painted in its place (`KitStyle.head`), swapped as
 * the player changes. Needs a canvas, so it runs in happy-dom, with a 2D
 * context that draws nothing (what is drawn is `parts-textures.test.ts`'s).
 */

import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildKit } from '@/components/app/studio/drummer/kit-model';
import { makeMaterials } from '@/components/app/studio/drummer/parts';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';

describe('buildKit().dress: the front head', () => {
  /** A 2D context that draws nothing, so the front head gets a canvas texture in jsdom. */
  const canvas2d = () => {
    const noop = () => undefined;
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      measureText: (t: string) => ({ width: 50 * t.length }),
      ...Object.fromEntries(
        [
          'fillRect',
          'beginPath',
          'arc',
          'stroke',
          'save',
          'restore',
          'translate',
          'rotate',
          'scale',
          'fillText',
          'moveTo',
          'lineTo',
          'bezierCurveTo',
          'closePath',
          'fill',
        ].map((k) => [k, noop])
      ),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    );
  };
  afterEach(() => vi.restoreAllMocks());

  /** The front head's material: the one mesh on the kit painted from a canvas. */
  const frontOf = (root: THREE.Object3D) => {
    const found: THREE.MeshStandardMaterial[] = [];
    root.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.material instanceof THREE.MeshStandardMaterial &&
        o.material.map instanceof THREE.CanvasTexture
      )
        found.push(o.material);
    });
    expect(found).toHaveLength(1);
    return found[0];
  };
  const sly = { art: 'sly-and-the-family-stone', ground: '#f1ede4', ink: '#141414' } as const;

  it("repaints the head for a player's own, frees the old one, and goes back to BeatBreaker's", () => {
    const m = makeMaterials();
    canvas2d();
    const { root, dress } = buildKit(m);
    const front = frontOf(root);
    const ours = front.map!;
    const freed = vi.spyOn(ours, 'dispose');
    dress({ ...PERSONAS[0].kit, head: sly });
    expect(front.map).not.toBe(ours);
    expect(freed).toHaveBeenCalledOnce();
    const theirs = front.map!;
    // the same head again is left as it is
    dress({ ...PERSONAS[0].kit, head: { ...sly } });
    expect(front.map).toBe(theirs);
    dress(PERSONAS[0].kit);
    expect(front.map).not.toBe(theirs);
  });

  it("keeps a mirrored kit's head reading forwards across a repaint", () => {
    const m = makeMaterials();
    canvas2d();
    const { root, dress, mirrorLogo } = buildKit(m);
    const front = frontOf(root);
    mirrorLogo(true);
    dress({ ...PERSONAS[0].kit, head: sly });
    expect(front.map!.repeat.x).toBe(-1);
    mirrorLogo(false);
    expect(front.map!.repeat.x).toBe(1);
  });
});
