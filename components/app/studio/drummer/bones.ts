import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The bones of the skeleton drummer, as shapes (experiment: the drummer view).
 *
 * Each bone is built once, at its real size, in its own frame — and placed
 * whole every frame, never stretched. A limb bone's frame is the same for
 * every one: `y` down the bone from the joint it hangs from (0) to the next,
 * `x` out to the side (lateral), `z = x × y` (anterior, for a limb hanging in
 * the anatomical position). They are built for the right side; the left is
 * the mirror of it ({@link mirrored}).
 *
 * Shapes are drawn from the anatomy (Gray's; Standring, *Gray's Anatomy*,
 * 42nd ed.) at the size a 1.78 m man's are — lathed shafts, flared ends,
 * condyles where the joints turn — detailed enough to read as the bone it
 * is from a metre away and when the camera is down at the hands, and no
 * more: about two hundred meshes for the whole figure.
 */

/** Points round a lathe or a tube. */
const AROUND = 14;

/** Drop the attributes the merged bones don't share, so any two can be merged. */
function plain(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(geo.attributes)) {
    if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
  }
  if (!geo.getAttribute('normal')) geo.computeVertexNormals();
  return geo;
}

/** Many shapes as one geometry, for one mesh. */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts.map(plain), false);
  if (!merged) throw new Error('bone parts did not merge');
  return merged;
}

/** A shape turned about `y`: `[radius, y]` pairs, top to bottom or bottom to top. */
export function lathe(profile: [number, number][], around = AROUND): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)),
    around
  );
}

/** An ellipsoid with semi-axes `x`, `y`, `z`, centred at `at`. */
export function blob(
  x: number,
  y: number,
  z: number,
  at: [number, number, number] = [0, 0, 0],
  segments = 12
): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, segments, Math.max(6, Math.round(segments * 0.7)));
  g.scale(x, y, z);
  g.translate(...at);
  return g;
}

/**
 * A tube along a smooth curve through `points`, its cross-section an ellipse
 * of half-widths `r(t)` (across the curve's side) and `r(t) * flat` (across
 * its normal), `t` running 0–1 along it. The ends are capped.
 */
export function tube(
  points: THREE.Vector3[],
  r: number | ((t: number) => number),
  flat = 1,
  steps = 20,
  around = 10,
  up = new THREE.Vector3(0, 1, 0)
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const radius = typeof r === 'number' ? () => r : r;
  const pos: number[] = [];
  const index: number[] = [];
  const at = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const side = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    curve.getPointAt(t, at);
    curve.getTangentAt(t, tan);
    // a frame that doesn't twist: `up` made square to the curve
    nrm.copy(up).addScaledVector(tan, -up.dot(tan));
    if (nrm.lengthSq() < 1e-8) nrm.set(1, 0, 0).addScaledVector(tan, -tan.x);
    nrm.normalize();
    side.crossVectors(tan, nrm).normalize();
    const rr = radius(t);
    for (let k = 0; k < around; k++) {
      const a = (k / around) * Math.PI * 2;
      pos.push(
        at.x + side.x * Math.cos(a) * rr + nrm.x * Math.sin(a) * rr * flat,
        at.y + side.y * Math.cos(a) * rr + nrm.y * Math.sin(a) * rr * flat,
        at.z + side.z * Math.cos(a) * rr + nrm.z * Math.sin(a) * rr * flat
      );
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let k = 0; k < around; k++) {
      const a = i * around + k;
      const b = i * around + ((k + 1) % around);
      index.push(a, b, a + around, b, b + around, a + around);
    }
  }
  for (const [ring, out] of [
    [0, false],
    [steps, true],
  ] as const) {
    const c = pos.length / 3;
    curve.getPointAt(ring / steps, at);
    pos.push(at.x, at.y, at.z);
    for (let k = 0; k < around; k++) {
      const a = ring * around + k;
      const b = ring * around + ((k + 1) % around);
      if (out) index.push(a, b, c);
      else index.push(b, a, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** A flat plate: `outline` (in `x`, `y`) given `depth` along `z`, centred on it, its edges rounded off. */
export function plate(outline: [number, number][], depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const bevel = Math.min(depth * 0.45, 0.003);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1e-4, depth - 2 * bevel),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  g.translate(0, 0, -depth / 2 + bevel);
  return g;
}

/** The mirror of a right-side bone, for the left: `x` flipped and the faces turned back outward. */
export function mirrored(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.clone();
  g.scale(-1, 1, 1);
  const pos = g.getAttribute('position');
  if (g.index) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = t;
    }
    g.index.needsUpdate = true;
  } else {
    // swap the second and third corner of every triangle
    for (let i = 0; i < pos.count; i += 3) {
      for (let c = 0; c < 3; c++) {
        const a = pos.getComponent(i + 1, c);
        pos.setComponent(i + 1, c, pos.getComponent(i + 2, c));
        pos.setComponent(i + 2, c, a);
      }
    }
    pos.needsUpdate = true;
  }
  g.computeVertexNormals();
  return g;
}

/* ---- the arm --------------------------------------------------------- */

