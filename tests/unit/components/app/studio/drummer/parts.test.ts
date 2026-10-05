/**
 * Shared primitives for the 3D drummer scene: materials, placing a segment
 * between two joints, balls/rods, and scene disposal.
 *
 * Node environment is fine here — `three` builds geometry and materials with
 * no DOM. `lathingTexture()` (private) is only reachable through
 * `makeMaterials()`, and is asserted to fall back to `null` without
 * `document`, which is the documented behaviour this file runs under.
 */

import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import {
  ball,
  disposeTree,
  makeMaterials,
  place,
  rod,
  segment,
} from '@/components/app/studio/drummer/parts';

/** The world-space point a mesh's local point maps to, via its full matrix. */
function worldPoint(mesh: THREE.Object3D, local: THREE.Vector3): THREE.Vector3 {
  mesh.updateMatrix();
  return local.clone().applyMatrix4(mesh.matrix);
}

describe('makeMaterials', () => {
  it('builds every material the kit and the drummer need, with the right physical types', () => {
    const m = makeMaterials();

    expect(m.shell).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    for (const key of [
      'head',
      'chrome',
      'black',
      'bronze',
      'wood',
      'felt',
      'skin',
      'shirt',
      'jeans',
      'shoe',
      'sole',
      'hair',
      'eye',
      'rug',
      'floor',
    ] as const) {
      expect(m[key]).toBeInstanceOf(THREE.MeshStandardMaterial);
    }
  });

  it('falls back to no lathing texture without a document (the node test environment)', () => {
    // Node has no `document`, so `lathingTexture()` returns null — the bronze
    // material's roughness/bump maps must fall back rather than throw.
    expect(typeof document).toBe('undefined');
    const m = makeMaterials();
    expect(m.bronze.roughnessMap).toBeNull();
    expect(m.bronze.bumpMap).toBeNull();
  });

  it('gives each call its own material instances', () => {
    const a = makeMaterials();
    const b = makeMaterials();
    expect(a.shell).not.toBe(b.shell);
    expect(a.chrome).not.toBe(b.chrome);
  });
});

describe('segment', () => {
  it('builds a unit-height cylinder that casts a shadow, with the requested radii', () => {
    const mat = new THREE.MeshStandardMaterial();
    const mesh = segment(0.05, 0.08, mat);

    expect(mesh.castShadow).toBe(true);
    expect(mesh.geometry).toBeInstanceOf(THREE.CylinderGeometry);
    const geo = mesh.geometry as THREE.CylinderGeometry;
    expect(geo.parameters.radiusTop).toBe(0.05);
    expect(geo.parameters.radiusBottom).toBe(0.08);
    expect(geo.parameters.height).toBe(1);
    expect(geo.parameters.radialSegments).toBe(14);
    expect(mesh.material).toBe(mat);
  });

  it('honours a custom radial-segment count', () => {
    const mat = new THREE.MeshStandardMaterial();
    const mesh = segment(0.05, 0.08, mat, 6);
    expect((mesh.geometry as THREE.CylinderGeometry).parameters.radialSegments).toBe(6);
  });
});

describe('place', () => {
  it('spans straight up: midpoint position, y-scale = length, no rotation needed', () => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 4));
    const a = new THREE.Vector3(0, 0, 0);
    const b = new THREE.Vector3(0, 2, 0);

    place(mesh, a, b);

    expect(mesh.position.toArray()).toEqual([0, 1, 0]);
    expect(mesh.scale.y).toBeCloseTo(2, 6);
    // the unit cylinder's local top lands exactly on b
    const top = worldPoint(mesh, new THREE.Vector3(0, 0.5, 0));
    expect(top.x).toBeCloseTo(0, 6);
    expect(top.y).toBeCloseTo(2, 6);
    expect(top.z).toBeCloseTo(0, 6);
  });

  it('spans a diagonal segment so the mesh top/bottom land exactly on b and a', () => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 4));
    const a = new THREE.Vector3(1, 0, 0);
    const b = new THREE.Vector3(1, 1, 1);

    place(mesh, a, b);

    const top = worldPoint(mesh, new THREE.Vector3(0, 0.5, 0));
    const bottom = worldPoint(mesh, new THREE.Vector3(0, -0.5, 0));
    expect(top.x).toBeCloseTo(b.x, 5);
    expect(top.y).toBeCloseTo(b.y, 5);
    expect(top.z).toBeCloseTo(b.z, 5);
    expect(bottom.x).toBeCloseTo(a.x, 5);
    expect(bottom.y).toBeCloseTo(a.y, 5);
    expect(bottom.z).toBeCloseTo(a.z, 5);

    const len = a.distanceTo(b);
    expect(mesh.scale.y).toBeCloseTo(len, 6);
  });

  it('degenerates safely when a and b coincide: tiny scale, no rotation attempted', () => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 4));
    const a = new THREE.Vector3(3, 3, 3);
    const identity = mesh.quaternion.clone();

    place(mesh, a, a.clone());

    expect(mesh.position.toArray()).toEqual([3, 3, 3]);
    expect(mesh.scale.y).toBeCloseTo(1e-4, 8);
    // `len > 1e-6` guard skipped `setFromUnitVectors`: quaternion is untouched
    expect(mesh.quaternion.equals(identity)).toBe(true);
  });
});

