import { Euler, Matrix4, Quaternion, Vector3 } from 'three';

import type { Hand } from '@/lib/app/breaks/drummer/kit-layout';
import type { ArmPose, Pose } from '@/lib/app/breaks/drummer/pose';

/**
 * An arm's pose read as the angles of its joints (experiment: the drummer
 * view's skeleton).
 *
 * The stroke planner places points — shoulder, elbow, wrist — and a frame for
 * the hand. A body moves by turning joints, so this reads those back out as
 * the angles a clinician would measure: the shoulder's elevation, the plane
 * it is raised in and the humerus's turn about its own length; the elbow's
 * bend; the forearm's pronation (the radius rolling over the ulna); and the
 * wrist's flexion and deviation. The skeleton is posed from these, and they
 * are what the joint limits in `rom.ts` are checked against.
 *
 * Everything is worked in the thorax's frame, with the other arm mirrored
 * onto the lead's, so a right arm and a left arm read the same: `+x` is out
 * to the side (lateral), `y` up, `-z` forward.
 */

export interface ArmAngles {
  /** The humerus raised from hanging, radians: 0 at the side, π/2 level. */
  elevation: number;
  /**
   * The plane it is raised in, radians: 0 straight out to the side
   * (abduction), π/2 straight forward (flexion), past that across the body.
   */
  plane: number;
  /**
   * The humerus turned about its own length, radians: positive inward
   * (internal rotation, the forearm swinging toward the belly), measured from
   * where the forearm would point had the arm swung straight up from hanging
   * with the forearm forward. `NaN` with the elbow too straight to tell.
   */
  rotation: number;
  /** The elbow's bend, radians: 0 straight. */
  flexion: number;
  /** The forearm's turn, radians: positive palm down (pronation), 0 thumb up, negative palm up. */
  pronation: number;
  /** The wrist bent toward the palm, radians (negative: back, extension). */
  wristFlexion: number;
  /** The wrist bent toward the thumb, radians (negative: toward the little finger, ulnar deviation). */
  deviation: number;
}

/** Below this elbow bend (radians) the plane the forearm makes with the humerus is too thin to read a turn from. */
const STRAIGHT = 0.12;

const X = new Vector3(1, 0, 0);
const DOWN = new Vector3(0, -1, 0);
const FORWARD = new Vector3(0, 0, -1);

/** The torso's frame, as the pose turns it about the pelvis. */
export function torsoOf(pose: Pick<Pose, 'lean' | 'yaw' | 'roll'>): Quaternion {
  return new Quaternion().setFromEuler(new Euler(-pose.lean, pose.yaw, pose.roll, 'YXZ'));
}

/** A point or direction in the torso's frame, mirrored onto the lead side for the other arm. */
function local(p: Vector3, inv: Quaternion, side: 1 | -1): Vector3 {
  const q = p.clone().applyQuaternion(inv);
  q.x *= side;
  return q;
}

function signedAngle(from: Vector3, to: Vector3, axis: Vector3): number {
  return Math.atan2(new Vector3().crossVectors(from, to).dot(axis), from.dot(to));
}

/**
 * The twist about `axis` (a unit vector) in `q`, radians: `q` split as a turn
 * about `axis` followed — or preceded, the twist is the same — by a swing
 * square to it.
 */
export function twistAbout(q: Quaternion, axis: Vector3): number {
  const p = q.x * axis.x + q.y * axis.y + q.z * axis.z;
  return 2 * Math.atan2(p, q.w);
}

/** Wrap an angle into (−π, π]. */
function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * The forearm's frame at the wrist with no pronation — thumb up, the palm
 * facing in toward the body — for an arm on the lead side: `z` along the
 * forearm, `y` out to the side (where the back of a thumb-up hand faces) and
 * `x = y × z` (toward the thumb). Built from the elbow's hinge, so it follows
 * the elbow wherever the shoulder puts it.
 */
export function neutralForearm(humerus: Vector3, forearm: Vector3): Matrix4 {
  const lateral = new Vector3().crossVectors(humerus, forearm);
  if (lateral.lengthSq() < 1e-10) {
    // straight: any line square to the forearm, outward if it can be
    lateral.copy(X).addScaledVector(forearm, -forearm.x);
    if (lateral.lengthSq() < 1e-10) lateral.set(0, 0, 1).addScaledVector(forearm, -forearm.z);
  }
  lateral.normalize();
  const thumb = new Vector3().crossVectors(lateral, forearm).normalize();
  return new Matrix4().makeBasis(thumb, lateral, forearm);
}

/**
 * The hand's frame mirrored onto the lead side, as a rotation in the torso's
 * frame: `z` to the knuckles, `y` out of the back of the hand, `x` toward the
 * thumb. (The pose's other hand has `x` toward the little finger, and
 * mirroring turns a frame inside out — between them, `x` comes out at the thumb.)
 */
function handLocal(hand: Quaternion, inv: Quaternion, side: 1 | -1): Quaternion {
  const y = local(new Vector3(0, 1, 0).applyQuaternion(hand), inv, side);
  const z = local(new Vector3(0, 0, 1).applyQuaternion(hand), inv, side);
  const x = new Vector3().crossVectors(y, z).normalize();
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
}

/** Read an arm's pose as joint angles. `torso` is the pose's torso frame ({@link torsoOf}). */
export function armAngles(arm: ArmPose, torso: Quaternion, hand: Hand): ArmAngles {
  const side = hand === 'lead' ? 1 : -1;
  const inv = torso.clone().invert();
  const shoulder = local(arm.shoulder, inv, side);
  const elbow = local(arm.elbow, inv, side);
  const wrist = local(arm.wrist, inv, side);
  const h = elbow.clone().sub(shoulder).normalize();
  const f = wrist.clone().sub(elbow).normalize();

  const elevation = Math.acos(Math.min(1, Math.max(-1, h.dot(DOWN))));
  const plane = Math.atan2(-h.z, h.x);
  const flexion = Math.acos(Math.min(1, Math.max(-1, h.dot(f))));

  // the forearm where it would point had the arm swung straight up to here from
  // hanging, forearm forward: the turn is measured from that, about the humerus
  let rotation = NaN;
  if (flexion > STRAIGHT) {
    const swing = new Quaternion().setFromUnitVectors(DOWN, h);
    const ref = FORWARD.clone().applyQuaternion(swing);
    const square = (u: Vector3) => u.clone().addScaledVector(h, -u.dot(h)).normalize();
    // inward is a turn about the humerus pointing back up it
    rotation = signedAngle(square(ref), square(f), h.clone().negate());
  }

  // the hand against a thumb-up forearm: first the forearm's turn about its own
  // length, then the wrist's bend, in the turned frame
  const neutral = new Quaternion().setFromRotationMatrix(neutralForearm(h, f));
  const r = neutral
    .clone()
    .invert()
    .multiply(handLocal(arm.hand, inv, side));
  if (r.w < 0) r.set(-r.x, -r.y, -r.z, -r.w);
  const twist = wrap(twistAbout(r, new Vector3(0, 0, 1)));
  const swing = new Quaternion()
    .setFromAxisAngle(new Vector3(0, 0, 1), twist)
    .invert()
    .multiply(r);
  const knuckles = new Vector3(0, 0, 1).applyQuaternion(swing);

  return {
    elevation,
    plane,
    rotation,
    flexion,
    // turning the back of the hand from out to the side toward up is a turn
    // about -z (the knuckles' way back): pronation
    pronation: -twist,
    wristFlexion: Math.atan2(-knuckles.y, knuckles.z),
    deviation: Math.atan2(knuckles.x, knuckles.z),
  };
}