/**
 * The humerus, shoulder joint (0) to elbow (`length`): the head a ball in the
 * glenoid, turned in and back; the greater tubercle out to the side of it;
 * the shaft, round above and three-sided below; and the elbow's end, wide and
 * flat — the spool of the trochlea inside, the ball of the capitellum outside,
 * an epicondyle beyond each, and the olecranon's hollow behind.
 */
export function humerus(length: number): THREE.BufferGeometry {
  const L = length;
  return merge([
    blob(0.023, 0.024, 0.023, [-0.006, -0.002, -0.004]),
    blob(0.012, 0.016, 0.012, [0.014, 0.008, 0.004]),
    blob(0.008, 0.012, 0.008, [0.004, 0.006, 0.016]),
    lathe([
      [0.016, 0.02],
      [0.0125, 0.06],
      [0.011, 0.12],
      [0.0105, 0.18],
      [0.0115, L - 0.07],
      [0.0135, L - 0.04],
      [0.01, L - 0.02],
    ]).translate(0, 0, 0),
    // flattened and widening to the epicondyles
    blob(0.026, 0.024, 0.0095, [0, L - 0.028, 0.001]),
    blob(0.0085, 0.0085, 0.0075, [0.03, L - 0.01, -0.002]),
    blob(0.0095, 0.009, 0.008, [-0.034, L - 0.008, -0.003]),
    // the trochlea, a spool across the elbow's axis, inside
    new THREE.CylinderGeometry(0.0105, 0.0105, 0.022, 14)
      .rotateZ(Math.PI / 2)
      .translate(-0.012, L, 0),
    blob(0.0055, 0.0125, 0.0125, [-0.024, L, 0]),
    blob(0.0055, 0.0125, 0.0125, [-0.001, L, 0]),
    // the capitellum, a ball for the head of the radius, outside and in front
    blob(0.0105, 0.0105, 0.0105, [0.013, L, 0.003]),
  ]);
}

/**
 * The ulna, elbow (0) down to the wrist: hooked round the back of the
 * trochlea by the olecranon, the coronoid under it in front, then a shaft
 * that thins all the way to a small round head at the little finger's side,
 * and the styloid behind that. Laid along `y` with its own axis at `x`, the
 * trochlea's middle, so the elbow's hinge is the origin.
 */
export function ulna(length: number): THREE.BufferGeometry {
  const L = length - 0.012;
  return merge([
    // the olecranon, the point of the elbow
    blob(0.011, 0.016, 0.01, [-0.012, -0.012, -0.013]),
    blob(0.009, 0.009, 0.009, [-0.012, 0.004, 0.011]),
    tube(
      [
        new THREE.Vector3(-0.012, -0.004, -0.008),
        new THREE.Vector3(-0.012, 0.03, -0.004),
        new THREE.Vector3(-0.011, 0.12, -0.003),
        new THREE.Vector3(-0.012, L - 0.03, -0.002),
        new THREE.Vector3(-0.012, L, -0.003),
      ],
      (t) => 0.0095 - 0.0045 * t,
      0.8,
      16,
      10,
      new THREE.Vector3(0, 0, 1)
    ),
    blob(0.0078, 0.008, 0.0078, [-0.012, L, -0.003]),
    blob(0.0028, 0.006, 0.0028, [-0.017, L + 0.006, -0.006]),
  ]);
}

/**
 * The radius, a straight rod at the elbow (0) — its head a shallow disc
 * turning on the capitellum — bowing out down the forearm to the broad end
 * that carries the wrist. Its own frame: `y` down its axis, and the distal
 * end laid out to `+x` (the thumb's side), so it can be turned about `y` as
 * the forearm pronates.
 */
export function radius(length: number): THREE.BufferGeometry {
  const L = length;
  return merge([
    new THREE.CylinderGeometry(0.011, 0.0105, 0.008, 16).translate(0, 0.002, 0),
    lathe([
      [0.0065, 0.006],
      [0.0055, 0.02],
      [0.0075, 0.035],
    ]),
    tube(
      [
        new THREE.Vector3(0, 0.03, 0),
        new THREE.Vector3(0.004, 0.1, 0),
        new THREE.Vector3(0.006, 0.17, 0.001),
        new THREE.Vector3(0.006, L - 0.04, 0.001),
      ],
      (t) => 0.0065 + 0.0035 * t,
      0.8,
      14,
      10,
      new THREE.Vector3(0, 0, 1)
    ),
    // the broad distal end and its styloid, toward the thumb
    blob(0.014, 0.017, 0.0095, [0.005, L - 0.016, 0.001]),
    blob(0.0045, 0.008, 0.0045, [0.017, L - 0.006, 0]),
  ]);
}

/**
 * The clavicle along `+x` from the sternum (0) to the acromion (`length`):
 * the S of it — forward-convex by the sternum, back-convex by the shoulder —
 * round at the inner end and flat at the outer.
 */
