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
      // the snare's leather is drawn on a canvas too
      createRadialGradient: () => ({ addColorStop: noop }),
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

  /** The front head's material: the one mesh painted from a canvas that is not the leather's grain. */
  const frontOf = (root: THREE.Object3D) => {
    const found: THREE.MeshStandardMaterial[] = [];
    root.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.material instanceof THREE.MeshStandardMaterial &&
        o.material.map instanceof THREE.CanvasTexture &&
        !o.material.bumpMap
      )
        found.push(o.material);
    });
    expect(found).toHaveLength(1);
    return found[0];
  };
  const sly = { art: 'sly-and-the-family-stone', ground: '#f1ede4', ink: '#141414' } as const;

  it("paints a player's own head, and each head once: picked again, it is the same texture", () => {
    const m = makeMaterials();
    canvas2d();
    const { root, dress } = buildKit(m);
    const front = frontOf(root);
    const ours = front.map!;
    dress({ ...PERSONAS[0].kit, head: sly });
    expect(front.map).not.toBe(ours);
    const theirs = front.map!;
    // the same head again, as a new object, is left as it is
    dress({ ...PERSONAS[0].kit, head: { ...sly } });
    expect(front.map).toBe(theirs);
    // back to BeatBreaker's, and to theirs again: neither painted twice
    dress(PERSONAS[0].kit);
    expect(front.map).toBe(ours);
    const painted = vi.mocked(HTMLCanvasElement.prototype.getContext).mock.calls.length;
    dress({ ...PERSONAS[0].kit, head: sly });
    expect(front.map).toBe(theirs);
    expect(vi.mocked(HTMLCanvasElement.prototype.getContext).mock.calls.length).toBe(painted);
  });

  it('paints a head that differs in any one field as a head of its own', () => {
    const m = makeMaterials();
    canvas2d();
    const { root, dress } = buildKit(m);
    const front = frontOf(root);
    dress({ ...PERSONAS[0].kit, head: sly });
    const black = front.map!;
    dress({ ...PERSONAS[0].kit, head: { ...sly, ink: '#c40000' } });
    expect(front.map).not.toBe(black);
    dress({ ...PERSONAS[0].kit, head: { ...sly, ground: '#111111' } });
    expect(front.map).not.toBe(black);
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
