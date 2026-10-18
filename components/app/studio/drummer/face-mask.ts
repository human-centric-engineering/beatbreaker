import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bell, radiusAt } from '@/components/app/studio/drummer/parts';

/**
 * A mask over the face alone (experiment: the drummer view): a rigid shell
 * moulded on the head's own face and stood a few millimetres off it, cut to
 * an oval from the hairline to under the chin, with its paint drawn onto it.
 * The skull, the ears and the hair stay — the hair grows over its top edge
 * and hangs over its sides, as a real mask's strap and rim are hidden — and
 * the face under it (nose, lips, brows) is not built at all.
 *
 * Everything here is in the head's frame (`-z` forward, `+x` the drummer's
 * right, `y` up from the head's origin, the skull's centre 0.1 up).
 */

/** The paint's canvas spans this much of the face, metres: x across, y up from the head's origin. */
const SPAN_X = 0.18;
const SPAN_Y = 0.21;
const CANVAS = 512;

/** Where a point of the face falls on the paint's canvas, in pixels. */
export type FacePoint = (x: number, y: number) => [number, number];

export interface FaceMaskSpec {
  /** The mask's base colour, and how rough its finish is (0 gloss, 1 matte). */
  colour: string;
  roughness: number;
  /** The oval it is cut to, seen from the front: its centre's height and its half-width and half-height. */
  oval: { y: number; rx: number; ry: number };
  /** How far round the head it reaches: the least a point's normal may face forward (0 side-on, 1 straight ahead). */
  front: number;
  /** How far it stands off the face, metres. */
  standoff: number;
  /**
   * A hood over the whole head instead (the oval and `front` are then ignored),
   * down a tube round the neck to `neck` metres below the head's origin, its
   * paint on the face only.
   */
  hood?: { neck: number };
  /** A deep cloth cowl over the hood, in this colour: open round the face, peaked at the crown, draped over the shoulders. */
  cowl?: string;
  /** A straight moulded nose, standing `height` out at its tip, `width` across, from `top` down to `tip`. */
  nose?: { top: number; tip: number; width: number; height: number };
  /** The paint, drawn onto a canvas: `at` turns a point of the face into pixels, `px` is pixels a metre. */
  paint?: (ctx: CanvasRenderingContext2D, at: FacePoint, px: number) => void;
}

/** How far the moulded nose stands out at `(x, y)`: rising from its root to the tip, its underside cut flat. */
function noseAt(spec: NonNullable<FaceMaskSpec['nose']>, x: number, y: number): number {
  if (y > spec.top || y < spec.tip - 0.006) return 0;
  const along = y >= spec.tip ? (spec.top - y) / (spec.top - spec.tip) : 1 - (spec.tip - y) / 0.006;
  return spec.height * along ** 1.5 * bell(x / (spec.width / 2));
}

