import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { ball, type Materials, place, segment } from '@/components/app/studio/drummer/parts';
import { BODY, type Foot, type Hand, STICK, type V3 } from '@/lib/app/breaks/drummer/kit-layout';
import type { Beard, Build, HairStyle, Hat, Persona } from '@/lib/app/breaks/drummer/personas';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';
import type { ArmPose, Grip, LegPose, Pose } from '@/lib/app/breaks/drummer/pose';

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
  /** Multiplies the chest's width, height and depth. */
  chest: V3;
  /** The belly's radius, and how deep it is front to back. */
  belly: number;
  gut: number;
  pelvis: number;
  neck: number;
}

const SHAPES: Record<Build, Shape> = {
  slim: {
    arm: 0.8,
    leg: 0.8,
    chest: [0.88, 1, 0.85],
    belly: 0.8,
    gut: 0.6,
    pelvis: 0.9,
    neck: 0.85,
  },
  average: { arm: 1, leg: 1, chest: [1, 1, 1], belly: 1, gut: 0.68, pelvis: 1, neck: 1 },
  heavy: {
    arm: 1.25,
    leg: 1.28,
    chest: [1.12, 1.02, 1.3],
    belly: 1.45,
    gut: 0.95,
    pelvis: 1.22,
    neck: 1.35,
  },
  muscular: {
    arm: 1.4,
    leg: 1.2,
    chest: [1.16, 1.05, 1.35],
    belly: 0.95,
    gut: 0.62,
    pelvis: 1,
    neck: 1.4,
  },
};

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
function buildHand(thumb: 1 | -1, m: Materials): HandRig {
  const group = new THREE.Group();
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.03, 0.098, 2, 0.012), m.skin);
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
      joint.add(phalanx(len, f.r, m.skin));
      parent.add(joint);
      joints.push(joint);
      parent = joint;
    });
    return joints;
  });

  const thumbBase = new THREE.Group();
  thumbBase.position.set(thumb * 0.038, -0.012, 0.022);
  turnThumb(thumbBase, thumb, 'matched');
  const t1 = phalanx(0.042, 0.0115, m.skin);
  thumbBase.add(t1);
  const t2 = new THREE.Group();
  t2.position.z = 0.042;
  t2.rotation.x = 0.25;
  t2.add(phalanx(0.032, 0.0105, m.skin));
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
  const sleeve = segment(0.052 * g, 0.058 * g, m.shirt);
  sleeve.visible = sleeved;
  return {
    shoulder: ball(0.056 * g, sleeved ? m.shirt : m.skin),
    sleeve,
    upper: segment(0.04 * g, 0.047 * g, m.skin),
    elbow: ball(0.041 * g, m.skin),
    forearm: segment(0.029 * Math.sqrt(g), 0.04 * g, m.skin),
    wrist: ball(0.028 * Math.sqrt(g), m.skin),
    hand: buildHand(hand === 'lead' ? 1 : -1, m),
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
    hip: ball(0.08 * g, m.jeans),
    thigh: segment(0.058 * g, 0.078 * g, m.jeans),
    knee: ball(0.06 * g, m.jeans),
    shin: segment(0.045 * g, 0.056 * g, m.jeans),
    ankle: ball(0.045 * Math.sqrt(g), m.jeans),
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
  eyes: Record<1 | -1, THREE.Mesh>;
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
const hairCap = (m: Materials) => cover(0.104, 0.55, m.hair);

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

/** A moustache under the nose. */
function moustache(m: Materials, handlebar: boolean): THREE.Object3D[] {
  const tache = mesh(new THREE.CapsuleGeometry(0.011, 0.045, 4, 8), m.hair);
  tache.rotation.z = Math.PI / 2;
  tache.position.set(0, 0.064, -0.098);
  if (!handlebar) return [tache];
  const out: THREE.Object3D[] = [tache];
  for (const side of [-1, 1]) {
    const curl = mesh(new THREE.CapsuleGeometry(0.007, 0.03, 4, 8), m.hair);
    curl.position.set(side * 0.045, 0.074, -0.092);
    curl.rotation.z = side * -0.5;
    out.push(curl);
  }
  return out;
}

/** A shell over the jaw and the cheeks, a little proud of the skin. */
function jaw(mat: THREE.Material, proud: number, from: number): THREE.Mesh {
  // the front half (`-z`), from `from` (of a half turn down from the crown) to the chin
  const shell = mesh(
    new THREE.SphereGeometry(
      SKULL_R,
      24,
      12,
      Math.PI,
      Math.PI,
      from * Math.PI,
      (1 - from) * Math.PI
    ),
    mat
  );
  const [sx, sy, sz] = SKULL_SCALE;
  shell.scale.set(sx * proud, sy * proud, sz * proud);
  shell.position.y = SKULL_Y;
  return shell;
}

function beardFor(beard: Beard, m: Materials): THREE.Object3D[] {
  switch (beard) {
    case 'none':
      return [];
    case 'stubble': {
      // a shadow, not a beard: darker skin, whatever colour the hair is dyed
      const shadow = new THREE.MeshStandardMaterial({
        color: m.skin.color.clone().multiplyScalar(0.45),
        roughness: 1,
        transparent: true,
        opacity: 0.45,
      });
      return [jaw(shadow, 1.015, 0.6)];
    }
    case 'goatee': {
      const tuft = mesh(new THREE.ConeGeometry(0.024, 0.065, 10), m.hair);
      tuft.rotation.x = Math.PI;
      tuft.position.set(0, -0.005, -0.082);
      return [tuft, ...moustache(m, false)];
    }
    case 'handlebar':
      return moustache(m, true);
    case 'full':
    case 'viking': {
      const chin = ball(0.06, m.hair, 16);
      chin.scale.set(1.2, 1, 0.9);
      chin.position.set(0, 0.005, -0.06);
      const out: THREE.Object3D[] = [jaw(m.hair, 1.05, 0.58), chin, ...moustache(m, false)];
      if (beard === 'viking') {
        const braid = mesh(new THREE.ConeGeometry(0.05, 0.18, 12), m.hair);
        braid.rotation.x = Math.PI - 0.25;
        braid.position.set(0, -0.08, -0.075);
        out.push(braid);
      }
      return out;
    }
  }
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
  if (who.lipstick) {
    const lips = mesh(new THREE.CapsuleGeometry(0.008, 0.02, 4, 8), m.lips);
    lips.rotation.z = Math.PI / 2;
    lips.scale.set(1, 1, 0.6);
    lips.position.set(0, 0.05, -0.094);
    out.push(lips);
  }
  return out;
}

function buildHead(m: Materials, who: Persona): HeadRig {
  const head = new THREE.Group();
  const eyes: Record<1 | -1, THREE.Mesh> = {
    1: ball(0.011, m.eye, 10),
    [-1]: ball(0.011, m.eye, 10),
  };
  const brow = () => new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.01), m.hair);
  const brows: Record<1 | -1, THREE.Mesh> = { 1: brow(), [-1]: brow() };
  const skull = ball(SKULL_R, m.skin, 28);
  skull.scale.set(...SKULL_SCALE);
  skull.position.y = SKULL_Y;
  head.add(skull);
  for (const o of [...hairFor(who.hairStyle, m), ...beardFor(who.beard, m)]) head.add(o);
  for (const o of accessoriesFor(who, m)) head.add(o);
  for (const side of [-1, 1] as const) {
    const ear = ball(0.022, m.skin, 10);
    ear.scale.set(0.5, 1, 0.8);
    ear.position.set(side * 0.088, 0.1, 0.01);
    head.add(ear);
    const eye = eyes[side];
    eye.position.set(side * 0.032, 0.115, -0.088);
    head.add(eye);
    const brow = brows[side];
    brow.position.set(side * 0.033, BROW_Y, -0.09);
    head.add(brow);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.035, 10), m.skin);
  nose.rotation.x = -Math.PI / 2 - 0.25;
  nose.position.set(0, 0.09, -0.1);
  head.add(nose);
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
  const pelvis = ball(0.1, m.jeans, 20);
  pelvis.scale.set(1.65 * shape.pelvis * (female ? 1.1 : 1), 0.85, 1.2 * shape.pelvis);
  torso.add(pelvis);
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.135 * shape.belly, 0.2, 8, 24), m.shirt);
  belly.scale.set(female ? 0.9 : 1, 1, shape.gut);
  // a big belly sits forward, over the belt
  belly.position.set(0, 0.2, -0.04 * (shape.belly - 1));
  belly.castShadow = true;
  torso.add(belly);
  const [cx, cy, cz] = shape.chest;
  const chest = ball(0.2, m.shirt, 28);
  chest.scale.set(0.88 * cx * (female ? 0.92 : 1), 0.9 * cy, 0.52 * cz);
  chest.position.set(0, 0.42, 0.01);
  torso.add(chest);
  if (female) {
    for (const side of [-1, 1]) {
      const bust = ball(0.06 * Math.sqrt(shape.belly), m.shirt, 18);
      bust.scale.set(1, 0.95, 0.9);
      bust.position.set(side * 0.068, 0.42, 0.01 - 0.075 * cz);
      torso.add(bust);
    }
  }
  if (who.chain) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.075 * shape.neck, 0.005, 6, 32), m.gold);
    // lying round the neck, dropping down the chest in front
    chain.rotation.x = Math.PI / 2 - 0.55;
    // out over a deep chest
    chain.position.set(0, 0.565, -0.02 - 0.09 * (cz - 1));
    torso.add(chain);
  }
  const yoke = new THREE.Mesh(
    // a vest's straps leave the shoulders bare
    new THREE.CapsuleGeometry(0.05, BODY.shoulder[0] * (who.top === 'tee' ? 2 : 1.1), 6, 14),
    m.shirt
  );
  yoke.rotation.z = Math.PI / 2;
  yoke.position.set(0, BODY.shoulder[1] - 0.01, BODY.shoulder[2]);
  yoke.castShadow = true;
  torso.add(yoke);
  const neck = segment(0.043 * shape.neck, 0.05 * shape.neck, m.skin);
  place(neck, new THREE.Vector3(0, 0.58, 0.02), new THREE.Vector3(0, 0.69, 0.01));
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
