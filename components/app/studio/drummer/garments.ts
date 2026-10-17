import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { loft, meshOf, type Ring } from '@/components/app/studio/drummer/parts';
import type { Top } from '@/lib/app/breaks/drummer/personas';

/**
 * What a drummer wears on the trunk (experiment: the drummer view), cut over
 * the trunk's own cross-sections so it follows the body under it: a T-shirt
 * hanging loose over the waistband with a ribbed crew neck and soft folds
 * where it bunches, a shirt buttoned down the front under a collar, or a
 * vest cut away at the arms and the neck; and the top
 * of the trousers — the waistband, a belt and its buckle, the belt loops, the
 * fly and the back pockets.
 *
 * Everything here is in the torso's frame (`+z` back, `y` up from the
 * pelvis), and rigid with it.
 */

/** How square the trunk's cross-sections are: its {@link loft}'s squareness. */
export const TRUNK_SQUARE = 2.2;

/** The trunk's cross-section at height `y`, between the nearest two of `rings`. */
export function ringAt(rings: Ring[], y: number): Ring {
  let i = rings.findIndex((r) => r.y >= y);
  if (i < 0) i = rings.length - 1;
  i = Math.max(1, i);
  const [a, b] = [rings[i - 1], rings[i]];
  const t = b.y === a.y ? 0 : Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y)));
  return {
    y,
    w: a.w + (b.w - a.w) * t,
    d: a.d + (b.d - a.d) * t,
    z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t,
  };
}

/**
 * The point on a cross-section `around` radians round from the right side
 * (π/2 the middle of the back, −π/2 the middle of the front), `out` proud of
 * it, and which way is out there.
 */
export function onRing(
  r: Ring,
  around: number,
  out = 0
): { at: THREE.Vector3; normal: THREE.Vector3 } {
  const e = 2 / TRUNK_SQUARE;
  const c = Math.cos(around);
  const s = Math.sin(around);
  const x = r.w * Math.sign(c) * Math.abs(c) ** e;
  const z = r.d * Math.sign(s) * Math.abs(s) ** e;
  // the superellipse's normal: its gradient
  const p = TRUNK_SQUARE;
  const normal = new THREE.Vector3(
    (Math.sign(x) * Math.abs(x / r.w) ** (p - 1)) / r.w,
    0,
    (Math.sign(z) * Math.abs(z / r.d) ** (p - 1)) / r.d
  ).normalize();
  const at = new THREE.Vector3(x, r.y, (r.z ?? 0) + z).addScaledVector(normal, out);
  return { at, normal };
}

/** The cross-sections of `rings` from `from` to `to`, `proud` of them, with each end exactly there. */
function between(rings: Ring[], from: number, to: number, proud: (y: number) => number): Ring[] {
  const inside = rings.filter((r) => r.y > from + 1e-4 && r.y < to - 1e-4);
  return [ringAt(rings, from), ...inside, ringAt(rings, to)].map((r) => {
    const p = proud(r.y);
    return { ...r, w: r.w + p, d: r.d + p };
  });
}

/** A band round the trunk from `from` to `to`, `proud` of it: a waistband, a belt. */
function band(
  rings: Ring[],
  from: number,
  to: number,
  proud: number,
  mat: THREE.Material
): THREE.Mesh {
  const o = loft(
    between(rings, from, to, () => proud),
    mat,
    64,
    TRUNK_SQUARE
  );
  return o;
}

/** A tube round the trunk at height `y`, `out` proud of it and `r` thick: a hem, a collar's rib. */
function rim(rings: Ring[], y: number, out: number, r: number, mat: THREE.Material): THREE.Mesh {
  const ring = ringAt(rings, y);
  const points = Array.from({ length: 64 }, (_, i) => onRing(ring, (i / 64) * Math.PI * 2, out).at);
  const curve = new THREE.CatmullRomCurve3(points, true);
  return meshOf(new THREE.TubeGeometry(curve, 128, r, 8, true), mat, 'rim');
}

/**
 * A patch lying on the trunk: `around` radians from `a0` to `a1` and up from
 * `y0` to `y1`, `out` proud of it, its corners cut where `keep` says (in the
 * patch's own `u` across and `v` up, each 0–1): a pocket.
 */