/** The paint, drawn once; null where there is no canvas (the tests run in Node). */
function paintTexture(spec: FaceMaskSpec): THREE.Texture | null {
  if (!spec.paint || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS;
  canvas.height = CANVAS;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = spec.colour;
  ctx.fillRect(0, 0, CANVAS, CANVAS);
  const at: FacePoint = (x, y) => [(0.5 + x / SPAN_X) * CANVAS, (1 - y / SPAN_Y) * CANVAS];
  spec.paint(ctx, at, CANVAS / SPAN_X);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * The mask, cut from `face` — the head's sculpted skull, already scaled and
 * placed in the head's frame — and stood off it along its normals.
 */
export function faceMask(face: THREE.BufferGeometry, spec: FaceMaskSpec): THREE.Mesh {
  // the skull's own smooth normals, so neighbouring triangles stand off it together
  const src = face.index ? face.toNonIndexed() : face.clone();
  const p = src.getAttribute('position');
  const n = src.getAttribute('normal');
  const inside = (i: number) => {
    const x = p.getX(i);
    const y = p.getY(i);
    const { oval } = spec;
    if (spec.hood) return true;
    return (
      -n.getZ(i) >= spec.front &&
      p.getZ(i) < 0 &&
      (x / oval.rx) ** 2 + ((y - oval.y) / oval.ry) ** 2 <= 1
    );
  };
  const pos: number[] = [];
  const uv: number[] = [];
  for (let t = 0; t < p.count; t += 3) {
    if (!(inside(t) && inside(t + 1) && inside(t + 2))) continue;
    // the back of a hood takes the canvas's top row, which no paint reaches — a whole triangle
    // at a time, so none straddles the face and the back and drags the paint between them
    const back = !!spec.hood && [t, t + 1, t + 2].some((i) => -n.getZ(i) < 0.3);
    for (let i = t; i < t + 3; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const out = spec.standoff;
      const nose = spec.nose ? noseAt(spec.nose, x, y) : 0;
      pos.push(x + n.getX(i) * out, y + n.getY(i) * out, p.getZ(i) + n.getZ(i) * out - nose);
      uv.push(0.5 + x / SPAN_X, back ? 0.999 : y / SPAN_Y);
    }
  }
  src.dispose();
  const cut = new THREE.BufferGeometry();
  cut.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  cut.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  // one smooth moulding, not a facet a triangle
  const geo = mergeVertices(cut, 1e-6);
  cut.dispose();
  geo.computeVertexNormals();
  const map = paintTexture(spec);
  const mat = new THREE.MeshStandardMaterial({
    color: map ? '#ffffff' : spec.colour,
    map,
    roughness: spec.roughness,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const mask = new THREE.Mesh(geo, mat);
  mask.name = 'mask';
  mask.castShadow = true;
  if (spec.hood) {
    // down from under the jaw round the neck, into the collar
    const plain = new THREE.MeshStandardMaterial({ color: spec.colour, roughness: spec.roughness });
    const neck = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.078, spec.hood.neck - 0.02),
          new THREE.Vector2(0.07, spec.hood.neck),
          new THREE.Vector2(0.06, spec.hood.neck + 0.03),
          new THREE.Vector2(0.056, -0.04),
          new THREE.Vector2(0.064, -0.01),
          new THREE.Vector2(0.074, 0.02),
        ],
        32
      ),
      plain
    );
    neck.scale.x = 0.9;
    neck.position.z = 0.01;
    neck.name = 'hood neck';
    mask.add(neck);
  }
  if (spec.cowl) mask.add(cowl(spec.cowl));
  return mask;
}

/** The cowl's outline, radius and height (head frame): the drape over the shoulders, up round the head to the crown. */
const COWL: [number, number][] = [
  [0.21, -0.24],
  [0.17, -0.15],
  [0.132, -0.06],
  [0.128, 0.0],
  [0.13, 0.08],
  [0.127, 0.16],
  [0.115, 0.22],
  [0.092, 0.27],
  [0.058, 0.3],
  [0.022, 0.316],
  [0.0, 0.32],
];
/** Deeper behind than it is wide; shallower in front, so its rim stands a little forward of the face. */
const COWL_DEEP = 1.12;
const COWL_FRONT = 0.95;
/** The opening round the face, seen from the front: its centre's height and its half-width and half-height. */
const OPENING = { y: 0.105, rx: 0.072, ry: 0.118 };

/**
 * A deep cowl of heavy cloth over a hood: open in an oval round the face, its
 * rim rolled and standing forward of it, its crown pulled back to a soft
 * point, widening below into a drape over the shoulders and down the back,
 * open at the front below the chin, with soft folds down it.
 */
