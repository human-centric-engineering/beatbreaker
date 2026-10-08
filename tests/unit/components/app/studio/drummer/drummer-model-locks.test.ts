/**
 * `buildDrummer()`'s locks of hair when they will not merge into one mesh:
 * every lock is kept as a mesh of its own, rather than the hairstyle quietly
 * shrinking to one. The merge is mocked to fail, which is why this sits apart
 * from `drummer-model.test.ts`.
 */

import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { buildDrummer } from '@/components/app/studio/drummer/drummer-model';
import { makeMaterials } from '@/components/app/studio/drummer/parts';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: () => null,
}));

describe('buildDrummer() — locks that will not merge', () => {
  it('keeps every lock of long hair, each its own mesh', () => {
    const who = { ...PERSONAS[0], hairStyle: 'long' as const };
    const { root } = buildDrummer(makeMaterials(who), who);
    const swing = root.getObjectByName('hair-swing')!;
    const strands: THREE.Mesh[] = [];
    swing.traverse((o) => {
      if (o instanceof THREE.Mesh && !(o.geometry instanceof THREE.CapsuleGeometry))
        strands.push(o);
    });
    // 34 locks, one mesh each, none of them empty
    expect(strands).toHaveLength(34);
    for (const s of strands) expect(s.geometry.getAttribute('position').count).toBe(13 * 7);
  });
});
