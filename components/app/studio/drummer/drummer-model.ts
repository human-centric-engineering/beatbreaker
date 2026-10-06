import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import {
  ball,
  furMaterial,
  limb,
  loft,
  type Materials,
  place,
  type Ring,
} from '@/components/app/studio/drummer/parts';
import { BODY, type Foot, type Hand, STICK, type V3 } from '@/lib/app/breaks/drummer/kit-layout';
import type { Beard, Build, HairStyle, Hat, Persona } from '@/lib/app/breaks/drummer/personas';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';
import type { ArmPose, Grip, LegPose, Pose } from '@/lib/app/breaks/drummer/pose';
import { makeRng } from '@/lib/app/breaks/rng';

/**
 * The drummer, built from primitives (experiment: the drummer view).
 *
 * A jointed figure rather than a skinned one: every limb is a segment placed
 * between two joints the pose has solved, so what you see is exactly what the
 * stroke planner and the IK decided — nothing is blended or retargeted on the
 * way to the screen. The hands are articulated to the finger joint: the
 * stick balances on the middle finger under the thumb, the first finger wraps
 * beside it, and the back two close on each stroke and give as the stick
 * comes up. In a military grip the stick sits in the web of the thumb instead:
 * the thumb lies over it, the first two fingers rest on top, and the ring
 * finger is curled underneath with the little finger tucked in behind.
 *
 * Who is playing is a {@link Persona}: their build thickens or thins the
 * limbs and the trunk round the same joints, and their hair, beard and what
 * they wear hang off the head and the torso. None of it moves a joint.
 */