export function clavicle(length: number): THREE.BufferGeometry {
  const L = length;
  return tube(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(L * 0.3, 0.002, -0.012),
      new THREE.Vector3(L * 0.62, 0.004, -0.006),
      new THREE.Vector3(L * 0.86, 0.004, 0.01),
      new THREE.Vector3(L, 0.002, 0.016),
    ],
    (t) => (t < 0.1 ? 0.009 : 0.0072 - 0.001 * t),
    0.75,
    18,
    10,
    new THREE.Vector3(0, 1, 0)
  );
}

/**
 * The right scapula, from the glenoid (the origin, facing out to `+x` and a
 * little forward): a triangular blade lying back and in across the ribs, the
 * spine ridged across its back up to the acromion over the joint, and the
 * coracoid hooked forward under the clavicle.
 */
export function scapula(): THREE.BufferGeometry {
  // the blade in its own plane, then laid back against the ribs
  const blade = plate(
    [
      [-0.012, 0.024],
      [-0.06, 0.03],
      [-0.1, 0.022],
      [-0.104, -0.04],
      [-0.095, -0.1],
      [-0.075, -0.132],
      [-0.03, -0.045],
      [-0.012, -0.018],
    ],
    0.006
  );
  blade.rotateY(0.5);
  blade.translate(-0.006, 0, 0.012);
  const spine = tube(
    [
      new THREE.Vector3(-0.088, 0.012, 0.064),
      new THREE.Vector3(-0.05, 0.022, 0.05),
      new THREE.Vector3(-0.012, 0.03, 0.03),
      new THREE.Vector3(0.012, 0.034, 0.012),
    ],
    (t) => 0.0045 + 0.002 * t,
    1.6,
    14,
    8,
    new THREE.Vector3(0, 0, 1)
  );
  return merge([
    blade,
    spine,
    // the acromion, roofing the shoulder joint
    blob(0.018, 0.0055, 0.013, [0.016, 0.034, 0.002]),
    // the glenoid: a shallow pear-shaped socket
    blob(0.005, 0.017, 0.012, [0.0, 0, 0]),
    // the coracoid, forward under the clavicle
    tube(
      [
        new THREE.Vector3(-0.008, 0.022, -0.004),
        new THREE.Vector3(-0.004, 0.03, -0.022),
        new THREE.Vector3(0.006, 0.026, -0.036),
      ],
      0.0045,
      1,
      8,
      8
    ),
  ]);
}

/* ---- the hand -------------------------------------------------------- */

/** The carpals of the right hand, in the hand's frame (`z` to the knuckles, `y` the back, `x` the thumb). */
export const CARPALS: {
  name: string;
  at: [number, number, number];
  size: [number, number, number];
}[] = [
  // the proximal row, against the radius
  { name: 'scaphoid', at: [0.012, -0.002, -0.006], size: [0.0055, 0.0045, 0.0085] },
  { name: 'lunate', at: [0.0, -0.001, -0.008], size: [0.0052, 0.005, 0.0055] },
  { name: 'triquetrum', at: [-0.011, -0.001, -0.005], size: [0.0045, 0.0045, 0.005] },
  { name: 'pisiform', at: [-0.013, -0.008, -0.002], size: [0.0032, 0.0032, 0.0036] },
  // the distal row, under the metacarpals
  { name: 'trapezium', at: [0.018, -0.005, 0.01], size: [0.0055, 0.005, 0.006] },
  { name: 'trapezoid', at: [0.009, 0.0, 0.012], size: [0.0042, 0.0045, 0.0048] },
  { name: 'capitate', at: [-0.001, -0.001, 0.009], size: [0.005, 0.0055, 0.0085] },
  { name: 'hamate', at: [-0.011, -0.001, 0.01], size: [0.005, 0.0052, 0.0065] },
];

/** The hook of the hamate, standing out of the palm. */
export const HAMATE_HOOK: [number, number, number] = [-0.011, -0.007, 0.012];

/**
 * A long bone of the hand — metacarpal or phalanx — along `+z` from its base
 * (0) to its head (`length`): a broad base, a waisted shaft and a head of two
 * small condyles (or, at a finger's end, the flat tuft under the nail).
 */
export function handBone(length: number, width: number, end = false): THREE.BufferGeometry {
  const L = length;
  const w = width;
  const parts = [
    blob(w * 0.72, w * 0.6, w * 0.62, [0, 0, w * 0.45]),
    tube(
      [
        new THREE.Vector3(0, 0, w * 0.5),
        new THREE.Vector3(0, w * 0.05, L * 0.5),
        new THREE.Vector3(0, 0, L - w * 0.45),
      ],
      (t) => w * (0.46 - 0.1 * Math.sin(Math.PI * t)),
      0.85,
      8,
      10,
      new THREE.Vector3(0, 1, 0)
    ),
  ];
  if (end) {
    // the tuft: a little spade under the nail
    parts.push(blob(w * 0.6, w * 0.32, w * 0.45, [0, -w * 0.06, L - w * 0.4]));
  } else {
    parts.push(
      blob(w * 0.34, w * 0.52, w * 0.5, [w * 0.27, -w * 0.04, L - w * 0.42]),
      blob(w * 0.34, w * 0.52, w * 0.5, [-w * 0.27, -w * 0.04, L - w * 0.42])
    );
  }
  return merge(parts);
}

