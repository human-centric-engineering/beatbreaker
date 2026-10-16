import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import {
  SHORTS_LEG,
  SOCK,
  TRUNK_SQUARE,
  onRing,
  flesh,
  ringAt,
  shirtFor,
  surface,
  surfaceNormals,
  trousersTop,
  vest,
} from '@/components/app/studio/drummer/garments';
import { bendFingers, placeStick } from '@/components/app/studio/drummer/hand-pose';
import {
  ball,
  bentSkin,
  forwardLoft,
  furMaterial,
  limb,
  loft,
  type Materials,
  place,
  type Ring,
  SKIN_REST,
  skinDetail,
} from '@/components/app/studio/drummer/parts';
import { SHAFT_BELOW, SHAFT_UP, buildShoe } from '@/components/app/studio/drummer/shoes';
import { BODY, type Foot, type Hand, type V3 } from '@/lib/app/breaks/drummer/kit-layout';
import type { Beard, Build, HairStyle, Hat, Persona } from '@/lib/app/breaks/drummer/personas';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';
import type { Speak } from '@/lib/app/breaks/drummer/expression';
import {
  DIGITS,
  KNUCKLE_Y,
  KNUCKLE_Z,
  SPLAY,
  THUMB_BASE,
  THUMB_TIP,
  handSetOf,
  thumbTurn,
} from '@/lib/app/breaks/drummer/anatomy/hand';
import type { ArmPose, LegPose, Pose } from '@/lib/app/breaks/drummer/pose';
import { makeRng } from '@/lib/app/breaks/rng';

/**
 * The drummer, built from primitives (experiment: the drummer view).
 *
 * A jointed figure rather than a skinned one: every limb is a segment placed
 * between two joints the pose has solved, so what you see is exactly what the
 * stroke planner and the IK decided — nothing is blended or retargeted on the
 * way to the screen. The hands are articulated to the finger joint, and each finger is fitted to
 * the stick where it lies (`anatomy/hand.ts`): in a matched grip the stick
 * balances on the middle finger under the pad of the thumb, the first finger
 * wraps beside it, and the back two close on each stroke and ease off as the
 * stick comes up. In traditional grip the stick sits in the web of the thumb
 * instead: the thumb lies over it, the first two fingers rest on top, and the
 * ring finger is curled underneath with the little finger tucked in behind.
 *
 * Who is playing is a {@link Persona}: their build thickens or thins the
 * limbs and the trunk round the same joints, and their hair, beard and what
 * they wear hang off the head and the torso. None of it moves a joint.
 */

export interface DrummerModel {
  root: THREE.Group;
  /**
   * Pose the figure; `camera` (world space) is where a glance looks, and `dt`
   * the seconds since the last frame, which the hair swings over (0: it holds).
   */
  update: (pose: Pose, camera?: THREE.Vector3, dt?: number) => void;
}

/** How far the head turns to meet the camera, radians: past this, it is behind the drummer. */
const LOOK_YAW = 1.1;
const LOOK_BEHIND = 1.6;
const LOOK_PITCH = 0.45;

const vec = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);

/** A build, as girth round the joints: none of these moves one. */
interface Shape {
  arm: number;
  leg: number;
  neck: number;
  /** Width across the hips, the waist and the chest, and depth front to back. */
  hips: number;
  waist: number;
  chest: number;
  depth: number;
  /** How far a belly stands out in front, metres. */
  belly: number;
}

const SHAPES: Record<Build, Shape> = {
  slim: {
    arm: 0.82,
    leg: 0.84,
    neck: 0.88,
    hips: 0.92,
    waist: 0.86,
    chest: 0.9,
    depth: 0.88,
    belly: 0,
  },
  average: { arm: 1, leg: 1, neck: 1, hips: 1, waist: 1, chest: 1, depth: 1, belly: 0.012 },
  heavy: {
    arm: 1.22,
    leg: 1.25,
    neck: 1.3,
    hips: 1.18,
    waist: 1.32,
    chest: 1.12,
    depth: 1.18,
    belly: 0.075,
  },
  muscular: {
    arm: 1.38,
    leg: 1.18,
    neck: 1.38,
    hips: 1,
    waist: 0.98,
    chest: 1.2,
    depth: 1.16,
    belly: 0,
  },
};

/** Where on the trunk a cross-section is: which of a build's widths it takes. */
type Region = 'seat' | 'hips' | 'waist' | 'chest' | 'yoke';

/**
 * The trunk, seat to the base of the neck, for an average man, shaped over
 * the skeleton's bones (`skeleton-model.ts`) in the torso's frame (`+z` back):
 * at each height, the half-width, and where the front and the back are.
 *
 * The flesh is laid over the bones by what lies between: the buttocks
 * under and behind the sacrum, spread on the seat; the hips over the
 * trochanters and the iliac crests; the lumbar hollow at the small of the
 * back, the spinous processes a couple of centimetres under the skin; the
 * belly in front of the lumbar spine; the ribcage with the lats at its sides,
 * the shoulder blades and their muscle behind it and the pectorals in front;
 * then the trapezius sloping from the acromion up to the neck. The shoulder
 * itself is the deltoid's, on the arm: the trunk stops short of it.
 */
const TRUNK: { y: number; w: number; front: number; back: number; at: Region }[] = [
  { y: -0.088, w: 0.118, front: -0.03, back: 0.12, at: 'seat' },
  { y: -0.072, w: 0.152, front: -0.062, back: 0.155, at: 'seat' },
  { y: -0.045, w: 0.172, front: -0.077, back: 0.172, at: 'seat' },
  { y: -0.01, w: 0.178, front: -0.078, back: 0.168, at: 'hips' },
  { y: 0.03, w: 0.174, front: -0.074, back: 0.152, at: 'hips' },
  { y: 0.075, w: 0.166, front: -0.079, back: 0.13, at: 'hips' },
  { y: 0.12, w: 0.156, front: -0.083, back: 0.116, at: 'waist' },
  { y: 0.17, w: 0.15, front: -0.086, back: 0.112, at: 'waist' },
  { y: 0.22, w: 0.148, front: -0.086, back: 0.118, at: 'waist' },
  { y: 0.27, w: 0.151, front: -0.084, back: 0.13, at: 'chest' },
  { y: 0.32, w: 0.157, front: -0.083, back: 0.148, at: 'chest' },
  { y: 0.37, w: 0.163, front: -0.087, back: 0.157, at: 'chest' },
  { y: 0.42, w: 0.169, front: -0.094, back: 0.16, at: 'chest' },
  { y: 0.47, w: 0.172, front: -0.099, back: 0.158, at: 'chest' },
  { y: 0.51, w: 0.172, front: -0.097, back: 0.152, at: 'chest' },
  { y: 0.55, w: 0.162, front: -0.088, back: 0.142, at: 'yoke' },
  { y: 0.585, w: 0.152, front: -0.08, back: 0.13, at: 'yoke' },
  { y: 0.607, w: 0.142, front: -0.064, back: 0.12, at: 'yoke' },
  { y: 0.626, w: 0.13, front: -0.054, back: 0.11, at: 'yoke' },
  { y: 0.638, w: 0.118, front: -0.046, back: 0.1, at: 'yoke' },
  { y: 0.649, w: 0.103, front: -0.038, back: 0.092, at: 'yoke' },
  { y: 0.659, w: 0.084, front: -0.03, back: 0.085, at: 'yoke' },
  { y: 0.667, w: 0.064, front: -0.022, back: 0.078, at: 'yoke' },
  { y: 0.673, w: 0.047, front: -0.012, back: 0.068, at: 'yoke' },
];

/** Up the yoke, where a build's breadth eases from the chest's to the shoulders'. */
const YOKE_FROM = 0.51;
const YOKE_TO = 0.62;

/** The trunk's cross-sections between two of `TRUNK`'s, this many to a gap: smooth, not faceted. */
const TRUNK_STEPS = 3;

/** Where the trousers stop and the shirt starts, up the trunk. */
const BELT = 0.15;
/** The base of the neck, up the trunk: where a T-shirt's neckline is. */
const NECK_BASE = 0.666;

/** A Catmull-Rom step between `b` and `c`, `t` of the way, with `a` before and `d` after. */
function spline(a: number, b: number, c: number, d: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3)
  );
}

/** The trunk's cross-sections for a build and a figure, from `from` to `to` up it. */
function trunk(shape: Shape, female: boolean, from: number, to: number, proud = 0): Ring[] {
  const across: Record<Region, number> = {
    seat: shape.hips * (female ? 1.08 : 1),
    hips: shape.hips * (female ? 1.1 : 1),
    waist: shape.waist * (female ? 0.86 : 1),
    chest: shape.chest * (female ? 0.92 : 1),
    yoke: ((1 + shape.chest) / 2) * (female ? 0.9 : 1),
  };
  // each cross-section as a build has it, then the curve through them, so it rounds between
  const built = TRUNK.map((r) => {
    // a belly, most at the navel, standing out in front
    const b = shape.belly * Math.exp(-(((r.y - 0.18) / 0.11) ** 2));
    // a woman's chest, fuller in front: part of the trunk's surface, not stuck on it
    const bust = female
      ? 0.03 * Math.sqrt(shape.waist) * Math.exp(-(((r.y - 0.4) / 0.055) ** 2))
      : 0;
    const d = ((r.back - r.front) / 2) * shape.depth;
    // the chest's breadth easing into the yoke's over the top of the ribcage, not stepping to it
    const wide =
      r.at === 'yoke'
        ? THREE.MathUtils.lerp(
            across.chest,
            across.yoke,
            THREE.MathUtils.smoothstep(r.y, YOKE_FROM, YOKE_TO)
          )
        : across[r.at];
    return {
      y: r.y,
      w: r.w * wide + b * 0.3,
      d: d + b * 0.75 + bust * 0.5,
      z: (r.back + r.front) / 2 - b * 0.6 - bust * 0.5,
    };
  });
  const out: Ring[] = [];
  for (let i = 0; i < built.length - 1; i++) {
    const [a, b, c, d] = [
      built[i - 1] ?? built[i],
      built[i],
      built[i + 1],
      built[i + 2] ?? built[i + 1],
    ];
    for (let k = 0; k < TRUNK_STEPS; k++) {
      const t = k / TRUNK_STEPS;
      out.push({
        y: b.y + (c.y - b.y) * t,
        w: spline(a.w, b.w, c.w, d.w, t),
        d: spline(a.d, b.d, c.d, d.d, t),
        z: spline(a.z, b.z, c.z, d.z, t),
      });
    }
  }
  out.push(built[built.length - 1]);
  return out
    .filter((r) => r.y >= from - 1e-6 && r.y <= to + 1e-6)
    .map((r) => ({ y: r.y, w: r.w + proud, d: r.d + proud, z: r.z }));
}

/** How much of the muscle under the skin shows on each build. */
const TONE: Record<Build, number> = { slim: 0.8, average: 1, heavy: 0.55, muscular: 1.7 };

/**
 * The body above the belt, skin over the bones and muscle (`flesh`) where
 * none of it is covered: all of it bare-chested, round a vest's straps and
 * neckline, and none under a T-shirt, which is cloth over a smooth body.
 */
function skinOver(rings: Ring[], skinMat: THREE.Material, who: Persona): THREE.Mesh {
  // a robot's plate, a whole cyborg's and a beast's fur lie smooth, and a T-shirt hides it all:
  // the trunk's own smooth loft, without the fine grid the relief needs
  const person = (who.kind ?? 'human') === 'human' && who.cyborg !== 'full';
  if (!person || who.top === 'tee') {
    const from = BELT - 0.03;
    const smooth = loft(
      [ringAt(rings, from), ...rings.filter((r) => r.y > from + 1e-4)],
      skinMat,
      48,
      TRUNK_SQUARE
    );
    smooth.name = 'trunk';
    return smooth;
  }
  const top = TRUNK[TRUNK.length - 1].y;
  const skin = surface(rings, BELT - 0.03, top, () => 0, skinMat, undefined, 'trunk');
  const shows = (around: number, y: number) =>
    who.top === 'vest' ? THREE.MathUtils.smoothstep(-vest(around, y), 0.004, 0.012) : 1;
  const tone = TONE[who.build];
  const male = who.figure !== 'female';
  const pos = skin.geometry.getAttribute('position');
  const uv = skin.geometry.getAttribute('uv');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const around = uv.getX(i) * Math.PI * 2;
    const w = shows(around, v.y);
    if (w <= 0) continue;
    const s = Math.sin(around);
    const d = flesh(v.x, v.y, Math.max(0, -s), Math.max(0, s), tone, male) * w;
    v.addScaledVector(onRing(ringAt(rings, v.y), around).normal, d);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  surfaceNormals(skin.geometry);
  return skin;
}

/** The trunk `who` has, seat to the base of the neck, in the torso's frame: what they wear is cut over it. */
export function trunkOf(who: Persona): Ring[] {
  return trunk(SHAPES[who.build], who.figure === 'female', -1, 1);
}

/** Scale a limb's profile: `top` girth at one joint easing to `bottom` at the other. */
function girth(profile: [number, number][], top: number, bottom = top): [number, number][] {
  return profile.map(([r, y]) => [r * (top + (bottom - top) * (y + 0.5)), y]);
}

/** Shoulder to elbow: the biceps bellying in the upper half, thinning to the elbow. */
const UPPER_ARM: [number, number][] = [
  [0.036, -0.5],
  [0.045, -0.42],
  [0.049, -0.3],
  [0.049, -0.08],
  [0.043, 0.18],
  [0.037, 0.4],
  [0.035, 0.5],
];
/** Elbow to wrist: full under the elbow, tapering to a narrow wrist. */
const FOREARM: [number, number][] = [
  [0.036, -0.5],
  [0.041, -0.32],
  [0.038, -0.08],
  [0.031, 0.25],
  [0.026, 0.45],
  [0.025, 0.5],
];
/**
 * A T-shirt's short sleeve, part of the arm's own surface so it bends with
 * it: where its hem is, as a share of the upper arm from the shoulder joint
 * (halfway to the elbow), how far it stands off the arm there, hanging loose,
 * and the roll of the hem turned in at its edge.
 */
const SLEEVE_TO = 0.47;
const SLEEVE_SLACK = 0.009;
const SLEEVE_ROLL = 0.0022;

/** Hip to knee: heavy at the top, narrowing to the knee. */
const THIGH: [number, number][] = [
  [0.082, -0.5],
  [0.081, -0.25],
  [0.073, 0.05],
  [0.061, 0.35],
  [0.053, 0.5],
];
/** A trouser leg, knee to just past the ankle: hanging straight from the knee to a hem over the shoe. */
const TROUSER_SHIN: [number, number][] = [
  [0.054, -0.5],
  [0.056, -0.3],
  [0.053, 0],
  [0.05, 0.3],
  [0.05, 0.46],
  [0.052, 0.495],
  [0.044, 0.5],
];
/** How far past the ankle a trouser leg hangs, over the top of the shoe. */
const HEM_PAST = 0.014;
/** How far up the shin a sock is pulled, from the ankle to its ribbed top. */
const SOCK_UP = 0.07;
/** Knee to ankle: the calf full in the upper third, then the long taper. */
const SHIN: [number, number][] = [
  [0.05, -0.5],
  [0.056, -0.28],
  [0.053, -0.08],
  [0.043, 0.22],
  [0.037, 0.42],
  [0.036, 0.5],
];
/**
 * The neck, from its base up into the skull, domed shut at the top: its
 * radius, metres, at each share of the way from {@link NECK_FROM} to
 * {@link NECK_TO}.
 */
const NECK: [number, number][] = [
  [0.062, -0.5],
  [0.054, -0.3],
  [0.05, -0.05],
  [0.048, 0.2],
  [0.046, 0.38],
  [0.036, 0.46],
  [0, 0.5],
];
/**
 * Where the head turns on the neck, up the torso: high enough over the base of
 * the neck that a hand's breadth of throat shows under the chin, as it does
 * on a drummer sitting up, rather than the chin resting on the collar.
 */
const HEAD_Y = 0.69;
/** Where the neck runs, in the torso's frame: from the base, deep in the trunk, up into the skull. */
const NECK_FROM: V3 = [0, 0.6, 0.03];
const NECK_TO: V3 = [0, 0.795, 0.018];
/**
 * How the neck bends as the head turns, up the torso: below the first
 * height it stays with the torso, above the second it goes wholly with the
 * head, and between the two it eases from one to the other — so as the head
 * drops to look down, the back of the neck stretches after the skull rather
 * than opening between them.
 */
const NECK_BENDS: [number, number] = [0.62, 0.725];

/**
 * The neck, bending with the head: built in the torso's frame, and each
 * frame its upper part turned with the head about where the head turns.
 */