export interface DrummerModel {
  root: THREE.Group;
  /** Pose the figure; `camera` (world space) is where a glance looks. */
  update: (pose: Pose, camera?: THREE.Vector3) => void;
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

/** The trunk, pelvis up, for an average man: height, half-width, half-depth, set back. */
const TRUNK: (Ring & { at: Region })[] = [
  { y: -0.075, w: 0.1, d: 0.085, at: 'seat' },
  { y: -0.035, w: 0.152, d: 0.112, at: 'hips' },
  { y: 0.02, w: 0.166, d: 0.12, at: 'hips' },
  { y: 0.1, w: 0.158, d: 0.112, at: 'hips' },
  { y: 0.16, w: 0.15, d: 0.106, at: 'waist' },
  { y: 0.23, w: 0.143, d: 0.1, at: 'waist' },
  { y: 0.31, w: 0.152, d: 0.105, at: 'chest', z: -0.004 },
  { y: 0.4, w: 0.17, d: 0.114, at: 'chest', z: -0.008 },
  { y: 0.49, w: 0.182, d: 0.108, at: 'chest', z: -0.004 },
  // out over the shoulder joints, then the slope of the trapezius up to the neck
  { y: 0.56, w: 0.2, d: 0.094, at: 'yoke', z: 0.004 },
  { y: 0.615, w: 0.17, d: 0.07, at: 'yoke', z: 0.012 },
  { y: 0.64, w: 0.1, d: 0.056, at: 'yoke', z: 0.016 },
  { y: 0.655, w: 0.05, d: 0.045, at: 'yoke', z: 0.016 },
];

/** Where the trousers stop and the shirt starts, up the trunk. */
const BELT = 0.15;

/** The trunk's cross-sections for a build and a figure, from `from` to `to` up it. */
function trunk(shape: Shape, female: boolean, from: number, to: number, proud = 0): Ring[] {
  const across: Record<Region, number> = {
    seat: shape.hips * (female ? 1.08 : 1),
    hips: shape.hips * (female ? 1.1 : 1),
    waist: shape.waist * (female ? 0.86 : 1),
    chest: shape.chest * (female ? 0.92 : 1),
    yoke: ((1 + shape.chest) / 2) * (female ? 0.9 : 1),
  };
  return TRUNK.filter((r) => r.y >= from - 1e-6 && r.y <= to + 1e-6).map((r) => {
    // a belly, most at the navel, standing out in front
    const b = shape.belly * Math.exp(-(((r.y - 0.18) / 0.11) ** 2));
    // a woman's chest, fuller in front: part of the trunk's surface, not stuck on it
    const bust = female
      ? 0.03 * Math.sqrt(shape.waist) * Math.exp(-(((r.y - 0.4) / 0.055) ** 2))
      : 0;
    const deep = r.d * shape.depth + b * 0.75 + bust * 0.5;
    return {
      y: r.y,
      w: r.w * across[r.at] + b * 0.3 + proud,
      d: deep + proud,
      z: (r.z ?? 0) - b * 0.6 - bust * 0.5,
    };
  });
}

/** Scale a limb's profile: `top` girth at one joint easing to `bottom` at the other. */
function girth(profile: [number, number][], top: number, bottom = top): [number, number][] {
  return profile.map(([r, y]) => [r * (top + (bottom - top) * (y + 0.5)), y]);
}

/** Shoulder to elbow: the biceps bellying in the upper half, thinning to the elbow. */
const UPPER_ARM: [number, number][] = [
  [0.045, -0.5],
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
/** A short sleeve, a little off the arm, wider at the hem. */
const SLEEVE: [number, number][] = [
  [0.058, -0.5],
  [0.059, 0.1],
  [0.062, 0.5],
];
/** Hip to knee: heavy at the top, narrowing to the knee. */
const THIGH: [number, number][] = [
  [0.082, -0.5],
  [0.081, -0.25],
  [0.073, 0.05],
  [0.061, 0.35],
  [0.053, 0.5],
];
/** Knee to ankle: the calf full in the upper third, then the long taper. */
const SHIN: [number, number][] = [
  [0.05, -0.5],
  [0.056, -0.28],
  [0.053, -0.08],
  [0.043, 0.22],
  [0.037, 0.42],
  [0.036, 0.5],
];
/** Base of the neck to under the skull. */
const NECK: [number, number][] = [
  [0.056, -0.5],
  [0.047, -0.15],
  [0.043, 0.2],
  [0.042, 0.5],
];

/** A phalanx: a short cylinder from its joint along `+z`, with a knuckle at the far end. */
function phalanx(length: number, radius: number, m: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(radius * 0.9, radius, length, 10);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, length / 2);
  const mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = true;
  g.add(mesh);
  const tip = ball(radius * 0.92, m, 10);
  tip.position.z = length;
  g.add(tip);
  return g;
}

interface FingerGrip {
  /** How far each joint bends at full curl, radians. */
  bend: [number, number, number];
  /**
   * How much of the curl the finger holds whatever the stroke, 0–1: in matched
   * grip the middle finger is the fulcrum the stick balances on and never lets
   * go; the first finger wraps beside it, mostly closed; the back two open and
   * close with the stroke.
   */
  hold: number;
}

interface HandRig {
  group: THREE.Group;
  /** Each finger's joints, knuckle out. */
  fingers: THREE.Group[][];
  thumb: THREE.Group;
  /** Which side of `x` the thumb is on. */
  side: 1 | -1;
}

const FINGERS: { x: number; lengths: [number, number, number]; r: number }[] = [
  { x: 0.031, lengths: [0.045, 0.026, 0.021], r: 0.0095 },
  { x: 0.011, lengths: [0.05, 0.03, 0.023], r: 0.0098 },
  { x: -0.009, lengths: [0.046, 0.028, 0.021], r: 0.0092 },
  { x: -0.028, lengths: [0.036, 0.022, 0.018], r: 0.0082 },
];

/** First, middle, ring, little: how each finger bends, and how much of it it holds, per grip. */
const FINGER_GRIP: Record<Grip, FingerGrip[]> = {
  matched: [
    { bend: [0.95, 1.35, 0.85], hold: 0.7 },
    { bend: [1.15, 1.45, 0.9], hold: 1 },
    { bend: [1.45, 1.55, 1.0], hold: 0 },
    { bend: [1.45, 1.55, 1.0], hold: 0 },
  ],
  // the first two lie over the stick, pressing it down into the stroke; the ring
  // finger is curled under it and carries it, the little finger tucked in behind
  military: [
    { bend: [0.7, 0.95, 0.6], hold: 0.6 },
    { bend: [0.85, 1.1, 0.7], hold: 0.5 },
    { bend: [1.0, 1.6, 1.1], hold: 1 },
    { bend: [1.35, 1.6, 1.1], hold: 1 },
  ],
};

/** Where the thumb's base turns, per grip (`y` and `z` mirrored for the other hand). */
const THUMB: Record<Grip, [number, number, number]> = {
  // along the stick on top of the fulcrum
  matched: [0.38, -0.55, 0.5],
  // over the stick where it leaves the web, pointing along it toward the first finger
  military: [0.1, 0.2, 0.95],
};

/**
 * A hand in the frame the pose solves (`z` to the knuckles, `y` out of the
 * back of the hand); `thumb` is which side of `x` the thumb is on.
 */
function buildHand(thumb: 1 | -1, skin: THREE.Material): HandRig {
  const group = new THREE.Group();
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.03, 0.098, 2, 0.012), skin);
  palm.position.set(0, 0, 0.05);
  palm.castShadow = true;
  group.add(palm);

  const fingers = FINGERS.map((f) => {
    const joints: THREE.Group[] = [];
    let parent: THREE.Object3D = group;
    f.lengths.forEach((len, k) => {
      const joint = new THREE.Group();
      if (k === 0) {
        joint.position.set(f.x * thumb, -0.004, 0.097);
        joint.rotation.y = -f.x * thumb * 1.2; // a little splay from the middle
      } else {
        joint.position.z = f.lengths[k - 1];
      }
      joint.add(phalanx(len, f.r, skin));
      parent.add(joint);
      joints.push(joint);
      parent = joint;
    });
    return joints;
  });

  const thumbBase = new THREE.Group();
  thumbBase.position.set(thumb * 0.038, -0.012, 0.022);
  turnThumb(thumbBase, thumb, 'matched');
  const t1 = phalanx(0.042, 0.0115, skin);
  thumbBase.add(t1);
  const t2 = new THREE.Group();
  t2.position.z = 0.042;
  t2.rotation.x = 0.25;
  t2.add(phalanx(0.032, 0.0105, skin));
  t1.add(t2);
  group.add(thumbBase);

  return { group, fingers, thumb: thumbBase, side: thumb };
}

