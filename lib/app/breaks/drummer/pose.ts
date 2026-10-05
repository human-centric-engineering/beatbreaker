import { Euler, Matrix4, Quaternion, Vector3 } from 'three';

import { solveTwoBone } from '@/lib/app/breaks/drummer/ik';
import {
  AIM_FROM,
  BOARD_LENGTH,
  BODY,
  type Foot,
  HAND_REST,
  HAT_PEDAL,
  type Hand,
  KICK_PEDAL,
  type PieceId,
  PIECES,
  TIP_REACH,
  type V3,
  strikeTarget,
} from '@/lib/app/breaks/drummer/kit-layout';
import {
  CHICK,
  HAND,
  KICK,
  type StrokeState,
  hatOpenAt,
  strokeAt,
} from '@/lib/app/breaks/drummer/strokes';
import type { Hit, StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';

/**
 * The whole body at one instant (experiment: the drummer view).
 *
 * Everything is solved from the strokes outward: where each stick has to be
 * (the stroke planner), where the hand holding it must be for that, where the
 * elbow goes for the hand to be there (two-bone IK from a shoulder the torso
 * has placed). The torso sways to the pulse and turns toward the hands, so the
 * shoulders move under the arms and the arms re-solve — which is why a reach
 * to the floor tom turns the body rather than stretching an arm.
 *
 * Model space is the right-handed kit (see `kit-layout.ts`). Pure, apart from
 * the `three` maths types it returns.
 */

export interface ArmPose {
  shoulder: Vector3;
  elbow: Vector3;
  wrist: Vector3;
  /**
   * The hand's frame: `z` from the wrist toward the knuckles, `y` out of the
   * back of the hand, `x` toward the thumb on the lead hand and toward the
   * little finger on the other (`x = y × z`, whichever hand it is).
   */
  hand: Quaternion;
  /** The fulcrum: where the thumb and first finger pinch the stick. */
  grip: Vector3;
  /** Unit vector, butt to tip. */
  stick: Vector3;
  tip: Vector3;
  /** How high the tip is above where it lands, metres. */
  lift: number;
  /** 0–1: the back fingers wrapped, tightening on contact and giving as the stick rises. */
  curl: number;
}

export interface LegPose {
  hip: Vector3;
  knee: Vector3;
  ankle: Vector3;
  heel: Vector3;
  ball: Vector3;
  toe: Vector3;
  /** The pedal board's angle above flat, radians. */
  board: number;
}

export interface PieceHit {
  since: number;
  strength: number;
}

export interface Pose {
  /** The torso: dip, turn, lean forward and tilt, radians (bob in metres). */
  bob: number;
  yaw: number;
  lean: number;
  roll: number;
  nod: number;
  headYaw: number;
  arms: Record<Hand, ArmPose>;
  legs: Record<Foot, LegPose>;
  /** The kick beater, radians back from the head. */
  beater: number;
  /** Space between the hat cymbals, metres. */
  hatGap: number;
  /** The last stroke on each piece, for cymbals to swing and heads to give. */
  hits: Partial<Record<PieceId, PieceHit>>;
}

const UP = new Vector3(0, 1, 0);

/** The gap between the hat cymbals with the pedal down. */
export const HAT_CLOSED_GAP = 0.003;

function v(a: V3): Vector3 {
  return new Vector3(a[0], a[1], a[2]);
}

function mirrorSide(a: V3, hand: Hand | Foot): Vector3 {
  const side = hand === 'lead' || hand === 'kickFoot' ? 1 : -1;
  return new Vector3(a[0] * side, a[1], a[2]);
}

/** The beat as a phase, 0 on the pulse — what the body sways to. */
export function beatPhase(clock: StrokeTimeline['clock'], now: number): number {
  if (!clock) return 0;
  const pulse = (clock.meter.group[0] ?? 1) * clock.meter.sub;
  const steps = (now - clock.t) / clock.dur + clock.slot;
  const ph = (steps % pulse) / pulse;
  return ph < 0 ? ph + 1 : ph;
}

interface Target {
  tip: Vector3;
  pitch: number;
}

function targetOf(hit: Hit | undefined, hand: Hand, hatGap: number): Target {
  const piece: PieceId = hit?.piece ?? HAND_REST[hand];
  const { tip, pitch } = strikeTarget(piece, hit?.contact);
  const out = v(tip);
  if (piece === 'sticks') {
    // the two sticks meet across each other, each hand on its own side
    out.x += hand === 'lead' ? 0.03 : -0.03;
    if (hand === 'lead') out.y += 0.01;
  }
  // the top hat cymbal rides up as the pedal opens
  if (piece === 'hat') out.y += hatGap - HAT_CLOSED_GAP;
  return { tip: out, pitch };
}

/** The stick's direction when it meets a target: aimed across the body, pitched down onto the piece. */
function aim(hand: Hand, tip: Vector3, pitch: number): Vector3 {
  const from = AIM_FROM[hand];
  const h = new Vector3(tip.x - from[0], 0, tip.z - from[2]);
  if (h.lengthSq() < 1e-8) h.set(0, 0, -1);
  h.normalize().multiplyScalar(Math.cos(pitch));
  return new Vector3(h.x, -Math.sin(pitch), h.z).normalize();
}

/** Where the fulcrum sits in the hand's frame, for the lead hand (the other mirrors `x`). */
const GRIP_IN_HAND = new Vector3(0.022, -0.026, 0.074);
/** How far the hand's long axis turns out from the stick: the stick runs across the palm. */
const HAND_SPLAY = 0.42;
/** How far the back of the hand rolls out from flat (American grip, between German and French). */
const HAND_ROLL = 0.5;

function handFrame(hand: Hand, stick: Vector3): Quaternion {
  const outward = hand === 'lead' ? 1 : -1;
  const up = UP.clone()
    .sub(stick.clone().multiplyScalar(stick.dot(UP)))
    .normalize();
  const side = new Vector3().crossVectors(stick, up).normalize().multiplyScalar(outward);
  const back = up
    .clone()
    .multiplyScalar(Math.cos(HAND_ROLL))
    .addScaledVector(side, Math.sin(HAND_ROLL))
    .normalize();
  const fwd = stick
    .clone()
    .multiplyScalar(Math.cos(HAND_SPLAY))
    .addScaledVector(side, Math.sin(HAND_SPLAY));
  fwd.sub(back.clone().multiplyScalar(fwd.dot(back))).normalize();
  const x = new Vector3().crossVectors(back, fwd);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, back, fwd));
}