function buildNeck(
  girthOf: number,
  mat: THREE.Material
): { mesh: THREE.Mesh; bend: (head: THREE.Object3D) => void } {
  const neck = limb(girth(NECK, girthOf), mat, 28);
  place(neck, vec(NECK_FROM), vec(NECK_TO));
  neck.updateMatrix();
  const lathe = neck.geometry.clone().applyMatrix4(neck.matrix);
  neck.geometry.dispose();
  // one surface all the way round: the lathe's seam shares its points
  lathe.deleteAttribute('uv');
  lathe.deleteAttribute('normal');
  const geo = mergeVertices(lathe);
  lathe.dispose();
  geo.computeVertexNormals();
  neck.geometry = geo;
  neck.position.set(0, 0, 0);
  neck.quaternion.identity();
  neck.scale.set(1, 1, 1);
  neck.name = 'neck';
  const pos = geo.getAttribute('position');
  const rest = Float32Array.from(pos.array);
  geo.setAttribute(SKIN_REST, new THREE.BufferAttribute(rest, 3));
  const weight = Array.from({ length: pos.count }, (_, i) =>
    THREE.MathUtils.smoothstep(rest[i * 3 + 1], ...NECK_BENDS)
  );
  // and which way each faces, turned by its share of the head's turn, in steps
  const normal = geo.getAttribute('normal');
  const restNormal = Float32Array.from(normal.array);
  const STEPS = 24;
  const step = weight.map((w) => Math.round(w * STEPS));
  const turns = Array.from({ length: STEPS + 1 }, () => new THREE.Quaternion());
  const v = new THREE.Vector3();
  const turned = new THREE.Vector3();
  return {
    mesh: neck,
    bend: (head) => {
      for (let n = 0; n <= STEPS; n++) turns[n].identity().slerp(head.quaternion, n / STEPS);
      for (let i = 0; i < pos.count; i++) {
        v.fromArray(rest, i * 3);
        turned.copy(v).sub(head.position).applyQuaternion(head.quaternion).add(head.position);
        v.lerp(turned, weight[i]);
        pos.setXYZ(i, v.x, v.y, v.z);
        v.fromArray(restNormal, i * 3).applyQuaternion(turns[step[i]]);
        normal.setXYZ(i, v.x, v.y, v.z);
      }
      pos.needsUpdate = true;
      normal.needsUpdate = true;
      geo.computeBoundingSphere();
    },
  };
}

/** A limb's radius `t` of the way along `profile` (−0.5 to 0.5), scaled by its girth from `top` to `bottom`. */
function profileAt(profile: [number, number][], t: number, top: number, bottom = top): number {
  const y = Math.min(0.5, Math.max(-0.5, t - 0.5));
  const n = Math.max(
    1,
    profile.findIndex(([, py]) => py >= y)
  );
  const [r0, y0] = profile[n - 1];
  const [r1, y1] = profile[n];
  return (r0 + ((r1 - r0) * (y - y0)) / (y1 - y0)) * (top + (bottom - top) * t);
}

/**
 * How a drummer's upper arm hangs while they play, from the shoulder joint in
 * the torso's frame (the lead side): a little out from the side and back. The
 * arm is shaped for it, so it bends least from the shape it was made in.
 */
const REST_ARM: V3 = [0.28, -0.9, 0.3];
/** Turns straight down onto {@link REST_ARM}, and back. */
const TO_REST_ARM = new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(0, -1, 0),
  vec(REST_ARM).normalize()
);
const FROM_REST_ARM = TO_REST_ARM.clone().invert();

/**
 * An arm's flesh, shoulder to wrist, as one body, in the torso's frame with
 * the arm straight along {@link REST_ARM} from its joint (lead side, `+x` out,
 * `+z` back), as distance from its surface about the joint. In the arm's own
 * frame (straight down, the front `-z`): the upper arm slightly flatter side
 * to side than front to back, the biceps in front and the triceps behind; the
 * deltoid over the top of the joint, wrapping the front, the outside and the
 * back and tapering down the outside to its insertion a third of the way to
 * the elbow; the point of the elbow behind; the forearm full under the elbow
 * and flattening to the wrist. In the torso's: the trapezius running in from
 * over the joint toward the neck, and the flesh between the arm and the chest
 * and back that makes the folds of the armpit. Blended, so each runs into the
 * next without a seam.
 */
function armShape(girthOf: number, armpit = true): (v: THREE.Vector3) => number {
  const along = new THREE.Vector3();
  const g = girthOf;
  // the shoulder broadens less than the arm thickens: a heavy arm is not a wider frame
  const k = (1 + g) / 2;
  const L = BODY.upperArm;
  const F = BODY.forearm;
  return (at) => {
    // the arm's own, in its frame: the trunk's, in the torso's
    const v = along.copy(at).applyQuaternion(FROM_REST_ARM);
    const down = -v.y;
    // round at the elbow, and cut off softly under the deltoid, which is all there is over the joint
    const upper =
      Math.hypot(Math.hypot(v.x * 1.06, v.z * 0.97), Math.max(0, down - L)) -
      profileAt(UPPER_ARM, Math.min(1, Math.max(0, down / L)), g);
    let d = -blend(-upper, -(v.y + 0.025), 0.02);
    // wider than deep toward the wrist
    const t = Math.min(1, Math.max(0, (down - L) / F));
    const fore =
      Math.hypot(
        Math.hypot(v.x * (1 - 0.1 * t), v.z * (1 + 0.16 * t)),
        Math.max(0, L - down, down - L - F)
      ) - profileAt(FOREARM, t, g, Math.sqrt(g));
    d = blend(d, fore, 0.025);
    // cut square at the wrist, and on into the heel of the hand: wider and flatter than the wrist
    d = -blend(-d, -(down - L - F), 0.012);
    const sg = Math.sqrt(g);
    d = blend(d, toEllipsoid(v, [0, -L - F - 0.008, 0.002], [0.03 * sg, 0.028, 0.016 * sg]), 0.012);
    d = blend(d, toEllipsoid(v, [0, -0.15, -0.013], [0.033 * g, 0.075, 0.03 * g]), 0.016);
    d = blend(d, toEllipsoid(v, [0.004, -0.115, 0.015], [0.033 * g, 0.09, 0.031 * g]), 0.016);
    d = blend(d, toEllipsoid(v, [0.01, -0.054, 0.002], [0.047 * k, 0.07, 0.05 * k]), 0.034);
    d = blend(d, toEllipsoid(v, [0.014, -0.115, 0.002], [0.034 * g, 0.07, 0.034 * g]), 0.03);
    d = blend(d, toEllipsoid(v, [0, -L - 0.004, 0.024 * g], [0.017 * g, 0.024, 0.014 * g]), 0.012);
    // down from the neck to the acromion
    d = blend(
      d,
      toRod(at, [-0.055, 0.008, 0.012], [-0.002, -0.006, 0.008], 0.021 * k, 0.025 * k),
      0.035
    );
    if (armpit)
      d = blend(d, toEllipsoid(at, [-0.04, -0.035, 0.006], [0.045, 0.06, 0.072 * k]), 0.035);
    return d;
  };
}

/**
 * How much of a point on an arm goes with the upper arm rather than the
 * trunk, with the forearm rather than the upper arm, with the hand's roll
 * rather than the forearm's, and with the hand's bend at the wrist, by where
 * it is at rest (about the shoulder joint, lead side): toward the neck it is
 * the trunk's, the deltoid shared between them, round the elbow the two
 * bones'; the forearm rolls with the hand more and more toward the wrist, as
 * the radius turns over the ulna, and the heel of the hand bends with it.
 */
function armShares(at: THREE.Vector3): [number, number, number, number] {
  const v = at.clone().applyQuaternion(FROM_REST_ARM);
  const L = BODY.upperArm;
  const F = BODY.forearm;
  return [
    THREE.MathUtils.smoothstep(-v.y + 0.4 * v.x, -0.05, 0.08),
    THREE.MathUtils.smoothstep(-v.y, L - 0.035, L + 0.04),
    THREE.MathUtils.smoothstep(-v.y, L + 0.03, L + F),
    THREE.MathUtils.smoothstep(-v.y, L + F - 0.012, L + F + 0.006),
  ];
}

/** How far the top of the shoulder lifts with the arm raised to level, metres. */
const SHRUG = 0.025;

/**
 * How much of a point on an arm goes with the upper arm rather than the trunk
 * once the arm is raised to level, by where it is at rest (as
 * {@link armShares}): all of it under the arm, as the armpit opens to a
 * hollow between the chest and the back, and only some over the top, which
 * bunches as the shoulder lifts.
 */
function raisedShare(at: THREE.Vector3): number {
  const v = at.clone().applyQuaternion(FROM_REST_ARM);
  return THREE.MathUtils.smoothstep(-v.y + 0.25 * v.x, -0.07, 0);
}

/**
 * The trunk as distance from its surface, `proud` of it, in the torso's frame:
 * its rounded-square cross-section at each height, closed flat at the top.
 * Looked up by the millimetre up the trunk, as it is asked often each frame.
 * Given `facing`, it is set to the way the surface faces there, out of it.
 */
function trunkField(
  rings: Ring[],
  proud: number
): (p: THREE.Vector3, facing?: THREE.Vector3) => number {
  const bottom = rings[0].y;
  const top = rings[rings.length - 1].y;
  const steps = Math.ceil((top - bottom) / 0.001);
  const table = new Float32Array((steps + 1) * 3);
  for (let i = 0; i <= steps; i++) {
    const r = ringAt(rings, bottom + ((top - bottom) * i) / steps);
    table.set([r.w + proud, r.d + proud, r.z ?? 0], i * 3);
  }
  const q = TRUNK_SQUARE;
  return (p, facing) => {
    const at = (Math.min(top, Math.max(bottom, p.y)) - bottom) / (top - bottom);
    const n = Math.min(steps - 1, Math.floor(at * steps));
    const t = at * steps - n;
    const lerp = (c: number) => table[n * 3 + c] * (1 - t) + table[n * 3 + 3 + c] * t;
    const w = lerp(0);
    const d = lerp(1);
    const z0 = lerp(2);
    const x = Math.abs(p.x) / w + 1e-9;
    const z = Math.abs(p.z - z0) / d + 1e-9;
    const xq = x ** q;
    const zq = z ** q;
    const sum = xq + zq;
    const f = sum ** (1 / q);
    // out from the superellipse along its gradient, so it reads in metres on the flat sides and the round
    const grad = (f / sum) * Math.hypot(xq / x / w, zq / z / d);
    const out = (f - 1) / grad;
    if (p.y - top > out) {
      facing?.set(0, 1, 0);
      return p.y - top;
    }
    if (facing) {
      // up the superellipse's gradient, leaning as the cross-section widens, deepens or moves up it
      const k = f / sum;
      const fx = (k * xq * Math.sign(p.x)) / x / w;
      const fz = (k * zq * Math.sign(p.z - z0)) / z / d;
      const inside = p.y > bottom && p.y < top;
      const up = (c: number) =>
        inside ? ((table[n * 3 + 3 + c] - table[n * 3 + c]) * steps) / (top - bottom) : 0;
      const fy = (-k * xq * up(0)) / w - (k * zq * up(1)) / d - fz * up(2);
      facing.set(fx, fy, fz).normalize();
    }
    return out;
  };
}

/** How wide the fillet is where an arm's flesh runs into the trunk. */
const ARM_FILLET = 0.04;

/**
 * A shirt's cloth on an arm at the scale it is on the trunk: the share of the
 * weave's width that goes round the arm (the trunk takes all of it, and is
 * a little over twice round), and the height of the shirt the weave spans.
 */
const ARM_KNIT = 9 / 22;
const SHIRT_SPAN = 0.61;

/** How finely an arm is cut: rays round it, and rows over the shoulder, down the arm and round the wrist. */
const ARM_ROUND = 48;
const ARM_ROWS = { top: 22, down: 84, end: 8 };

interface ArmFlesh {
  mesh: THREE.Mesh;
  /** Bend it to the arm's joints, the trunk's share of it staying with `torso` (its matrix up to date). */
  bend: (torso: THREE.Object3D, a: ArmPose) => void;
}

/**
 * An arm, shoulder to wrist: the surface of {@link armShape}, found along rays
 * out from the arm's line — fanning over the top of the shoulder, out square
 * to the arm down its length, and fanning again round the wrist — and bent
 * each frame by {@link armShares}: about the shoulder, between the trunk and
 * the upper arm's swing, and about the elbow, between the upper arm and the
 * forearm. A shared point turns by its share of the turn, so the flesh
 * between stays full rather than folding. The upper arm turns on its own line
 * with the forearm, so the point of the elbow stays at the back of the bend.
 * In the shirt under a sleeve, a cyborg's metal on its machine side.
 */