function turnThumb(base: THREE.Group, side: 1 | -1, held: Grip): void {
  const [x, y, z] = THUMB[held];
  base.rotation.set(x, side * y, side * z, 'YXZ');
}

interface ArmRig {
  shoulder: THREE.Mesh;
  sleeve: THREE.Mesh;
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

function stickGeometry(): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    STICK_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
    16
  );
}

function buildArm(hand: Hand, m: Materials, who: Persona): ArmRig {
  const stick = new THREE.Mesh(stickGeometry(), m.wood);
  stick.castShadow = true;
  const g = SHAPES[who.build].arm;
  // a vest leaves the arms bare to the shoulder
  const sleeved = who.top === 'tee';
  const sleeve = limb(girth(SLEEVE, g), m.shirt);
  sleeve.visible = sleeved;
  // a cyborg's arm is metal, its elbow and wrist lit
  const machine = who.cyborg === 'full' || (who.cyborg === 'arm' && hand === 'lead');
  const skin = machine ? m.metal : m.skin;
  const joint = machine ? m.glow : skin;
  // the deltoid, capping the shoulder: rounder sideways than up
  const shoulder = ball(0.054 * g, sleeved ? m.shirt : skin, 22);
  shoulder.scale.set(1.05, 0.88, 1);
  return {
    shoulder,
    sleeve,
    upper: limb(girth(UPPER_ARM, g), skin),
    elbow: ball(0.0355 * g * (machine ? 0.92 : 1), joint, 18),
    forearm: limb(girth(FOREARM, g, Math.sqrt(g)), skin),
    wrist: ball(0.025 * Math.sqrt(g) * (machine ? 0.92 : 1), joint, 14),
    hand: buildHand(hand === 'lead' ? 1 : -1, skin),
    stick,
    bead: ball(BEAD_RADIUS, m.wood, 12),
  };
}