function arm(hand: Hand, st: StrokeState, shoulder: Vector3, hatGap: number): ArmPose {
  const from = targetOf(st.prev ?? st.next, hand, hatGap);
  const to = st.next ? targetOf(st.next, hand, hatGap) : from;
  const tip0 = from.tip.clone().lerp(to.tip, st.travel);
  const pitch = from.pitch + (to.pitch - from.pitch) * st.travel;
  // a hand crossing the kit goes up and over, not through the drums in between
  const arc = Math.min(0.1, from.tip.distanceTo(to.tip) * 0.3) * Math.sin(Math.PI * st.travel);
  const lift = st.lift + arc;

  const d0 = aim(hand, tip0, pitch);
  // the wrist does the small strokes; past ~11 cm the forearm comes up with it
  const armLift = Math.max(0, lift - 0.11) * 0.7;
  const wristLift = lift - armLift;
  const theta = Math.asin(Math.min(0.97, wristLift / TIP_REACH));
  const axis = new Vector3().crossVectors(d0, UP).normalize();
  const stick = d0.clone().applyAxisAngle(axis, theta);

  const back = new Vector3(-d0.x, 0, -d0.z).normalize();
  const grip = tip0
    .clone()
    .addScaledVector(d0, -TIP_REACH)
    .addScaledVector(UP, armLift)
    .addScaledVector(back, armLift * 0.25);

  const q = handFrame(hand, stick);
  const gripLocal = GRIP_IN_HAND.clone();
  if (hand === 'other') gripLocal.x = -gripLocal.x;
  const wristWanted = grip.clone().sub(gripLocal.applyQuaternion(q));

  // elbows hang, a little out from the ribs and behind the hands
  const pole = new Vector3(hand === 'lead' ? 0.85 : -0.85, -1, 0.05);
  const { joint, end } = solveTwoBone(shoulder, wristWanted, BODY.upperArm, BODY.forearm, pole);
  // out of reach, the hand stays on the arm and the stick goes with it
  const shift = end.clone().sub(wristWanted);
  grip.add(shift);
  const tip = grip.clone().addScaledVector(stick, TIP_REACH);

  const squeeze = st.prev ? st.prev.strength * Math.exp(-st.since * 22) : 0;
  const give = Math.min(1, lift / 0.15);
  return {
    shoulder,
    elbow: joint,
    wrist: end,
    hand: q,
    grip,
    stick,
    tip,
    lift,
    curl: Math.min(1, Math.max(0, 0.62 + 0.3 * squeeze - 0.22 * give)),
  };
}

function dir(a: V3): Vector3 {
  return v(a).normalize();
}

function leg(foot: Foot, board: number, heelUp: number): LegPose {
  const pedal = foot === 'kickFoot' ? KICK_PEDAL : HAT_PEDAL;
  const plate = v(pedal.heel);
  const toward = dir(pedal.toward);
  const along = toward.clone().multiplyScalar(Math.cos(board)).addScaledVector(UP, Math.sin(board));
  const normal = new Vector3()
    .crossVectors(new Vector3().crossVectors(toward, UP), along)
    .normalize();
  if (normal.y < 0) normal.negate();

  const ball = plate
    .clone()
    .addScaledVector(along, BOARD_LENGTH * 0.68)
    .addScaledVector(normal, 0.03);
  const toe = ball.clone().addScaledVector(along, 0.07);
  // heel up pivots the foot on its ball; heel down rests it on the plate and the toe works the board
  let heel: Vector3;
  if (heelUp > 0) {
    const rise = Math.min(BODY.foot * 0.9, heelUp + 0.02);
    const run = Math.sqrt(BODY.foot * BODY.foot - rise * rise);
    heel = ball
      .clone()
      .addScaledVector(toward, -run)
      .add(new Vector3(0, rise, 0));
  } else {
    heel = plate.clone().addScaledVector(normal, 0.03);
  }
  const ankle = heel
    .clone()
    .add(new Vector3(0, BODY.ankle, 0))
    .addScaledVector(toward, 0.035);

  const hip = mirrorSide(BODY.hip, foot);
  const pole = new Vector3(foot === 'kickFoot' ? 0.25 : -0.25, 0.6, -1);
  const { joint } = solveTwoBone(hip, ankle, BODY.thigh, BODY.shin, pole);
  return { hip, knee: joint, ankle, heel, ball, toe, board };
}