function cowl(colour: string): THREE.Mesh {
  // the outline resampled finely, so the opening's cut runs smooth
  const rows: THREE.Vector2[] = [];
  for (let k = 0; k <= 90; k++) {
    const y = COWL[0][1] + ((COWL[COWL.length - 1][1] - COWL[0][1]) * k) / 90;
    rows.push(new THREE.Vector2(radiusAt(COWL, y), y));
  }
  const lathe = new THREE.LatheGeometry(rows, 120).toNonIndexed();
  const p = lathe.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const around = Math.atan2(v.x, v.z);
    // folds down the drape, deepest at the hem
    const fold = 0.01 * Math.sin(around * 6) * THREE.MathUtils.smoothstep(-v.y, 0.04, 0.24);
    const r = Math.hypot(v.x, v.z);
    if (r > 0) {
      v.x += (v.x / r) * fold;
      v.z += (v.z / r) * fold;
    }
    v.z *= v.z < 0 ? COWL_FRONT : COWL_DEEP;
    // the peak: the crown pulled back and up
    const peak = THREE.MathUtils.smoothstep(v.y, 0.24, 0.32);
    v.z += 0.03 * peak;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  // cut the face's opening, and the front below the chin, where it hangs open onto the chest
  const open = (i: number) => {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const face = z < 0 && (x / OPENING.rx) ** 2 + ((y - OPENING.y) / OPENING.ry) ** 2 < 1;
    const chest = z < -0.04 && y < 0.0 && Math.abs(x) < 0.11;
    return face || chest;
  };
  const kept: number[] = [];
  for (let t = 0; t < p.count; t += 3) {
    if (open(t) || open(t + 1) || open(t + 2)) continue;
    for (let i = t; i < t + 3; i++) kept.push(p.getX(i), p.getY(i), p.getZ(i));
  }
  lathe.dispose();
  const cut = new THREE.BufferGeometry();
  cut.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
  const geo = mergeVertices(cut, 1e-6);
  cut.dispose();
  geo.computeVertexNormals();
  const cloth = new THREE.MeshStandardMaterial({
    color: colour,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const o = new THREE.Mesh(geo, cloth);
  o.name = 'cowl';
  o.castShadow = true;
  // the rim rolled round the opening, on the cowl's surface
  const rim: THREE.Vector3[] = [];
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    const x = OPENING.rx * 1.04 * Math.cos(a);
    const y = OPENING.y + OPENING.ry * 1.03 * Math.sin(a);
    const r = radiusAt(COWL, y);
    rim.push(new THREE.Vector3(x, y, -Math.sqrt(Math.max(0, r * r - x * x)) * COWL_FRONT));
  }
  o.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true), 96, 0.008, 8, true),
      cloth
    )
  );
  return o;
}

/** A soft-edged stroke of paint through `points`, `width` metres wide, tapering to `end` at its tip. */
function stroke(
  ctx: CanvasRenderingContext2D,
  at: FacePoint,
  px: number,
  points: [number, number][],
  width: number,
  end: number,
  colour: string
): void {
  ctx.fillStyle = colour;
  // one path of every dab, filled once: a filter (the soft edge) is paid per fill, not per dab
  ctx.beginPath();
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    // dabs close enough to overlap, however thin the stroke
    const n = Math.max(8, Math.ceil((Math.hypot(x1 - x0, y1 - y0) / Math.max(end, 0.0008)) * 3));
    for (let s = 0; s <= n; s++) {
      const f = (i + s / n) / (points.length - 1);
      const [cx, cy] = at(x0 + ((x1 - x0) * s) / n, y0 + ((y1 - y0) * s) / n);
      const r = ((width + (end - width) * f) / 2) * px;
      ctx.moveTo(cx + r, cy);
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }
  ctx.fill('nonzero');
}

const PAINT_BLACK = '#0e0c0d';
const PAINT_RED = '#5e1216';

/**
 * Joey Jordison's mask on the Iowa tour (London Arena, February 2002): a white
 * kabuki face, calm and closed-lipped, with a straight nose; black smeared round
 * the eyes, four stripes up the brow over each — the outer two a dried-blood red
 * — three drips down each cheek, the middle one red, and black lips.
 */
