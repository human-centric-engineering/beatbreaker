import * as THREE from 'three';

/**
 * Shared bits for building the drummer scene out of primitives
 * (experiment: the drummer view): the materials, and placing a limb between
 * two joints. Nothing is loaded from the network — the CSP's `connect-src
 * 'self'` would refuse a model or an HDRI from a CDN, and a procedural rig is
 * one the stroke planner can drive joint by joint without a skeleton to fit.
 */

export interface Materials {
  shell: THREE.MeshPhysicalMaterial;
  head: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  black: THREE.MeshStandardMaterial;
  bronze: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  felt: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  shirt: THREE.MeshStandardMaterial;
  jeans: THREE.MeshStandardMaterial;
  shoe: THREE.MeshStandardMaterial;
  sole: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
  rug: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
}

/**
 * Concentric lathing for the cymbals, drawn once onto a canvas. Without it a
 * cymbal is a flat gold dish; with it the light runs round it the way it does
 * on bronze. Skipped where there is no canvas (the tests run in Node).
 */
function lathingTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const c = size / 2;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let r = 4; r < c; r += 1.6) {
    const shade = 110 + Math.round(40 * Math.sin(r * 1.7) + 25 * Math.sin(r * 0.31));
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

export function makeMaterials(): Materials {
  const lathing = lathingTexture();
  return {
    shell: new THREE.MeshPhysicalMaterial({
      color: '#7a1f1a',
      metalness: 0.35,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      side: THREE.DoubleSide,
    }),
    head: new THREE.MeshStandardMaterial({ color: '#ece6d6', roughness: 0.75 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 1, roughness: 0.16 }),
    black: new THREE.MeshStandardMaterial({ color: '#17181b', roughness: 0.6 }),
    bronze: new THREE.MeshStandardMaterial({
      color: '#c99a4a',
      metalness: 1,
      roughness: 0.3,
      side: THREE.DoubleSide,
      roughnessMap: lathing,
      bumpMap: lathing,
      bumpScale: 0.6,
    }),
    wood: new THREE.MeshStandardMaterial({ color: '#c8a273', roughness: 0.55 }),
    felt: new THREE.MeshStandardMaterial({ color: '#efece6', roughness: 0.95 }),
    skin: new THREE.MeshStandardMaterial({ color: '#c58c6a', roughness: 0.62 }),
    shirt: new THREE.MeshStandardMaterial({ color: '#2c4f6b', roughness: 0.85 }),
    jeans: new THREE.MeshStandardMaterial({ color: '#2a2f3a', roughness: 0.9 }),
    shoe: new THREE.MeshStandardMaterial({ color: '#202124', roughness: 0.7 }),
    sole: new THREE.MeshStandardMaterial({ color: '#e9e6e0', roughness: 0.8 }),
    hair: new THREE.MeshStandardMaterial({ color: '#2a1c14', roughness: 0.9 }),
    eye: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.2 }),
    rug: new THREE.MeshStandardMaterial({ color: '#3a2f2a', roughness: 1 }),
    floor: new THREE.MeshStandardMaterial({ color: '#1d1f24', roughness: 0.85 }),
  };
}

const Y = new THREE.Vector3(0, 1, 0);

/**
 * A unit-height cylinder along `y`, centred — scaled and turned each frame to
 * span two joints. The ends are covered by the joints' spheres, so the
 * stretch never shows.
 */
export function segment(
  rTop: number,
  rBottom: number,
  mat: THREE.Material,
  radial = 14
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, 1, radial, 1, true), mat);
  mesh.castShadow = true;
  return mesh;
}

/** Span a {@link segment} from `a` to `b` (its top at `b`). */
export function place(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  mesh.position.copy(a).addScaledVector(d, 0.5);
  if (len > 1e-6) mesh.quaternion.setFromUnitVectors(Y, d.multiplyScalar(1 / len));
  mesh.scale.set(1, Math.max(len, 1e-4), 1);
}

export function ball(r: number, mat: THREE.Material, segments = 16): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, segments, Math.round(segments * 0.75)),
    mat
  );
  mesh.castShadow = true;
  return mesh;
}

/** A static cylinder between two fixed points — stands, rods, legs. */
export function rod(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  mat: THREE.Material
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), mat);
  place(mesh, a, b);
  mesh.castShadow = true;
  return mesh;
}

/** Free every geometry and material under a root — the scene is built per mount. */
export function disposeTree(root: THREE.Object3D): void {
  const mats = new Set<{ dispose: () => void }>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    // a bare `Mesh` is typed with `any` geometry and material: read them as what they are
    const geo: unknown = o.geometry;
    const mat: unknown = o.material;
    if (geo instanceof THREE.BufferGeometry) geo.dispose();
    for (const x of Array.isArray(mat) ? (mat as unknown[]) : [mat]) {
      if (x instanceof THREE.Material) mats.add(x);
    }
  });
  mats.forEach((m) => {
    if (m instanceof THREE.MeshStandardMaterial) {
      m.roughnessMap?.dispose();
      m.bumpMap?.dispose();
    }
    m.dispose();
  });
}