/* ---- the trunk ------------------------------------------------------- */

export type Region = 'cervical' | 'thoracic' | 'lumbar';

/**
 * A vertebra, its body centred on the origin (`y` up the spine, `+z` back): a
 * drum of a body, the arch of the canal behind it, a spinous process off the
 * back and a transverse process to either side. The proportions change down
 * the spine: small and wide with a short forked spine in the neck; heart-shaped
 * with long spines sloping down, and facets for the ribs, in the chest; big
 * kidney-shaped bodies with square spines and long thin transverse processes
 * in the small of the back.
 */
export function vertebra(region: Region, scale: number, height: number): THREE.BufferGeometry {
  const s = scale;
  const h = height;
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.CylinderGeometry(1, 1, h, 18);
  if (region === 'lumbar') body.scale(0.024 * s, 1, 0.017 * s);
  else if (region === 'thoracic') body.scale(0.016 * s, 1, 0.014 * s);
  else body.scale(0.0115 * s, 1, 0.0085 * s);
  parts.push(body);
  const depth = region === 'lumbar' ? 0.017 : region === 'thoracic' ? 0.014 : 0.0085;
  // the arch round the canal
  const canal = region === 'cervical' ? 0.0085 : region === 'thoracic' ? 0.0075 : 0.0085;
  const arch = new THREE.TorusGeometry(canal * s, 0.0032 * s, 6, 14, Math.PI);
  arch.rotateX(Math.PI / 2);
  arch.translate(0, 0, (depth + canal) * s);
  parts.push(arch);
  const back = (depth + 2 * canal) * s;
  if (region === 'cervical') {
    parts.push(
      blob(0.0035 * s, 0.003 * s, 0.009 * s, [0.004 * s, -0.002 * s, back + 0.006 * s]),
      blob(0.0035 * s, 0.003 * s, 0.009 * s, [-0.004 * s, -0.002 * s, back + 0.006 * s]),
      blob(0.012 * s, 0.003 * s, 0.004 * s, [0.014 * s, 0, 0.004 * s]),
      blob(0.012 * s, 0.003 * s, 0.004 * s, [-0.014 * s, 0, 0.004 * s])
    );
  } else if (region === 'thoracic') {
    parts.push(
      tube(
        [
          new THREE.Vector3(0, 0, back - 0.004 * s),
          new THREE.Vector3(0, -0.012 * s, back + 0.012 * s),
          new THREE.Vector3(0, -0.026 * s, back + 0.022 * s),
        ],
        (t) => 0.0035 * s * (1 - 0.4 * t),
        1.4,
        8,
        8,
        new THREE.Vector3(0, 0, 1)
      ),
      blob(0.014 * s, 0.0035 * s, 0.0045 * s, [0.016 * s, 0.002 * s, back - 0.006 * s]),
      blob(0.014 * s, 0.0035 * s, 0.0045 * s, [-0.016 * s, 0.002 * s, back - 0.006 * s])
    );
  } else {
    parts.push(
      blob(0.0035 * s, 0.009 * s, 0.014 * s, [0, -0.002 * s, back + 0.01 * s]),
      blob(0.02 * s, 0.0035 * s, 0.0035 * s, [0.026 * s, 0, back - 0.014 * s]),
      blob(0.02 * s, 0.0035 * s, 0.0035 * s, [-0.026 * s, 0, back - 0.014 * s])
    );
  }
  return merge(parts);
}

/**
 * The sacrum and coccyx, from the top of the sacrum (the origin, `+z` back):
 * a curved wedge sloping back and down, wide where the hip bones meet it,
 * narrowing to the tailbone tucked forward under it.
 */
export function sacrum(): THREE.BufferGeometry {
  const wedge = plate(
    [
      [-0.05, 0],
      [0.05, 0],
      [0.042, -0.04],
      [0.022, -0.085],
      [0.008, -0.105],
      [-0.008, -0.105],
      [-0.022, -0.085],
      [-0.042, -0.04],
    ],
    0.02
  );
  // curved back on itself, concave in front
  const pos = wedge.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setZ(i, pos.getZ(i) + 0.01 - 0.12 * y + 0.9 * y * y);
  }
  wedge.computeVertexNormals();
  const coccyx = [0, 1, 2, 3].map((k) =>
    blob(0.008 - 0.0015 * k, 0.005, 0.006, [0, -0.112 - 0.01 * k, 0.032 - 0.007 * k])
  );
  return merge([wedge, ...coccyx]);
}

/**
 * The right hip bone (os coxae), in the pelvis's frame — its origin midway
 * between the hip joints, `+z` back — built round the hip socket at `hip`: the
 * ilium's wing flaring up and out behind, its crest rolled along the top; the
 * ischium down and back to the tuberosity a seated body rests on; and the
 * pubic rami round the obturator foramen to the symphysis in front.
 */