function patch(
  rings: Ring[],
  [a0, a1]: [number, number],
  [y0, y1]: [number, number],
  out: number,
  mat: THREE.Material,
  keep: (u: number, v: number) => boolean
): THREE.Mesh {
  const n = 16;
  const pos: number[] = [];
  const index: number[] = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const r = ringAt(rings, y0 + ((y1 - y0) * j) / n);
      const { at } = onRing(r, a0 + ((a1 - a0) * i) / n, out);
      pos.push(at.x, at.y, at.z);
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (!keep((i + 0.5) / n, (j + 0.5) / n)) continue;
      const a = j * (n + 1) + i;
      const b = a + 1;
      const c = a + n + 1;
      const d = c + 1;
      // wound to face out, as the trunk's own surface is
      index.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return meshOf(geo, mat, 'pocket');
}

/** How many columns a {@link surface} has round the trunk. */
const AROUND = 128;

/**
 * A surface over the trunk from `from` up to `to`, `proud` of it — skin, or
 * cloth over it — as a fine grid round and up it, open at both ends; cut where `keep` (in metres, of the angle round and the height)
 * is negative. The cut is clean, not stepped: every cell with any of its
 * corners kept is kept, and each corner outside is slid back onto the line
 * where `keep` is zero, so the edge runs smoothly through the grid like a
 * hem rather than round its squares.
 */
export function surface(
  rings: Ring[],
  from: number,
  to: number,
  proud: (y: number) => number,
  mat: THREE.Material,
  keep?: (around: number, y: number) => number,
  name = 'shirt'
): THREE.Mesh {
  const around = AROUND;
  const up = Math.max(8, Math.round((to - from) / 0.005));
  const grid: [number, number][] = [];
  for (let j = 0; j <= up; j++) {
    for (let i = 0; i <= around; i++)
      grid.push([(i / around) * Math.PI * 2, from + ((to - from) * j) / up]);
  }
  const k = (p: [number, number]) => (keep ? keep(p[0], p[1]) : 1);
  const index: number[] = [];
  const used = new Set<number>();
  for (let j = 0; j < up; j++) {
    for (let i = 0; i < around; i++) {
      const a = j * (around + 1) + i;
      const quad = [a, a + 1, a + around + 1, a + around + 2];
      if (!quad.some((q) => k(grid[q]) > 0)) continue;
      quad.forEach((q) => used.add(q));
      index.push(a, a + around + 1, a + 1, a + 1, a + around + 1, a + around + 2);
    }
  }
  // slide each corner left outside back onto the edge, down the slope of `keep`
  if (keep) {
    const h = [1e-3, 1e-4];
    for (const q of used) {
      const p = grid[q];
      for (let step = 0; step < 6; step++) {
        const v = k(p);
        if (v >= 0) break;
        // the slope round in metres, not radians, so a step round and a step up are alike
        const r = ringAt(rings, p[1]);
        const radius = (r.w + r.d) / 2;
        const ds = (k([p[0] + h[0], p[1]]) - v) / h[0] / radius;
        const dy = (k([p[0], p[1] + h[1]]) - v) / h[1];
        const g = ds * ds + dy * dy;
        if (g < 1e-12) break;
        p[0] -= (v * ds) / g / radius;
        p[1] = Math.max(from, Math.min(to, p[1] - (v * dy) / g));
      }
    }
  }
  const pos: number[] = [];
  const uv: number[] = [];
  for (const [a, y] of grid) {
    const { at } = onRing(ringAt(rings, y), a, proud(y));
    pos.push(at.x, at.y, at.z);
    uv.push(a / (Math.PI * 2), (y - from) / (to - from));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  surfaceNormals(geo);
  return meshOf(geo, mat, name);
}

/**
 * A {@link surface}'s normals, shared across the seam where it closes: the
 * first and last columns of each row are the same points round the back, and
 * each takes the mean of the two so no line shows down it.
 */
export function surfaceNormals(geo: THREE.BufferGeometry): void {
  geo.computeVertexNormals();
  const n = geo.getAttribute('normal');
  const rows = n.count / (AROUND + 1);
  const v = new THREE.Vector3();
  for (let j = 0; j < rows; j++) {
    const a = j * (AROUND + 1);
    const b = a + AROUND;
    v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b));
    if (v.lengthSq() < 1e-12) continue;
    v.normalize();
    n.setXYZ(a, v.x, v.y, v.z);
    n.setXYZ(b, v.x, v.y, v.z);
  }
}