function buildArmFlesh(
  hand: Hand,
  m: Materials,
  who: Persona,
  girthOf: number,
  rings: Ring[],
  bent: THREE.Material
): ArmFlesh {
  const side = hand === 'lead' ? 1 : -1;
  // a little under a T-shirt, clear of its folds, a robot's or a beast's cover over its trunk, else the skin
  const person = (who.kind ?? 'human') === 'human';
  const cover = !person && who.top !== 'bare' ? 0.004 : who.top === 'tee' ? -0.003 : 0;
  const body = trunkField(rings, cover);
  const L = BODY.upperArm;
  const reach = L + BODY.forearm;
  const rows: { at: number; up: number }[] = [];
  for (let i = 0; i < ARM_ROWS.top; i++)
    rows.push({ at: 0, up: Math.cos(((i / ARM_ROWS.top) * Math.PI) / 2) });
  const tee = who.top === 'tee';
  const hem = SLEEVE_TO * L;
  // a sleeve's hem a sharp step down to the arm, and its roll just above it
  const down = Array.from({ length: ARM_ROWS.down + 1 }, (_, i) => (reach * i) / ARM_ROWS.down);
  if (tee) down.push(hem - 0.008, hem - 0.004, hem - 0.0008, hem + 0.0008);
  for (const at of down.sort((p, q) => p - q)) rows.push({ at, up: 0 });
  /** How far a sleeve stands off the arm, `at` down it: none over the shoulder, most at the hem. */
  const slack = (at: number) =>
    !tee || at > hem
      ? 0
      : SLEEVE_SLACK * THREE.MathUtils.smoothstep(at, 0.03, hem - 0.004) +
        SLEEVE_ROLL * bell((at - (hem - 0.004)) / 0.004);
  for (let i = 1; i <= ARM_ROWS.end; i++)
    rows.push({ at: reach, up: -Math.sin(((i / ARM_ROWS.end) * Math.PI) / 2) });
  const rest = new Float32Array(rows.length * ARM_ROUND * 3);
  const from = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const v = new THREE.Vector3();
  /** The surface of `far` along each row's rays, into `into`: the rows down to `to` along the arm. */
  const surfaceOf = (far: (v: THREE.Vector3) => number, into: Float32Array, to = Infinity) =>
    rows.forEach((row, i) => {
      if (row.at > to) return;
      from.set(0, -row.at, 0).applyQuaternion(TO_REST_ARM);
      const across = Math.sqrt(Math.max(0, 1 - row.up * row.up));
      for (let j = 0; j < ARM_ROUND; j++) {
        // from the inside of the arm, against the trunk, where its cloth's seam is
        const th = (2 * Math.PI * j) / ARM_ROUND + Math.PI;
        dir.set(across * Math.cos(th), row.up, across * Math.sin(th)).applyQuaternion(TO_REST_ARM);
        // out to the first of the surface, then halve onto it
        let inside = 0;
        let out = 0.006;
        while (out < 0.25 && far(v.copy(from).addScaledVector(dir, out)) < 0) {
          inside = out;
          out += 0.006;
        }
        for (let n = 0; n < 11; n++) {
          const mid = (inside + out) / 2;
          if (far(v.copy(from).addScaledVector(dir, mid)) < 0) inside = mid;
          else out = mid;
        }
        v.copy(from).addScaledVector(dir, (inside + out) / 2 + slack(row.at));
        into.set([side * v.x, v.y, v.z], (i * ARM_ROUND + j) * 3);
      }
    });
  surfaceOf(armShape(girthOf), rest);
  // and as it is with the arm raised: the flesh filling the armpit is the chest's and the back's,
  // stretched thin as the arm goes up, not carried up under it
  const lifted = Float32Array.from(rest);
  surfaceOf(armShape(girthOf, false), lifted, 0.14);
  const index: number[] = [];
  // the shirt to the sleeve's hem, and the step in under it
  const shirt: number[] = [];
  for (let i = 0; i < rows.length - 1; i++)
    for (let j = 0; j < ARM_ROUND; j++) {
      const a = i * ARM_ROUND + j;
      const b = a + ARM_ROUND;
      const a1 = i * ARM_ROUND + ((j + 1) % ARM_ROUND);
      const b1 = a1 + ARM_ROUND;
      // outward on either side: mirroring the lead side's turns its faces in
      const quad = side === 1 ? [a, a1, b, a1, b1, b] : [a, b, a1, a1, b, b1];
      (tee && rows[i].at < hem ? shirt : index).push(...quad);
    }
  // a shirt's knit at the scale it has on the trunk: round the arm, and down it over the surface
  const uv = new Float32Array(rows.length * ARM_ROUND * 2);
  for (let j = 0; j < ARM_ROUND; j++) {
    let down = 0;
    for (let i = 0; i < rows.length; i++) {
      const a = (i * ARM_ROUND + j) * 3;
      if (i > 0)
        down += Math.hypot(
          rest[a] - rest[a - ARM_ROUND * 3],
          rest[a + 1] - rest[a + 1 - ARM_ROUND * 3],
          rest[a + 2] - rest[a + 2 - ARM_ROUND * 3]
        );
      uv.set([(j / ARM_ROUND) * ARM_KNIT, -down / SHIRT_SPAN], (i * ARM_ROUND + j) * 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(rest), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute(SKIN_REST, new THREE.BufferAttribute(rest, 3));
  geo.setIndex([...shirt, ...index]);
  const machine = who.cyborg === 'full' || (who.cyborg === 'arm' && hand === 'lead');
  const skin = machine ? m.metal : bent;
  let mat: THREE.Material | THREE.Material[] = skin;
  if (tee) {
    geo.addGroup(0, shirt.length, 0);
    geo.addGroup(shirt.length, index.length, 1);
    mat = [m.shirt, skin];
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.name = 'arm';
  const pos = geo.getAttribute('position');
  // each point's shares, in steps a turn is worked out for each frame
  const STEPS = 24;
  const shares = Array.from({ length: pos.count }, (_, i) =>
    armShares(v.set(side * rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2])).map((s) =>
      Math.round(s * STEPS)
    )
  );
  // and the upper arm's share with the arm raised, from the rest's toward it as it rises
  const raisedShares = Array.from({ length: pos.count }, (_, i) =>
    raisedShare(v.set(side * rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]))
  );
  // and how far it lifts as the shoulder blade turns up under a raised arm: the top of the
  // shoulder, over the joint, and less of it in toward the neck, under the shirt's shoulder
  const shrugs = Array.from({ length: pos.count }, (_, i) => {
    v.set(side * rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]);
    return (
      SHRUG *
      THREE.MathUtils.smoothstep(v.y, -0.05, 0) *
      THREE.MathUtils.smoothstep(v.x, -0.08, -0.01)
    );
  });
  // how wide the fillet onto the trunk is at each point: round the top of the arm, none down it
  const downArm = vec(REST_ARM).normalize();
  const nudge = new THREE.Vector3();
  const shoulderAt = vec(BODY.shoulder);
  const fillet = Array.from({ length: pos.count }, (_, i) => {
    v.set(side * rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]);
    // a machine's arm meets the flesh at its socket, not grown into it
    if (machine && person) return 0;
    // nor any of it too far from the trunk at rest to come to it as the arm swings
    if (body(nudge.copy(v).add(shoulderAt)) > 0.09) return 0;
    return ARM_FILLET * (1 - THREE.MathUtils.smoothstep(v.dot(downArm), 0.15, 0.28));
  });
  // and which way is out from each at rest, and with the arm raised: turned with each point
  // each frame, rather than worked out again from the posed surface
  pos.array.set(lifted);
  geo.computeVertexNormals();
  const liftedNormal = Float32Array.from(geo.getAttribute('normal').array);
  pos.array.set(rest);
  geo.computeVertexNormals();
  const restNormal = Float32Array.from(geo.getAttribute('normal').array);
  const normal = geo.getAttribute('normal');
  const joint = vec(BODY.shoulder);
  joint.x *= side;
  // the arm's line at rest, and its front: the way the elbow bends the forearm
  const rested = vec(REST_ARM).normalize();
  rested.x *= side;
  const front = new THREE.Vector3(0, 0, -1).applyQuaternion(TO_REST_ARM);
  front.x *= side;
  // the hand as the arm was shaped for it: on along the forearm, its back to the arm's back
  const handBack = front.clone().negate();
  const handRest = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(
      new THREE.Vector3().crossVectors(handBack, rested),
      handBack,
      rested
    )
  );
  const twists = Array.from({ length: STEPS + 1 }, () => new THREE.Quaternion());
  const wrists = Array.from({ length: STEPS + 1 }, () => new THREE.Quaternion());
  const roll = new THREE.Quaternion();
  const toHand = new THREE.Quaternion();
  const expected = new THREE.Quaternion();
  const fixed = new THREE.Vector3();
  const swing = new THREE.Quaternion();
  const flex = new THREE.Quaternion();
  const turns = Array.from({ length: STEPS + 1 }, () => new THREE.Quaternion());
  const pivots = Array.from({ length: STEPS + 1 }, () => new THREE.Vector3());
  const bends = Array.from({ length: STEPS + 1 }, () => new THREE.Quaternion());
  const was = new THREE.Matrix4();
  const now = new THREE.Matrix4();
  const a0 = new THREE.Vector3();
  const f0 = new THREE.Vector3();
  const a1 = new THREE.Vector3();
  const f1 = new THREE.Vector3();
  const fore = new THREE.Vector3();
  const side0 = new THREE.Vector3();
  const side1 = new THREE.Vector3();
  const u = new THREE.Vector3();
  const p0 = new THREE.Vector3();
  const out = new THREE.Vector3();
  const slope = new THREE.Vector3();
  const least = new THREE.Vector3();
  const facing = new THREE.Vector3();
  const inTorso = new THREE.Matrix4();
  const hang = new THREE.Vector3();
  const at = new THREE.Vector3();
  const bend = (torso: THREE.Object3D, a: ArmPose) => {
    inTorso.copy(torso.matrix).invert();
    fixed.copy(joint).applyMatrix4(torso.matrix);
    a0.copy(rested).applyQuaternion(torso.quaternion);
    f0.copy(front).applyQuaternion(torso.quaternion);
    a1.subVectors(a.elbow, a.shoulder).normalize();
    fore.subVectors(a.wrist, a.elbow).normalize();
    // the front where the forearm goes, as far as the elbow is bent; else the least turn's
    swing.setFromUnitVectors(a0, a1);
    least.copy(f0).applyQuaternion(swing);
    f1.copy(fore).addScaledVector(a1, -fore.dot(a1));
    const bent = THREE.MathUtils.smoothstep(f1.length(), 0.1, 0.4);
    f1.normalize()
      .multiplyScalar(bent)
      .addScaledVector(least, 1 - bent);
    f1.addScaledVector(a1, -f1.dot(a1)).normalize();
    side0.crossVectors(a0, f0);
    side1.crossVectors(a1, f1);
    was.makeBasis(a0, f0, side0);
    now.makeBasis(a1, f1, side1);
    swing.setFromRotationMatrix(now.multiply(was.transpose()));
    flex.setFromUnitVectors(a1, fore);
    // how far the arm is raised: from hanging, up past halfway to level, to level and over
    const raised = THREE.MathUtils.smoothstep(
      a1.angleTo(hang.set(0, -1, 0).applyQuaternion(torso.quaternion)),
      1,
      1.5
    );
    for (let n = 0; n <= STEPS; n++) {
      turns[n].identity().slerp(swing, n / STEPS);
      pivots[n].lerpVectors(fixed, a.shoulder, n / STEPS);
      bends[n].identity().slerp(flex, n / STEPS);
    }
    // how the hand is turned from where the forearm carries it: its roll about the forearm, then its bend
    expected
      .copy(bends[STEPS])
      .multiply(turns[STEPS])
      .multiply(torso.quaternion)
      .multiply(handRest);
    toHand.copy(a.hand).multiply(expected.invert());
    if (toHand.w < 0) toHand.set(-toHand.x, -toHand.y, -toHand.z, -toHand.w);
    const along = toHand.x * fore.x + toHand.y * fore.y + toHand.z * fore.z;
    roll.set(fore.x * along, fore.y * along, fore.z * along, toHand.w);
    if (roll.lengthSq() < 1e-12) roll.identity();
    else roll.normalize();
    toHand.multiply(expected.copy(roll).invert());
    for (let n = 0; n <= STEPS; n++) {
      twists[n].identity().slerp(roll, n / STEPS);
      wrists[n].identity().slerp(toHand, n / STEPS);
    }
    for (let i = 0; i < pos.count; i++) {
      const [hanging, e, t, h] = shares[i];
      const n =
        raised > 0 ? Math.round(hanging + (raisedShares[i] * STEPS - hanging) * raised) : hanging;
      u.fromArray(rest, i * 3);
      facing.fromArray(restNormal, i * 3);
      if (raised > 0) {
        u.lerp(at.fromArray(lifted, i * 3), raised);
        u.y += shrugs[i] * raised;
        facing.lerp(at.fromArray(liftedNormal, i * 3), raised);
      }
      u.applyQuaternion(torso.quaternion).applyQuaternion(turns[n]);
      facing.applyQuaternion(torso.quaternion).applyQuaternion(turns[n]);
      u.add(pivots[n]);
      if (e > 0) {
        u.sub(a.elbow).applyQuaternion(bends[e]).add(a.elbow);
        facing.applyQuaternion(bends[e]);
      }
      if (t > 0 || h > 0) {
        u.sub(a.wrist).applyQuaternion(twists[t]).applyQuaternion(wrists[h]).add(a.wrist);
        facing.applyQuaternion(twists[t]).applyQuaternion(wrists[h]);
      }
      // wider as the arm rises, filling between the trunk's shoulder and the arm going out from it
      const k = fillet[i] * (1 + raised);
      if (k > 0) {
        p0.copy(u).applyMatrix4(inTorso);
        // and which way the trunk faces there
        const trunkIn = body(p0, slope);
        if (trunkIn < k) {
          // swelling out as the two run together, as much as their smooth union would, and on
          // through the trunk's skin unbroken, so it crosses it smoothly, easing off deep inside
          const h = Math.min(1, (k - trunkIn) / k);
          const deep = THREE.MathUtils.smoothstep(trunkIn, -k, 0);
          out
            .fromArray(restNormal, i * 3)
            .applyQuaternion(torso.quaternion)
            .applyQuaternion(turns[n]);
          u.addScaledVector(out, ((h * h * k) / 4) * deep);
          slope.applyQuaternion(torso.quaternion);
          // shaded as the trunk where they meet, so the skin runs on over the join
          facing.normalize().lerp(slope, 1 - THREE.MathUtils.smoothstep(trunkIn, 0, k));
        }
      }
      pos.setXYZ(i, u.x, u.y, u.z);
      facing.normalize();
      normal.setXYZ(i, facing.x, facing.y, facing.z);
    }
    pos.needsUpdate = true;
    normal.needsUpdate = true;
    geo.computeBoundingSphere();
  };
  return { mesh, bend };
}

/** A phalanx: a short cylinder from its joint along `+z`, with a knuckle at the far end. */
function phalanx(
  length: number,
  radius: number,
  m: THREE.Material,
  nail?: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  // rounded at both ends, so each knuckle is the two bones meeting, not a seam
  const geo = new THREE.CapsuleGeometry(radius, length, 4, 12);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, length / 2);
  // a little flatter across the palm side than round
  geo.scale(1, 0.88, 1);
  const bone = new THREE.Mesh(geo, m);
  bone.castShadow = true;
  g.add(bone);
  const tip = ball(radius * 0.97, m, 12);
  tip.scale.set(1, 0.88, 1);
  tip.position.z = length;
  g.add(tip);
  if (nail) {
    // on the back of the last bone, toward its tip
    const n = ball(radius * 0.78, nail, 12);
    n.scale.set(1, 0.32, 1.25);
    n.position.set(0, radius * 0.72, length * 0.72);
    g.add(n);
  }
  return g;
}

/**
 * Wrist to knuckles, as cross-sections forward along `z`: `[forward, half-width,
 * half-thickness, raised]`. Narrow at the heel of the hand, widest across the
 * knuckles, thinning to them; the back of the hand is `+y`.
 */
const PALM: [number, number, number, number][] = [
  [-0.004, 0.02, 0.01, 0],
  [0.006, 0.027, 0.014, 0],
  [0.025, 0.037, 0.019, -0.001],
  [0.05, 0.042, 0.019, -0.001],
  [0.075, 0.044, 0.016, 0],
  [0.094, 0.043, 0.013, 0],
  [0.104, 0.036, 0.009, 0],
];

interface HandRig {
  group: THREE.Group;
  /** Each finger's joints, knuckle out. */
  fingers: THREE.Group[][];
  thumb: THREE.Group;
  /** The thumb's end joint. */
  thumbTip: THREE.Group;
  /** Which side of `x` the thumb is on. */
  side: 1 | -1;
}

/**
 * A hand in the frame the pose solves (`z` to the knuckles, `y` out of the
 * back of the hand); `thumb` is which side of `x` the thumb is on.
 */
function buildHand(thumb: 1 | -1, skin: THREE.Material, nail?: THREE.Material): HandRig {
  const group = new THREE.Group();
  group.name = 'hand';
  group.add(forwardLoft(PALM, skin));

  const fingers = DIGITS.map((f) => {
    const joints: THREE.Group[] = [];
    let parent: THREE.Object3D = group;
    f.lengths.forEach((len, k) => {
      const joint = new THREE.Group();
      if (k === 0) {
        joint.position.set(f.x * thumb, KNUCKLE_Y, KNUCKLE_Z);
        joint.rotation.y = -f.x * thumb * SPLAY; // a little splay from the middle
      } else {
        joint.position.z = f.lengths[k - 1];
      }
      // tapering to the tip, the last bone wearing the nail
      joint.add(phalanx(len, f.r * (1 - 0.07 * k), skin, k === 2 ? nail : undefined));
      parent.add(joint);
      joints.push(joint);
      parent = joint;
    });
    return joints;
  });

  const thumbBase = new THREE.Group();
  // its base inside the heel of the hand, as a thumb's is
  thumbBase.position.set(thumb * THUMB_BASE[0], THUMB_BASE[1], THUMB_BASE[2]);
  thumbBase.rotation.set(...thumbTurn(thumb, 'american'), 'YXZ');
  const t1 = phalanx(0.042, 0.0115, skin);
  thumbBase.add(t1);
  const t2 = new THREE.Group();
  t2.position.z = 0.042;
  t2.rotation.x = THUMB_TIP;
  t2.add(phalanx(0.032, 0.0105, skin, nail));
  t1.add(t2);
  group.add(thumbBase);
  // the pad of the thumb's muscle, under the palm on its side
  const pad = ball(0.02, skin, 16);
  pad.scale.set(1, 0.72, 1.5);
  pad.position.set(thumb * 0.024, -0.009, 0.034);
  group.add(pad);

  return { group, fingers, thumb: thumbBase, thumbTip: t2, side: thumb };
}

export interface ArmRig {
  upper: THREE.Mesh;
  elbow: THREE.Mesh;
  forearm: THREE.Mesh;
  wrist: THREE.Mesh;
  hand: HandRig;
  stick: THREE.Mesh;
  bead: THREE.Mesh;
}

/** The bead at the stick's tip, metres: a 5B's, a touch big so it reads at a distance. */
export const BEAD_RADIUS = 0.0085;

/**
 * A stick's profile, butt (`y` −0.5) to tip (+0.5) of a unit length that
 * `place` stretches to the stick: full width for most of its length, then the
 * taper to the shoulder under the bead. A 5B is 15 mm across; this is a little
 * heavier than that so the sticks carry their weight on screen.
 */
const STICK_PROFILE: [number, number][] = [
  [0, -0.5],
  [0.0086, -0.5],
  [0.009, -0.47],
  [0.009, 0.18],
  [0.0068, 0.36],
  [0.0045, 0.47],
  [0.004, 0.5],
];

export function stickGeometry(): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    STICK_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
    16
  );
}