describe('ball', () => {
  it('builds a sphere that casts a shadow with the requested radius and segments', () => {
    const mat = new THREE.MeshStandardMaterial();
    const mesh = ball(0.02, mat, 20);

    expect(mesh.castShadow).toBe(true);
    const geo = mesh.geometry as THREE.SphereGeometry;
    expect(geo).toBeInstanceOf(THREE.SphereGeometry);
    expect(geo.parameters.radius).toBe(0.02);
    expect(geo.parameters.widthSegments).toBe(20);
    expect(geo.parameters.heightSegments).toBe(15); // round(20 * 0.75)
  });

  it('defaults to 16 segments', () => {
    const mesh = ball(0.02, new THREE.MeshStandardMaterial());
    const geo = mesh.geometry as THREE.SphereGeometry;
    expect(geo.parameters.widthSegments).toBe(16);
    expect(geo.parameters.heightSegments).toBe(12);
  });
});

describe('rod', () => {
  it('builds a static cylinder already spanning a to b', () => {
    const mat = new THREE.MeshStandardMaterial();
    const a = new THREE.Vector3(0, 0, 0);
    const b = new THREE.Vector3(0, 0, 4);

    const mesh = rod(a, b, 0.01, mat);

    expect(mesh.castShadow).toBe(true);
    const geo = mesh.geometry as THREE.CylinderGeometry;
    expect(geo.parameters.radiusTop).toBe(0.01);
    expect(geo.parameters.radiusBottom).toBe(0.01);
    expect(mesh.scale.y).toBeCloseTo(4, 6);
    const top = worldPoint(mesh, new THREE.Vector3(0, 0.5, 0));
    expect(top.z).toBeCloseTo(4, 5);
  });
});

describe('disposeTree', () => {
  it('disposes every geometry exactly once, including a material shared across meshes', () => {
    const sharedMat = new THREE.MeshStandardMaterial();
    const geoA = new THREE.BoxGeometry(1, 1, 1);
    const geoB = new THREE.SphereGeometry(1, 4, 4);
    const meshA = new THREE.Mesh(geoA, sharedMat);
    const meshB = new THREE.Mesh(geoB, sharedMat);

    const root = new THREE.Group();
    const child = new THREE.Group(); // a non-mesh node — must be skipped, not throw
    child.add(meshB);
    root.add(meshA, child);

    const disposeGeoA = vi.spyOn(geoA, 'dispose');
    const disposeGeoB = vi.spyOn(geoB, 'dispose');
    const disposeMat = vi.spyOn(sharedMat, 'dispose');

    disposeTree(root);

    expect(disposeGeoA).toHaveBeenCalledTimes(1);
    expect(disposeGeoB).toHaveBeenCalledTimes(1);
    // shared material is deduplicated via a Set — disposed once, not twice
    expect(disposeMat).toHaveBeenCalledTimes(1);
  });

  it('disposes every material in a multi-material mesh', () => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const matA = new THREE.MeshStandardMaterial();
    const matB = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geo, [matA, matB]);
    const root = new THREE.Group();
    root.add(mesh);

    const disposeA = vi.spyOn(matA, 'dispose');
    const disposeB = vi.spyOn(matB, 'dispose');

    disposeTree(root);

    expect(disposeA).toHaveBeenCalledTimes(1);
    expect(disposeB).toHaveBeenCalledTimes(1);
  });

  it('disposes a MeshStandardMaterial roughness/bump map texture', () => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const tex = new THREE.Texture();
    const mat = new THREE.MeshStandardMaterial({ roughnessMap: tex, bumpMap: tex });
    const mesh = new THREE.Mesh(geo, mat);
    const root = new THREE.Group();
    root.add(mesh);

    const disposeTex = vi.spyOn(tex, 'dispose');

    disposeTree(root);

    expect(disposeTex).toHaveBeenCalled();
  });

  it('does nothing to an empty tree', () => {
    const root = new THREE.Group();
    expect(() => disposeTree(root)).not.toThrow();
  });
});