/** How far `a` is round from `to`, radians, the short way: 0 to π. */
const apart = (a: number, to: number) => Math.abs(Math.atan2(Math.sin(a - to), Math.cos(a - to)));

/**
 * Soft folds in a T-shirt, pushed in and out along the trunk's surface:
 * rings of them bunched over the waistband where the shirt gathers as the
 * drummer sits, fading up the belly, and a few running down from the armpits.
 */
function fold(geo: THREE.BufferGeometry, rings: Ring[]): void {
  const pos = geo.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = ringAt(rings, v.y);
    const around = Math.atan2((v.z - (r.z ?? 0)) / r.d, v.x / r.w);
    const front = Math.max(0, -Math.sin(around));
    // gathered at the waist, round the front and sides
    const waist =
      0.0028 *
      bell((v.y - 0.15) / 0.06) *
      (0.4 + 0.6 * front) *
      Math.sin(v.y * ((2 * Math.PI) / 0.032) + 1.7 * Math.sin(around * 3));
    // pulled down and in from under the arms
    const side = Math.abs(Math.cos(around));
    const arm =
      0.0016 *
      bell((v.y - 0.44) / 0.07) *
      side *
      front *
      Math.sin((v.y + 0.6 * Math.abs(v.x)) * ((2 * Math.PI) / 0.05));
    const { normal } = onRing(r, around);
    v.addScaledVector(normal, waist + arm);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  surfaceNormals(geo);
}

/** A bump `t` from its middle, falling away as a bell. */
const bell = (t: number) => Math.exp(-t * t);

/**
 * How the flesh lies over the bones and muscle under it, in metres out (or,
 * negative, in) from the trunk's smooth surface at `x` across and `y` up, in
 * front (`front`, 0–1) or behind (`back`): the pectorals over the ribs, with
 * the crease under them; the collarbones under the skin from the notch at
 * the top of the breastbone out to the shoulders; the line down the middle
 * of the abdomen and the navel; behind, the groove over the spine between
 * the long muscles either side of it, and the shoulder blades. `tone` is how
 * much of it shows: a muscular build's most, a heavy one's least, and a
 * woman's chest is her own shape (`trunk`), not a man's pectorals.
 */
export function flesh(
  x: number,
  y: number,
  front: number,
  back: number,
  tone: number,
  male: boolean
): number {
  const ax = Math.abs(x);
  let out = 0;
  if (front > 0) {
    // the pectorals, full to a crisp crease underneath
    const under = y < 0.445 ? 0.022 : 0.05;
    const pec = male ? 0.0078 * tone * bell((ax - 0.072) / 0.05) * bell((y - 0.47) / under) : 0;
    // the collarbones, rising a little out to the shoulders, and the hollow under each
    const along = Math.max(0, Math.min(1, (ax - 0.022) / 0.14));
    const clavicle = y - (0.644 + 0.01 * along);
    const bone =
      ax > 0.018 && ax < 0.17
        ? 0.0024 * bell(clavicle / 0.0065) - 0.0012 * bell((clavicle + 0.02) / 0.01)
        : 0;
    const notch = -0.0045 * bell(ax / 0.014) * bell((y - 0.652) / 0.012);
    // down the middle of the abdomen, and across it at the tendons, on a lean build
    const abs = male
      ? -0.0022 * Math.max(0, tone - 0.7) * bell(ax / 0.008) * (y > 0.17 && y < 0.42 ? 1 : 0) -
        0.0012 *
          Math.max(0, tone - 1) *
          (ax < 0.06 ? 1 : 0) *
          (bell((y - 0.27) / 0.006) + bell((y - 0.34) / 0.006))
      : 0;
    const navel = -0.006 * bell(ax / 0.006) * bell((y - 0.165) / 0.007);
    out += front * (pec + bone + notch + abs + navel);
  }
  if (back > 0) {
    // the spine in its groove, the long muscles standing either side low down
    const spine = -0.0042 * bell(ax / 0.011) * (y > 0.1 && y < 0.64 ? 1 : 0);
    const erectors = 0.003 * tone * bell((ax - 0.032) / 0.018) * bell((y - 0.2) / 0.08);
    // the shoulder blades, the muscle over them
    const blades = 0.0045 * tone * bell((ax - 0.085) / 0.045) * bell((y - 0.53) / 0.06);
    out += back * (spine + erectors + blades);
  }
  return out;
}