function poseArm(rig: ArmRig, a: ArmPose): void {
  rig.shoulder.position.copy(a.shoulder);
  const sleeveEnd = a.shoulder.clone().lerp(a.elbow, 0.45);
  place(rig.sleeve, a.shoulder, sleeveEnd);
  place(rig.upper, a.shoulder, a.elbow);
  rig.elbow.position.copy(a.elbow);
  place(rig.forearm, a.elbow, a.wrist);
  rig.wrist.position.copy(a.wrist);
  rig.hand.group.position.copy(a.wrist);
  rig.hand.group.quaternion.copy(a.hand);
  const grips = FINGER_GRIP[a.held];
  rig.hand.fingers.forEach((joints, n) => {
    const f = grips[n];
    const c = f.hold + (1 - f.hold) * a.curl;
    joints.forEach((j, k) => (j.rotation.x = f.bend[k] * c));
  });
  turnThumb(rig.hand.thumb, rig.hand.side, a.held);
  const butt = a.grip.clone().addScaledVector(a.stick, -STICK.grip);
  place(rig.stick, butt, a.tip);
  rig.bead.position.copy(a.tip);
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
}

/** The outline of a shoe's sole, in the piece's frame: `x` across, forward along `z`. */
interface SoleOutline {
  /** Width at the back and the front end. */
  back: number;
  front: number;
  /** How round each end is: the radius of its corners. */
  backRound: number;
  frontRound: number;
}

/**
 * A sole the shape of the shoe above it — narrow at the heel, widest at the
 * ball, round at the toe — and never wider than the upper, so it reads as the
 * underside of a shoe rather than a plate under it.
 */
function soleGeometry(length: number, back: number, o: SoleOutline): THREE.ExtrudeGeometry {
  const [hb, hf] = [o.back / 2, o.front / 2];
  const [z0, z1] = [-back, length];
  const shape = new THREE.Shape();
  shape.moveTo(0, z0);
  shape.quadraticCurveTo(hb, z0, hb, z0 + o.backRound);
  shape.lineTo(hf, z1 - o.frontRound);
  shape.quadraticCurveTo(hf, z1, 0, z1);
  shape.quadraticCurveTo(-hf, z1, -hf, z1 - o.frontRound);
  shape.lineTo(-hb, z0 + o.backRound);
  shape.quadraticCurveTo(-hb, z0, 0, z0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 8,
  });
  // the outline's y runs forward, and the sole hangs down from the upper
  geo.rotateX(Math.PI / 2);
  return geo;
}

/** A piece of shoe `length` long from its origin forward, sole underneath. */
function shoePiece(
  m: Materials,
  length: number,
  back: number,
  height: number,
  outline: SoleOutline
): THREE.Group {
  const g = new THREE.Group();
  const upper = new THREE.Mesh(
    new RoundedBoxGeometry(0.1, height, length + back, 3, Math.min(0.03, height / 2.2)),
    m.shoe
  );
  upper.position.set(0, height / 2 - 0.008, (length - back) / 2);
  upper.castShadow = true;
  g.add(upper);
  const sole = new THREE.Mesh(soleGeometry(length, back, outline), m.sole);
  sole.position.y = -0.003;
  g.add(sole);
  return g;
}

