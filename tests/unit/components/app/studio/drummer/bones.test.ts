/**
 * The bone shapes (`bones.ts`): built at their real size, in their own frame,
 * and mirrored for the left side without turning inside out.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  cranium,
  femur,
  handBone,
  humerus,
  mandible,
  mirrored,
  rib,
  vertebra,
} from '@/components/app/studio/drummer/bones';

function box(g: THREE.BufferGeometry): THREE.Box3 {
  g.computeBoundingBox();
  return g.boundingBox!;
}

/** How many faces are wound to face away from the shape's middle, less those facing in, as a share of all. */
function outward(g: THREE.BufferGeometry): number {
  const geo = g.index ? g.toNonIndexed() : g;
  const pos = geo.getAttribute('position');
  const mid = box(geo).getCenter(new THREE.Vector3());
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let sum = 0;
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
    const centre = a.clone().add(b).add(c).divideScalar(3);
    sum += n.dot(centre.sub(mid)) > 0 ? 1 : -1;
  }
  return sum / (pos.count / 3);
}

describe('the bones', () => {
  it('builds each long bone at its length, down `y` from its joint', () => {
    for (const [g, L] of [
      [humerus(0.3), 0.3],
      [femur(0.45), 0.45],
    ] as const) {
      const b = box(g);
      expect(b.max.y).toBeGreaterThan(L - 0.005);
      expect(b.max.y).toBeLessThan(L + 0.035);
      expect(b.min.y).toBeGreaterThan(-0.04);
    }
  });

  it('builds a hand bone forward along `z` to its head', () => {
    const b = box(handBone(0.045, 0.007));
    expect(b.max.z).toBeCloseTo(0.045, 2);
    expect(b.min.z).toBeGreaterThan(-0.002);
  });

  it('mirrors a right-side bone for the left with its faces still turned out', () => {
    const right = humerus(0.3);
    const left = mirrored(right);
    const r = box(right);
    const l = box(left);
    expect(l.min.x).toBeCloseTo(-r.max.x, 9);
    expect(l.max.x).toBeCloseTo(-r.min.x, 9);
    // the faces turn the same way as the right's: flipping x without rewinding them would
    // turn every one inside out and the measure over
    expect(outward(left)).toBeCloseTo(outward(right), 6);
    expect(outward(right)).toBeGreaterThan(0);
  });

  it('meshes the skull and the jaw as one closed surface each, a skull’s size', () => {
    const skull = box(cranium());
    // about 19 cm long and 14 across (the face down -z)
    expect(skull.max.z - skull.min.z).toBeGreaterThan(0.17);
    expect(skull.max.z - skull.min.z).toBeLessThan(0.21);
    expect(skull.max.x - skull.min.x).toBeGreaterThan(0.13);
    expect(skull.max.x - skull.min.x).toBeLessThan(0.17);
    expect(skull.min.z).toBeLessThan(-0.09);
    const jaw = box(mandible());
    expect(jaw.max.x - jaw.min.x).toBeGreaterThan(0.09);
    expect(jaw.min.y).toBeLessThan(-0.06);
  });

  it('makes the lumbar vertebrae bigger than the thoracic, and those than the cervical', () => {
    const width = (g: THREE.BufferGeometry) => box(g).max.z - box(g).min.z;
    expect(width(vertebra('lumbar', 1, 0.028))).toBeGreaterThan(
      width(vertebra('thoracic', 1, 0.022))
    );
    expect(width(vertebra('thoracic', 1, 0.022))).toBeGreaterThan(
      width(vertebra('cervical', 1, 0.013))
    );
  });

  it('runs a rib from its head at the spine round to the front, falling as it goes', () => {
    const r = rib(6, 0.123, 0.155, 0.098, 0.86 * Math.PI);
    expect(r.end.z).toBeLessThan(-0.1);
    expect(r.end.y).toBeLessThan(-0.08);
    expect(box(r.geo).max.x).toBeGreaterThan(0.11);
  });
});