/** Where a T-shirt or a vest hangs to: below the belt, over the top of the trousers. */
const HEM = 0.085;

/**
 * The shirt over the trunk: a T-shirt or a button-up (their sleeves are the
 * arms', see `buildArm`), or a vest. Bare-chested, nothing. `rings` are the
 * trunk's own, and `neck` is the height of the base of the neck, where the
 * neckline is.
 */
export function shirtFor(
  top: Top,
  rings: Ring[],
  mat: THREE.MeshStandardMaterial,
  neck: number
): THREE.Object3D[] {
  if (top === 'bare') return [];
  if (top === 'button-up') return buttonUp(rings, mat, neck);
  const tee = top === 'tee';
  // close over the body, standing off it toward the hem as a T-shirt hangs loose; a vest's
  // rib knit hugs the body to the hem, rather than flaring over the hips
  const proud = (y: number) =>
    (tee ? 0.005 : 0.004) + (tee ? 0.017 : 0.007) * Math.max(0, 1 - (y - HEM) / 0.16) ** 1.6;
  if (tee) {
    const shell = surface(rings, HEM, neck, proud, mat);
    fold(shell.geometry, rings);
    return [
      shell,
      // a ribbed crew neck, and the hem turned up
      rim(rings, neck - 0.003, 0.0065, 0.0055, mat),
      rim(rings, HEM + 0.003, proud(HEM), 0.0035, mat),
    ];
  }
  return [
    surface(rings, HEM, neck, proud, mat, vest),
    rim(rings, HEM + 0.003, proud(HEM), 0.003, mat),
  ];
}

/** How far a T-shirt or a button-up stands off the body at height `y`: close, and loose toward the hem. */
const hanging = (y: number) => 0.005 + 0.017 * Math.max(0, 1 - (y - HEM) / 0.16) ** 1.6;

/** How wide a button-up's placket is down the front, and how many buttons are on it. */
const PLACKET = 0.032;
const BUTTONS = 6;

/**
 * A button-up's collar point on the right of the front (mirrored on the
 * left), in radians round from the middle of the front and metres down from
 * the base of the neck: in at the top button, down to its point, and out and
 * up to the shoulder; the neckline closes it along the top.
 */
const COLLAR: [number, number][] = [
  [0.035, 0.008],
  [0.21, 0.068],
  [0.6, 0.018],
];

/**
 * A long-sleeved shirt, buttoned: cut and hung as a T-shirt is, with a
 * placket down the middle of the front from the hem to the collar, stitched
 * down either edge, and its buttons; and at the neck a collar stand with a
 * point folded down either side of the top button, its edge stitched.
 */