function buildLeg(m: Materials, g: number): LegRig {
  return {
    hip: ball(0.08 * g, m.jeans, 20),
    thigh: limb(girth(THIGH, g), m.jeans),
    knee: ball(0.053 * g, m.jeans, 18),
    shin: limb(girth(SHIN, g, Math.sqrt(g)), m.jeans),
    ankle: ball(0.037 * Math.sqrt(g), m.jeans, 14),
    // heel to ball: a rounded heel, widening to the ball where the toe box takes over
    shoe: shoePiece(m, BODY.foot, 0.045, 0.075, {
      back: 0.074,
      front: 0.092,
      backRound: 0.03,
      frontRound: 0.004,
    }),
    toes: shoePiece(m, 0.08, 0.01, 0.05, {
      back: 0.092,
      front: 0.07,
      backRound: 0.004,
      frontRound: 0.04,
    }),
  };
}

const UP = new THREE.Vector3(0, 1, 0);

function poseLeg(rig: LegRig, l: LegPose): void {
  rig.hip.position.copy(l.hip);
  place(rig.thigh, l.hip, l.knee);
  rig.knee.position.copy(l.knee);
  place(rig.shin, l.knee, l.ankle);
  rig.ankle.position.copy(l.ankle);
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
}

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
 * sockets for the eyes, the brow over them, cheekbones, the jaw's angle, the
 * mouth carried forward and a chin. One smooth surface — the face is shaped,
 * not stuck on.
 */
function relief(x: number, y: number, z: number): number {
  const front = Math.max(0, -z);
  const ax = Math.abs(x);
  return (
    -0.075 * bell((ax - 0.38) / 0.15) * bell((y - 0.13) / 0.13) * front ** 2 +
    0.022 * bell(ax / 0.55) * bell((y - 0.27) / 0.07) * front +
    0.04 * bell((ax - 0.5) / 0.15) * bell((y + 0.06) / 0.14) * front +
    0.05 * bell((ax - 0.72) / 0.2) * bell((y + 0.55) / 0.2) +
    0.045 * bell(x / 0.38) * bell((y + 0.42) / 0.2) * front +
    0.13 * bell(x / 0.3) * bell((y + 0.8) / 0.13) * front
  );
}

/** Push a sphere of radius {@link SKULL_R}, centred on the origin, out into the head's shape. */
function sculpt(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const p = geo.getAttribute('position');
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    n.copy(v).normalize();
    v.multiplyScalar(1 + relief(n.x, n.y, n.z));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
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
      const fro = mesh(new THREE.SphereGeometry(0.14, 28, 20), m.hair);
      fro.scale.set(1.12, 1, 1);
      fro.position.set(0, 0.19, 0.05);
      return [fro];
    }
    case 'long': {
      const back = mesh(new THREE.CapsuleGeometry(0.09, 0.22, 6, 18), m.hair);
      back.scale.set(1, 1, 0.55);
      back.position.set(0, 0.03, 0.05);
      const out: THREE.Object3D[] = [hairCap(m), back];
      for (const side of [-1, 1]) {
        const lock = mesh(new THREE.CapsuleGeometry(0.03, 0.15, 4, 10), m.hair);
        lock.position.set(side * 0.08, 0.04, -0.005);
        out.push(lock);
      }
      return out;
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
        const tail = mesh(new THREE.CapsuleGeometry(0.028, 0.12, 4, 10), m.hair);
        tail.position.set(side * 0.13, 0.1, 0.05);
        tail.rotation.z = side * 0.6;
        out.push(tie, tail);
      }
      return out;
    }
    case 'quiff': {
      // swept up and forward off the brow
      const quiff = mesh(new THREE.CapsuleGeometry(0.042, 0.1, 6, 14), m.hair);
      quiff.scale.set(1.35, 1, 1);
      quiff.position.set(0, 0.2, -0.075);
      quiff.rotation.x = -1.25;
      return [hairCap(m), quiff];
    }
    case 'ponytail': {
      const tie = ball(0.016, m.accent, 10);
      tie.position.set(0, 0.17, 0.1);
      const tail = mesh(new THREE.CapsuleGeometry(0.03, 0.16, 4, 10), m.hair);
      tail.position.set(0, 0.07, 0.135);
      tail.rotation.x = -0.35;
      return [hairCap(m), tie, tail];
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
      return [hairCap(m), party];
    }
    case 'shag': {
      // a wild crest bursting up and out of the crown, and fluffy tufts over the cheeks
      const out: THREE.Object3D[] = [cover(0.112, 0.52, m.hair)];
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
        out.push(tuft);
      }
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
      const out: THREE.Object3D[] = [hairCap(m)];
      // round the sides and back, none over the face
      for (let i = 0; i < 15; i++) {
        const ph = -1.9 + (i / 14) * 3.8;
        const len = 0.2 + 0.05 * Math.sin(i * 2.3);
        const lock = mesh(new THREE.CylinderGeometry(0.012, 0.01, len, 6), m.hair);
        lock.position.set(0.095 * Math.sin(ph), 0.15 - len / 2, 0.1 * Math.cos(ph));
        // the ends hang out from the head
        lock.rotation.set(-0.12 * Math.cos(ph), 0, 0.12 * Math.sin(ph));
        out.push(lock);
      }
      return out;
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