export const JORDISON_MASK: FaceMaskSpec = {
  colour: '#ece8de',
  roughness: 0.55,
  oval: { y: 0.108, rx: 0.08, ry: 0.104 },
  front: 0.3,
  standoff: 0.005,
  nose: { top: 0.128, tip: 0.08, width: 0.012, height: 0.014 },
  paint: (ctx, at, px) => {
    ctx.filter = 'blur(1.5px)';
    for (const side of [-1, 1]) {
      // the smear round each eye, heavier and dragged down at its outer corner
      ctx.fillStyle = PAINT_BLACK;
      const ring: [number, number][] = [
        [0.011, 0.117],
        [0.014, 0.125],
        [0.022, 0.128],
        [0.03, 0.126],
        [0.037, 0.13],
        [0.045, 0.127],
        [0.052, 0.12],
        [0.054, 0.107],
        [0.049, 0.098],
        [0.041, 0.101],
        [0.032, 0.102],
        [0.021, 0.104],
        [0.013, 0.108],
      ];
      outline(
        ctx,
        at,
        ring.map(([x, y]) => [side * x, y])
      );
      ctx.fill();
      // four stripes up the brow, combed outward, the outer two red
      const tops = [0.164, 0.174, 0.17, 0.16];
      tops.forEach((top, i) => {
        const x = 0.018 + i * 0.008;
        stroke(
          ctx,
          at,
          px,
          [
            [side * x, 0.122],
            [side * (x + 0.0015), (0.122 + top) / 2],
            [side * (x + 0.003), top],
          ],
          0.0035,
          0.0018,
          i < 2 ? PAINT_BLACK : PAINT_RED
        );
      });
      // three drips down the cheek, the middle one red
      const drips: [number, number, string][] = [
        [0.024, 0.064, PAINT_BLACK],
        [0.033, 0.058, PAINT_RED],
        [0.043, 0.07, PAINT_BLACK],
      ];
      for (const [x, end, colour] of drips) {
        const wave = (y: number) => side * (x + 0.0008 * Math.sin(y * 900));
        stroke(
          ctx,
          at,
          px,
          [
            [wave(0.104), 0.104],
            [wave(0.09), 0.09],
            [wave(0.076), 0.076],
            [wave(end), end],
          ],
          0.003,
          0.0024,
          colour
        );
        const [cx, cy] = at(wave(end), end);
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(cx, cy, 0.002 * px, 0, Math.PI * 2);
        ctx.fill();
      }
      // the eye hole, dark inside the smear
      const [ex, ey] = at(side * 0.032, 0.116);
      ctx.fillStyle = '#050405';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 0.012 * px, 0.0045 * px, side * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    // black lips, thin and closed, pointed at the corners
    ctx.fillStyle = PAINT_BLACK;
    ctx.beginPath();
    const lip = (x: number, y: number) => at(x, y);
    ctx.moveTo(...lip(-0.018, 0.052));
    ctx.quadraticCurveTo(...lip(-0.006, 0.057), ...lip(0, 0.055));
    ctx.quadraticCurveTo(...lip(0.006, 0.057), ...lip(0.018, 0.052));
    ctx.quadraticCurveTo(...lip(0, 0.045), ...lip(-0.018, 0.052));
    ctx.fill();
    ctx.filter = 'none';
    ctx.strokeStyle = '#050405';
    ctx.lineWidth = 0.0012 * px;
    ctx.beginPath();
    ctx.moveTo(...lip(-0.015, 0.052));
    ctx.lineTo(...lip(0.015, 0.052));
    ctx.stroke();
  },
};

const HOOD_WHITE = '#ecebe6';

/**
 * Skinny's hood in 2002 (Mushroomhead's XX year): black latex over the whole
 * head and down the neck, a soft nose under it, and the band's X face painted
 * on in white — a clawed X over each eye, the eye in its crossing, and seven
 * tapering teeth across the mouth and chin.
 */
export const SKINNY_HOOD: FaceMaskSpec = {
  colour: '#141416',
  roughness: 0.5,
  oval: { y: 0.1, rx: 1, ry: 1 },
  front: -1,
  standoff: 0.004,
  hood: { neck: -0.1 },
  nose: { top: 0.12, tip: 0.075, width: 0.022, height: 0.014 },
  paint: (ctx, at, px) => {
    ctx.filter = 'blur(1px)';
    for (const side of [-1, 1]) {
      const [cx, cy] = [side * 0.032, 0.115];
      // each arm a curved slash from the crossing, thinning to a point and hooked outward at its end
      const arms: [number, number][] = [
        [side * 0.01, 0.14],
        [side * 0.055, 0.142],
        [side * 0.012, 0.09],
        [side * 0.058, 0.088],
      ];
      for (const [x, y] of arms) {
        const dx = x - cx;
        const dy = y - cy;
        const hook: [number, number] = [x + Math.sign(x - cx) * 0.004, y + Math.sign(dy) * 0.002];
        stroke(
          ctx,
          at,
          px,
          [[cx, cy], [cx + dx * 0.55 - dy * 0.08, cy + dy * 0.55 + dx * 0.08], [x, y], hook],
          0.01,
          0.0015,
          HOOD_WHITE
        );
      }
      // the eye's mesh, dark in the crossing
      const [ex, ey] = at(cx, cy);
      ctx.fillStyle = '#060607';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 0.011 * px, 0.005 * px, side * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    // seven teeth hanging from under the nose, the middle ones longest, each to a point
    const lengths = [0.04, 0.052, 0.06, 0.064, 0.06, 0.052, 0.04];
    lengths.forEach((len, i) => {
      const x = -0.036 + i * 0.012;
      const top = 0.058 - 0.004 * (x / 0.04) ** 2;
      stroke(
        ctx,
        at,
        px,
        [
          [x, top],
          [x * 0.98, top - len * 0.6],
          [x * 0.95, top - len],
        ],
        0.007,
        0.001,
        HOOD_WHITE
      );
    });
    ctx.filter = 'none';
  },
};

const BONE_WHITE = '#d3ccbc';

/**
 * II's mask in Drumeo's offering (December 2023, "his old mask"): a close
 * black cloth hood over the whole head, and on its face a flat, pale plate cut
 * in an open filigree — an arch over the nose with a spike and rays standing
 * from it, a black hole under it, an X over the mouth, the eyes outlined and
 * swept up to points at the temples, an edge down each side and four bars down
 * each cheek — under a deep black cowl.
 */
export const SLEEPTOKEN_MASK: FaceMaskSpec = {
  colour: '#141214',
  roughness: 0.92,
  oval: { y: 0.1, rx: 1, ry: 1 },
  front: -1,
  standoff: 0.003,
  hood: { neck: -0.1 },
  nose: { top: 0.12, tip: 0.076, width: 0.022, height: 0.012 },
  cowl: '#1a181b',
  paint: (ctx, at, px) => {
    ctx.filter = 'blur(0.6px)';
    const band = (points: [number, number][], width: number, end = 0.001) =>
      stroke(ctx, at, px, points, width, end, BONE_WHITE);
    // the black hole under the arch, a rounded heart upside down, and the band of bone round it
    ctx.fillStyle = '#060507';
    ctx.beginPath();
    ctx.moveTo(...at(0, 0.074));
    ctx.bezierCurveTo(...at(0.012, 0.08), ...at(0.018, 0.096), ...at(0.008, 0.1));
    ctx.quadraticCurveTo(...at(0, 0.101), ...at(-0.008, 0.1));
    ctx.bezierCurveTo(...at(-0.018, 0.096), ...at(-0.012, 0.08), ...at(0, 0.074));
    ctx.fill();
    for (const s of [-1, 1]) {
      band(
        [
          [s * 0.017, 0.097],
          [s * 0.019, 0.088],
          [s * 0.01, 0.077],
          [s * 0.002, 0.071],
        ],
        0.004,
        0.004
      );
      // the arch over the nose, up to its top
      band(
        [
          [s * 0.017, 0.097],
          [s * 0.016, 0.106],
          [s * 0.01, 0.113],
          [0, 0.116],
        ],
        0.005,
        0.005
      );
      // the rays from the arch's top
      band(
        [
          [s * 0.009, 0.117],
          [s * 0.014, 0.127],
        ],
        0.004
      );
      band(
        [
          [s * 0.015, 0.111],
          [s * 0.024, 0.117],
        ],
        0.0035
      );
      // the X over the mouth
      band(
        [
          [s * 0.018, 0.079],
          [-s * 0.017, 0.04],
        ],
        0.005,
        0.004
      );
      // the eye's hole, and its borders: over it and up to the temple's point, and under it
      const [ex, ey] = at(s * 0.032, 0.114);
      ctx.fillStyle = '#060507';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 0.012 * px, 0.006 * px, -s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      band(
        [
          [s * 0.014, 0.111],
          [s * 0.022, 0.121],
          [s * 0.032, 0.125],
          [s * 0.045, 0.131],
          [s * 0.056, 0.146],
        ],
        0.005
      );
      band(
        [
          [s * 0.016, 0.105],
          [s * 0.032, 0.101],
          [s * 0.05, 0.106],
        ],
        0.004,
        0.003
      );
      // the outer edge, from the temple's point down the side of the face to a point
      band(
        [
          [s * 0.056, 0.146],
          [s * 0.058, 0.12],
          [s * 0.055, 0.08],
          [s * 0.046, 0.042],
        ],
        0.005
      );
      // four bars down the cheek, the inner ones longest, leaning in a little to the jaw
      const bars: [number, number, number][] = [
        [0.021, 0.1, 0.033],
        [0.028, 0.101, 0.035],
        [0.036, 0.101, 0.04],
        [0.044, 0.103, 0.045],
      ];
      for (const [x, top, bottom] of bars)
        band(
          [
            [s * x, top],
            [s * x * 0.975, (top + bottom) / 2],
            [s * x * 0.95, bottom],
          ],
          0.0045
        );
    }
    // the spike, standing from the arch's top to between the brows
    band(
      [
        [0, 0.119],
        [0, 0.128],
        [0, 0.137],
      ],
      0.005
    );
    ctx.filter = 'none';
  },
};

/** A smooth closed outline through `points` (metres, head frame), as a brush would leave it. */
function outline(ctx: CanvasRenderingContext2D, at: FacePoint, points: [number, number][]): void {
  const mid = (i: number): [number, number] => {
    const [a, b] = [points[i % points.length], points[(i + 1) % points.length]];
    return at((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  };
  ctx.beginPath();
  ctx.moveTo(...mid(0));
  for (let i = 1; i <= points.length; i++) {
    const [x, y] = points[i % points.length];
    ctx.quadraticCurveTo(...at(x, y), ...mid(i));
  }
  ctx.closePath();
}

const LOCUST_OLIVE = '#6e6b4f';

/**
 * The Locust's hood in 2003 (Gabe Serbian at Hellfest, touring Plague
 * Soundscapes): olive stretch canvas over the whole head and down the neck, a
 * seam up the middle; across the eyes two teardrops of black fishnet, their
 * points nearly meeting over the nose and their round ends swept up onto the
 * temples, the cloth folded over at their rims; and a D of a mouth, worn open,
 * the lips showing through it.
 */
export const LOCUST_HOOD: FaceMaskSpec = {
  colour: LOCUST_OLIVE,
  roughness: 0.95,
  oval: { y: 0.1, rx: 1, ry: 1 },
  front: -1,
  standoff: 0.004,
  hood: { neck: -0.1 },
  nose: { top: 0.12, tip: 0.076, width: 0.022, height: 0.011 },
  paint: (ctx, at, px) => {
    // the seam up the middle of the face to the crown
    ctx.strokeStyle = '#55533c';
    ctx.lineWidth = 0.0012 * px;
    ctx.beginPath();
    ctx.moveTo(...at(0, 0.145));
    ctx.lineTo(...at(0, 0.2));
    ctx.stroke();
    for (const s of [-1, 1]) {
      const lobe: [number, number][] = [
        [s * 0.007, 0.104],
        [s * 0.024, 0.098],
        [s * 0.048, 0.106],
        [s * 0.058, 0.124],
        [s * 0.05, 0.14],
        [s * 0.028, 0.139],
        [s * 0.012, 0.122],
      ];
      // the dark behind the net, a shade of eye at its middle
      outline(ctx, at, lobe);
      ctx.fillStyle = '#151513';
      ctx.fill();
      ctx.save();
      ctx.clip();
      const [ex, ey] = at(s * 0.032, 0.118);
      const eye = ctx.createRadialGradient(ex, ey, 0, ex, ey, 0.014 * px);
      eye.addColorStop(0, 'rgba(58, 47, 42, 0.5)');
      eye.addColorStop(1, 'rgba(58, 47, 42, 0)');
      ctx.fillStyle = eye;
      ctx.fillRect(ex - 0.02 * px, ey - 0.02 * px, 0.04 * px, 0.04 * px);
      // the fishnet: diamonds, lines at either diagonal
      ctx.strokeStyle = '#2e2d28';
      ctx.lineWidth = 0.0006 * px;
      ctx.beginPath();
      const step = 0.0035 * px;
      const [x0, y0] = at(s < 0 ? -0.07 : 0, 0.15);
      const span = 0.08 * px;
      for (let k = -span; k <= span; k += step) {
        ctx.moveTo(x0 + k, y0);
        ctx.lineTo(x0 + k + span, y0 + span);
        ctx.moveTo(x0 + k, y0);
        ctx.lineTo(x0 + k - span, y0 + span);
      }
      ctx.stroke();
      ctx.restore();
      // the cloth folded over the mesh at its rim
      outline(ctx, at, lobe);
      ctx.strokeStyle = '#4b4935';
      ctx.lineWidth = 0.0018 * px;
      ctx.stroke();
    }
    // the mouth, a D lying flat side up, worn open: the lips, parted, through it
    const mouth: [number, number][] = [
      [-0.017, 0.06],
      [0.017, 0.06],
      [0.016, 0.049],
      [0.008, 0.04],
      [-0.008, 0.04],
      [-0.016, 0.049],
    ];
    outline(ctx, at, mouth);
    ctx.fillStyle = '#b97f6c';
    ctx.fill();
    ctx.fillStyle = '#2a1513';
    const [mx, my] = at(0, 0.05);
    ctx.beginPath();
    ctx.ellipse(mx, my, 0.01 * px, 0.0025 * px, 0, 0, Math.PI * 2);
    ctx.fill();
    outline(ctx, at, mouth);
    ctx.strokeStyle = '#4b4935';
    ctx.lineWidth = 0.002 * px;
    ctx.stroke();
  },
};
