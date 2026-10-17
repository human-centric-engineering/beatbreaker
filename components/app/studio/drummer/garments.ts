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

/**
 * How far round from the middle of the front a point `x` metres across is,
 * radians: on the superellipse `x = w·sin(δ)^(2/square)`, so `δ` is not `x`
 * over a radius, which near the flat of the front is well wide of it.
 */
const roundTo = (r: Ring, x: number) =>
  Math.asin(Math.min(1, Math.abs(x) / r.w) ** (TRUNK_SQUARE / 2));

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

/** About a shirt's height, metres: a patch's `v` runs up it at a {@link surface}'s scale, so its weave matches. */
const PATCH_V = 0.58;

/**
 * A patch lying on the trunk: `around` radians from `a0` to `a1` (or, a
 * function, as they are at each height) and up from `y0` to `y1` in `rows`,
 * `out` proud of it (or as it is at each height), its corners cut where
 * `keep` says (in the patch's own `u` across and `v` up, each 0–1): a
 * pocket, a collar's point, a placket. Its `uv` is a {@link surface}'s, by
 * the angle round and the height, so cloth on it is the same weave.
 */
function patch(
  rings: Ring[],
  span: [number, number] | ((y: number) => [number, number]),
  [y0, y1]: [number, number],
  out: number | ((y: number) => number),
  mat: THREE.Material,
  keep: (u: number, v: number) => boolean = () => true,
  rows = 16,
  name = 'pocket'
): THREE.Mesh {
  const n = 16;
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (let j = 0; j <= rows; j++) {
    const y = y0 + ((y1 - y0) * j) / rows;
    const r = ringAt(rings, y);
    const [a0, a1] = typeof span === 'function' ? span(y) : span;
    const o = typeof out === 'function' ? out(y) : out;
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      const { at } = onRing(r, a, o);
      pos.push(at.x, at.y, at.z);
      uv.push(a / (Math.PI * 2), y / PATCH_V);
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < n; i++) {
      if (!keep((i + 0.5) / n, (j + 0.5) / rows)) continue;
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
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return meshOf(geo, mat, name);
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
 * Only the points move: the caller lays the normals over them.
 */
function fold(geo: THREE.BufferGeometry, rings: Ring[]): void {
  const pos = geo.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    folded(rings, v.fromBufferAttribute(pos, i));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
}

/** The point `v`, on or over the shirt, moved with its {@link fold}s: in place, and returned. */
function folded(rings: Ring[], v: THREE.Vector3): THREE.Vector3 {
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
  return v;
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

/** How far a T-shirt or a button-up stands off the body at height `y`: close, and loose toward the hem. */
const hanging = (y: number) => 0.005 + 0.017 * Math.max(0, 1 - (y - HEM) / 0.16) ** 1.6;

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
  neck: number,
  dress: Dress = {}
): THREE.Object3D[] {
  if (top === 'bare') return [];
  if (top === 'button-up') return buttonUp(rings, mat, neck);
  if (top === 'ruffled') return ruffled(rings, mat, neck);
  if (top === 'suit') return smock(rings, mat, neck, dress.emblem ?? mat);
  if (top === 'tuxedo') return tuxedo(rings, mat, neck, dress.under ?? mat, dress.bow ?? mat);
  if (top === 'tee') {
    const shell = surface(rings, HEM, neck, hanging, mat);
    fold(shell.geometry, rings);
    surfaceNormals(shell.geometry);
    return [
      shell,
      // a ribbed crew neck, and the hem turned up
      rim(rings, neck - 0.003, 0.0065, 0.0055, mat),
      rim(rings, HEM + 0.003, hanging(HEM), 0.0035, mat),
    ];
  }
  // a vest's rib knit hugs the body to the hem, rather than flaring over the hips as a T-shirt does
  const proud = (y: number) => 0.004 + 0.007 * Math.max(0, 1 - (y - HEM) / 0.16) ** 1.6;
  return [
    surface(rings, HEM, neck, proud, mat, vest),
    rim(rings, HEM + 0.003, proud(HEM), 0.003, mat),
  ];
}

/** What else a top is made of: a dinner jacket's shirt and bow tie, a smock's emblem. */
export interface Dress {
  under?: THREE.MeshStandardMaterial;
  bow?: THREE.Material;
  emblem?: THREE.Material;
}

/** The same cloth, seen from both sides: a ruffle, which shows its back as it turns. */
function bothSides(mat: THREE.Material): THREE.Material {
  const o = mat.clone();
  o.side = THREE.DoubleSide;
  return o;
}

/**
 * A ruffle: a fan of cloth gathered at a point and hanging from it, `wide`
 * across and `drop` down, rippling `waves` times round its edge and standing
 * out up to `depth` (toward `-z`, the front). Its own frame: `x` across, `y` up.
 */
export function frill(
  wide: number,
  drop: number,
  waves: number,
  depth: number
): THREE.BufferGeometry {
  const rows = 8;
  const cols = 40;
  const pos: number[] = [];
  const index: number[] = [];
  for (let j = 0; j <= rows; j++) {
    const r = j / rows;
    for (let i = 0; i <= cols; i++) {
      const th = -Math.PI / 2 + (Math.PI * i) / cols;
      // gathered at the point, fuller and more rippled out to the edge
      const ripple = 0.5 + 0.5 * Math.sin(waves * th * 2);
      pos.push(
        Math.sin(th) * (wide / 2) * r,
        -Math.cos(th) * drop * r,
        -depth * r * (0.35 + 0.65 * ripple)
      );
    }
  }
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      index.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Mitch Mitchell's shirt at Monterey: satin, hung as a T-shirt is (its full
 * sleeves are the arms', see `buildArmFlesh`), with a ruffled collar standing
 * round the neck and a jabot — ruffle under ruffle — down the front.
 */
function ruffled(rings: Ring[], mat: THREE.MeshStandardMaterial, neck: number): THREE.Object3D[] {
  const shell = surface(rings, HEM, neck, hanging, mat);
  fold(shell.geometry, rings);
  surfaceNormals(shell.geometry);
  const soft = bothSides(mat);
  const out: THREE.Object3D[] = [
    shell,
    rim(rings, HEM + 0.003, hanging(HEM), 0.0035, mat),
    band(rings, neck - 0.014, neck, 0.007, mat),
  ];
  // the jabot: each ruffle over the one below it, a little further out
  for (let k = 0; k < 7; k++) {
    const y = neck - 0.018 - k * 0.032;
    const { at } = onRing(ringAt(rings, y), -Math.PI / 2, hanging(y) + 0.013 - 0.0014 * k);
    const ruffle = meshOf(frill(0.07 + 0.006 * k, 0.05, 5, 0.016), soft, 'ruffle');
    ruffle.position.copy(at);
    ruffle.rotation.x = 0.18;
    out.push(ruffle);
  }
  // the collar's ruffle, standing up and out round the neck from one side of it to the other
  const cols = 72;
  const pos: number[] = [];
  const index: number[] = [];
  const ring = ringAt(rings, neck - 0.006);
  for (let i = 0; i <= cols; i++) {
    const a = -Math.PI / 2 - 1.45 + (2.9 * i) / cols;
    const { at, normal } = onRing(ring, a, 0.006);
    for (let j = 0; j <= 4; j++) {
      const t = j / 4;
      const ripple = 0.006 * t * Math.sin(a * 22);
      pos.push(
        at.x + normal.x * (0.012 * t + ripple),
        at.y + 0.03 * t,
        at.z + normal.z * (0.012 * t + ripple)
      );
    }
  }
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < 4; j++) {
      const a = i * 5 + j;
      index.push(a, a + 5, a + 1, a + 1, a + 5, a + 6);
    }
  const collar = new THREE.BufferGeometry();
  collar.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  collar.setIndex(index);
  collar.computeVertexNormals();
  out.push(meshOf(collar, soft, 'ruffle'));
  return out;
}

/**
 * Klek de Poitrine's smock: loose and oversized, square across dropped
 * shoulders and hanging past the belt, with a gold triangle on the chest.
 */
function smock(
  rings: Ring[],
  mat: THREE.MeshStandardMaterial,
  neck: number,
  emblem: THREE.Material
): THREE.Object3D[] {
  // oversized: well off the body all the way down, squared out over dropped shoulders
  const loose = (y: number) => hanging(y) + 0.02 + 0.018 * bell((y - 0.6) / 0.06);
  const from = HEM - 0.03;
  const shell = surface(rings, from, neck, loose, mat);
  fold(shell.geometry, rings);
  surfaceNormals(shell.geometry);
  const y = 0.4;
  const { at } = onRing(ringAt(rings, y), -Math.PI / 2, loose(y) + 0.012);
  const shape = new THREE.Shape([
    new THREE.Vector2(-0.065, -0.05),
    new THREE.Vector2(0.065, -0.05),
    new THREE.Vector2(0, 0.06),
  ]);
  const triangle = meshOf(new THREE.ShapeGeometry(shape), emblem, 'emblem');
  triangle.position.copy(at);
  // flat on the chest, facing out the front
  triangle.rotation.y = Math.PI;
  return [
    shell,
    rim(rings, from + 0.003, loose(from), 0.004, mat),
    rim(rings, neck - 0.002, 0.016, 0.005, mat),
    triangle,
  ];
}

/**
 * A dinner jacket, open over a white dress shirt and a bow tie: the jacket
 * cut in a V from the button to the shoulders, its lapels faced in satin; the
 * shirt's front and collar showing in the V; its sleeves are the arms'.
 */
function tuxedo(
  rings: Ring[],
  mat: THREE.MeshStandardMaterial,
  neck: number,
  under: THREE.MeshStandardMaterial,
  bow: THREE.Material
): THREE.Object3D[] {
  const button = 0.3;
  /** How far round either way of the middle of the front the V is open at height `y`, radians. */
  const open = (y: number) =>
    0.46 * Math.max(0, Math.min(1, (y - button) / (neck - button))) ** 0.9;
  const front = (a: number) =>
    Math.abs(Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2)));
  const jacketOut = (y: number) => hanging(y) + 0.005;
  const jacket = surface(
    rings,
    HEM - 0.01,
    neck,
    jacketOut,
    mat,
    (a, y) => (y < button ? 1 : (front(a) - open(y)) * 0.15),
    'jacket'
  );
  const shirt = surface(
    rings,
    button - 0.02,
    neck,
    (y) => hanging(y),
    under,
    (a, y) => (open(y) + 0.06 - front(a)) * 0.15,
    'shirt'
  );
  const satin = new THREE.MeshStandardMaterial({
    color: mat.color.clone().multiplyScalar(0.9),
    roughness: 0.3,
  });
  const out: THREE.Object3D[] = [
    jacket,
    shirt,
    rim(rings, HEM - 0.007, jacketOut(HEM - 0.01), 0.004, mat),
    band(rings, neck - 0.016, neck, 0.0075, under),
  ];
  for (const side of [-1, 1]) {
    out.push(
      patch(
        rings,
        (y) => {
          const a = -Math.PI / 2 + side * open(y);
          const b = a + side * (0.05 + 0.1 * Math.min(1, (y - button) / 0.12));
          return side === 1 ? [a, b] : [b, a];
        },
        [button, neck - 0.012],
        (y) => jacketOut(y) + 0.0018,
        satin,
        undefined,
        24,
        'lapel'
      )
    );
  }
  // the bow tie at the collar: two wings and the knot between them
  const { at } = onRing(ringAt(rings, neck - 0.012), -Math.PI / 2, 0.012);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.016, 14, 10), bow);
    wing.scale.set(1.25, 0.75, 0.45);
    wing.position.copy(at).add(new THREE.Vector3(side * 0.019, 0, 0));
    wing.rotation.z = side * 0.12;
    out.push(wing);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 12, 8), bow);
  knot.position.copy(at).add(new THREE.Vector3(0, 0, -0.003));
  out.push(knot);
  return out;
}