function buttonUp(rings: Ring[], mat: THREE.MeshStandardMaterial, neck: number): THREE.Object3D[] {
  const shell = surface(rings, HEM, neck, hanging, mat);
  fold(shell.geometry, rings);
  /** How far round the trunk `d` metres is at height `y`, radians. */
  const across = (d: number, y: number) => {
    const r = ringAt(rings, y);
    return d / ((r.w + r.d) / 2);
  };
  // within half the placket's width of the middle of the front, in metres round the trunk
  const strip = (around: number, y: number) => {
    const r = ringAt(rings, y);
    return PLACKET / 2 - apart(around, -Math.PI / 2) * ((r.w + r.d) / 2);
  };
  const placket = surface(
    rings,
    HEM,
    neck - 0.01,
    (y) => hanging(y) + 0.0016,
    mat,
    strip,
    'placket'
  );
  fold(placket.geometry, rings);
  const stitch = new THREE.MeshStandardMaterial({
    color: mat.color.clone().lerp(new THREE.Color('#000000'), 0.45),
    roughness: 0.9,
  });
  /** A line of stitching through `points`, each as round from the middle of the front and up. */
  const seam = (points: [number, number, number][], name: string) =>
    meshOf(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          points.map(([around, y, out]) => onRing(ringAt(rings, y), -Math.PI / 2 + around, out).at)
        ),
        points.length * 2,
        0.0009,
        4
      ),
      stitch,
      name
    );
  const out: THREE.Object3D[] = [
    shell,
    placket,
    rim(rings, HEM + 0.003, hanging(HEM), 0.0035, mat),
    // the collar stand round the neck, and its edge
    band(rings, neck - 0.016, neck, 0.0075, mat),
    rim(rings, neck - 0.001, 0.0075, 0.003, mat),
  ];
  // the placket's edges, stitched down from the collar to the hem, over the shirt's folds
  for (const side of [-1, 1]) {
    const line: [number, number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const y = neck - 0.012 - ((neck - 0.012 - HEM - 0.004) * i) / 40;
      line.push([side * across(PLACKET / 2 - 0.003, y), y, hanging(y) + 0.0048]);
    }
    out.push(seam(line, 'stitch'));
  }
  // the collar's points, lying down over the shoulders of the shirt either side of the placket
  const top = neck - 0.006;
  const low = neck - 0.075;
  /** Whether `d` round and `drop` down is within the outline: on the inner side of each of its edges. */
  const inside = (d: number, drop: number) =>
    COLLAR.slice(1).every(([d1, y1], i) => {
      const [d0, y0] = COLLAR[i];
      return (d1 - d0) * (drop - y0) - (y1 - y0) * (d - d0) <= 0;
    });
  for (const side of [-1, 1]) {
    const [near, far] = [0.02, 0.62];
    const point = patch(
      rings,
      side === 1
        ? [-Math.PI / 2 + near, -Math.PI / 2 + far]
        : [-Math.PI / 2 - far, -Math.PI / 2 - near],
      [low, top],
      0.0105,
      mat,
      (u, v) => {
        const d = side === 1 ? near + (far - near) * u : far - (far - near) * u;
        return inside(d, neck - (low + (top - low) * v));
      }
    );
    point.name = 'collar point';
    out.push(point);
    // and stitched round its edge, a little in from it
    const edge: [number, number, number][] = [];
    for (let i = 0; i < COLLAR.length - 1; i++) {
      const [[d0, y0], [d1, y1]] = [COLLAR[i], COLLAR[i + 1]];
      for (let t = 0; t < 1; t += 0.125)
        edge.push([side * (d0 + (d1 - d0) * t), neck - (y0 + (y1 - y0) * t), 0.0115]);
    }
    const [dl, yl] = COLLAR[COLLAR.length - 1];
    edge.push([side * dl, neck - yl, 0.0115]);
    out.push(seam(edge, 'stitch'));
  }
  // the buttons, from the collar down, pearly against the cloth
  const pearl = new THREE.MeshStandardMaterial({ color: '#ece6da', roughness: 0.35 });
  const first = neck - 0.03;
  const last = HEM + 0.045;
  for (let i = 0; i < BUTTONS; i++) {
    const y = first - ((first - last) * i) / (BUTTONS - 1);
    const { at, normal } = onRing(ringAt(rings, y), -Math.PI / 2, hanging(y) + 0.0055);
    const button = meshOf(new THREE.CylinderGeometry(0.0052, 0.0052, 0.0022, 14), pearl, 'button');
    button.position.copy(at);
    button.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    out.push(button);
  }
  return out;
}

/**
 * Where a vest is (positive) and is not (negative), roughly in metres, by the
 * angle round the trunk and the height: cut away in an oval round each arm,
 * from under the armpit to below the top of the shoulder, and scooped at the
 * neck, deep in front and shallower behind — leaving a strap over each
 * shoulder between them.
 */
export function vest(around: number, y: number): number {
  const side = Math.min(apart(around, 0), apart(around, Math.PI));
  const arm = Math.hypot(side / 0.85, (y - 0.54) / 0.096) - 1;
  const front = 0.52 + 0.17 * (apart(around, -Math.PI / 2) / 0.78) ** 2 - y;
  const back = 0.6 + 0.09 * (apart(around, Math.PI / 2) / 0.7) ** 2 - y;
  return Math.min(arm * 0.08, front, back);
}

/** Where the trousers come up to on the trunk, the belt round them and its width. */
const WAIST = 0.165;
const BELT_Y = 0.143;
const BELT_WIDE = 0.034;