/** The kick beater on the head, radians from upright: leaning forward onto it. */
export const BEATER_CONTACT = -0.21;

/**
 * The pose at `now`.
 *
 * `groove` is how much the body moves with the music, 0–1 — the caller eases
 * it in at Play and out at Stop, so the drummer does not freeze mid-sway.
 */
export function poseAt(timeline: StrokeTimeline, now: number, groove: number): Pose {
  const all = timeline.all();
  const hatHits = all.filter((h) => h.piece === 'hat');
  const chick = strokeAt(timeline.forLimb('hatFoot'), now, CHICK);
  const open = hatOpenAt(hatHits, now);
  const hatLift = Math.max(open, chick.lift);
  const hatGap = HAT_CLOSED_GAP + 0.024 * hatLift;

  const strokes = {
    lead: strokeAt(timeline.forLimb('lead'), now, HAND),
    other: strokeAt(timeline.forLimb('other'), now, HAND),
  };

  // the torso turns toward where the hands are going and leans in to reach
  const leadTo = targetOf(strokes.lead.next ?? strokes.lead.prev, 'lead', hatGap).tip;
  const otherTo = targetOf(strokes.other.next ?? strokes.other.prev, 'other', hatGap).tip;
  const leadFrom = targetOf(strokes.lead.prev ?? strokes.lead.next, 'lead', hatGap).tip;
  const otherFrom = targetOf(strokes.other.prev ?? strokes.other.next, 'other', hatGap).tip;
  const lt = leadFrom.lerp(leadTo, strokes.lead.travel);
  const ot = otherFrom.lerp(otherTo, strokes.other.travel);
  const midX = (lt.x + ot.x) / 2 + 0.12;
  const reach = -(lt.z + ot.z) / 2;
  const yaw = Math.max(-0.3, Math.min(0.3, -0.55 * midX));

  const phase = beatPhase(timeline.clock, now);
  const pulse = 0.5 + 0.5 * Math.cos(2 * Math.PI * phase);
  const nodPulse = 0.5 + 0.5 * Math.cos(2 * Math.PI * (phase - 0.12));
  const breath = Math.sin((now * 2 * Math.PI) / 4.2);
  const effort = Math.max(0, Math.max(strokes.lead.lift, strokes.other.lift) - 0.18);

  const bob = -0.012 * groove * pulse + 0.004 * breath + 0.05 * effort;
  const lean = 0.08 + Math.max(0, reach - 0.3) * 0.35 + 0.025 * groove * pulse;
  const roll = Math.max(-0.05, Math.min(0.05, -0.25 * (lt.y - ot.y)));
  const nod = 0.05 + 0.07 * groove * nodPulse;
  const headYaw = yaw * 0.6 + Math.max(-0.25, Math.min(0.25, -0.3 * (lt.x + 0.1)));

  const torso = new Euler(-lean, yaw, roll, 'YXZ');
  const pelvis = v(BODY.pelvis).add(new Vector3(0, bob, 0));
  const shoulderOf = (hand: Hand) => mirrorSide(BODY.shoulder, hand).applyEuler(torso).add(pelvis);

  const kick = strokeAt(timeline.forLimb('kickFoot'), now, KICK);

  const hits: Partial<Record<PieceId, PieceHit>> = {};
  for (let i = all.length - 1; i >= 0; i--) {
    const h = all[i];
    if (h.time > now || hits[h.piece]) continue;
    hits[h.piece] = { since: now - h.time, strength: h.strength };
  }

  return {
    bob,
    yaw,
    lean,
    roll,
    nod,
    headYaw,
    arms: {
      lead: arm('lead', strokes.lead, shoulderOf('lead'), hatGap),
      other: arm('other', strokes.other, shoulderOf('other'), hatGap),
    },
    legs: {
      kickFoot: leg('kickFoot', 0.1 + 0.32 * kick.lift, 0.05 + 0.04 * kick.lift),
      hatFoot: leg('hatFoot', 0.08 + 0.3 * hatLift, 0),
    },
    beater: BEATER_CONTACT + 0.95 * kick.lift,
    hatGap,
    hits,
  };
}

/** Every piece the kit has, for a scene to build one of each. */
export const PIECE_IDS = Object.keys(PIECES) as PieceId[];
