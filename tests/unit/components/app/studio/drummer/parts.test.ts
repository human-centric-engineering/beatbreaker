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
  bentCloth,
  bentSkin,
  disposeMaterials,
  disposeTree,
  limb,
  loft,
  makeMaterials,
  place,
  printDots,
  REST_NORMAL,
  rod,
  segment,
  SKIN_REST,
  styleKit,
} from '@/components/app/studio/drummer/parts';
import { LIKENESSES } from '@/lib/app/breaks/drummer/likenesses';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';

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
      'trim',
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

  it("dresses the drummer in the player's colours, and a bare chest in their skin", () => {
    const nia = PERSONAS.find((p) => p.id === 'nia')!;
    const m = makeMaterials(nia);
    expect(m.skin.color.getHexString()).toBe(nia.skin.slice(1));
    expect(m.shirt.color.getHexString()).toBe(nia.shirt.slice(1));
    expect(m.hair.color.getHexString()).toBe(nia.hair.slice(1));
    expect(m.jeans.color.getHexString()).toBe(nia.trousers.slice(1));
    expect(m.accent.color.getHexString()).toBe(nia.accent.slice(1));

    const bare = PERSONAS.find((p) => p.top === 'bare' && p.shirt !== p.skin);
    const shirtless = { ...(bare ?? PERSONAS[0]), top: 'bare' as const, shirt: '#00ff00' };
    expect(makeMaterials(shirtless).shirt.color.getHexString()).toBe(shirtless.skin.slice(1));
  });

  it('gives each call its own material instances', () => {
    const a = makeMaterials();
    const b = makeMaterials();
    expect(a.shell).not.toBe(b.shell);
    expect(a.chrome).not.toBe(b.chrome);
  });
});

