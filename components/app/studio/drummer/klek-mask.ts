import * as THREE from 'three';

import {
  ball,
  type Materials,
  printDots,
  REST_NORMAL,
  SKIN_REST,
} from '@/components/app/studio/drummer/parts';

/**
 * Klek de Poitrine's mask (experiment: the drummer view), in the head's frame
 * (`-z` forward, the skull's centre 0.1 up): a tall capsule over the whole
 * head, down onto the shoulders, black and spotted white, with a gold pyramid
 * on its crown, gold almond eyes, a gold stud on the brow and one at each
 * side, and a gold-rimmed "O" of a mouth standing out from its base — and his
 * nose: a long, limp, spotted tube hanging from under the brow, lying down
 * the face at rest and swinging off it as he plays.
 *
 * The nose is a rope, not a bone: points a fixed distance apart, pinned at
 * the root, pulled down by their weight and carried by the head, kept off the
 * mask's surface, and barely stiff — so it hangs, lags, swings past and
 * wobbles back as the head turns and nods.
 */

export interface Mask {
  parts: THREE.Object3D[];
  /**
   * Swing the nose on: `head` is the head's matrix in the frame gravity is
   * down in (the drummer's), `dt` the seconds since the last frame.
   */
  sway: (head: THREE.Matrix4, dt: number) => void;
}

/** The capsule's outline, radius and height (head frame): flared onto the shoulders, a dome to the crown. */
const OUTLINE: [number, number][] = [
  [0.128, -0.08],
  [0.121, -0.05],
  [0.116, 0.0],
  [0.114, 0.08],
  [0.114, 0.17],
  [0.11, 0.225],
  [0.098, 0.27],
  [0.077, 0.305],
  [0.05, 0.327],
  [0.022, 0.337],
  [0.0, 0.34],
];

/** Front to back, the capsule is this much deeper than it is wide. */
const DEEP = 1.06;

/** How far the brow stands out over the eyes, metres, and where. */
const BROW = 0.012;
const BROW_Y = 0.21;