export function buildArm(hand: Hand, m: Materials, who: Persona): ArmRig {
  const stick = new THREE.Mesh(stickGeometry(), m.wood);
  stick.castShadow = true;
  const g = SHAPES[who.build].arm;
  // a cyborg's arm is metal, its elbow and wrist lit
  const machine = who.cyborg === 'full' || (who.cyborg === 'arm' && hand === 'lead');
  const skin = machine ? m.metal : m.skin;
  const joint = machine ? m.glow : skin;
  // a machine has no nails
  const nail = machine
    ? undefined
    : new THREE.MeshStandardMaterial({
        color: m.skin.color.clone().lerp(new THREE.Color('#fff2ee'), 0.45),
        roughness: 0.3,
      });
  return {
    // an arm on its own, as the grip guide shows it: the drummer's is one body (`buildArmFlesh`),
    // keeping only the lit elbow of a machine's
    upper: limb(girth(UPPER_ARM, g), skin, 36),
    elbow: ball(0.0355 * g * (machine ? 0.92 : 1), joint, 18),
    forearm: limb(girth(FOREARM, g, Math.sqrt(g)), skin),
    wrist: ball(0.025 * Math.sqrt(g) * (machine ? 0.92 : 1), joint, 16),
    hand: buildHand(hand === 'lead' ? 1 : -1, skin, nail),
    stick,
    bead: ball(BEAD_RADIUS, m.wood, 12),
  };
}

export function poseArm(rig: ArmRig, a: ArmPose): void {
  place(rig.upper, a.shoulder, a.elbow);
  rig.elbow.position.copy(a.elbow);
  place(rig.forearm, a.elbow, a.wrist);
  poseHand(rig, a);
}

/** An arm's wrist, hand and stick: all a drummer whose arm is one body (`buildArmFlesh`) poses of it. */
function poseHand(rig: ArmRig, a: ArmPose): void {
  // a wrist is wider than it is deep, and turns with the hand
  rig.wrist.position.copy(a.wrist);
  rig.wrist.quaternion.copy(a.hand);
  rig.wrist.scale.set(1.08, 0.74, 1);
  rig.hand.group.position.copy(a.wrist);
  rig.hand.group.quaternion.copy(a.hand);
  const set = handSetOf(a, rig.hand.side);
  bendFingers(rig.hand.fingers, set);
  rig.hand.thumb.rotation.set(...set.thumb, 'YXZ');
  rig.hand.thumbTip.rotation.x = set.thumbTip;
  placeStick(rig.stick, rig.bead, a);
}

interface LegRig {
  hip: THREE.Mesh;
  thigh: THREE.Mesh;
  knee: THREE.Mesh;
  shin: THREE.Mesh;
  ankle: THREE.Mesh;
  /** Heel to ball, and the toe box: the shoe bends at the ball as the heel comes up. */
  shoe: THREE.Group;
  toes: THREE.Group;
  /** What is worn over the limb between two of its points: a pair of shorts' leg, a sock, a boot's shaft. */
  over: { mesh: THREE.Mesh; span: (l: LegPose) => [THREE.Vector3, THREE.Vector3] }[];
  /** A trouser leg, hanging on past the ankle over the shoe. */
  hem: boolean;
}

/** Along a leg from `a` toward `b`, `t` of the way (past either end below 0 or over 1). */
const toward = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t);

/** Further along the shin than the ankle, by `d` metres (back up it, for a negative `d`). */
const pastAnkle = (l: LegPose, d: number) =>
  l.ankle.clone().addScaledVector(new THREE.Vector3().subVectors(l.ankle, l.knee).normalize(), d);

/**
 * How a shin of build girth `g` is scaled `up` metres above the ankle (below
 * it, for a negative `up`): `g` at the knee easing to `√g` at the ankle, as
 * `girth(SHIN, g, √g)` has it, so what is worn round it keeps to it.
 */
const shinScale = (g: number, up: number) =>
  g + (Math.sqrt(g) - g) * Math.min(1, 1 - up / BODY.shin);

/**
 * A leg in what `who` wears: trousers to a hem over the shoe; or shorts over a
 * bare thigh, the knee and shin bare, with a sock to the ankle — and on the
 * foot, trainers or boots. A robot or a beast is plated or furred to the
 * floor, on plain feet.
 */
function buildLeg(m: Materials, g: number, who: Persona, sock: THREE.Material): LegRig {
  const person = (who.kind ?? 'human') === 'human';
  const shorts = person && who.legs === 'shorts';
  const feet = buildShoe(m, person ? (who.footwear ?? 'trainers') : 'plain', Math.sqrt(g));
  const over: LegRig['over'] = [];
  if (shorts) {
    const leg = limb(girth(SHORTS_LEG, g), m.jeans, 28);
    leg.name = 'shorts';
    over.push({
      mesh: leg,
      span: (l) => [toward(l.hip, l.knee, -0.12), toward(l.hip, l.knee, 0.66)],
    });
    // as full as the calf it is pulled up over, from the ankle to its ribbed top
    const s = limb(girth(SOCK, Math.sqrt(g), shinScale(g, SOCK_UP)), sock, 20);
    s.name = 'sock';
    over.push({ mesh: s, span: (l) => [pastAnkle(l, 0.03), pastAnkle(l, -SOCK_UP)] });
  }
  if (feet.shaft) {
    const shaft = feet.shaft;
    over.push({ mesh: shaft, span: (l) => [pastAnkle(l, SHAFT_BELOW), pastAnkle(l, -SHAFT_UP)] });
  }
  // bare from the shorts down: the knee and the calf
  const legs = shorts ? m.skin : m.jeans;
  return {
    hip: ball(0.08 * g, m.jeans, 20),
    thigh: limb(girth(THIGH, g * (shorts ? 0.96 : 1)), legs, 22),
    knee: ball((shorts ? 0.049 : 0.053) * g, legs, 18),
    shin:
      person && !shorts
        ? limb(girth(TROUSER_SHIN, g, Math.sqrt(g)), legs, 22)
        : limb(girth(SHIN, g, Math.sqrt(g)), legs, 22),
    ankle: ball(0.037 * Math.sqrt(g), legs, 14),
    shoe: feet.shoe,
    toes: feet.toes,
    over,
    hem: person && !shorts,
  };
}

const UP = new THREE.Vector3(0, 1, 0);

function poseLeg(rig: LegRig, l: LegPose): void {
  rig.hip.position.copy(l.hip);
  place(rig.thigh, l.hip, l.knee);
  rig.knee.position.copy(l.knee);
  // a trouser leg hangs on past the ankle, over the shoe
  place(rig.shin, l.knee, rig.hem ? pastAnkle(l, HEM_PAST) : l.ankle);
  rig.ankle.position.copy(l.ankle);
  for (const o of rig.over) place(o.mesh, ...o.span(l));
  // the shoe runs heel to ball, and the toe box on from the ball, each sole on its line
  const side = new THREE.Vector3().crossVectors(UP, new THREE.Vector3().subVectors(l.ball, l.heel));
  alongFoot(rig.shoe, l.heel, l.ball, side);
  alongFoot(rig.toes, l.ball, l.toe, side);
}

function alongFoot(
  piece: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  side: THREE.Vector3
): void {
  const fwd = new THREE.Vector3().subVectors(to, from).normalize();
  const s = side
    .clone()
    .sub(fwd.clone().multiplyScalar(side.dot(fwd)))
    .normalize();
  const up = new THREE.Vector3().crossVectors(fwd, s).normalize();
  piece.position.copy(from);
  piece.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(s, up, fwd));
}

interface HeadRig {
  head: THREE.Group;
  /** Each eye with its lid: a blink squashes the lot. */
  eyes: Record<1 | -1, THREE.Object3D>;
  brows: Record<1 | -1, THREE.Mesh>;
  /** Draw the mouth `smile` (0–1) of the way into a smile, shaping any word it is saying. */
  mouth: (smile: number, speak: Speak) => void;
}

/** How far a smile lifts the corners of the mouth, radians, and parts the lips, metres. */
const SMILE_LIFT = 0.42;
const SMILE_PART = 0.0055;
/** How far a word drops the lower lip and lifts the upper, metres, and how much a rounded one purses the lips. */
const WORD_DROP = 0.0095;
const WORD_LIFT = 0.0018;
const WORD_PURSE = 0.35;

/** How far the brows go up for a hello, metres. */
const BROW_RAISE = 0.009;
const BROW_Y = 0.138;

/** The skull: a sphere this big, squashed by {@link SKULL_SCALE}, its centre this high in the head. */
const SKULL_R = 0.1;
const SKULL_SCALE: V3 = [0.84, 1.12, 0.98];
const SKULL_Y = 0.1;

const UP_Y = new THREE.Vector3(0, 1, 0);

const bell = (t: number) => Math.exp(-t * t);

/**
 * How far the skull's surface stands out from an egg, as a share of its
 * radius, in direction `(x, y, z)` (unit length; the face looks down `-z`):
 * the bone under the face, and the hollows between. Sockets for the eyes,
 * the ridge of the brow over them and the bridge of the nose between them;
 * the temples, hollow behind the outer corners of the eyes; cheekbones high
 * and out to the sides, with the cheeks hollowing under them; the jaw's
 * angle below the ear and its line running down to the chin, the throat
 * tucked in under it; the mouth carried forward on the teeth, and a chin.
 * One smooth surface — the face is shaped, not stuck on. A woman's (`soft`)
 * has a lighter brow, higher, fuller cheekbones, a gentler jaw and a
 * smaller, narrower chin.
 */
function relief(x: number, y: number, z: number, soft = false): number {
  const front = Math.max(0, -z);
  const ax = Math.abs(x);
  // the face and the sides of the head, not the back of the skull
  const face = THREE.MathUtils.smoothstep(-z, -0.35, 0.1);
  // where the jaw's lower edge runs: from the angle under the ear down to the chin
  const jawLine = -0.84 + 0.3 * Math.min(1, ax / 0.74);
  const sockets = -0.075 * bell((ax - 0.38) / 0.15) * bell((y - 0.13) / 0.13) * front ** 2;
  const brow =
    (soft ? 0.014 : 0.03) * bell(ax / 0.5) * bell((y - 0.27) / (soft ? 0.07 : 0.055)) * front;
  const bridge = 0.018 * bell(x / 0.09) * bell((y - 0.16) / 0.07) * front;
  const temples = -0.028 * bell((ax - 0.74) / 0.13) * bell((y - 0.26) / 0.15) * face;
  const cheekbones =
    (soft ? 0.065 : 0.058) *
    bell((ax - 0.56) / 0.14) *
    bell((y + (soft ? 0.02 : 0.05)) / 0.1) *
    front;
  // the cheeks hollowing under the cheekbones, and the face narrowing below them to the jaw
  const hollows =
    -(soft ? 0.025 : 0.04) * bell((ax - 0.62) / 0.15) * bell((y + 0.32) / 0.12) * front -
    0.05 * THREE.MathUtils.smoothstep(ax, 0.45, 0.85) * bell((y + 0.4) / 0.2) * face;
  // the angle of the jaw, and its edge running forward to the chin
  const angle = (soft ? 0.035 : 0.065) * bell((ax - 0.74) / 0.14) * bell((y + 0.58) / 0.11) * face;
  const jaw = (soft ? 0.012 : 0.022) * bell((y - jawLine) / 0.09) * face;
  // tucked in under the jaw, where the throat runs back from it
  const under = -(soft ? 0.03 : 0.045) * THREE.MathUtils.smoothstep(jawLine - y, 0.06, 0.2) * face;
  const muzzle = 0.045 * bell(x / 0.38) * bell((y + 0.42) / 0.2) * front;
  const chin =
    (soft ? 0.085 : 0.13) * bell(x / (soft ? 0.24 : 0.3)) * bell((y + 0.8) / 0.13) * front;
  return (
    sockets + brow + bridge + temples + cheekbones + hollows + angle + jaw + under + muzzle + chin
  );
}

/** Push a sphere of radius {@link SKULL_R}, centred on the origin, out into the head's shape (a woman's if `soft`). */
function sculpt(geo: THREE.BufferGeometry, soft = false): THREE.BufferGeometry {
  const p = geo.getAttribute('position');
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    n.copy(v).normalize();
    v.multiplyScalar(1 + relief(n.x, n.y, n.z, soft));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * The colour in a face, as a tint over the skin at each point of the skull
 * (`sculpt`ed, unit radius before scaling): the cheeks, the nose's root and
 * round the mouth flushed warmer, where the blood is nearest the surface;
 * under the eyes a shade cooler and darker; the forehead a touch paler.
 */
function complexion(geo: THREE.BufferGeometry): void {
  const p = geo.getAttribute('position');
  const colour = new Float32Array(p.count * 3);
  const n = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    n.fromBufferAttribute(p, i).normalize();
    const front = Math.max(0, -n.z);
    const ax = Math.abs(n.x);
    const cheeks = bell((ax - 0.5) / 0.2) * bell((n.y + 0.15) / 0.18) * front;
    const mouth = bell(n.x / 0.3) * bell((n.y + 0.42) / 0.14) * front;
    const nose = bell(n.x / 0.15) * bell((n.y - 0.02) / 0.16) * front;
    const under = bell((ax - 0.36) / 0.13) * bell((n.y - 0.0) / 0.06) * front;
    const brow = bell((n.y - 0.45) / 0.2) * front;
    const warm = 0.9 * cheeks + 0.45 * mouth + 0.5 * nose;
    colour.set(
      [
        (1 + 0.035 * warm) * (1 - 0.06 * under) * (1 + 0.02 * brow),
        (1 - 0.09 * warm) * (1 - 0.07 * under) * (1 + 0.02 * brow),
        (1 - 0.08 * warm) * (1 - 0.03 * under) * (1 + 0.025 * brow),
      ],
      i * 3
    );
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colour, 3));
}

/** The skin of a face: the body's, tinted by its {@link complexion}. */
function faceSkin(skin: THREE.Material): THREE.Material {
  if (!(skin instanceof THREE.MeshPhysicalMaterial)) return skin;
  const face = skin.clone();
  face.vertexColors = true;
  skinDetail(face);
  return face;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const o = new THREE.Mesh(geo, mat);
  o.castShadow = true;
  return o;
}

/** A cone standing out of the skull along `dir` (head frame, unit length). */
function spike(dir: THREE.Vector3, r: number, h: number, mat: THREE.Material): THREE.Mesh {
  const o = mesh(new THREE.ConeGeometry(r, h, 8), mat);
  o.quaternion.setFromUnitVectors(UP_Y, dir);
  const [sx, sy, sz] = SKULL_SCALE;
  o.position
    .set(dir.x * SKULL_R * sx, SKULL_Y + dir.y * SKULL_R * sy, dir.z * SKULL_R * sz)
    .addScaledVector(dir, h * 0.4);
  return o;
}

/** A cap over the crown and the back of the head, `r` round, down to `reach` of a half turn. */
function cover(r: number, reach: number, mat: THREE.Material): THREE.Mesh {
  const o = mesh(new THREE.SphereGeometry(r, 28, 16, 0, Math.PI * 2, 0, Math.PI * reach), mat);
  o.scale.set(0.9, 1.1, 1.02);
  o.position.set(0, 0.115, 0.012);
  o.rotation.x = 0.35;
  return o;
}

/** Short hair. */
const hairCap = (m: Materials) => cover(0.107, 0.55, m.hair);

/**
 * A lock of hair: a tube along a smooth curve through `points` (head frame),
 * `root` thick where it leaves the head and tapering to `tip` at its end.
 * Its texture runs root to tip along `v`, which is the way the strands
 * drawn on the hair material lie.
 */