describe('styleKit', () => {
  const byId = (id: string) => PERSONAS.find((p) => p.id === id)!;

  it("paints the kit in the player's: shells, hardware, the mat and its trim", () => {
    const vex = byId('vex');
    const m = makeMaterials(vex);
    expect(m.shell.color.getHexString()).toBe(vex.kit.shell.slice(1));
    expect(m.rug.color.getHexString()).toBe(vex.kit.rug.slice(1));
    expect(m.trim.color.getHexString()).toBe(vex.kit.trim!.slice(1));
    // blacked-out hardware: dark, and duller than chrome
    expect(m.chrome.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(0.1);
    expect(m.chrome.roughness).toBeGreaterThan(0.3);
  });

  it("keeps the original drummer's kit exactly as it was", () => {
    const m = makeMaterials(PERSONAS[0]);
    expect(m.shell.color.getHexString()).toBe('7a1f1a');
    expect(m.shell).toMatchObject({
      metalness: 0.35,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    expect(m.chrome.color.getHexString()).toBe('d9dde2');
    expect(m.chrome).toMatchObject({ metalness: 1, roughness: 0.16 });
    expect(m.rug.color.getHexString()).toBe('3a2f2a');
    // no trim: the band is the mat's own colour
    expect(m.trim.color.getHexString()).toBe('3a2f2a');
  });

  it('gives each finish its own surface', () => {
    const finish = (id: string) => {
      const s = makeMaterials(byId(id)).shell;
      return { metalness: s.metalness, roughness: s.roughness, clearcoat: s.clearcoat };
    };
    const satin = finish('raj');
    const metal = finish('brassbot');
    const sparkle = finish('roxy');
    // satin is matt and unmetallic; bare metal is all metal; sparkle sits between, under lacquer
    expect(satin.metalness).toBe(0);
    expect(satin.roughness).toBeGreaterThan(finish('original').roughness);
    expect(metal.metalness).toBe(1);
    expect(sparkle.metalness).toBeGreaterThan(satin.metalness);
    expect(sparkle.metalness).toBeLessThan(metal.metalness);
    expect(sparkle.clearcoat).toBe(1);
  });

  it('repaints a kit in place for the next player, gold hardware and all', () => {
    const m = makeMaterials(PERSONAS[0]);
    const { shell, chrome, rug, trim } = m;
    const duchess = byId('duchess');
    styleKit(m, duchess);
    expect(m.shell).toBe(shell);
    expect(m.chrome).toBe(chrome);
    expect(m.rug).toBe(rug);
    expect(m.trim).toBe(trim);
    expect(shell.color.getHexString()).toBe(duchess.kit.shell.slice(1));
    expect(chrome.color.getHexString()).toBe('e0b24a');
    expect(rug.color.getHexString()).toBe(duchess.kit.rug.slice(1));
    expect(trim.color.getHexString()).toBe(duchess.kit.trim!.slice(1));
  });

  it('flags the shell for a new shader when it is repainted', () => {
    const m = makeMaterials(PERSONAS[0]);
    const version = m.shell.version;
    styleKit(m, byId('roxy'));
    expect(m.shell.version).toBeGreaterThan(version);
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

describe('limb', () => {
  it('lathes the profile, joint to joint, and spans two joints like a segment', () => {
    const mat = new THREE.MeshStandardMaterial();
    const m = limb(
      [
        [0.04, -0.5],
        [0.05, 0],
        [0.03, 0.5],
      ],
      mat
    );
    expect(m.geometry).toBeInstanceOf(THREE.LatheGeometry);
    expect(m.castShadow).toBe(true);
    place(m, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.3, 0));
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    // as long as the joints are apart, as thick as the profile's belly
    expect(box.max.y - box.min.y).toBeCloseTo(0.3, 6);
    // (to within the facets of 18 sides)
    expect(box.max.x).toBeGreaterThan(0.049);
    expect(box.max.x).toBeLessThanOrEqual(0.05);
  });
});

describe('loft', () => {
  it('runs through each cross-section at its height, width and depth, closed at both ends', () => {
    const mat = new THREE.MeshStandardMaterial();
    const m = loft(
      [
        { y: 0, w: 0.1, d: 0.05 },
        { y: 0.2, w: 0.2, d: 0.1, z: 0.03 },
        { y: 0.4, w: 0.05, d: 0.04 },
      ],
      mat,
      24
    );
    const box = new THREE.Box3().setFromObject(m);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.max.y).toBeCloseTo(0.4, 6);
    expect(box.max.x).toBeCloseTo(0.2, 6);
    expect(box.max.z).toBeCloseTo(0.13, 6);
    // 3 rings of 24, plus the two end centres; every edge shared, so no seam
    const pos = m.geometry.getAttribute('position');
    expect(pos.count).toBe(3 * 24 + 2);
    expect(m.geometry.getIndex()!.count).toBe((2 * 24 * 2 + 2 * 24) * 3);
    expect(m.geometry.getAttribute('normal')).toBeDefined();
  });

  it('closes each end facing out of it, so an end in view is lit, not dark', () => {
    const m = loft(
      [
        { y: 0, w: 0.1, d: 0.1 },
        { y: 0.2, w: 0.1, d: 0.1 },
      ],
      new THREE.MeshStandardMaterial(),
      16
    );
    const normal = m.geometry.getAttribute('normal');
    // the two end centres are the last two vertices: bottom, then top
    const n = normal.count;
    expect(normal.getY(n - 2)).toBeLessThan(-0.9);
    expect(normal.getY(n - 1)).toBeGreaterThan(0.9);
  });
});

describe('disposeMaterials', () => {
  it('frees every material in the set, worn or not', () => {
    const m = makeMaterials();
    const spies = Object.values(m).map((mat) => vi.spyOn(mat as THREE.Material, 'dispose'));
    disposeMaterials(m);
    for (const s of spies) expect(s).toHaveBeenCalled();
  });
});

describe('printDots', () => {
  /** What a material's shader is once its `onBeforeCompile` has run on three's own chunks. */
  const compiled = (mat: THREE.Material) => {
    const shader = {
      vertexShader: '#include <common>\n#include <begin_vertex>',
      fragmentShader: '#include <common>\n#include <color_fragment>',
    };
    mat.onBeforeCompile(
      shader as THREE.WebGLProgramParametersWithUniforms,
      {} as THREE.WebGLRenderer
    );
    return shader;
  };
  const dots = { ground: '#ffffff', dot: '#000000', spacing: 0.05, radius: 0.01 };

  it('lays the dots out in the mesh’s own frame, in metres, and colours the cloth with them', () => {
    const mat = new THREE.MeshPhysicalMaterial();
    printDots(mat, dots);
    const { vertexShader, fragmentShader } = compiled(mat);
    expect(vertexShader).toContain('vDotAt = position');
    expect(vertexShader).toContain('vDotFacing = normal');
    // a lattice the spacing apart, each dot a disc the radius round
    expect(fragmentShader).toContain('p / 0.05000');
    expect(fragmentShader).toContain('0.2000');
    expect(fragmentShader).toContain('diffuseColor.rgb *= mix(');
    expect(mat.userData.dots).toEqual(dots);
  });

  it('lays them out where a bent mesh is at rest, so they stay on the sleeve as it bends', () => {
    const mat = new THREE.MeshPhysicalMaterial();
    printDots(mat, dots, true);
    const { vertexShader } = compiled(mat);
    expect(vertexShader).toContain(`attribute vec3 ${SKIN_REST}`);
    expect(vertexShader).toContain(`vDotAt = ${SKIN_REST}`);
    expect(vertexShader).toContain(`vDotFacing = ${REST_NORMAL}`);
  });

  it('keeps a shader of its own for each print, and for a bent mesh', () => {
    const a = new THREE.MeshPhysicalMaterial();
    const b = new THREE.MeshPhysicalMaterial();
    const c = new THREE.MeshPhysicalMaterial();
    printDots(a, dots);
    printDots(b, dots, true);
    printDots(c, { ...dots, spacing: 0.07 });
    const keys = new Set([a, b, c].map((m) => m.customProgramCacheKey()));
    expect(keys.size).toBe(3);
  });
});

describe('bentCloth', () => {
  it('leaves plain cloth as it is', () => {
    const plain = makeMaterials(PERSONAS[0]).shirt;
    expect(bentCloth(plain)).toBe(plain);
  });

  it('copies a printed cloth with its dots laid out at rest', () => {
    const printed = makeMaterials(LIKENESSES.klek).shirt;
    const bent = bentCloth(printed);
    expect(bent).not.toBe(printed);
    expect(bent.userData.dots).toEqual(printed.userData.dots);
    expect(bent.customProgramCacheKey()).toContain('dots-true');
    expect(printed.customProgramCacheKey()).toContain('dots-false');
  });
});

describe('makeMaterials — the likenesses', () => {
  it("prints Klek's costume: a pale smock spotted dark, dark trousers and gloves spotted pale", () => {
    const klek = LIKENESSES.klek;
    const m = makeMaterials(klek);
    expect(m.shirt.userData.dots).toMatchObject({ ground: klek.shirt, dot: klek.polka!.shirt });
    expect(m.jeans.userData.dots).toMatchObject({
      ground: klek.trousers,
      dot: klek.polka!.trousers,
    });
    expect(m.skin.userData.dots).toMatchObject({ ground: klek.skin, dot: klek.polka!.skin });
    // finer on the gloves than on the clothes
    expect(m.skin.userData.dots.spacing).toBeLessThan(m.shirt.userData.dots.spacing);
    // the print colours the cloth: white under it
    expect(m.shirt.color.r).toBe(m.shirt.color.g);
  });

  it("weaves a dinner jacket's shirt in white poplin, and a satin shirt with a sheen", () => {
    const purdie = makeMaterials(LIKENESSES.bernardpurdie);
    expect((purdie.under as THREE.MeshPhysicalMaterial).color.getHexString()).not.toBe(
      purdie.shirt.color.getHexString()
    );
    const satin = makeMaterials(LIKENESSES.mitchell).shirt as THREE.MeshPhysicalMaterial;
    const plain = makeMaterials(PERSONAS[0]).shirt as THREE.MeshPhysicalMaterial;
    expect(satin.sheen).toBeGreaterThan(plain.sheen);
    expect(satin.roughness).toBeLessThan(plain.roughness);
  });

  it("colours Mitchell's braces", () => {
    const m = makeMaterials(LIKENESSES.mitchell);
    expect(m.braces.color.getHexString()).toBe(LIKENESSES.mitchell.braces!.slice(1));
  });
});

describe('makeMaterials — for a figure', () => {
  it('leaves the shells unpainted: a figure has none, and an oyster wrap is not drawn for nothing', () => {
    const kit = makeMaterials(LIKENESSES.mitchell);
    const figure = makeMaterials(LIKENESSES.mitchell, false);
    expect(kit.shell.color.getHexString()).not.toBe(figure.shell.color.getHexString());
    expect(figure.shell.map).toBeNull();
    // the figure's own colours are still its own
    expect(figure.braces.color.getHexString()).toBe(LIKENESSES.mitchell.braces!.slice(1));
  });
});

describe('bentSkin', () => {
  it('lays a glove’s print out at rest, as a sleeve’s is', () => {
    const glove = makeMaterials(LIKENESSES.klek).skin;
    const bent = bentSkin(glove);
    expect(bent).not.toBe(glove);
    expect(bent.customProgramCacheKey()).toContain('dots-true');
  });
});

describe('styleKit — spotted shells', () => {
  it("prints Klek's kit with dots on its shells, and takes them off for the next kit", () => {
    const m = makeMaterials(PERSONAS[0]);
    const plain = m.shell.customProgramCacheKey();
    styleKit(m, LIKENESSES.klek);
    expect(m.shell.userData.dots).toMatchObject({
      ground: LIKENESSES.klek.kit.shell,
      dot: LIKENESSES.klek.kit.dots,
    });
    expect(m.shell.customProgramCacheKey()).not.toBe(plain);
    styleKit(m, PERSONAS[0]);
    expect(m.shell.userData.dots).toBeUndefined();
    expect(m.shell.customProgramCacheKey()).toBe(plain);
    expect(m.shell.color.getHexString()).toBe(PERSONAS[0].kit.shell.slice(1));
  });

  it('gives an oyster pearl its own lacquered surface', () => {
    const s = makeMaterials(LIKENESSES.mitchell).shell;
    expect(s.clearcoat).toBe(1);
    expect(s.metalness).toBeGreaterThan(0);
  });
});