/**
 * The top of a pair of trousers, over the trunk below the shirt: the fly's
 * stitching curving down the front and a pocket on each buttock; and where no
 * shirt hangs over it (`belted`), a waistband, a leather belt with its buckle
 * at the front and five loops round it.
 */
export function trousersTop(
  rings: Ring[],
  mat: THREE.MeshStandardMaterial,
  belted: boolean
): THREE.Object3D[] {
  const leather = new THREE.MeshStandardMaterial({ color: '#2b1d14', roughness: 0.55 });
  const metal = new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 1, roughness: 0.28 });
  const stitch = new THREE.MeshStandardMaterial({
    color: mat.color.clone().lerp(new THREE.Color('#000000'), 0.35),
    roughness: 0.9,
  });
  const out: THREE.Object3D[] = [];
  if (belted) {
    out.push(
      band(rings, WAIST - 0.04, WAIST, 0.004, mat),
      band(rings, BELT_Y - BELT_WIDE / 2, BELT_Y + BELT_WIDE / 2, 0.007, leather)
    );
    // the buckle, square to the front of the belt
    const front = onRing(ringAt(rings, BELT_Y), -Math.PI / 2, 0.011);
    const buckle = meshOf(new RoundedBoxGeometry(0.05, 0.04, 0.007, 2, 0.003), metal, 'buckle');
    buckle.position.copy(front.at);
    out.push(buckle);
    // the loops, standing over the belt
    for (const around of [
      -Math.PI / 2 - 0.7,
      -Math.PI / 2 + 0.7,
      -0.15,
      Math.PI + 0.15,
      Math.PI / 2,
    ]) {
      const { at, normal } = onRing(ringAt(rings, BELT_Y), around, 0.0105);
      const loop = meshOf(
        new RoundedBoxGeometry(0.012, BELT_WIDE + 0.012, 0.004, 1, 0.0015),
        mat,
        'belt loop'
      );
      loop.position.copy(at);
      loop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      out.push(loop);
    }
  }
  // the fly: a line of stitching down the front, curving in to the middle at the bottom
  const fly: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const y = BELT_Y - BELT_WIDE / 2 - 0.004 - t * 0.1;
    const r = ringAt(rings, y);
    const sideways = 0.032 * Math.sqrt(1 - Math.max(0, (t - 0.75) / 0.25) ** 2);
    // round the superellipse from the middle of the front: `x = w·sin(δ)^(2/square)`
    const around = -Math.PI / 2 + Math.asin(Math.min(1, sideways / r.w) ** (TRUNK_SQUARE / 2));
    fly.push(onRing(r, around, 0.0012).at);
  }
  out.push(
    meshOf(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fly), 24, 0.0012, 5), stitch, 'fly')
  );
  // a pocket on each buttock: square at the top, coming to a blunt point at the bottom
  for (const side of [-1, 1]) {
    const centre = Math.PI / 2 - side * 0.5;
    const pocket = patch(
      rings,
      [centre - 0.24, centre + 0.24],
      [-0.03, 0.09],
      0.0022,
      mat,
      (u, v) => v > 0.25 * Math.abs(u - 0.5) * 2
    );
    out.push(pocket);
  }
  return out;
}

/** A leg of a pair of shorts, a sock: a tube round a limb, posed with it. */
export interface Sleeve {
  mesh: THREE.Mesh;
  /** Where along the limb it starts and ends, as shares of the limb's length from its top joint. */
  from: number;
  to: number;
}

/** A pair of shorts' leg from the hip, past the top of the thigh, to its hem above the knee. */
export const SHORTS_LEG: [number, number][] = [
  [0, -0.5],
  [0.06, -0.47],
  [0.084, -0.4],
  [0.092, -0.2],
  [0.09, 0.2],
  [0.088, 0.46],
  [0.089, 0.49],
  [0.08, 0.5],
];
/** An ankle sock, from inside the shoe to a ribbed top a hand's width up the shin. */
export const SOCK: [number, number][] = [
  [0.041, -0.5],
  [0.039, 0],
  [0.038, 0.4],
  [0.0395, 0.45],
  [0.0395, 0.5],
  [0.034, 0.5],
];