export function hipBone(hip: [number, number, number]): THREE.BufferGeometry {
  const [hx, hy, hz] = hip;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(hx + x, hy + y, hz + z);
  // the iliac crest, front to back: the anterior superior spine, the tubercle,
  // the top of the crest, and round to the posterior superior spine by the sacrum
  const crest = new THREE.CatmullRomCurve3([
    v(0.022, 0.07, -0.05),
    v(0.042, 0.1, -0.022),
    v(0.034, 0.118, 0.022),
    v(0.0, 0.1, 0.058),
    v(-0.05, 0.066, 0.076),
  ]);
  // and where the wing springs from: above the socket in front, to the sciatic notch behind
  const root = new THREE.CatmullRomCurve3([
    v(0.012, 0.032, -0.03),
    v(0.004, 0.034, 0.0),
    v(-0.02, 0.03, 0.032),
    v(-0.045, 0.04, 0.06),
  ]);
  const rows = 6;
  const cols = 12;
  const pos: number[] = [];
  const idx: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i <= rows; i++) {
    const u = i / rows;
    for (let j = 0; j <= cols; j++) {
      const t = j / cols;
      root.getPointAt(t, a);
      crest.getPointAt(t, b);
      // the iliac fossa: hollowed on the inside, so the wing curves out as a shallow bowl
      const p = a.lerp(b, u);
      p.x -= 0.012 * Math.sin(Math.PI * u) * Math.sin(Math.PI * t);
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const k = i * (cols + 1) + j;
      idx.push(k, k + 1, k + cols + 1, k + 1, k + cols + 2, k + cols + 1);
    }
  }
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  shell.setIndex(idx);
  shell.computeVertexNormals();
  // both faces, so the thin wing reads from either side
  const back = shell.clone();
  const bi = back.index!.array;
  for (let i = 0; i < bi.length; i += 3) {
    const t = bi[i + 1];
    bi[i + 1] = bi[i + 2];
    bi[i + 2] = t;
  }
  back.computeVertexNormals();
  return merge([
    shell,
    back,
    tube(crest.getPoints(16), 0.0055, 1.3, 24, 8),
    tube(root.getPoints(10), 0.008, 1, 12, 8),
    // the rim of the socket, and its floor
    new THREE.TorusGeometry(0.027, 0.006, 8, 18)
      .rotateY(Math.PI / 2 - 0.35)
      .translate(hx + 0.006, hy, hz),
    blob(0.008, 0.02, 0.02, [hx - 0.012, hy, hz]),
    // the ischium down to the tuberosity a seated body rests on
    tube(
      [v(-0.004, -0.018, 0.014), v(-0.012, -0.05, 0.028), v(-0.018, -0.07, 0.032)],
      0.012,
      0.8,
      10,
      10
    ),
    blob(0.013, 0.014, 0.018, [hx - 0.02, hy - 0.072, hz + 0.03]),
    // the superior ramus to the symphysis, and the inferior back to the ischium:
    // the obturator foramen between them
    tube(
      [v(-0.01, 0.0, -0.024), v(-0.05, -0.012, -0.05), v(-hx + 0.006, -0.03, -0.06)],
      0.0085,
      0.9,
      12,
      8
    ),
    tube(
      [v(-hx + 0.006, -0.03, -0.06), v(-0.06, -0.06, -0.035), v(-0.022, -0.074, 0.012)],
      0.0075,
      0.9,
      12,
      8
    ),
    blob(0.008, 0.018, 0.01, [0.008, hy - 0.035, hz - 0.06]),
  ]);
}

/**
 * One rib of the right side, from its head at the spine (the origin) round
 * the chest to where its cartilage takes over: out and back to the rib's
 * angle, then round the side and forward, falling as it goes. `n` is 1–12,
 * `width` the chest's half-width at the rib, `depth` how far forward it
 * reaches, `drop` how far its front end is below its head.
 */
export function rib(
  n: number,
  width: number,
  depth: number,
  drop: number,
  sweep: number
): { geo: THREE.BufferGeometry; end: THREE.Vector3 } {
  const pts: THREE.Vector3[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * sweep;
    // an ellipse starting behind, at the spine, round to the front
    const x = width * Math.sin(a) * (1 - 0.15 * Math.exp(-a * 4));
    const z = 0.018 + (depth / 2) * (Math.cos(a) - 1) + 0.02 * Math.sin(a) * Math.exp(-a * 1.5);
    const y = (-drop * (1 - Math.cos(a))) / 2;
    pts.push(new THREE.Vector3(x, y, z));
  }
  // the head sits against the vertebra's body
  pts[0].set(0.014, 0.004, 0.0);
  const r = n === 1 ? 0.0055 : n > 10 ? 0.0045 : 0.006;
  return {
    geo: tube(pts, (t) => r * (1 - 0.25 * t), 0.5, 24, 8, new THREE.Vector3(0, 1, 0)),
    end: pts[pts.length - 1].clone(),
  };
}

/**
 * The sternum, from the jugular notch (the origin) down the front of the
 * chest: the manubrium, the long body, and the xiphoid's small point.
 */