/** Grow `g` out of the face, in the head's frame. */
function grow(g: Growth, mat: THREE.Material): THREE.Mesh {
  const geo = sculpt(new THREE.SphereGeometry(SKULL_R, 96, 72));
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
function facePlate(m: Materials): THREE.Object3D[] {
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
    m.metal
  );
  plate.name = 'plate';
  const ring = mesh(new THREE.TorusGeometry(0.0175, 0.0026, 10, 28), m.metal);
  ring.position.set(eye.x, eye.y, eye.z - 0.007);
  ring.rotation.y = -0.25;
  return [plate, ring];
}

function hatFor(hat: Hat, m: Materials): THREE.Object3D[] {
  switch (hat) {
    case 'beanie': {
      const pom = ball(0.028, m.accent, 12);
      pom.position.set(0, 0.25, 0.03);
      return [cover(0.114, 0.52, m.accent), pom];
    }
    case 'cap': {
      // on backwards, the peak over the nape
      const peak = mesh(new RoundedBoxGeometry(0.13, 0.008, 0.09, 2, 0.003), m.accent);
      peak.position.set(0, 0.17, 0.13);
      peak.rotation.x = 0.2;
      return [cover(0.112, 0.46, m.accent), peak];
    }
    case 'cowboy': {
      const brim = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.008, 32), m.accent);
      brim.scale.set(1, 1, 0.85);
      brim.position.y = 0.2;
      const crown = mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.11, 24), m.accent);
      crown.position.y = 0.26;
      return [brim, crown];
    }
    case 'tophat': {
      const brim = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.01, 32), m.black);
      brim.position.y = 0.205;
      const crown = mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.2, 28), m.black);
      crown.position.y = 0.31;
      const band = mesh(new THREE.CylinderGeometry(0.087, 0.086, 0.03, 28), m.accent);
      band.position.y = 0.225;
      return [brim, crown, band];
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

/** An eye: the white, the iris on it, and the upper lid hooding it. A cyborg's is dark, lit from inside. */
function buildEye(m: Materials, lit = false): THREE.Group {
  const eye = new THREE.Group();
  eye.name = 'eye';
  eye.add(ball(0.0145, lit ? m.black : m.sclera, 14));
  const iris = ball(lit ? 0.0095 : 0.0088, lit ? m.glow : m.eye, 12);
  iris.position.set(0, -0.0008, -0.0115);
  eye.add(iris);
  const lid = mesh(
    new THREE.SphereGeometry(0.0158, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.47),
    m.skin
  );
  lid.rotation.x = -0.45;
  eye.add(lid);
  return eye;
}