/** The capsule's radius at height `y`, metres: the outline, between its points. */
export function maskRadius(y: number): number {
  if (y <= OUTLINE[0][1]) return OUTLINE[0][0];
  for (let i = 1; i < OUTLINE.length; i++) {
    const [r1, y1] = OUTLINE[i];
    const [r0, y0] = OUTLINE[i - 1];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}

/** How far the brow stands out at height `y`, toward the front (`front`, 0–1). */
const browAt = (y: number, front: number) =>
  BROW * Math.exp(-(((y - BROW_Y) / 0.022) ** 2)) * front ** 3;

/** The point on the mask's front at height `y` (head frame). */
export function maskFront(y: number): number {
  return -(maskRadius(y) * DEEP + browAt(y, 1));
}

/** Its spots: white on black, a twentieth of its width, about two and a half of them apart. */
const SPOTS = { spacing: 0.028, radius: 0.0055 } as const;

function capsule(mat: THREE.Material): THREE.Mesh {
  const geo = new THREE.LatheGeometry(
    OUTLINE.map(([r, y]) => new THREE.Vector2(r, y)),
    64
  );
  const p = geo.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const r = Math.hypot(v.x, v.z);
    const front = r > 0 ? Math.max(0, -v.z / r) : 0;
    v.z *= DEEP;
    // the brow over the eyes, standing out in front
    if (r > 0) {
      const out = browAt(v.y, front);
      v.x += (v.x / r) * out * 0.3;
      v.z += (v.z / r) * out;
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const o = new THREE.Mesh(geo, mat);
  o.castShadow = true;
  o.name = 'mask';
  return o;
}

/** A gold stud, pyramid or almond, sat on the mask's surface at `y` and `around` (0 the front, + to the lead side). */
function stud(geo: THREE.BufferGeometry, mat: THREE.Material, y: number, around: number) {
  const o = new THREE.Mesh(geo, mat);
  const r = maskRadius(y);
  o.position.set(
    r * Math.sin(around),
    y,
    -r * DEEP * Math.cos(around) - browAt(y, Math.cos(around))
  );
  o.rotation.y = -around;
  return o;
}

/** How many points the nose is, how far apart, and how thick it is at the root and the tip. */
const NOSE_POINTS = 9;
const NOSE_LINK = 0.024;
const NOSE_ROOT = 0.012;
const NOSE_TIP = 0.0165;
/** Where it hangs from: just under the brow, out of the front of the mask. */
const NOSE_FROM_Y = BROW_Y - 0.03;
/** Rings along the tube, and how many round it. */
const RINGS = 28;
const ROUND = 12;
/** Gravity, metres a second squared; the simulation's step; how much of each step's speed is lost. */
const GRAVITY = 9.8;
const STEP = 1 / 240;
const DRAG = 0.015;
/**
 * How much harder than its weight alone the nose is thrown by the head: a
 * stuffed nose on a papier-mâché head is thrown about more than a rope of
 * its length would be.
 */
const THROWN = 1.2;
/** How stiff it is, 0–1: barely, so it hangs in a curve rather than a line. */
const STIFF = 0.06;
/**
 * The head's turn, radians a second, past which it is not moving but cut to
 * somewhere new — a seek, a restart — which the nose, like the head, is
 * simply there for rather than thrown by (as the hair's swish is).
 */
const CUT = 15;
/**
 * How much of the way back to where it hangs at rest each point goes a step:
 * a stuffed nose keeps a little of its shape, so it settles hanging down the
 * middle of the face rather than rolling off the front of the mask to one side.
 */
const MEMORY = 0.001;

/** The nose's radius `s` along it (0 the root, 1 the tip): even, swelling a little to a round end. */
const noseRadius = (s: number) =>
  NOSE_ROOT + (NOSE_TIP - NOSE_ROOT) * THREE.MathUtils.smoothstep(s, 0.55, 0.92);

export function klekMask(m: Materials): Mask {
  const black = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.35,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
  });
  printDots(black, { ground: '#17110f', dot: '#f2eee6', ...SPOTS });
  const gold = new THREE.MeshStandardMaterial({
    color: m.accent.color,
    metalness: 0.75,
    roughness: 0.32,
  });
  const dark = new THREE.MeshStandardMaterial({ color: '#0b0807', roughness: 0.9 });
  const parts: THREE.Object3D[] = [capsule(black)];

  // the pyramid on the crown
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.042, 4), gold);
  finial.position.set(0, OUTLINE[OUTLINE.length - 1][1] + 0.016, 0);
  finial.rotation.y = Math.PI / 4;
  parts.push(finial);

  // gold almond eyes under the brow, a stud on the brow between them and one each side
  const almond = new THREE.SphereGeometry(0.011, 16, 10);
  almond.scale(1.7, 0.8, 0.55);
  for (const side of [-1, 1]) {
    const eye = stud(almond, gold, 0.172, side * 0.36);
    eye.rotation.z = side * 0.15;
    parts.push(eye);
    const temple = stud(new THREE.ConeGeometry(0.012, 0.016, 4), gold, 0.15, side * 1.55);
    temple.rotation.set(0, -side * 1.55, (-side * Math.PI) / 2);
    parts.push(temple);
  }
  const brow = stud(new THREE.ConeGeometry(0.009, 0.012, 4), gold, 0.245, 0);
  brow.rotation.x = -Math.PI / 2;
  parts.push(brow);

  // the mouth: a gold-rimmed "O", wide, standing out from the base, dark inside
  const mouthY = 0.0;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0065, 10, 32), gold);
  rim.scale.set(1.55, 0.72, 1);
  rim.position.set(0, mouthY, maskFront(mouthY) - 0.012);
  const inside = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.024, 24), dark);
  inside.rotation.x = Math.PI / 2;
  inside.scale.set(1.55, 1, 0.72);
  inside.position.set(0, mouthY, maskFront(mouthY) - 0.004);
  parts.push(rim, inside);

  /* ---- the nose ------------------------------------------------------ */
  const root = new THREE.Vector3(0, NOSE_FROM_Y, maskFront(NOSE_FROM_Y) - 0.004);
  // at rest: hanging straight down the face from the root
  const resting = Array.from({ length: NOSE_POINTS }, (_, i) => {
    const y = NOSE_FROM_Y - i * NOSE_LINK;
    return new THREE.Vector3(0, y, maskFront(y) - noseRadius(i / (NOSE_POINTS - 1)));
  });
  const length = NOSE_LINK * (NOSE_POINTS - 1);

  // a tube drawn through the points each frame, its spots laid out on it as if it were straight
  const count = (RINGS + 1) * ROUND + 1;
  const position = new Float32Array(count * 3);
  const rest = new Float32Array(count * 3);
  const restNormal = new Float32Array(count * 3);
  const index: number[] = [];
  for (let k = 0; k <= RINGS; k++) {
    const s = k / RINGS;
    for (let j = 0; j < ROUND; j++) {
      const a = (j / ROUND) * Math.PI * 2;
      const at = (k * ROUND + j) * 3;
      rest.set([Math.cos(a) * noseRadius(s), -s * length, Math.sin(a) * noseRadius(s)], at);
      restNormal.set([Math.cos(a), 0, Math.sin(a)], at);
      if (k < RINGS) {
        const a0 = k * ROUND + j;
        const a1 = k * ROUND + ((j + 1) % ROUND);
        index.push(a0, a1, a0 + ROUND, a1, a1 + ROUND, a0 + ROUND);
      }
    }
  }
  // the round end
  const tip = (RINGS + 1) * ROUND;
  rest.set([0, -length - NOSE_TIP, 0], tip * 3);
  restNormal.set([0, -1, 0], tip * 3);
  for (let j = 0; j < ROUND; j++)
    index.push(RINGS * ROUND + j, RINGS * ROUND + ((j + 1) % ROUND), tip);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.setAttribute(SKIN_REST, new THREE.BufferAttribute(rest, 3));
  geo.setAttribute(REST_NORMAL, new THREE.BufferAttribute(restNormal, 3));
  geo.setIndex(index);
  const noseMat = black.clone();
  printDots(noseMat, { ground: '#17110f', dot: '#f2eee6', ...SPOTS }, true);
  const nose = new THREE.Mesh(geo, noseMat);
  nose.name = 'nose';
  nose.castShadow = true;
  nose.frustumCulled = false;
  parts.push(nose);
  // the knot it hangs from, sunk in under the brow
  const knot = ball(NOSE_ROOT * 1.25, black, 12);
  knot.position.copy(root);
  parts.push(knot);

  /** Lay the tube along `points` (head frame). */
  const curve = new THREE.CatmullRomCurve3(resting.map((p) => p.clone()));
  const draw = (points: THREE.Vector3[]) => {
    curve.points = points;
    const frames = curve.computeFrenetFrames(RINGS, false);
    const c = new THREE.Vector3();
    for (let k = 0; k <= RINGS; k++) {
      const s = k / RINGS;
      curve.getPointAt(s, c);
      const r = noseRadius(s);
      for (let j = 0; j < ROUND; j++) {
        const a = (j / ROUND) * Math.PI * 2;
        const n = frames.normals[k]
          .clone()
          .multiplyScalar(Math.cos(a))
          .addScaledVector(frames.binormals[k], Math.sin(a));
        position.set([c.x + n.x * r, c.y + n.y * r, c.z + n.z * r], (k * ROUND + j) * 3);
      }
    }
    const end = frames.tangents[RINGS];
    curve.getPointAt(1, c);
    position.set([c.x + end.x * NOSE_TIP, c.y + end.y * NOSE_TIP, c.z + end.z * NOSE_TIP], tip * 3);
    geo.getAttribute('position').needsUpdate = true;
    geo.computeVertexNormals();
  };
  draw(resting);

  /* ---- swinging it ---------------------------------------------------- */
  // the points in the drummer's frame, now and a step ago; null until the first frame places them
  let now: THREE.Vector3[] | null = null;
  let was: THREE.Vector3[] = [];
  const toHead = new THREE.Matrix4();
  const pinned = new THREE.Vector3();
  const pinnedWas = new THREE.Vector3();
  const pinnedBefore = new THREE.Vector3();
  const local = new THREE.Vector3();
  const d = new THREE.Vector3();
  const throwBy = new THREE.Vector3();
  const inHead = resting.map((p) => p.clone());
  const home = new THREE.Vector3();
  const headAt = new THREE.Matrix4();
  const turned = new THREE.Quaternion();
  const turnedWas = new THREE.Quaternion();

  /** Keep a point (drummer's frame) outside the mask by its own thickness. */
  const offMask = (p: THREE.Vector3, r: number, head: THREE.Matrix4) => {
    local.copy(p).applyMatrix4(toHead);
    const y = Math.min(local.y, 0.3);
    const R = maskRadius(y);
    const front = Math.max(0, -local.z) / Math.max(1e-6, Math.hypot(local.x, local.z));
    const reach = Math.hypot(local.x / R, local.z / (R * DEEP + browAt(y, front)));
    const need = 1 + r / R;
    if (reach < need && reach > 1e-6) {
      local.x *= need / reach;
      local.z *= need / reach;
      p.copy(local).applyMatrix4(head);
    }
  };

  const sway = (head: THREE.Matrix4, dt: number) => {
    toHead.copy(head).invert();
    turned.setFromRotationMatrix(head);
    const cut = turnedWas.angleTo(turned) / Math.max(dt, 1e-6) > CUT;
    turnedWas.copy(turned);
    if (!now || !(dt > 0) || dt > 0.25 || cut) {
      // the first frame, or after a pause: hanging at rest where the head is
      now = resting.map((p) => p.clone().applyMatrix4(head));
      was = now.map((p) => p.clone());
      pinnedWas.copy(root).applyMatrix4(head);
      pinnedBefore.copy(pinnedWas);
      draw(resting);
      return;
    }
    const pts = now;
    pinned.copy(root).applyMatrix4(head);
    for (let t = 0; t < dt; t += STEP) {
      const h = Math.min(STEP, dt - t);
      const k = (t + h) / dt;
      // where the root is through the frame
      const at = pinnedWas.clone().lerp(pinned, k);
      throwBy
        .subVectors(pinned, pinnedWas)
        .sub(d.subVectors(pinnedWas, pinnedBefore))
        .multiplyScalar(-(THROWN - 1) * (h / dt));
      for (let i = 1; i < NOSE_POINTS; i++) {
        const p = pts[i];
        const v = d.subVectors(p, was[i]).multiplyScalar(1 - DRAG);
        was[i].copy(p);
        p.add(v);
        p.y -= GRAVITY * h * h;
        // the further out along it, the more of the head's throw it feels
        p.addScaledVector(throwBy, i / (NOSE_POINTS - 1));
      }
      pts[0].copy(at);
      was[0].copy(at);
      // a stuffed nose keeps a little of its shape
      for (let i = 1; i < NOSE_POINTS; i++)
        pts[i].lerp(home.copy(resting[i]).applyMatrix4(headAt.copy(head)), MEMORY);
      for (let it = 0; it < 4; it++) {
        for (let i = 1; i < NOSE_POINTS; i++) {
          const a = pts[i - 1];
          const b = pts[i];
          d.subVectors(b, a);
          const len = d.length() || 1e-6;
          const fix = (len - NOSE_LINK) / len;
          if (i === 1) b.addScaledVector(d, -fix);
          else {
            a.addScaledVector(d, fix / 2);
            b.addScaledVector(d, -fix / 2);
          }
        }
        // a little body: each point eased toward the line of its neighbours either side
        for (let i = 1; i < NOSE_POINTS - 1; i++) {
          d.addVectors(pts[i - 1], pts[i + 1])
            .multiplyScalar(0.5)
            .sub(pts[i]);
          pts[i].addScaledVector(d, STIFF);
        }
        for (let i = 1; i < NOSE_POINTS; i++)
          offMask(pts[i], noseRadius(i / (NOSE_POINTS - 1)), head);
      }
    }
    pinnedBefore.copy(pinnedWas);
    pinnedWas.copy(pinned);
    for (let i = 0; i < NOSE_POINTS; i++) inHead[i].copy(pts[i]).applyMatrix4(toHead);
    draw(inHead);
  };

  return { parts, sway };
}