export function sternum(length: number): THREE.BufferGeometry {
  return merge([
    plate(
      [
        [-0.026, 0],
        [0.026, 0],
        [0.018, -0.045],
        [-0.018, -0.045],
      ],
      0.009
    ),
    plate(
      [
        [-0.014, -0.048],
        [0.014, -0.048],
        [0.017, -length * 0.7],
        [0.011, -length * 0.88],
        [-0.011, -length * 0.88],
        [-0.017, -length * 0.7],
      ],
      0.008
    ),
    blob(0.006, 0.013, 0.003, [0, -length + 0.01, 0.003]),
  ]);
}

/* ---- the head -------------------------------------------------------- */

/**
 * The skull, without its jaw, from the occipital condyles where it rests on
 * the spine (the origin), the face looking down `-z`: the vault, the brow
 * ridge over the orbits, the cheekbones and the arches back from them, the
 * nasal bones, the maxilla with the upper teeth, and the mastoids behind the ears.
 */
/** A signed distance: negative inside, metres. */
type Sdf = (x: number, y: number, z: number) => number;

/** Distance to an ellipsoid of semi-axes `r` centred at `c` (Quílez's bound: exact on the surface). */
function ellipsoid(c: [number, number, number], r: [number, number, number]): Sdf {
  return (x, y, z) => {
    const px = (x - c[0]) / r[0];
    const py = (y - c[1]) / r[1];
    const pz = (z - c[2]) / r[2];
    const k0 = Math.hypot(px, py, pz);
    const k1 = Math.hypot(px / r[0], py / r[1], pz / r[2]);
    return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(...r);
  };
}

/** Distance to a capsule from `a` to `b` of radius `r`. */
function capsule(a: [number, number, number], b: [number, number, number], r: number): Sdf {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ll = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  return (x, y, z) => {
    const ap = [x - a[0], y - a[1], z - a[2]];
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / ll));
    return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t) - r;
  };
}

/** Polynomial smooth minimum: two surfaces blended over `k` metres, as bone grows into bone. */
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
}

/**
 * A surface from a signed distance, meshed by marching cubes over a cube of
 * side `size` centred at `centre`, `resolution` cells along each edge.
 */
function surface(
  sdf: Sdf,
  centre: [number, number, number],
  size: number,
  resolution: number
): THREE.BufferGeometry {
  const mc = new MarchingCubes(resolution, new THREE.MeshBasicMaterial(), false, false, 60000);
  mc.isolation = 0;
  const half = size / 2;
  const n = mc.size;
  for (let k = 0; k < n; k++) {
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const at = (q: number) => ((q - mc.halfsize) / mc.halfsize) * half;
        mc.field[k * mc.size2 + j * n + i] = -sdf(
          centre[0] + at(i),
          centre[1] + at(j),
          centre[2] + at(k)
        );
      }
    }
  }
  mc.update();
  const count = mc.count;
  const src = mc.geometry;
  const pos = (src.getAttribute('position').array as Float32Array).slice(0, count * 3);
  const nrm = (src.getAttribute('normal').array as Float32Array).slice(0, count * 3);
  src.dispose();
  (mc.material as THREE.Material).dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.scale(half, half, half);
  g.translate(...centre);
  return g;
}

/**
 * The skull, without its jaw, from the occipital condyles where it rests on
 * the spine (the origin), the face looking down `-z`. One surface, as bone
 * is: the long vault and the full occiput behind it; the brow over the
 * orbits; the cheekbones and the zygomatic arches back from them to the ears;
 * the maxilla round the nose and carrying the upper teeth; the mastoids —
 * with the orbits, the nasal aperture and the temporal hollows carved into it.
 */
export function cranium(): THREE.BufferGeometry {
  const parts: Sdf[] = [
    ellipsoid([0, 0.072, -0.004], [0.071, 0.073, 0.094]),
    ellipsoid([0, 0.032, 0.044], [0.06, 0.046, 0.05]),
    ellipsoid([0, 0.036, -0.058], [0.056, 0.032, 0.036]),
    ellipsoid([0, 0.002, -0.064], [0.034, 0.026, 0.03]),
    ellipsoid([0.047, 0.02, -0.068], [0.016, 0.012, 0.016]),
    ellipsoid([-0.047, 0.02, -0.068], [0.016, 0.012, 0.016]),
    capsule([0.054, 0.018, -0.06], [0.064, 0.018, -0.004], 0.0055),
    capsule([-0.054, 0.018, -0.06], [-0.064, 0.018, -0.004], 0.0055),
    ellipsoid([0.03, 0.06, -0.084], [0.021, 0.008, 0.011]),
    ellipsoid([-0.03, 0.06, -0.084], [0.021, 0.008, 0.011]),
    ellipsoid([0.05, 0.0, 0.01], [0.008, 0.013, 0.009]),
    ellipsoid([-0.05, 0.0, 0.01], [0.008, 0.013, 0.009]),
    ellipsoid([0.012, 0.004, 0], [0.006, 0.006, 0.01]),
    ellipsoid([-0.012, 0.004, 0], [0.006, 0.006, 0.01]),
  ];
  const cuts: Sdf[] = [
    ellipsoid([0.031, 0.04, -0.098], [0.0165, 0.016, 0.032]),
    ellipsoid([-0.031, 0.04, -0.098], [0.0165, 0.016, 0.032]),
    ellipsoid([0, 0.008, -0.098], [0.0085, 0.013, 0.026]),
    ellipsoid([0.079, 0.04, -0.03], [0.014, 0.022, 0.03]),
    ellipsoid([-0.079, 0.04, -0.03], [0.014, 0.022, 0.03]),
  ];
  const sdf: Sdf = (x, y, z) => {
    let d = parts[0](x, y, z);
    for (let i = 1; i < parts.length; i++) d = smin(d, parts[i](x, y, z), 0.012);
    for (const c of cuts) d = -smin(-d, c(x, y, z), 0.004);
    return d;
  };
  return surface(sdf, [0, 0.055, -0.006], 0.24, 64);
}