/** What stands off the face: the nose and the lips (head frame, `-z` forward). */
function buildFace(m: Materials, who: Persona): THREE.Object3D[] {
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
    return [...out, slot];
  }
  // a beast's nose is leathery and dark, and so are its lips
  const nose = who.kind === 'beast' ? m.black : m.skin;
  for (const side of [-1, 1]) {
    // the wings of the nose
    const wing = ball(0.0092, nose, 10);
    wing.position.set(side * 0.0125, 0.08, -0.103);
    out.push(wing);
  }
  // the bridge, from between the eyes down and out to the tip
  const bridge = bar(at(0, 0.114, -0.096), at(0, 0.086, -0.112), 0.0098, m.skin);
  const tip = ball(who.kind === 'beast' ? 0.018 : 0.0142, nose, 14);
  tip.scale.set(1.05, 0.85, 1);
  tip.position.set(0, 0.083, -0.11);
  out.push(bridge, tip);
  // the lips: the upper a touch fuller at the sides, the lower fuller in the middle
  const mouth = who.lipstick
    ? m.lips
    : who.cyborg === 'full' || who.kind === 'beast'
      ? m.black
      : new THREE.MeshStandardMaterial({
          color: m.skin.color.clone().lerp(new THREE.Color('#9c4a44'), 0.35).multiplyScalar(0.88),
          roughness: 0.45,
        });
  const upper = bar(at(-0.015, 0.0545, -0.094), at(0.015, 0.0545, -0.094), 0.0058, mouth);
  upper.scale.z = 0.7;
  const lower = bar(at(-0.011, 0.0445, -0.092), at(0.011, 0.0445, -0.092), 0.0072, mouth);
  lower.scale.z = 0.75;
  out.push(upper, lower);
  return out;
}

