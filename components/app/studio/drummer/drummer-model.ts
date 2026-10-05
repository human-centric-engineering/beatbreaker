import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { ball, type Materials, place, segment } from '@/components/app/studio/drummer/parts';
import { BODY, type Foot, type Hand, STICK, type V3 } from '@/lib/app/breaks/drummer/kit-layout';
import type { ArmPose, LegPose, Pose } from '@/lib/app/breaks/drummer/pose';

/**
 * The drummer, built from primitives (experiment: the drummer view).
 *
 * A jointed figure rather than a skinned one: every limb is a segment placed
 * between two joints the pose has solved, so what you see is exactly what the
 * stroke planner and the IK decided — nothing is blended or retargeted on the
 * way to the screen. The hands are articulated to the finger joint: the
 * thumb and first finger pinch the stick at its fulcrum, the back three wrap
 * it, close on each stroke and give as the stick comes up.
 */

export interface DrummerModel {
  root: THREE.Group;
  update: (pose: Pose) => void;
}

const vec = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);

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

interface Finger {
  joints: THREE.Group[];
  /** How far each joint bends at full curl, radians. */
  bend: [number, number, number];
  /** The first finger hooks round the stick and holds; the others follow the curl. */
  fixed: boolean;
}

interface HandRig {
  group: THREE.Group;
  fingers: Finger[];
}

const FINGERS: { x: number; lengths: [number, number, number]; r: number }[] = [
  { x: 0.031, lengths: [0.045, 0.026, 0.021], r: 0.0095 },
  { x: 0.011, lengths: [0.05, 0.03, 0.023], r: 0.0098 },
  { x: -0.009, lengths: [0.046, 0.028, 0.021], r: 0.0092 },
  { x: -0.028, lengths: [0.036, 0.022, 0.018], r: 0.0082 },
];

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

  const fingers: Finger[] = FINGERS.map((f, n) => {
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
    return n === 0
      ? { joints, bend: [0.95, 1.35, 0.85], fixed: true }
      : { joints, bend: [1.45, 1.55, 1.0], fixed: false };
  });

  // the thumb lies along the stick on top of the fulcrum
  const thumbBase = new THREE.Group();
  thumbBase.position.set(thumb * 0.038, -0.012, 0.022);
  thumbBase.rotation.set(0.38, -thumb * 0.55, thumb * 0.5, 'YXZ');
  const t1 = phalanx(0.042, 0.0115, m.skin);
  thumbBase.add(t1);
  const t2 = new THREE.Group();
  t2.position.z = 0.042;
  t2.rotation.x = 0.25;
  t2.add(phalanx(0.032, 0.0105, m.skin));
  t1.add(t2);
  group.add(thumbBase);

  return { group, fingers };
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