/**
 * Braces over the shirt: from the waistband up the front either side, over
 * the shoulders by the neck and down the back, `proud` of the trunk as the
 * shirt under them is.
 */
export function braces(
  rings: Ring[],
  mat: THREE.Material,
  neck: number,
  proud: (y: number) => number = hanging
): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const wide = 0.021;
  for (const side of [-1, 1]) {
    const path: { at: THREE.Vector3; normal: THREE.Vector3 }[] = [];
    const top = neck - 0.006;
    const across = (y: number) => 0.06 + 0.025 * ((y - WAIST) / (top - WAIST));
    const angle = (y: number, back: boolean) => {
      const a = roundTo(ringAt(rings, y), across(y));
      return back ? Math.PI / 2 - side * a : -Math.PI / 2 + side * a;
    };
    const on = (a: number, y: number) => onRing(ringAt(rings, y), a, proud(y) + 0.003);
    for (let k = 0; k <= 20; k++) {
      const y = WAIST + ((top - WAIST) * k) / 20;
      path.push(on(angle(y, false), y));
    }
    // over the shoulder, round the outside of the base of the neck
    const [a0, a1] = [angle(top, false), angle(top, true)];
    const toSide = side === 1 ? 0 : Math.PI;
    for (let k = 1; k < 12; k++) {
      const t = k / 12;
      const a = t < 0.5 ? a0 + (toSide - a0) * t * 2 : toSide + (a1 - toSide) * (t - 0.5) * 2;
      path.push(on(a, top + 0.004 * Math.sin(Math.PI * t)));
    }
    for (let k = 20; k >= 0; k--) {
      const y = WAIST + ((top - WAIST) * k) / 20;
      path.push(on(angle(y, true), y));
    }
    const pos: number[] = [];
    const index: number[] = [];
    const t = new THREE.Vector3();
    const across3 = new THREE.Vector3();
    path.forEach(({ at, normal }, i) => {
      const next = path[Math.min(path.length - 1, i + 1)].at;
      const prev = path[Math.max(0, i - 1)].at;
      t.subVectors(next, prev).normalize();
      across3
        .crossVectors(t, normal)
        .normalize()
        .multiplyScalar(wide / 2);
      pos.push(at.x + across3.x, at.y + across3.y, at.z + across3.z);
      pos.push(at.x - across3.x, at.y - across3.y, at.z - across3.z);
      if (i > 0) {
        const a = (i - 1) * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    out.push(meshOf(geo, bothSides(mat), 'braces'));
  }
  return out;
}

/** How wide a button-up's placket is down the front, and how many buttons are on it. */
const PLACKET = 0.032;
const BUTTONS = 6;
/** A button's radius. */
const BUTTON = 0.0052;

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
  surfaceNormals(shell.geometry);
  /** How far round from the middle of the front `x` metres across is at height `y`, radians. */
  const at = (x: number, y: number) => roundTo(ringAt(rings, y), x);
  // a narrow strip down the front, its own width at every height, over the shirt's folds
  const placketFrom = neck - 0.01;
  const placket = patch(
    rings,
    (y) => [-Math.PI / 2 - at(PLACKET / 2, y), -Math.PI / 2 + at(PLACKET / 2, y)],
    [HEM, placketFrom],
    (y) => hanging(y) + 0.0016,
    mat,
    undefined,
    Math.round((placketFrom - HEM) / 0.004),
    'placket'
  );
  fold(placket.geometry, rings);
  placket.geometry.computeVertexNormals();
  /** A point on the shirt `around` radians from the middle of the front, `y` up and `out` proud, in its folds. */
  const onShirt = (around: number, y: number, out: number) =>
    folded(rings, onRing(ringAt(rings, y), -Math.PI / 2 + around, out).at);
  const stitch = new THREE.MeshStandardMaterial({
    color: mat.color.clone().lerp(new THREE.Color('#000000'), 0.45),
    roughness: 0.9,
  });
  /** A line of stitching through `points`. */
  const seam = (points: THREE.Vector3[], name: string) =>
    meshOf(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length * 2, 0.0009, 4),
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
  // the placket's edges, stitched down from the collar to the hem, sunk a little into its folds
  for (const side of [-1, 1]) {
    const line: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const y = neck - 0.012 - ((neck - 0.012 - HEM - 0.004) * i) / 80;
      line.push(onShirt(side * at(PLACKET / 2 - 0.003, y), y, hanging(y) + 0.0022));
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
      },
      16,
      'collar point'
    );
    out.push(point);
    // and stitched round its edge, a little in from it
    const edge: THREE.Vector3[] = [];
    const lying = (d: number, drop: number) =>
      onRing(ringAt(rings, neck - drop), -Math.PI / 2 + side * d, 0.0115).at;
    for (let i = 0; i < COLLAR.length - 1; i++) {
      const [[d0, y0], [d1, y1]] = [COLLAR[i], COLLAR[i + 1]];
      for (let t = 0; t < 1; t += 0.125) edge.push(lying(d0 + (d1 - d0) * t, y0 + (y1 - y0) * t));
    }
    const [dl, yl] = COLLAR[COLLAR.length - 1];
    edge.push(lying(dl, yl));
    out.push(seam(edge, 'stitch'));
  }
  // the buttons, from the collar down, pearly against the cloth: each flat, sat on the highest
  // of the placket's folds under it
  const pearl = new THREE.MeshStandardMaterial({ color: '#ece6da', roughness: 0.35 });
  const disc = new THREE.CylinderGeometry(BUTTON, BUTTON, 0.0022, 14);
  const first = neck - 0.03;
  const last = HEM + 0.045;
  for (let i = 0; i < BUTTONS; i++) {
    const y = first - ((first - last) * i) / (BUTTONS - 1);
    const { at: centre, normal } = onRing(ringAt(rings, y), -Math.PI / 2, hanging(y) + 0.0016);
    let crest = -Infinity;
    for (let k = -4; k <= 4; k++) {
      const dy = (k / 4) * BUTTON;
      const cloth = onShirt(0, y + dy, hanging(y + dy) + 0.0016);
      crest = Math.max(crest, cloth.sub(centre).dot(normal));
    }
    const button = meshOf(disc, pearl, 'button');
    button.position.copy(centre).addScaledVector(normal, crest + 0.0013);
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
    fly.push(onRing(r, -Math.PI / 2 + roundTo(r, sideways), 0.0012).at);
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