function buildHead(m: Materials, who: Persona): HeadRig {
  const head = new THREE.Group();
  // a cyborg's lead side is machine: the eye on it lights up (both of them, all machine)
  const eyes: Record<1 | -1, THREE.Object3D> = {
    1: buildEye(m, !!who.cyborg),
    [-1]: buildEye(m, who.cyborg === 'full'),
  };
  const brow = (side: 1 | -1) => {
    const b = mesh(new THREE.CapsuleGeometry(0.0038, 0.022, 4, 8), m.hair);
    b.rotation.z = Math.PI / 2 + side * 0.12;
    b.scale.z = 0.7;
    b.name = 'brow';
    return b;
  };
  const brows: Record<1 | -1, THREE.Mesh> = { 1: brow(1), [-1]: brow(-1) };
  const skull = mesh(sculpt(new THREE.SphereGeometry(SKULL_R, 56, 42)), m.skin);
  skull.scale.set(...SKULL_SCALE);
  skull.position.y = SKULL_Y;
  head.add(skull);
  for (const o of buildFace(m, who)) head.add(o);
  for (const o of [...hairFor(who.hairStyle, m), ...beardFor(who.beard, m)]) head.add(o);
  for (const o of accessoriesFor(who, m)) head.add(o);
  if (who.cyborg === 'arm') for (const o of facePlate(m)) head.add(o);
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
  return { head, eyes, brows };
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

/**
 * Build the drummer: `m` is coloured for `who` (`makeMaterials(who)`), and
 * `who` sets the build, the hair, the beard and what they wear.
 */
export function buildDrummer(m: Materials, who: Persona = PERSONAS[0]): DrummerModel {
  const root = new THREE.Group();
  root.name = 'drummer';
  const shape = SHAPES[who.build];
  const female = who.figure === 'female';

  const torso = new THREE.Group();
  // one trunk, hips to the base of the neck: the trousers to the belt, the shirt over them from there
  torso.add(loft(trunk(shape, female, -1, BELT + 0.01), m.jeans));
  torso.add(loft(trunk(shape, female, 0.1, 1, 0.004), m.shirt));
  if (who.kind === 'robot') for (const o of midriff(shape, female, m)) torso.add(o);
  if (who.kind === 'beast') torso.add(bellyPatch(shape, female, who));
  if (who.chain) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.075 * shape.neck, 0.005, 6, 32), m.gold);
    // lying round the neck, dropping down the chest in front
    chain.rotation.x = Math.PI / 2 - 0.55;
    chain.position.set(0, 0.565, -0.02 - 0.09 * (shape.depth - 1));
    torso.add(chain);
  }
  const neck = limb(girth(NECK, shape.neck), m.skin);
  place(neck, new THREE.Vector3(0, 0.575, 0.02), new THREE.Vector3(0, 0.69, 0.01));
  torso.add(neck);
  const { head, eyes, brows } = buildHead(m, who);
  head.position.set(0, 0.665, 0.0);
  torso.add(head);
  root.add(torso);

  const arms: Record<Hand, ArmRig> = {
    lead: buildArm('lead', m, who),
    other: buildArm('other', m, who),
  };
  for (const a of Object.values(arms)) {
    root.add(
      a.shoulder,
      a.sleeve,
      a.upper,
      a.elbow,
      a.forearm,
      a.wrist,
      a.hand.group,
      a.stick,
      a.bead
    );
  }
  const legs: Record<Foot, LegRig> = {
    kickFoot: buildLeg(m, shape.leg),
    hatFoot: buildLeg(m, shape.leg),
  };
  for (const l of Object.values(legs))
    root.add(l.hip, l.thigh, l.knee, l.shin, l.ankle, l.shoe, l.toes);

  const pelvisAt = vec(BODY.pelvis);
  return {
    root,
    update(pose: Pose, camera?: THREE.Vector3) {
      torso.position.copy(pelvisAt).add(new THREE.Vector3(0, pose.bob, 0));
      torso.rotation.set(-pose.lean, pose.yaw, pose.roll, 'YXZ');
      // the head stays level-ish as the torso leans: it looks at the kit, not the floor
      let pitch = pose.lean * 0.55 - pose.nod;
      let yaw = pose.headYaw - pose.yaw;
      const g = pose.glance;
      if (camera && g.look > 0) {
        // where the camera is from the head, in the torso's frame (mirrored with the kit for a lefty)
        torso.updateMatrixWorld(true);
        const d = torso.worldToLocal(camera.clone()).sub(head.position);
        const toYaw = Math.atan2(-d.x, -d.z);
        const toPitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
        // a camera behind the drummer is not looked round at
        const look =
          g.look * (1 - THREE.MathUtils.smoothstep(Math.abs(toYaw), LOOK_YAW, LOOK_BEHIND));
        const clampYaw = Math.max(-LOOK_YAW, Math.min(LOOK_YAW, toYaw));
        const clampPitch = Math.max(-LOOK_PITCH, Math.min(LOOK_PITCH, toPitch));
        yaw += (clampYaw - yaw) * look;
        pitch += (clampPitch - pitch) * look;
      }
      head.rotation.set(pitch - g.nod, yaw, -pose.roll * 0.5 + pose.headTilt + g.tilt, 'YXZ');
      for (const side of [1, -1] as const) {
        // a blink shuts both eyes, a wink the one
        const shut = Math.max(pose.blink, g.eye === side ? g.wink : 0);
        eyes[side].scale.y = 1 - 0.9 * shut;
        // a hello lifts both brows; a wink pulls its own down a touch
        brows[side].position.y =
          BROW_Y + BROW_RAISE * g.brows - (g.eye === side ? 0.003 * g.wink : 0);
      }
      poseArm(arms.lead, pose.arms.lead);
      poseArm(arms.other, pose.arms.other);
      poseLeg(legs.kickFoot, pose.legs.kickFoot);
      poseLeg(legs.hatFoot, pose.legs.hatFoot);
    },
  };
}