/**
 * The dark of the skull's openings, set back inside their rims: the orbits,
 * the nasal aperture, the ear canals.
 */
export function cavities(): THREE.BufferGeometry {
  return merge([
    blob(0.0165, 0.016, 0.012, [0.031, 0.04, -0.068], 16),
    blob(0.0165, 0.016, 0.012, [-0.031, 0.04, -0.068], 16),
    blob(0.0078, 0.012, 0.008, [0, 0.008, -0.074], 12),
    blob(0.004, 0.005, 0.004, [0.0705, 0.016, 0.004]),
    blob(0.004, 0.005, 0.004, [-0.0705, 0.016, 0.004]),
  ]);
}

/** A row of teeth round an arch of half-width `w` and depth `d`, crowns toward `dir` (1 down, -1 up). */
export function teeth(w: number, d: number, dir: 1 | -1): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n - 0.5) * Math.PI * 0.95;
    // incisors in front are narrow, molars at the back broad
    const back = Math.abs(a) / (Math.PI * 0.475);
    const wide = 0.0028 + 0.0028 * back;
    const g = new THREE.BoxGeometry(wide, 0.0085 - 0.0015 * back, 0.0045 + 0.004 * back);
    g.rotateY(-a);
    g.translate(w * Math.sin(a), -dir * 0.004, -d * Math.cos(a));
    parts.push(g);
  }
  return merge(parts);
}

/**
 * The mandible, from the axis through its two condyles (the origin; the jaw
 * opens about `x`): each ramus down from its condyle to the angle, with the
 * coronoid process in front of it; and the U of the body forward to the chin,
 * carrying the lower teeth. One surface, like the skull's.
 */
export function mandible(): THREE.BufferGeometry {
  const parts: Sdf[] = [];
  const arch: [number, number, number][] = [
    [0.046, -0.058, 0.004],
    [0.041, -0.062, -0.028],
    [0.025, -0.066, -0.055],
    [0, -0.068, -0.068],
  ];
  for (const side of [1, -1]) {
    const m = (p: [number, number, number]): [number, number, number] => [side * p[0], p[1], p[2]];
    for (let i = 0; i < arch.length - 1; i++) {
      for (const dy of [0, -0.011]) {
        const a = m(arch[i]);
        const b = m(arch[i + 1]);
        parts.push(capsule([a[0], a[1] + dy, a[2]], [b[0], b[1] + dy, b[2]], 0.0062));
      }
    }
    parts.push(
      capsule(m([0.05, 0, 0]), m([0.047, -0.058, 0.004]), 0.0068),
      capsule(m([0.048, -0.012, -0.012]), m([0.044, -0.052, -0.018]), 0.0058),
      capsule(m([0.046, -0.03, -0.02]), m([0.045, -0.006, -0.026]), 0.0038),
      ellipsoid(m([0.05, 0.001, 0]), [0.0095, 0.0055, 0.006])
    );
  }
  parts.push(ellipsoid([0, -0.076, -0.07], [0.013, 0.008, 0.007]));
  const sdf: Sdf = (x, y, z) => {
    let d = parts[0](x, y, z);
    for (let i = 1; i < parts.length; i++) d = smin(d, parts[i](x, y, z), 0.006);
    return d;
  };
  return surface(sdf, [0, -0.04, -0.035], 0.13, 48);
}

/* ---- the leg --------------------------------------------------------- */

/**
 * The femur, hip (0) to knee (`length`): the ball of the head in the socket,
 * the neck out at 125° to the shaft, the greater trochanter out at the side
 * and the lesser behind; the long shaft bowing forward; and the two condyles
 * the knee rolls on, behind and below the knee's centre.
 */