function lockGeometry(
  points: THREE.Vector3[],
  root: number,
  tip: number,
  around = 6,
  along = 12
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(along, false);
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const p = new THREE.Vector3();
  for (let k = 0; k <= along; k++) {
    const t = k / along;
    curve.getPointAt(t, p);
    // full most of the way, thinning toward the end
    const r = root + (tip - root) * t ** 1.6;
    for (let i = 0; i <= around; i++) {
      const a = (i / around) * Math.PI * 2;
      const n = frames.normals[k]
        .clone()
        .multiplyScalar(Math.cos(a))
        .addScaledVector(frames.binormals[k], Math.sin(a));
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      uv.push(i / around, t);
    }
  }
  for (let k = 0; k < along; k++) {
    for (let i = 0; i < around; i++) {
      const a = k * (around + 1) + i;
      const b = a + around + 1;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Locks of hair, one mesh: each lock a list of points (head frame), root to
 * tip. Should they ever not merge, each is its own mesh rather than any lost.
 */
function locks(
  paths: THREE.Vector3[][],
  root: number,
  tip: number,
  mat: THREE.Material
): THREE.Object3D {
  const parts = paths.map((pts) => lockGeometry(pts, root, tip));
  const merged = mergeGeometries(parts);
  if (!merged) {
    const group = new THREE.Group();
    for (const g of parts) group.add(mesh(g, mat));
    return group;
  }
  for (const g of parts) g.dispose();
  return mesh(merged, mat);
}

/** A point on the skull's surface (pushed out by `out`), toward `around` (0 the back, + to the lead side) and `up` (radians). */
function onScalp(around: number, up: number, out = 1): THREE.Vector3 {
  const [sx, sy, sz] = SKULL_SCALE;
  return new THREE.Vector3(
    SKULL_R * sx * out * Math.cos(up) * Math.sin(around),
    SKULL_Y + SKULL_R * sy * out * Math.sin(up),
    SKULL_R * sz * out * Math.cos(up) * Math.cos(around)
  );
}

/**
 * A bunch of locks gathered at `from` (head frame) — a ponytail, a pigtail —
 * and running through `through` to the end, `count` of them, each spread out
 * up to `width` from the middle line and wandering a little, seeded.
 */
function bunch(
  from: V3,
  through: V3[],
  count: number,
  width: number,
  seed: number
): THREE.Vector3[][] {
  const rnd = makeRng(seed);
  return Array.from({ length: count }, () => {
    const a = rnd() * Math.PI * 2;
    const r = width * Math.sqrt(rnd());
    const [dx, dz] = [Math.cos(a) * r, Math.sin(a) * r];
    // tight at the tie, fanning out toward the end, a few shorter than the rest
    const short = 1 - 0.25 * rnd() * rnd();
    const pts = [vec(from)];
    through.forEach((p, k) => {
      const fan = (k + 1) / through.length;
      const at = vec(p).lerp(vec(from), (1 - short) * fan);
      pts.push(
        at.add(new THREE.Vector3(dx * (0.5 + fan), (rnd() - 0.5) * 0.006, dz * (0.5 + fan)))
      );
    });
    return pts;
  });
}

/**
 * Tight curls over a ball of hair: its surface pushed in and out by a few
 * waves at angles to each other, coarse and fine, so its outline is a mass of
 * bumps rather than a smooth dome.
 */
function curls(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const p = geo.getAttribute('position');
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    n.copy(v).normalize();
    const coarse = Math.abs(
      Math.sin(23 * n.x + 1.3) * Math.sin(19 * n.y + 0.7) * Math.sin(29 * n.z + 2.1)
    );
    const fine = Math.abs(
      Math.sin(53 * n.x + 0.4) * Math.sin(47 * n.y + 1.1) * Math.sin(61 * n.z + 0.9)
    );
    v.multiplyScalar(0.97 + 0.07 * coarse + 0.035 * fine);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Long hair falling from the crown: `count` locks rooted round the back and
 * sides of the scalp, `spread` radians either way of the back, out over the
 * skull and down to `to` (head-frame height), each a little wavy and its own
 * length, seeded so the same player has the same hair.
 */
function fall(
  count: number,
  spread: number,
  to: number,
  seed: number,
  out = 1.12
): THREE.Vector3[][] {
  const rnd = makeRng(seed);
  const paths: THREE.Vector3[][] = [];
  for (let i = 0; i < count; i++) {
    const around = -spread + (2 * spread * (i + 0.5)) / count + (rnd() - 0.5) * 0.08;
    // the sides hang clear of the face: they fall from further back and lower down
    const side = Math.abs(Math.sin(around));
    const root = onScalp(around, 0.95 - 0.35 * side + (rnd() - 0.5) * 0.15, 1.02);
    const over = onScalp(around, 0.1, out + 0.05 * rnd());
    const end = to - 0.05 * rnd();
    const wave = (rnd() - 0.5) * 0.02;
    const hang = (y: number, push: number) => {
      const p = onScalp(around, 0, out + push);
      // hanging straight down from the widest of the head, a little in behind the jaw
      return new THREE.Vector3(p.x * (1 - 0.15 * side), y, p.z + 0.012 * (1 - side));
    };
    const mid = hang(SKULL_Y - 0.08, 0.02);
    mid.x += wave;
    const low = hang((SKULL_Y - 0.08 + end) / 2, 0.04);
    low.x -= wave;
    paths.push([root, over, mid, low, hang(end, 0.06)]);
  }
  return paths;
}

/** What hangs off the head and swings as it moves (see `swishOf`): found by name. */
const SWING = 'hair-swing';

/**
 * Hair that swings: `pieces` (head frame) hung from `pivot`, swinging `give`
 * times as far as the swish says — a ponytail further than a mass of curls.
 */
function swinging(pivot: V3, give: number, pieces: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.name = SWING;
  g.position.set(...pivot);
  g.userData.give = give;
  for (const p of pieces) {
    p.position.sub(g.position);
    g.add(p);
  }
  return g;
}

/** A hairstyle, in the head's frame: the face looks down `-z`. */
function hairFor(style: HairStyle, m: Materials): THREE.Object3D[] {
  switch (style) {
    case 'bald':
      return [];
    case 'crop':
      return [hairCap(m)];
    case 'mohawk': {
      // a crest of fins from the brow over the crown to the nape
      const fins: THREE.Object3D[] = [];
      for (let i = 0; i < 9; i++) {
        const a = -0.55 + i * 0.32;
        fins.push(spike(new THREE.Vector3(0, Math.cos(a), Math.sin(a)), 0.026, 0.11, m.hair));
      }
      return fins;
    }
    case 'spikes': {
      const out: THREE.Object3D[] = [hairCap(m)];
      const rings: [number, number][] = [
        [0, 1],
        [0.55, 7],
        [1.05, 9],
      ];
      for (const [el, n] of rings) {
        for (let i = 0; i < n; i++) {
          const ph = (i / n) * Math.PI * 2 + el;
          const d = new THREE.Vector3(
            Math.sin(el) * Math.sin(ph),
            Math.cos(el),
            Math.sin(el) * Math.cos(ph)
          );
          // none down over the face
          if (d.z < -0.6 && el > 1) continue;
          out.push(spike(d, 0.022, 0.1, m.hair));
        }
      }
      return out;
    }
    case 'afro': {
      const fro = mesh(curls(new THREE.SphereGeometry(0.14, 72, 54)), m.hair);
      fro.scale.set(1.12, 1, 1);
      fro.position.set(0, 0.19, 0.05);
      // big hair: it shifts on the head rather than swinging out from it
      return [swinging([0, 0.1, 0.03], 0.35, [fro])];
    }
    case 'long': {
      // a mass behind, so the locks over it never show the neck through them
      const back = mesh(new THREE.CapsuleGeometry(0.08, 0.2, 6, 18), m.hair);
      back.scale.set(1, 1, 0.5);
      back.position.set(0, 0.03, 0.05);
      const hangs = locks(fall(34, 1.85, -0.16, 0x1f2e3d), 0.014, 0.004, m.hair);
      // all of it from the crown
      return [hairCap(m), swinging([0, 0.16, 0.03], 1, [back, hangs])];
    }
    case 'bun': {
      const bun = ball(0.048, m.hair, 16);
      bun.position.set(0, 0.225, 0.06);
      return [hairCap(m), bun];
    }
    case 'pigtails': {
      const out: THREE.Object3D[] = [hairCap(m)];
      for (const side of [-1, 1]) {
        const tie = ball(0.018, m.accent, 10);
        tie.position.set(side * 0.09, 0.16, 0.04);
        const tail = locks(
          bunch(
            [side * 0.09, 0.16, 0.04],
            [
              [side * 0.125, 0.13, 0.05],
              [side * 0.16, 0.07, 0.055],
              [side * 0.185, 0, 0.05],
            ],
            9,
            0.014,
            side > 0 ? 0x2a3b : 0x3b4c
          ),
          0.008,
          0.003,
          m.hair
        );
        out.push(tie, swinging([side * 0.09, 0.16, 0.04], 1.3, [tail]));
      }
      return out;
    }
    case 'quiff': {
      /* Grown out of the scalp as a beard is, rather than built of locks: one
         mass rising steeply off the hairline into a roll over the brow and
         lying back flatter over the crown, fullest in the middle and lower
         toward the temples. Thin locks each caught the light on every side and
         read grey, and laid over the top they met at the crown in a point. */
      const quiff = grow(
        {
          mask: (d) =>
            ramp(0.45, 0.6, d.y) * ramp(0.72, 0.5, Math.abs(d.x)) * ramp(0.55, 0.25, d.z),
          depth: (d) => 0.01 + 0.032 * ramp(0.25, -0.55, d.z) * ramp(0.6, 0.15, Math.abs(d.x)),
          tuck: 0.002,
        },
        m.hair
      );
      quiff.name = 'quiff';
      return [hairCap(m), quiff];
    }
    case 'ponytail': {
      const tie = ball(0.016, m.accent, 10);
      tie.position.set(0, 0.17, 0.1);
      const tail = locks(
        bunch(
          [0, 0.17, 0.1],
          [
            [0, 0.15, 0.14],
            [0, 0.09, 0.165],
            [0, 0.02, 0.165],
            [0, -0.04, 0.15],
          ],
          12,
          0.016,
          0x4d5e
        ),
        0.009,
        0.003,
        m.hair
      );
      return [hairCap(m), tie, swinging([0, 0.17, 0.1], 1.3, [tail])];
    }
    case 'bob': {
      // round the back and the sides to the jaw, open over the face
      const bob = mesh(
        new THREE.SphereGeometry(SKULL_R, 28, 14, -0.35, Math.PI + 0.7, 0, Math.PI * 0.66),
        m.hair
      );
      const [sx, sy, sz] = SKULL_SCALE;
      bob.scale.set(sx * 1.12, sy * 1.06, sz * 1.1);
      bob.position.y = SKULL_Y;
      return [hairCap(m), bob];
    }
    case 'mullet': {
      // business in front, party at the back
      const party = mesh(new THREE.CapsuleGeometry(0.065, 0.1, 6, 14), m.hair);
      party.scale.set(1.1, 1, 0.5);
      party.position.set(0, 0.02, 0.07);
      const lengths = locks(fall(16, 0.95, -0.1, 0x5f6e, 1.04), 0.013, 0.004, m.hair);
      return [hairCap(m), swinging([0, 0.09, 0.07], 0.9, [party, lengths])];
    }
    case 'shag': {
      // a wild crest bursting up and out of the crown, and fluffy tufts over the cheeks
      const out: THREE.Object3D[] = [cover(0.112, 0.52, m.hair)];
      const tufts: THREE.Object3D[] = [];
      const crest: [number, number][] = [
        [0, 0],
        [0.45, 0],
        [0.45, 1.25],
        [0.45, 2.5],
        [0.45, 3.75],
        [0.45, 5],
        [0.8, 0.6],
        [0.8, 1.9],
        [0.8, 3.2],
        [0.8, 4.5],
        [0.8, 5.7],
      ];
      for (const [el, ph] of crest) {
        const d = new THREE.Vector3(
          Math.sin(el) * Math.sin(ph),
          Math.cos(el),
          Math.sin(el) * Math.cos(ph)
        );
        const tuft = spike(d, 0.03, 0.08, m.hair);
        tuft.geometry.dispose();
        tuft.geometry = new THREE.CapsuleGeometry(0.03, 0.06 - 0.02 * el, 4, 10);
        tufts.push(tuft);
      }
      // the crest tosses about the middle of the head; the tufts over the cheeks stay put
      out.push(swinging([0, SKULL_Y, 0], 0.4, tufts));
      for (const side of [-1, 1]) {
        for (const [y, z, tilt] of [
          [0.07, -0.03, 0.9],
          [0.035, -0.015, 1.15],
        ]) {
          const cheek = mesh(new THREE.CapsuleGeometry(0.022, 0.035, 4, 10), m.hair);
          cheek.position.set(side * 0.085, y, z);
          cheek.rotation.z = side * tilt;
          out.push(cheek);
        }
      }
      return out;
    }
    case 'dreads': {
      // round the sides and back, none over the face: thick ropes, each its own length,
      // the ends hanging out from the head
      const rnd = makeRng(0x6a7b);
      const ropes: THREE.Vector3[][] = [];
      for (let i = 0; i < 22; i++) {
        const around = -1.9 + (i / 21) * 3.8 + (rnd() - 0.5) * 0.1;
        const end = -0.06 - 0.06 * rnd();
        const root = onScalp(around, 0.75 + (rnd() - 0.5) * 0.3, 1.02);
        const over = onScalp(around, 0.15, 1.1);
        const low = onScalp(around, 0, 1.22);
        low.y = end;
        const mid = over.clone().lerp(low, 0.5);
        mid.x += (rnd() - 0.5) * 0.015;
        ropes.push([root, over, mid, low]);
      }
      return [hairCap(m), swinging([0, 0.15, 0.02], 1, [locks(ropes, 0.012, 0.008, m.hair)])];
    }
  }
}

/**
 * Facial hair is grown out of the face, not stuck on it: a copy of the skull's
 * surface, kept only where the style has hair, thickened outward there and let
 * hang below the chin. At its edges it thins to nothing and tucks just under the
 * skin, so a beard comes out of the cheek the way hair does — no rim, no seam —
 * and it follows the cheekbone down to the jaw rather than cutting across the face.
 */
interface Growth {
  /** How much hair there is, 0–1, toward `d` from the skull's centre (unit length; the face looks down `-z`). */
  mask: (d: THREE.Vector3) => number;
  /** How far it stands off the skin where it is full, metres. */
  depth: (d: THREE.Vector3) => number;
  /** How far it hangs below the chin where it is longest, metres, how much of that each part takes, and how far it draws in to a point (0–1). */
  hang?: { length: number; at: (d: THREE.Vector3) => number; point: number };
  /** How far a bare edge sits under the skin, metres: 0 for stubble, which is only a shade on it. */
  tuck?: number;
}

/** A smooth step from `a` to `b` (either way round). */
function ramp(a: number, b: number, x: number): number {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

/** Round the head from the front, radians: 0 straight ahead, π/2 at the ear. */
const around = (d: THREE.Vector3) => Math.atan2(Math.abs(d.x), -d.z);

/** Seeded-looking lumps across the surface, about -1..1, `f` how fine. */
function clump(d: THREE.Vector3, f: number): number {
  return (
    0.5 * Math.sin(f * 1.7 * d.x + 3.1 * Math.sin(f * 0.6 * d.y)) +
    0.3 * Math.sin(f * 2.3 * d.y + f * 1.1 * d.z + 1.3) +
    0.2 * Math.sin(f * 3.7 * d.x - f * 2.9 * d.z)
  );
}

/**
 * Below the line a full beard grows from: under the nose, down to the corners of
 * the mouth, then up along under the cheekbone to the sideburn in front of the ear.
 * Bare round the lips, and none behind the jaw.
 */
function fullBeard(d: THREE.Vector3): number {
  const a = around(d);
  const top = -0.25 - 0.06 * ramp(0.15, 0.45, a) + 0.37 * ramp(0.45, 1.4, a);
  const below = ramp(top + 0.04, top - 0.04, d.y);
  // in front of the ear up the sides; further back round the jaw's angle
  const reach = 1.42 + 0.5 * ramp(-0.4, -0.9, d.y);
  return below * ramp(reach + 0.06, reach - 0.1, a) * lipsBare(d);
}

/** The lips and a little round them, bare. */
function lipsBare(d: THREE.Vector3): number {
  if (d.z > 0) return 1;
  const e = Math.hypot(d.x / 0.26, (d.y + 0.465) / 0.07);
  return ramp(0.85, 1.2, e);
}

/** Under the nose and just over the upper lip: `wide` how far round toward the cheeks. */
function moustacheBand(d: THREE.Vector3, wide: number): number {
  return ramp(-0.2, -0.26, d.y) * ramp(-0.44, -0.4, d.y) * ramp(wide + 0.1, wide - 0.05, around(d));
}

/** The chin and round the mouth to meet the moustache. */
function chinPatch(d: THREE.Vector3): number {
  const a = around(d);
  return ramp(0.5, 0.38, a) * ramp(-0.34, -0.4, d.y) * ramp(-0.97, -0.88, d.y) * lipsBare(d);
}

/** Grow `g` out of the face, in the head's frame (a woman's if `soft`). */
function grow(g: Growth, mat: THREE.Material, soft = false): THREE.Mesh {
  const geo = sculpt(new THREE.SphereGeometry(SKULL_R, 96, 72), soft);
  const [sx, sy, sz] = SKULL_SCALE;
  geo.scale(sx, sy, sz);
  geo.translate(0, SKULL_Y, 0);
  geo.computeVertexNormals();
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const tuck = g.tuck ?? 0.0015;
  const amount = new Float32Array(pos.count);
  const colour = new Float32Array(pos.count * 4);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    d.set(p.x / sx, (p.y - SKULL_Y) / sy, p.z / sz).normalize();
    const w = g.mask(d);
    amount[i] = w;
    // thicker in clumps, thinning to nothing (and just under the skin) at the edge
    const thick = w * (g.depth(d) * (1 + 0.35 * clump(d, 9)) + tuck) - tuck;
    p.addScaledVector(n, thick);
    if (g.hang) {
      const k = g.hang.at(d) * w;
      // a ragged hem, not a cut one
      const drop = g.hang.length * k * (1 + 0.22 * Math.sin(37 * d.x) * Math.cos(11 * d.x + 2));
      p.y -= drop;
      p.z -= drop * 0.3;
      p.x *= 1 - 0.6 * g.hang.point * k;
    }
    pos.setXYZ(i, p.x, p.y, p.z);
    // darker at the roots of the edge, and tufts a shade lighter or darker than the rest
    const shade = (0.6 + 0.4 * w) * (0.9 + 0.1 * clump(d, 31));
    colour.set([shade, shade, shade, w], i * 4);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colour, 4));
  // only the faces with hair on them
  const index = geo.getIndex();
  if (index) {
    const kept: number[] = [];
    for (let t = 0; t < index.count; t += 3) {
      const [a, b, c] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
      if (amount[a] > 0.002 || amount[b] > 0.002 || amount[c] > 0.002) kept.push(a, b, c);
    }
    geo.setIndex(kept);
  }
  geo.computeVertexNormals();
  const o = mesh(geo, mat);
  o.name = 'beard';
  return o;
}

/**
 * Hair texture for a beard: fine streaks running down it, drawn once onto a
 * canvas, for the light to catch along. Skipped where there is no canvas (the
 * tests run in Node).
 */
function strandTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 256);
  const rng = makeRng(0x6b3a91c1);
  for (let i = 0; i < 5000; i++) {
    const shade = Math.round(50 + 170 * rng());
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 0.6 + rng();
    const x = rng() * 512;
    const y = rng() * 256;
    const len = 12 + 50 * rng();
    ctx.beginPath();
    ctx.moveTo(x, y);
    // a little curl in each
    ctx.quadraticCurveTo(x + (rng() - 0.5) * 6, y + len / 2, x + (rng() - 0.5) * 4, y + len);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

/** Stubble's grain: dark dots on a faint shadow. */
function grainTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = 'rgb(95,95,95)';
  ctx.fillRect(0, 0, 512, 512);
  const rng = makeRng(0x2f9e4d17);
  for (let i = 0; i < 14000; i++) {
    const shade = Math.round(170 + 85 * rng());
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(rng() * 512, rng() * 512, 1.2, 1.2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/** A beard's material: the hair's colour, matt, with the light running along the strands. */
function beardMaterial(m: Materials): THREE.MeshPhysicalMaterial {
  const strands = strandTexture();
  return new THREE.MeshPhysicalMaterial({
    color: m.hair.color,
    roughness: 0.85,
    sheen: 0.7,
    sheenRoughness: 0.45,
    sheenColor: m.hair.color.clone().lerp(new THREE.Color('#ffffff'), 0.3),
    vertexColors: true,
    bumpMap: strands,
    bumpScale: 2.5,
    roughnessMap: strands,
  });
}

/** A handlebar's waxed tip: out from the corner of the mouth, curling up, tapering to a point. */
function handlebarTip(side: 1 | -1, mat: THREE.Material): THREE.Mesh {
  const points: V3[] = [
    [0.026, 0.058, -0.094],
    [0.042, 0.054, -0.088],
    [0.056, 0.058, -0.08],
    [0.063, 0.068, -0.075],
    [0.061, 0.078, -0.075],
    [0.054, 0.077, -0.078],
  ];
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(side * x, y, z))
  );
  const segments = 28;
  const radial = 8;
  // a tube of radius 1, each ring then shrunk to the taper
  const geo = new THREE.TubeGeometry(curve, segments, 1, radial, false);
  const pos = geo.getAttribute('position');
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    curve.getPointAt(i / segments, c);
    const r = 0.0062 * (1 - 0.85 * (i / segments) ** 0.8);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return mesh(geo, mat);
}

function beardFor(beard: Beard, m: Materials): THREE.Object3D[] {
  switch (beard) {
    case 'none':
      return [];
    case 'stubble': {
      // a shadow with a grain to it, not a beard: dark under the skin, whatever colour the hair is dyed
      const grain = grainTexture();
      const shadow = new THREE.MeshStandardMaterial({
        color: m.skin.color.clone().multiplyScalar(0.3).lerp(new THREE.Color('#1a1410'), 0.5),
        roughness: 1,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        vertexColors: true,
        alphaMap: grain,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
      const shade = grow(
        {
          mask: (d) => Math.max(fullBeard(d), moustacheBand(d, 0.5)),
          depth: () => 0.0006,
          tuck: 0,
        },
        shadow
      );
      shade.castShadow = false;
      return [shade];
    }
    case 'goatee':
      return [
        grow(
          {
            mask: (d) => Math.max(moustacheBand(d, 0.38), chinPatch(d)),
            depth: (d) => 0.005 + 0.002 * moustacheBand(d, 0.38),
            hang: { length: 0.016, at: (d) => ramp(-0.6, -0.95, d.y), point: 0.5 },
          },
          beardMaterial(m)
        ),
      ];
    case 'handlebar': {
      const mat = beardMaterial(m);
      return [
        grow({ mask: (d) => moustacheBand(d, 0.32), depth: () => 0.0065 }, mat),
        handlebarTip(1, mat),
        handlebarTip(-1, mat),
      ];
    }
    case 'full':
    case 'viking': {
      const viking = beard === 'viking';
      return [
        grow(
          {
            mask: (d) => Math.max(fullBeard(d), moustacheBand(d, 0.45)),
            // close at the sideburns, fuller down the jaw, and a moustache over the lip
            depth: (d) => 0.0035 + 0.0075 * ramp(-0.1, -0.8, d.y) + 0.003 * moustacheBand(d, 0.45),
            hang: viking
              ? {
                  length: 0.13,
                  at: (d) => ramp(-0.45, -0.95, d.y) * ramp(1.6, 0.3, around(d)),
                  point: 0.85,
                }
              : {
                  length: 0.035,
                  at: (d) => ramp(-0.55, -0.95, d.y) * ramp(1.5, 0.4, around(d)),
                  point: 0.2,
                },
          },
          beardMaterial(m)
        ),
      ];
    }
  }
}

/** Where the lead-side eye sits in the head, and the socket the plate leaves open round it. */
const LIT_EYE: V3 = [0.032, 0.115, -0.086];

/**
 * Half a cyborg's face: a metal plate over the lead side, from the cheekbone up
 * over the temple, grown out of the skull as a beard is but cut sharp at the
 * edge, open round the eye, and a ring round that eye where it meets the plate.
 */
function facePlate(m: Materials, soft: boolean): THREE.Object3D[] {
  const eye = new THREE.Vector3(...LIT_EYE);
  const plate = grow(
    {
      mask: (d) => {
        // the lead side only, from the cheekbone to over the crown, not behind the ear
        const side = ramp(0.02, 0.06, d.x);
        const span = ramp(-0.3, -0.26, d.y) * ramp(0.86, 0.82, d.y);
        const front = ramp(1.75, 1.68, around(d));
        // open round the eye
        const p = new THREE.Vector3(d.x * 0.084, SKULL_Y + d.y * 0.112, d.z * 0.098);
        const socket = ramp(0.017, 0.02, Math.hypot(p.x - eye.x, p.y - eye.y));
        return side * span * front * socket;
      },
      depth: () => 0.003,
      tuck: 0.0008,
    },
    m.metal,
    soft
  );
  plate.name = 'plate';
  const ring = mesh(new THREE.TorusGeometry(0.0175, 0.0026, 10, 28), m.metal);
  ring.position.set(eye.x, eye.y, eye.z - 0.007);
  ring.rotation.y = -0.25;
  return [plate, ring];
}

/**
 * Part of a hat turned on a lathe from `profile` (radius, height; anticlockwise,
 * so it faces out), round `turn` radians either side of the back (+z), then
 * each point moved by `shape` — a brim's curl, a crown's crease — and smoothed
 * over the seam.
 */
function turned(
  profile: [number, number][],
  shape: (v: THREE.Vector3) => void,
  turn = Math.PI
): THREE.BufferGeometry {
  const lathe = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    48,
    -turn,
    2 * turn
  );
  lathe.deleteAttribute('uv');
  lathe.deleteAttribute('normal');
  const geo = mergeVertices(lathe);
  const p = geo.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    shape(v.fromBufferAttribute(p, i));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** A brim's cross-section: flat from `inner` out to `outer`, `thick` deep, rolled round at the edge. */
function brimProfile(inner: number, outer: number, thick: number): [number, number][] {
  const flat = (k: number) => inner + ((outer - inner - thick / 2) * k) / 8;
  const out: [number, number][] = [];
  for (let k = 0; k <= 8; k++) out.push([flat(k), 0]);
  for (let k = 1; k < 8; k++) {
    const a = -Math.PI / 2 + (Math.PI * k) / 8;
    out.push([
      outer - thick / 2 + (thick / 2) * Math.cos(a),
      thick / 2 + (thick / 2) * Math.sin(a),
    ]);
  }
  for (let k = 8; k >= 0; k--) out.push([flat(k), thick]);
  return out;
}

/** How far out along a brim a point is, 0 at `inner` to 1 at `outer`, and how much it is to the side rather than front or back. */
function brimAt(v: THREE.Vector3, inner: number, outer: number): { out: number; side: number } {
  const r = Math.hypot(v.x, v.z);
  return {
    out: Math.min(1, Math.max(0, (r - inner) / (outer - inner))),
    side: r > 0 ? (v.x / r) ** 2 : 0,
  };
}

/** Each of a hat's parts sat `y` up the head, tipped back by `tilt`. */
function worn(parts: THREE.Mesh[], y: number, tilt: number): THREE.Mesh[] {
  for (const o of parts) {
    o.position.set(0, y, 0.005);
    o.rotation.x = tilt;
  }
  return parts;
}

/**
 * A baseball cap's peak, lying out along +z from the band: a slice of a
 * brim, tapered to a point at each end, its inner edge the band's curve, and
 * arched across so the sides droop.
 */
function peakGeometry(): THREE.BufferGeometry {
  const inner = 0.1;
  const turn = 1.0;
  return turned(
    brimProfile(inner, 0.165, 0.005),
    (v) => {
      const a = Math.atan2(v.x, v.z);
      const u = a / turn;
      const r = inner + (Math.hypot(v.x, v.z) - inner) * Math.sqrt(Math.max(0, 1 - u * u));
      v.x = r * Math.sin(a);
      v.z = r * Math.cos(a) * 1.13;
      v.y -= 1.4 * v.x * v.x;
    },
    turn
  );
}

function hatFor(hat: Hat, m: Materials): THREE.Object3D[] {
  switch (hat) {
    case 'beanie': {
      const pom = ball(0.028, m.accent, 12);
      pom.position.set(0, 0.25, 0.03);
      return [cover(0.114, 0.52, m.accent), pom];
    }
    case 'cap': {
      // on backwards: the peak comes off the band at the nape, drooping a little
      const button = ball(0.009, m.accent, 10);
      button.scale.y = 0.45;
      button.position.set(0, 0.229, 0.054);
      button.rotation.x = 0.35;
      const peak = mesh(peakGeometry(), m.accent);
      peak.position.set(0, 0.124, 0.015);
      peak.rotation.x = 0.3;
      return [cover(0.112, 0.46, m.accent), button, peak];
    }
    case 'cowboy': {
      // the brim's sides rolled up, dipping front and back; the crown pinched at
      // the front and creased down the middle
      const brim = turned(brimProfile(0.088, 0.19, 0.006), (v) => {
        const { out, side } = brimAt(v, 0.088, 0.19);
        v.y += 0.05 * out * out * side - 0.012 * out * (1 - side);
        v.z *= 1.1;
      });
      const crown = turned(
        [
          [0.094, 0],
          [0.092, 0.04],
          [0.088, 0.08],
          [0.084, 0.104],
          [0.076, 0.117],
          [0.05, 0.123],
          [0.025, 0.125],
          [0, 0.125],
        ],
        (v) => {
          v.y -= 0.032 * bell(v.x / 0.03) * ramp(0.06, 0.12, v.y);
          if (v.z < 0) v.x *= 1 - 0.22 * ramp(0.03, 0.12, v.y) * ramp(0, -0.09, v.z);
          v.z *= 1.1;
        }
      );
      const band = turned(
        [
          [0.0955, 0.004],
          [0.0935, 0.024],
        ],
        (v) => {
          v.z *= 1.1;
        }
      );
      return worn([mesh(brim, m.accent), mesh(crown, m.accent), mesh(band, m.black)], 0.165, 0.1);
    }
    case 'tophat': {
      // a crown waisted a little and flaring to the top; the brim's sides curled up
      const brim = turned(brimProfile(0.08, 0.13, 0.006), (v) => {
        const { out, side } = brimAt(v, 0.08, 0.13);
        v.y += 0.024 * out * out * side - 0.006 * out * (1 - side);
        v.z *= 1.08;
      });
      const crown = turned(
        [
          [0.084, 0],
          [0.081, 0.05],
          [0.08, 0.1],
          [0.083, 0.16],
          [0.086, 0.188],
          [0.084, 0.192],
          [0.06, 0.193],
          [0, 0.193],
        ],
        (v) => {
          v.z *= 1.08;
        }
      );
      const band = turned(
        [
          [0.0862, 0.005],
          [0.0838, 0.034],
        ],
        (v) => {
          v.z *= 1.08;
        }
      );
      return worn([mesh(brim, m.black), mesh(crown, m.black), mesh(band, m.accent)], 0.18, 0.06);
    }
    case 'bandana': {
      const knot = ball(0.024, m.accent, 10);
      knot.position.set(0, 0.12, 0.115);
      const out: THREE.Object3D[] = [cover(0.11, 0.5, m.accent), knot];
      for (const side of [-1, 1]) {
        const end = mesh(new THREE.CapsuleGeometry(0.012, 0.06, 4, 8), m.accent);
        end.position.set(side * 0.02, 0.085, 0.13);
        end.rotation.set(-0.3, 0, side * 0.3);
        out.push(end);
      }
      return out;
    }
  }
}

function accessoriesFor(who: Persona, m: Materials): THREE.Object3D[] {
  const out: THREE.Object3D[] = who.hat ? hatFor(who.hat, m) : [];
  if (who.shades) {
    for (const side of [-1, 1]) {
      const lens = mesh(new RoundedBoxGeometry(0.038, 0.024, 0.006, 2, 0.003), m.lens);
      lens.position.set(side * 0.033, 0.116, -0.097);
      lens.rotation.y = side * -0.18;
      out.push(lens);
    }
    const bridge = mesh(new THREE.BoxGeometry(0.03, 0.004, 0.004), m.lens);
    bridge.position.set(0, 0.122, -0.1);
    out.push(bridge);
  }
  if (who.headband) {
    const band = mesh(new THREE.TorusGeometry(0.09, 0.011, 8, 32), m.accent);
    band.rotation.x = Math.PI / 2 - 0.2;
    band.scale.set(0.88, 1, 1);
    band.position.set(0, 0.155, 0.005);
    out.push(band);
  }
  if (who.earrings) {
    // hoops below the headphones
    for (const side of [-1, 1]) {
      const hoop = mesh(new THREE.TorusGeometry(0.015, 0.0028, 6, 16), m.gold);
      hoop.rotation.y = Math.PI / 2;
      hoop.position.set(side * 0.088, 0.045, 0.012);
      out.push(hoop);
    }
  }
  return out;
}

/** A capsule from `a` to `b`, `r` round. */
function bar(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  const d = new THREE.Vector3().subVectors(b, a);
  const o = mesh(new THREE.CapsuleGeometry(r, Math.max(1e-3, d.length() - 2 * r), 4, 10), mat);
  o.position.copy(a).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(UP_Y, d.normalize());
  return o;
}

/**
 * An eye: the white, the iris on it, and the upper lid hooding it. A cyborg's
 * is dark, lit from inside. A woman's has a larger iris and a dark lash line
 * along the lid's edge.
 */
function buildEye(m: Materials, lit = false, female = false): THREE.Group {
  const eye = new THREE.Group();
  eye.name = 'eye';
  eye.add(ball(0.0145, lit ? m.black : m.sclera, 14));
  const iris = ball(lit ? 0.0095 : female ? 0.0094 : 0.0088, lit ? m.glow : m.eye, 12);
  iris.position.set(0, -0.0008, -0.0115);
  eye.add(iris);
  const lid = mesh(
    new THREE.SphereGeometry(0.0158, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.47),
    m.skin
  );
  lid.rotation.x = -0.45;
  eye.add(lid);
  if (female && !lit) {
    // round the front of the lid's edge, tilted with it: half a ring, laid flat and turned forward
    const lashes = new THREE.Group();
    lashes.rotation.x = -0.45;
    const line = mesh(new THREE.TorusGeometry(0.0159, 0.0012, 6, 20, Math.PI), m.black);
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.0015;
    lashes.add(line);
    eye.add(lashes);
  }
  return eye;
}

/**
 * How one lip runs from the middle (`t` 0) out to its corner (`t` 1), metres
 * about its hinge: the lower and upper edge of the red of it, how far it
 * stands forward, and how far back it is drawn round the teeth.
 */
interface LipLine {
  low: (t: number) => number;
  high: (t: number) => number;
  out: (t: number) => number;
  back: (t: number) => number;
}

/** Where the two lips meet at the corners, about each one's hinge. */
const LIP_CORNER = 0.005;

/**
 * The upper lip: its lower edge dipping to a bead in the middle, its upper
 * edge the cupid's bow — a notch in the middle, a peak each side of it — then
 * thinning out to the corner.
 */
function upperLip(full: number): LipLine {
  return {
    low: (t) => -LIP_CORNER - 0.0004 * (1 - t) - 0.0013 * bell(t / 0.2),
    high: (t) =>
      -LIP_CORNER +
      0.0128 *
        full *
        Math.pow(Math.max(0, 1 - t ** 3), 0.8) *
        (0.86 + 0.16 * bell((t - 0.3) / 0.16) - 0.1 * bell(t / 0.09)),
    out: (t) => 0.0006 + 0.0034 * full * Math.sqrt(Math.max(0, 1 - t * t)),
    back: (t) => 0.0065 * t * t,
  };
}

/** The lower lip: fuller in the middle, rounding off toward the corners. */
function lowerLip(full: number): LipLine {
  return {
    low: (t) =>
      LIP_CORNER -
      0.0128 * full * Math.pow(Math.max(0, 1 - t ** 2.2), 0.75) * (0.9 + 0.14 * bell(t / 0.35)),
    high: (t) => LIP_CORNER + 0.0018 * (1 - t * t),
    out: (t) => 0.0006 + 0.0038 * full * Math.sqrt(Math.max(0, 1 - t * t)),
    back: (t) => 0.0065 * t * t,
  };
}

/**
 * One side of a lip, `half` long from the middle to the corner, centred on its
 * own origin: a round section from `line`, flatter behind where it meets the
 * face, starting a touch past the middle so the two sides overlap there.
 */
function halfLip(line: LipLine, half: number, side: 1 | -1): THREE.BufferGeometry {
  const ALONG = 18;
  const ROUND = 20;
  const pos: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= ALONG; i++) {
    const t = -0.08 + (1.08 * i) / ALONG;
    const a = Math.abs(t);
    const mid = (line.low(a) + line.high(a)) / 2;
    const tall = Math.max(0.0003, (line.high(a) - line.low(a)) / 2);
    for (let j = 0; j <= ROUND; j++) {
      const th = (2 * Math.PI * j) / ROUND;
      const fore = Math.cos(th);
      const z = line.back(a) - line.out(a) * fore * (fore > 0 ? 1 : 0.6);
      pos.push(side * (t - 0.5) * half, mid + tall * Math.sin(th), z);
    }
  }
  for (let i = 0; i < ALONG; i++)
    for (let j = 0; j < ROUND; j++) {
      const a = i * (ROUND + 1) + j;
      const b = a + ROUND + 1;
      // the same faces outward whichever way the side runs
      if (side === -1) index.push(a, b, a + 1, a + 1, b, b + 1);
      else index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/**
 * A lip: two halves hinged at the middle, so a smile can lift each corner
 * — the lip bends up into a curve rather than the whole of it moving.
 */
function lip(
  y: number,
  z: number,
  half: number,
  line: LipLine,
  mat: THREE.Material
): { group: THREE.Group; halves: Record<1 | -1, THREE.Group> } {
  const group = new THREE.Group();
  group.name = 'lip';
  group.position.set(0, y, z);
  const hinge = (side: 1 | -1) => {
    const g = new THREE.Group();
    const o = mesh(halfLip(line, half, side), mat);
    // the half's middle, so its corner is twice as far out
    o.position.x = (side * half) / 2;
    g.add(o);
    group.add(g);
    return g;
  };
  return { group, halves: { 1: hinge(1), [-1]: hinge(-1) } };
}

/** Signed distance from `p` to an ellipsoid at `c`, `r` round each way (near enough off it). */
function toEllipsoid(p: THREE.Vector3, c: V3, r: V3): number {
  const x = (p.x - c[0]) / r[0];
  const y = (p.y - c[1]) / r[1];
  const z = (p.z - c[2]) / r[2];
  const k0 = Math.hypot(x, y, z);
  const k1 = Math.hypot(x / r[0], y / r[1], z / r[2]);
  return k1 === 0 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1;
}

/** Signed distance from `p` to a rod from `a` to `b`, `ra` round at one end and `rb` at the other. */
function toRod(p: THREE.Vector3, a: V3, b: V3, ra: number, rb: number): number {
  const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const pa = [p.x - a[0], p.y - a[1], p.z - a[2]];
  const t = Math.min(
    1,
    Math.max(
      0,
      (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / (ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2)
    )
  );
  return Math.hypot(pa[0] - ba[0] * t, pa[1] - ba[1] * t, pa[2] - ba[2] * t) - (ra + (rb - ra) * t);
}

/** The nearer of two distances, blended over `k` so the shapes run into each other. */
function blend(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
}

/** Where a nose's nostrils are, either side (head frame, the lead side's). */
interface NoseCut {
  at: V3;
  r: V3;
}

/**
 * A nose as distance from its surface (head frame, `-z` forward): the bridge
 * narrow and high between the eyes, widening to the tip, the wings either side
 * of it folding back into the cheeks, and the nostrils hollowed underneath.
 * A woman's is smaller and finer, its tip a touch upturned.
 */
function noseShape(female: boolean): { far: (p: THREE.Vector3) => number; nostril: NoseCut } {
  const f = female;
  const nostril: NoseCut = {
    at: [f ? 0.0052 : 0.0063, f ? 0.0772 : 0.0745, f ? -0.1015 : -0.1045],
    r: [f ? 0.0027 : 0.0032, 0.0021, f ? 0.0044 : 0.0052],
  };
  const tip: V3 = [0, f ? 0.0855 : 0.0835, f ? -0.1065 : -0.1102];
  const tipR: V3 = f ? [0.0084, 0.0074, 0.0078] : [0.0102, 0.0088, 0.0094];
  const wingR: V3 = f ? [0.0062, 0.0058, 0.0072] : [0.0076, 0.0068, 0.0084];
  const wingX = f ? 0.0102 : 0.0124;
  const wingY = f ? 0.0825 : 0.0805;
  const wingZ = f ? -0.0985 : -0.1012;
  const q = new THREE.Vector3();
  const far = (p: THREE.Vector3) => {
    // narrower side to side than front to back
    q.set(p.x * 1.3, p.y, p.z);
    let d = toRod(
      q,
      [0, 0.118, -0.0935],
      [0, tip[1] + 0.004, tip[2] + 0.0035],
      f ? 0.0042 : 0.0052,
      f ? 0.0062 : 0.0078
    );
    d = blend(d, toEllipsoid(p, tip, tipR), 0.006);
    for (const s of [-1, 1]) d = blend(d, toEllipsoid(p, [s * wingX, wingY, wingZ], wingR), 0.0055);
    // its root, sunk in the face
    d = blend(d, toEllipsoid(p, [0, 0.092, -0.089], [0.016, 0.026, 0.007]), 0.004);
    for (const s of [-1, 1]) {
      const cut = toEllipsoid(p, [s * nostril.at[0], nostril.at[1], nostril.at[2]], nostril.r);
      d = -blend(-d, cut, 0.0018);
    }
    return d;
  };
  return { far, nostril };
}

/**
 * A nose: the surface of its {@link noseShape}, found along rays out from
 * inside it, and lit by that shape's slope. Coloured a touch warmer than the
 * face, and dark in the nostrils.
 */
/**
 * How far in each ray steps to find a nose's surface before halving onto it:
 * no further than its thinnest wall, round a nostril, so it never steps
 * through one onto the surface behind (twice this steps through a man's).
 */
const NOSE_STEP = 0.0008;

function buildNose(female: boolean): THREE.BufferGeometry {
  const { far, nostril } = noseShape(female);
  const geo = new THREE.SphereGeometry(1, 72, 56);
  const p = geo.getAttribute('position');
  const normal = geo.getAttribute('normal');
  const colour = new Float32Array(p.count * 3);
  // well inside it, so every ray finds the surface on its way in
  const from = new THREE.Vector3(0, female ? 0.09 : 0.087, female ? -0.097 : -0.1);
  const dir = new THREE.Vector3();
  const v = new THREE.Vector3();
  const at = (r: number) => v.copy(from).addScaledVector(dir, r);
  const e = 1e-4;
  const g = new THREE.Vector3();
  const nudge = (x: number, y: number, z: number) => far(g.set(v.x + x, v.y + y, v.z + z));
  for (let i = 0; i < p.count; i++) {
    dir.fromBufferAttribute(p, i).normalize();
    // in from outside to the first of the surface, then halve onto it
    let out = 0.05;
    let r = out;
    while (r > 0 && far(at(r)) > 0) {
      out = r;
      r -= NOSE_STEP;
    }
    let lo = Math.max(0, r);
    for (let k = 0; k < 14; k++) {
      const mid = (lo + out) / 2;
      if (far(at(mid)) > 0) out = mid;
      else lo = mid;
    }
    at((lo + out) / 2);
    p.setXYZ(i, v.x, v.y, v.z);
    const n = new THREE.Vector3(
      nudge(e, 0, 0) - nudge(-e, 0, 0),
      nudge(0, e, 0) - nudge(0, -e, 0),
      nudge(0, 0, e) - nudge(0, 0, -e)
    ).normalize();
    normal.setXYZ(i, n.x, n.y, n.z);
    // the nostrils dark, deeper in darker
    const hole = Math.max(
      ...[-1, 1].map((s) => {
        const c = toEllipsoid(v, [s * nostril.at[0], nostril.at[1], nostril.at[2]], nostril.r);
        return Math.min(1, Math.max(0, 1 - c / 0.0016));
      })
    );
    const shade = 1 - 0.7 * hole;
    colour.set([1.03 * shade, 0.94 * shade, 0.93 * shade], i * 3);
  }
  geo.deleteAttribute('uv');
  geo.setAttribute('color', new THREE.BufferAttribute(colour, 3));
  geo.computeBoundingSphere();
  return geo;
}

/**
 * What stands off the face: the nose and the lips (head frame, `-z` forward),
 * and how to draw the mouth into a smile.
 */
function buildFace(
  m: Materials,
  who: Persona,
  skin: THREE.Material
): { parts: THREE.Object3D[]; mouth: (smile: number, speak: Speak) => void } {
  const out: THREE.Object3D[] = [];
  const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  if (who.kind === 'robot') {
    // no nose, no lips: a ring round each lit eye, and a slot of a mouth
    for (const side of [-1, 1]) {
      const ring = mesh(new THREE.TorusGeometry(0.019, 0.004, 10, 28), m.metal);
      ring.position.set(side * LIT_EYE[0], LIT_EYE[1], LIT_EYE[2] - 0.009);
      out.push(ring);
    }
    const slot = mesh(new RoundedBoxGeometry(0.03, 0.007, 0.01, 2, 0.003), m.black);
    slot.position.set(0, 0.05, -0.096);
    // a machine's smile: the slot widens and lights up
    const lit = mesh(new RoundedBoxGeometry(0.026, 0.003, 0.004, 2, 0.0012), m.glow);
    lit.position.set(0, 0.05, -0.1);
    lit.name = 'teeth';
    lit.visible = false;
    return {
      parts: [...out, slot, lit],
      mouth: (smile, speak) => {
        // a word opens the slot, and narrows or widens it with the vowel
        slot.scale.x = (1 + 0.25 * smile) * (1 - 0.3 * speak.round);
        slot.scale.y = 1 + 1.6 * speak.open;
        lit.visible = smile > 0.05;
        lit.scale.set(Math.max(0.05, smile), 1, 1);
      },
    };
  }
  // a woman's nose is smaller and finer, its tip a touch upturned; her lips fuller
  const female = who.figure === 'female' && (who.kind ?? 'human') === 'human';
  if (who.kind === 'beast') {
    // a beast's nose is leathery and dark, and so are its lips: the wings of it, and its tip
    for (const side of [-1, 1]) {
      const wing = ball(0.0092, m.black, 10);
      wing.position.set(side * 0.0125, 0.08, -0.103);
      out.push(wing);
    }
    const tip = ball(0.018, m.black, 14);
    tip.scale.set(1.05, 0.85, 1);
    tip.position.set(0, 0.083, -0.11);
    out.push(bar(at(0, 0.114, -0.096), at(0, 0.086, -0.112), 0.0098, m.skin), tip);
  } else {
    const nose = mesh(buildNose(female), skin);
    nose.name = 'nose';
    out.push(nose);
  }
  // the lips: the upper a touch fuller at the sides, the lower fuller in the middle
  const mouth = who.lipstick
    ? m.lips
    : who.cyborg === 'full' || who.kind === 'beast'
      ? m.black
      : new THREE.MeshStandardMaterial({
          color: m.skin.color.clone().lerp(new THREE.Color('#9c4a44'), 0.35).multiplyScalar(0.88),
          roughness: 0.45,
        });
  // set into the face, the backs of them under its skin
  const [upperZ, lowerZ] = [-0.0926, -0.0911];
  const upper = lip(0.0545, upperZ, 0.0205, upperLip(female ? 1.1 : 1), mouth);
  const lower = lip(0.0445, lowerZ, 0.0182, lowerLip(female ? 1.12 : 1), mouth);
  // the teeth, behind the lips: only seen as a smile parts them
  const teeth = mesh(new RoundedBoxGeometry(0.024, 0.006, 0.004, 2, 0.0015), m.sclera);
  teeth.position.set(0, 0.0505, -0.0918);
  teeth.name = 'teeth';
  teeth.visible = false;
  // the dark of the open mouth, behind the lips and the teeth: only seen as a word parts them
  const inside = ball(0.012, m.black, 12);
  // just proud of the face there, just behind the teeth
  inside.scale.set(1, 0.2, 0.25);
  inside.position.set(0, 0.0495, -0.0915);
  inside.name = 'mouth';
  inside.visible = false;
  out.push(upper.group, lower.group, teeth, inside);
  return {
    parts: out,
    mouth: (smile, speak) => {
      // a rounded vowel purses the lips in and forward; a spread one draws them wide
      const purse = Math.max(0, speak.round);
      const spread = Math.max(0, -speak.round);
      for (const side of [1, -1] as const) {
        // the corners up — the lower lip's more, so it curves round under the upper
        upper.halves[side].rotation.z = side * SMILE_LIFT * 0.8 * smile;
        lower.halves[side].rotation.z = side * SMILE_LIFT * smile;
      }
      // wider, and parted over the teeth
      const across = (1 - WORD_PURSE * purse) * (1 + 0.12 * spread);
      upper.group.scale.x = (1 + 0.12 * smile) * across;
      lower.group.scale.x = (1 + 0.2 * smile) * across;
      upper.group.position.y = 0.0545 + 0.25 * SMILE_PART * smile + WORD_LIFT * speak.open;
      lower.group.position.y = 0.0445 - SMILE_PART * smile - WORD_DROP * speak.open;
      upper.group.position.z = upperZ - 0.003 * purse;
      lower.group.position.z = lowerZ - 0.003 * purse;
      teeth.visible = smile > 0.05 || (speak.open > 0.15 && speak.round < 0.3);
      // the gap between them, as wide as the lips are and as tall as they are apart
      inside.visible = speak.open > 0.05;
      inside.scale.set(across * (1 + 0.15 * smile), 0.2 + 1.1 * speak.open, 0.25);
      inside.position.y = 0.0495 - 0.5 * (WORD_DROP - WORD_LIFT) * speak.open;
    },
  };
}

function buildHead(m: Materials, who: Persona): HeadRig {
  const head = new THREE.Group();
  // a cyborg's lead side is machine: the eye on it lights up (both of them, all machine)
  const female = who.figure === 'female' && (who.kind ?? 'human') === 'human';
  const eyes: Record<1 | -1, THREE.Object3D> = {
    1: buildEye(m, !!who.cyborg, female),
    [-1]: buildEye(m, who.cyborg === 'full', female),
  };
  // a woman's brows are finer and arched: the bow is along the geometry's x, which the
  // brow's quarter turn makes up
  const arch = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, -0.013, 0),
    new THREE.Vector3(0.007, 0, 0),
    new THREE.Vector3(0, 0.013, 0)
  );
  const brow = (side: 1 | -1) => {
    const b = mesh(
      female
        ? new THREE.TubeGeometry(arch, 12, 0.0024, 6)
        : new THREE.CapsuleGeometry(0.0038, 0.022, 4, 8),
      m.hair
    );
    b.rotation.z = Math.PI / 2 + side * 0.12;
    b.scale.z = 0.7;
    b.name = 'brow';
    return b;
  };
  const brows: Record<1 | -1, THREE.Mesh> = { 1: brow(1), [-1]: brow(-1) };
  const skullGeo = sculpt(new THREE.SphereGeometry(SKULL_R, 56, 42), female);
  // a person's face has colour in it, a machine's plate and a beast's fur none
  const flushed = (who.kind ?? 'human') === 'human' && who.cyborg !== 'full';
  if (flushed) complexion(skullGeo);
  const faceMat = flushed ? faceSkin(m.skin) : m.skin;
  const skull = mesh(skullGeo, faceMat);
  skull.scale.set(...SKULL_SCALE);
  skull.position.y = SKULL_Y;
  head.add(skull);
  const face = buildFace(m, who, faceMat);
  for (const o of face.parts) head.add(o);
  for (const o of [...hairFor(who.hairStyle, m), ...beardFor(who.beard, m)]) head.add(o);
  for (const o of accessoriesFor(who, m)) head.add(o);
  if (who.cyborg === 'arm') for (const o of facePlate(m, female)) head.add(o);
  if (who.kind === 'beast') for (const o of beastHead(m, who)) head.add(o);
  const robot = who.kind === 'robot';
  for (const side of [-1, 1] as const) {
    if (!robot) {
      const ear = ball(0.026, m.skin, 12);
      ear.scale.set(0.4, 1, 0.72);
      ear.position.set(side * 0.086, 0.1, 0.012);
      head.add(ear);
    }
    const eye = eyes[side];
    eye.position.set(side * LIT_EYE[0], LIT_EYE[1], LIT_EYE[2]);
    head.add(eye);
    const brow = brows[side];
    brow.position.set(side * 0.033, BROW_Y, -0.094);
    // a machine has no brows to raise: they are there, for the rig, but not seen
    brow.visible = !robot;
    head.add(brow);
  }
  // closed-back headphones: the drummer is playing to a click
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 8, 32, Math.PI), m.black);
  band.position.set(0, 0.11, 0.0);
  head.add(band);
  for (const side of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.03, 20), m.black);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(side * 0.1, 0.1, 0.005);
    cup.castShadow = true;
    head.add(cup);
  }
  // a smaller head on a woman
  if (who.figure === 'female') head.scale.setScalar(0.95);
  return { head, eyes, brows, mouth: face.mouth };
}

/** A ring round the trunk at height `y`, a little proud of it: `tube` thick, as a share of its width. */
function hoop(
  rings: Ring[],
  y: number,
  tube: number,
  proud: number,
  mat: THREE.Material
): THREE.Mesh {
  // the cross-section nearest `y`
  const r = rings.reduce((a, b) => (Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a));
  const o = mesh(new THREE.TorusGeometry(1, tube, 8, 40), mat);
  o.rotation.x = Math.PI / 2;
  o.scale.set(r.w * proud, r.d * proud, 1);
  o.position.set(0, y, r.z ?? 0);
  return o;
}

/** A robot's midriff: dark ribs round the waist, between the chest plate and the hips. */
function midriff(shape: Shape, female: boolean, m: Materials): THREE.Object3D[] {
  const rings = trunk(shape, female, 0.1, 0.32);
  return [0.165, 0.19, 0.215, 0.24, 0.265].map((y) => {
    const rib = hoop(rings, y, 0.06, 1.03, m.black);
    // the tube scales with the ring: keep it a thin rib, not a tyre
    rib.scale.z = 0.12;
    return rib;
  });
}

/** A beast's paler fur: the belly, the muzzle. */
const paler = (who: Persona) =>
  `#${new THREE.Color(who.skin).lerp(new THREE.Color('#f0d4ff'), 0.6).getHexString()}`;

/** A beast's paler belly: an oval of lighter fur down the front of the trunk. */
function bellyPatch(shape: Shape, female: boolean, who: Persona): THREE.Mesh {
  const rings = trunk(shape, female, 0.1, 0.45);
  const r = rings.reduce((a, b) => (Math.abs(b.y - 0.3) < Math.abs(a.y - 0.3) ? b : a));
  const patch = mesh(new THREE.SphereGeometry(0.1, 28, 20), furMaterial(paler(who)));
  patch.scale.set(r.w / 0.15, 1.7, 0.5);
  patch.position.set(0, 0.3, (r.z ?? 0) - r.d + 0.012);
  return patch;
}

/** A beast's face and head: a paler muzzle under the nose, round furry ears, and horns if it has them. */
function beastHead(m: Materials, who: Persona): THREE.Object3D[] {
  const muzzle = ball(0.045, furMaterial(paler(who)), 20);
  muzzle.scale.set(1.25, 0.85, 0.8);
  muzzle.position.set(0, 0.062, -0.074);
  const out: THREE.Object3D[] = [muzzle];
  for (const side of [-1, 1]) {
    const ear = ball(0.034, m.hair, 16);
    ear.scale.set(0.45, 1, 0.9);
    ear.position.set(side * 0.115, 0.175, 0.02);
    ear.rotation.z = side * -0.5;
    out.push(ear);
  }
  if (who.horns) {
    const ivory = new THREE.MeshStandardMaterial({ color: '#efe3c8', roughness: 0.45 });
    for (const side of [-1, 1]) {
      // out to the sides of the crest, curving up
      const horn = mesh(new THREE.ConeGeometry(0.022, 0.1, 14), ivory);
      horn.position.set(side * 0.075, 0.235, -0.06);
      horn.rotation.set(-0.35, 0, side * -0.4);
      out.push(horn);
    }
  }
  return out;
}

/** The head's turn, radians a second, under which the hair stays put, and over which it swings in full. */
const SWISH_FROM = 0.8;
const SWISH_FULL = 2;
/** How hard the hair is thrown by a change in the head's turn, its spring (per second squared) and its damping. */
const SWISH_GAIN = 2;
const SWISH_SPRING = 190;
const SWISH_DAMP = 9;
/** The furthest the hair swings from where it hangs, radians, and the step it is worked out in, seconds. */
const SWISH_MOST = 0.7;
/**
 * The fastest the hair swings, radians a second; and the head's turn, radians
 * a second, past which it is not moving but cut to somewhere new.
 */
const SWISH_FASTEST = 8;
const SWISH_CUT = 15;
const SWISH_STEP = 1 / 240;

/**
 * Long or big hair swishing as the head moves: a spring that lags each change
 * in how fast the head turns, so it is left behind as the head throws and
 * carries on past as it stops. Only a strong move throws it — the nod of a
 * groove is under `SWISH_FROM` and leaves it where it hangs. Nothing to swing
 * (short hair, or none), nothing done.
 */
function swishOf(head: THREE.Object3D, torso: THREE.Object3D): (dt: number) => void {
  const swings: THREE.Object3D[] = [];
  head.traverse((o) => {
    if (o.name === SWING) swings.push(o);
  });
  if (!swings.length) return () => {};
  const angle = new THREE.Vector3();
  const speed = new THREE.Vector3();
  const turn = new THREE.Vector3();
  const turned = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const step = new THREE.Quaternion();
  let was: THREE.Quaternion | null = null;
  return (dt) => {
    // the head in the drummer's frame: torso and head together
    q.multiplyQuaternions(torso.quaternion, head.quaternion);
    if (!was || !(dt > 0)) {
      was = q.clone();
      return;
    }
    // how fast it is turning now, about axes in the head's own frame (the short way round)
    step.copy(was).invert().multiply(q);
    if (step.w < 0) step.set(-step.x, -step.y, -step.z, -step.w);
    const a = 2 * Math.acos(Math.min(1, step.w));
    const s = Math.sqrt(Math.max(0, 1 - step.w * step.w));
    if (s > 1e-6) turn.set(step.x, step.y, step.z).multiplyScalar(a / s / dt);
    else turn.set(0, 0, 0);
    was.copy(q);
    // faster than any neck turns: not a toss of the head but a cut — a seek, a restart, a jump
    // to another section — which the hair, like the head, is simply there for
    if (turn.length() > SWISH_CUT) {
      turned.set(0, 0, 0);
      return;
    }
    const strong = THREE.MathUtils.smoothstep(
      Math.max(turn.length(), turned.length()),
      SWISH_FROM,
      SWISH_FULL
    );
    // left behind as the head changes how it turns
    speed
      .addScaledVector(turn.clone().sub(turned), -SWISH_GAIN * strong)
      .clampLength(0, SWISH_FASTEST);
    turned.copy(turn);
    for (let t = 0; t < dt; t += SWISH_STEP) {
      const h = Math.min(SWISH_STEP, dt - t);
      speed.addScaledVector(angle, -SWISH_SPRING * h).multiplyScalar(1 - SWISH_DAMP * h);
      angle.addScaledVector(speed, h).clampScalar(-SWISH_MOST, SWISH_MOST);
    }
    for (const o of swings) {
      const give = typeof o.userData.give === 'number' ? o.userData.give : 1;
      o.rotation.set(angle.x * give, angle.y * give, angle.z * give);
    }
  };
}

/**
 * The head's turn on the torso, as Euler angles (`YXZ`): level-ish as the
 * torso leans, nodding and turning as the pose has it, and — for a glance —
 * turned toward `camera` (world space), if it is not behind. `headAt` is
 * where the head turns, in the torso's frame.
 */
export function headTurn(
  pose: Pose,
  torso: THREE.Object3D,
  headAt: THREE.Vector3,
  camera?: THREE.Vector3
): THREE.Euler {
  // the head stays level-ish as the torso leans: it looks at the kit, not the floor
  let pitch = pose.lean * 0.55 - pose.nod;
  let yaw = pose.headYaw - pose.yaw;
  const g = pose.glance;
  if (camera && g.look > 0) {
    // where the camera is from the head, in the torso's frame (mirrored with the kit for a lefty)
    torso.updateMatrixWorld(true);
    const d = torso.worldToLocal(camera.clone()).sub(headAt);
    const toYaw = Math.atan2(-d.x, -d.z);
    const toPitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
    // a camera behind the drummer is not looked round at
    const look = g.look * (1 - THREE.MathUtils.smoothstep(Math.abs(toYaw), LOOK_YAW, LOOK_BEHIND));
    const clampYaw = Math.max(-LOOK_YAW, Math.min(LOOK_YAW, toYaw));
    const clampPitch = Math.max(-LOOK_PITCH, Math.min(LOOK_PITCH, toPitch));
    yaw += (clampYaw - yaw) * look;
    pitch += (clampPitch - pitch) * look;
  }
  return new THREE.Euler(pitch - g.nod, yaw, -pose.roll * 0.5 + pose.headTilt + g.tilt, 'YXZ');
}

/**
 * Build the drummer: `m` is coloured for `who` (`makeMaterials(who)`), and
 * `who` sets the build, the hair, the beard and what they wear.
 */
export function buildDrummer(m: Materials, who: Persona = PERSONAS[0]): DrummerModel {
  const root = new THREE.Group();
  root.name = 'drummer';
  const shape = SHAPES[who.build];
  const female = who.figure === 'female';

  const person = (who.kind ?? 'human') === 'human';
  const torso = new THREE.Group();
  // one trunk, seat to the base of the neck: in the trousers to the belt, and the body above it,
  // with the shirt over that and the top of the trousers over the shirt's hem
  const rings = trunkOf(who);
  torso.add(loft(trunk(shape, female, -1, BELT + 0.01), m.jeans, 48, TRUNK_SQUARE));
  torso.add(skinOver(rings, m.skin, who));
  if (person) {
    // the neckline at the base of the neck
    for (const o of shirtFor(who.top, rings, m.shirt, NECK_BASE)) torso.add(o);
    for (const o of trousersTop(rings, m.jeans, who.top === 'bare')) torso.add(o);
  } else if (who.top !== 'bare') {
    torso.add(loft(trunk(shape, female, 0.1, 1, 0.004), m.shirt, 48, TRUNK_SQUARE));
  }
  if (who.kind === 'robot') for (const o of midriff(shape, female, m)) torso.add(o);
  if (who.kind === 'beast') torso.add(bellyPatch(shape, female, who));
  if (who.chain) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.075 * shape.neck, 0.005, 6, 32), m.gold);
    // lying round the neck, dropping down the chest in front
    chain.rotation.x = Math.PI / 2 - 0.55;
    chain.position.set(0, 0.565, -0.02 - 0.09 * (shape.depth - 1));
    torso.add(chain);
  }
  // the skin of what bends each frame, its detail kept where each point is at rest
  const bent = bentSkin(m.skin);
  const neck = buildNeck(shape.neck, bent);
  torso.add(neck.mesh);
  const { head, eyes, brows, mouth } = buildHead(m, who);
  head.position.set(0, HEAD_Y, 0);
  torso.add(head);
  root.add(torso);
  const swish = swishOf(head, torso);

  const arms: Record<Hand, ArmRig> = {
    lead: buildArm('lead', m, who),
    other: buildArm('other', m, who),
  };
  // the arms' flesh, from the trapezius to the wrist
  const flesh: Record<Hand, ArmFlesh> = {
    lead: buildArmFlesh('lead', m, who, shape.arm, rings, bent),
    other: buildArmFlesh('other', m, who, shape.arm, rings, bent),
  };
  for (const o of Object.values(flesh)) root.add(o.mesh);
  const machine = (hand: Hand) =>
    who.cyborg === 'full' || (who.cyborg === 'arm' && hand === 'lead');
  for (const [hand, a] of Object.entries(arms) as [Hand, ArmRig][]) {
    root.add(a.hand.group, a.stick, a.bead);
    // the flesh is the arm, upper and fore, into the heel of the hand: a machine's elbow and wrist
    // are lit, so they show; what is not shown is never posed, and freed now, as nothing else will
    const unused = machine(hand) ? [a.upper, a.forearm] : [a.upper, a.forearm, a.elbow, a.wrist];
    for (const o of unused) o.geometry.dispose();
    if (machine(hand)) root.add(a.elbow, a.wrist);
  }
  const sock = new THREE.MeshStandardMaterial({ color: '#efede6', roughness: 0.95 });
  const legs: Record<Foot, LegRig> = {
    kickFoot: buildLeg(m, shape.leg, who, sock),
    hatFoot: buildLeg(m, shape.leg, who, sock),
  };
  for (const l of Object.values(legs))
    root.add(l.hip, l.thigh, l.knee, l.shin, l.ankle, l.shoe, l.toes, ...l.over.map((o) => o.mesh));

  const pelvisAt = vec(BODY.pelvis);
  return {
    root,
    update(pose: Pose, camera?: THREE.Vector3, dt = 0) {
      torso.position.copy(pelvisAt).add(new THREE.Vector3(0, pose.bob, 0));
      torso.rotation.set(-pose.lean, pose.yaw, pose.roll, 'YXZ');
      head.rotation.copy(headTurn(pose, torso, head.position, camera));
      neck.bend(head);
      const g = pose.glance;
      for (const side of [1, -1] as const) {
        // a blink shuts both eyes, a wink the one
        const shut = Math.max(pose.blink, g.eye === side ? g.wink : 0);
        // and a smile reaches the eyes, narrowing them a little
        eyes[side].scale.y = (1 - 0.9 * shut) * (1 - 0.18 * pose.smile);
        // a hello lifts both brows; a wink pulls its own down a touch; and now and then one goes
        // up on its own, arching at the outer end
        const one = pose.brow.side === side ? pose.brow.raise : 0;
        brows[side].position.y =
          BROW_Y +
          BROW_RAISE * Math.max(g.brows, 1.3 * one) -
          (g.eye === side ? 0.003 * g.wink : 0);
        brows[side].rotation.z = Math.PI / 2 + side * (0.12 - 0.2 * one);
      }
      mouth(pose.smile, pose.speak);
      swish(dt);
      for (const hand of ['lead', 'other'] as const) {
        poseHand(arms[hand], pose.arms[hand]);
        if (machine(hand)) arms[hand].elbow.position.copy(pose.arms[hand].elbow);
      }
      torso.updateMatrix();
      flesh.lead.bend(torso, pose.arms.lead);
      flesh.other.bend(torso, pose.arms.other);
      poseLeg(legs.kickFoot, pose.legs.kickFoot);
      poseLeg(legs.hatFoot, pose.legs.hatFoot);
    },
  };
}