function buildArm(hand: Hand, m: Materials): ArmRig {
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0075, 1, 12), m.wood);
  stick.castShadow = true;
  return {
    shoulder: ball(0.056, m.shirt),
    sleeve: segment(0.052, 0.058, m.shirt),
    upper: segment(0.04, 0.047, m.skin),
    elbow: ball(0.041, m.skin),
    forearm: segment(0.029, 0.04, m.skin),
    wrist: ball(0.028, m.skin),
    hand: buildHand(hand === 'lead' ? 1 : -1, m),
    stick,
    bead: ball(0.0065, m.wood, 10),
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
  for (const f of rig.hand.fingers) {
    const c = f.fixed ? 1 : a.curl;
    f.joints.forEach((j, k) => (j.rotation.x = f.bend[k] * c));
  }
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

/** A piece of shoe `length` long from its origin forward, sole underneath. */
function shoePiece(m: Materials, length: number, back: number, height: number): THREE.Group {
  const g = new THREE.Group();
  const upper = new THREE.Mesh(
    new RoundedBoxGeometry(0.1, height, length + back, 3, Math.min(0.03, height / 2.2)),
    m.shoe
  );
  upper.position.set(0, height / 2 - 0.008, (length - back) / 2);
  upper.castShadow = true;
  g.add(upper);
  const sole = new THREE.Mesh(
    new RoundedBoxGeometry(0.104, 0.02, length + back + 0.005, 2, 0.008),
    m.sole
  );
  sole.position.set(0, -0.01, (length - back) / 2);
  g.add(sole);
  return g;
}

function buildLeg(m: Materials): LegRig {
  return {
    hip: ball(0.08, m.jeans),
    thigh: segment(0.058, 0.078, m.jeans),
    knee: ball(0.06, m.jeans),
    shin: segment(0.045, 0.056, m.jeans),
    ankle: ball(0.045, m.jeans),
    shoe: shoePiece(m, BODY.foot, 0.045, 0.075),
    toes: shoePiece(m, 0.08, 0.01, 0.05),
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

function buildHead(m: Materials): THREE.Group {
  const head = new THREE.Group();
  const skull = ball(0.1, m.skin, 28);
  skull.scale.set(0.84, 1.12, 0.98);
  skull.position.y = 0.1;
  head.add(skull);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.104, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
    m.hair
  );
  hair.scale.set(0.9, 1.1, 1.02);
  hair.position.set(0, 0.115, 0.012);
  hair.rotation.x = 0.35;
  hair.castShadow = true;
  head.add(hair);
  for (const side of [-1, 1]) {
    const ear = ball(0.022, m.skin, 10);
    ear.scale.set(0.5, 1, 0.8);
    ear.position.set(side * 0.088, 0.1, 0.01);
    head.add(ear);
    const eye = ball(0.011, m.eye, 10);
    eye.position.set(side * 0.032, 0.115, -0.088);
    head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.01), m.hair);
    brow.position.set(side * 0.033, 0.138, -0.09);
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
  return head;
}

export function buildDrummer(m: Materials): DrummerModel {
  const root = new THREE.Group();
  root.name = 'drummer';

  const torso = new THREE.Group();
  const pelvis = ball(0.1, m.jeans, 20);
  pelvis.scale.set(1.65, 0.85, 1.2);
  torso.add(pelvis);
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.2, 8, 24), m.shirt);
  belly.scale.z = 0.68;
  belly.position.y = 0.2;
  belly.castShadow = true;
  torso.add(belly);
  const chest = ball(0.2, m.shirt, 28);
  chest.scale.set(0.88, 0.9, 0.52);
  chest.position.set(0, 0.42, 0.01);
  torso.add(chest);
  const yoke = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.05, BODY.shoulder[0] * 2, 6, 14),
    m.shirt
  );
  yoke.rotation.z = Math.PI / 2;
  yoke.position.set(0, BODY.shoulder[1] - 0.01, BODY.shoulder[2]);
  yoke.castShadow = true;
  torso.add(yoke);
  const neck = segment(0.043, 0.05, m.skin);
  place(neck, new THREE.Vector3(0, 0.58, 0.02), new THREE.Vector3(0, 0.69, 0.01));
  torso.add(neck);
  const head = buildHead(m);
  head.position.set(0, 0.665, 0.0);
  torso.add(head);
  root.add(torso);

  const arms: Record<Hand, ArmRig> = { lead: buildArm('lead', m), other: buildArm('other', m) };
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
  const legs: Record<Foot, LegRig> = { kickFoot: buildLeg(m), hatFoot: buildLeg(m) };
  for (const l of Object.values(legs))
    root.add(l.hip, l.thigh, l.knee, l.shin, l.ankle, l.shoe, l.toes);

  const pelvisAt = vec(BODY.pelvis);
  return {
    root,
    update(pose: Pose) {
      torso.position.copy(pelvisAt).add(new THREE.Vector3(0, pose.bob, 0));
      torso.rotation.set(-pose.lean, pose.yaw, pose.roll, 'YXZ');
      // the head stays level-ish as the torso leans: it looks at the kit, not the floor
      head.rotation.set(
        pose.lean * 0.55 - pose.nod,
        pose.headYaw - pose.yaw,
        -pose.roll * 0.5 + pose.headTilt,
        'YXZ'
      );
      poseArm(arms.lead, pose.arms.lead);
      poseArm(arms.other, pose.arms.other);
      poseLeg(legs.kickFoot, pose.legs.kickFoot);
      poseLeg(legs.hatFoot, pose.legs.hatFoot);
    },
  };
}