export function femur(length: number): THREE.BufferGeometry {
  const L = length;
  return merge([
    blob(0.024, 0.024, 0.024, [0, 0, 0]),
    tube(
      [
        new THREE.Vector3(0.0, 0.0, 0),
        new THREE.Vector3(0.03, 0.02, 0),
        new THREE.Vector3(0.05, 0.045, 0),
      ],
      0.0135,
      0.85,
      8,
      10,
      new THREE.Vector3(0, 0, 1)
    ),
    blob(0.018, 0.026, 0.02, [0.06, 0.03, 0.006]),
    blob(0.008, 0.008, 0.008, [0.035, 0.065, 0.014]),
    tube(
      [
        new THREE.Vector3(0.052, 0.04, 0.002),
        new THREE.Vector3(0.042, 0.15, 0.006),
        new THREE.Vector3(0.026, 0.28, 0.008),
        new THREE.Vector3(0.008, L - 0.07, 0.002),
      ],
      (t) => 0.0145 - 0.0015 * Math.sin(Math.PI * t) + 0.004 * t * t,
      0.95,
      18,
      12,
      new THREE.Vector3(0, 0, 1)
    ),
    blob(0.033, 0.026, 0.018, [0, L - 0.03, 0.0]),
    blob(0.0125, 0.02, 0.022, [0.02, L - 0.006, -0.006]),
    blob(0.0125, 0.02, 0.022, [-0.02, L - 0.006, -0.006]),
  ]);
}

/** The patella: a rounded triangle, point down, in front of the knee. Centred, its back facing `+z`. */
export function patella(): THREE.BufferGeometry {
  return blob(0.022, 0.024, 0.01, [0, 0, 0], 16);
}

/**
 * The tibia, knee (0) to ankle (`length`): the broad plateau the femur's
 * condyles roll on, the tuberosity in front below it, the three-sided shaft,
 * and the medial malleolus at the ankle.
 */
export function tibia(length: number): THREE.BufferGeometry {
  const L = length;
  return merge([
    new THREE.CylinderGeometry(0.036, 0.03, 0.022, 20).scale(1, 1, 0.7).translate(0, 0.016, 0.004),
    blob(0.009, 0.012, 0.006, [0.002, 0.05, 0.022]),
    tube(
      [
        new THREE.Vector3(0, 0.028, 0.004),
        new THREE.Vector3(0.002, 0.12, 0),
        new THREE.Vector3(0.0, L - 0.05, 0.002),
      ],
      (t) => 0.019 - 0.008 * t + 0.009 * (1 - t) ** 6,
      0.9,
      16,
      12,
      new THREE.Vector3(0, 0, 1)
    ),
    blob(0.021, 0.02, 0.018, [0, L - 0.028, 0.002]),
    blob(0.008, 0.014, 0.008, [-0.019, L - 0.008, 0.002]),
  ]);
}

/** The fibula, out at the side of the tibia: its head below the knee, a thin shaft, the lateral malleolus lower than the medial. */
export function fibula(length: number): THREE.BufferGeometry {
  const L = length;
  return merge([
    blob(0.009, 0.011, 0.009, [0.028, 0.04, -0.012]),
    tube(
      [
        new THREE.Vector3(0.028, 0.045, -0.012),
        new THREE.Vector3(0.026, 0.2, -0.01),
        new THREE.Vector3(0.022, L - 0.01, -0.008),
      ],
      (t) => 0.0055 - 0.0015 * Math.sin(Math.PI * t),
      0.85,
      14,
      8,
      new THREE.Vector3(0, 0, 1)
    ),
    blob(0.008, 0.016, 0.008, [0.023, L + 0.004, -0.008]),
  ]);
}

/** The tarsals and metatarsals of a right foot, in the foot's frame: `z` heel to ball, `y` up, `x` out. */
export const TARSALS: { at: [number, number, number]; size: [number, number, number] }[] = [
  // talus, under the ankle
  { at: [0.0, 0.05, 0.04], size: [0.016, 0.014, 0.024] },
  // calcaneus, back and down to the heel
  { at: [0.004, 0.026, 0.026], size: [0.016, 0.02, 0.036] },
  // navicular, cuboid
  { at: [-0.012, 0.042, 0.068], size: [0.014, 0.011, 0.008] },
  { at: [0.016, 0.026, 0.07], size: [0.012, 0.012, 0.012] },
  // the three cuneiforms
  { at: [-0.02, 0.036, 0.086], size: [0.008, 0.012, 0.011] },
  { at: [-0.007, 0.042, 0.084], size: [0.006, 0.01, 0.008] },
  { at: [0.004, 0.04, 0.085], size: [0.006, 0.01, 0.009] },
];

/** Where each metatarsal runs, base to head (the ball of the foot is the heads' line at `z` = foot length). */
export const METATARSALS: {
  base: [number, number, number];
  head: [number, number, number];
  w: number;
}[] = [
  { base: [-0.02, 0.034, 0.094], head: [-0.024, 0.014, 0.17], w: 0.013 },
  { base: [-0.008, 0.038, 0.094], head: [-0.004, 0.012, 0.172], w: 0.009 },
  { base: [0.003, 0.036, 0.094], head: [0.012, 0.011, 0.168], w: 0.0088 },
  { base: [0.014, 0.032, 0.088], head: [0.026, 0.01, 0.162], w: 0.0085 },
  { base: [0.024, 0.026, 0.082], head: [0.038, 0.009, 0.152], w: 0.009 },
];

/** Each toe's phalanges, from the ball: the big toe has two, the rest three. */
export const TOES: number[][] = [
  [0.03, 0.024],
  [0.024, 0.012, 0.01],
  [0.021, 0.011, 0.009],
  [0.019, 0.01, 0.008],
  [0.016, 0.008, 0.008],
];
