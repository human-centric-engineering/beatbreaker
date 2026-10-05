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
  onPiece,
  type V3,
  strikeTarget,
} from '@/lib/app/breaks/drummer/kit-layout';
import { expressionAt } from '@/lib/app/breaks/drummer/expression';
import { hatFootAt } from '@/lib/app/breaks/drummer/hat-foot';
import { type FootStance, kickStanceAt } from '@/lib/app/breaks/drummer/kick-foot';
import {
  HAND,
  KICK,
  type StrokeState,
  hatOpenAt,
  lastAtOrBefore,
  smoothstep,
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
  /** The head cocked to one side, radians: character, not the beat. */
  headTilt: number;
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

/**
 * The beat as a phase, 0 on the pulse — what the body sways to. With `pulses`,
 * the phase runs over that many beats instead (0 on every `pulses`-th).
 */
export function beatPhase(clock: StrokeTimeline['clock'], now: number, pulses = 1): number {
  if (!clock) return 0;
  const pulse = (clock.meter.group[0] ?? 1) * clock.meter.sub * pulses;
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

/**
 * Where a hand rests with nothing to play: the sticks in a loose V over the
 * near half of the snare, low, the hands relaxed.
 */
function restTarget(hand: Hand): Target {
  const snare = PIECES.snare;
  const x = hand === 'lead' ? 0.08 : -0.08;
  return { tip: v(onPiece(snare, [x, 0.03, snare.radius * 0.2])), pitch: 0.24 };
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

/** When the body reads where the hands are going, seconds from now. */
const LOOK_AHEAD = [-0.06, -0.02, 0.02, 0.06, 0.1, 0.14, 0.18];

/**
 * What an arm does with the pulse besides playing: a hand with nothing to
 * play keeps the stick moving in the air (down on the beat, up between, a
 * touch of the eighths in it), and the elbow swings out and in with the beat
 * whether the hand is playing or not.
 */
interface TimeKeeping {
  /** Extra height on the stick, metres. */
  air: number;
  /** How far the elbow swings out, in pole units. */
  sway: number;
}

/** How long either side of a note a hand is too busy to keep time in the air, seconds. */
const AIR_CLEAR = [0.16, 0.42] as const;
/** How far the idle stick swings, metres either way of where it waits. */
const AIR_SWING = 0.028;

/** When the body's effort is read, seconds before now. */
const EFFORT_WINDOW = [0, 0.04, 0.08, 0.12, 0.16, 0.2];

/** How far behind the beat the shoulders settle, in beats. */
const SHOULDER_LAG = 0.1;

/** The interval the stick's speed is read over, seconds. */
const SPEED_DT = 1 / 240;
/** How far the stick turns in the fulcrum ahead of the hand, per metre a second of tip speed. */
const PLAY_PER_SPEED = 0.055;
const PLAY_MAX = 0.2;

/**
 * An arm, from what its stick is doing.
 *
 * A stroke is the hand turning at the wrist, not the stick turning in a still
 * hand: the stick is placed where it meets the piece, and the hand and stick
 * are swung up from there about the wrist. The stick is held loosely, so it
 * leads the hand off the head on the rebound and trails it like a whip on the
 * way down — it turns in the fulcrum by an amount that grows with its speed,
 * which leaves the stick exactly where the planner put it and moves the hand.
 * Past about 11 cm the forearm comes up into the stroke too.
 */
function arm(
  hand: Hand,
  st: StrokeState,
  p: HandPath,
  speed: number,
  shoulder: Vector3,
  time: TimeKeeping
): ArmPose {
  const { from, to, travel } = p;
  const tip0 = from.tip.clone().lerp(to.tip, travel);
  const pitch = from.pitch + (to.pitch - from.pitch) * travel;
  // a hand crossing the kit goes up and over, not through the drums in between
  const arc = Math.min(0.1, from.tip.distanceTo(to.tip) * 0.3) * Math.sin(Math.PI * travel);
  const lift = st.lift + arc + time.air;

  // the stick as it meets the piece, and the hand holding it there
  const d0 = aim(hand, tip0, pitch);
  const gripLocal = GRIP_IN_HAND.clone();
  if (hand === 'other') gripLocal.x = -gripLocal.x;
  const grip0 = tip0.clone().addScaledVector(d0, -TIP_REACH);
  const q0 = handFrame(hand, d0);
  const wrist0 = grip0.clone().sub(gripLocal.clone().applyQuaternion(q0));

  // the forearm comes up for the big strokes, a little back toward the body
  const armLift = Math.max(0, lift - 0.11) * 0.7;
  const back = new Vector3(-d0.x, 0, -d0.z).normalize();
  const raise = new Vector3().addScaledVector(UP, armLift).addScaledVector(back, armLift * 0.25);

  // the wrist turns the hand and stick up about itself
  const reach = tip0.distanceTo(wrist0);
  const theta = Math.asin(Math.min(0.97, (lift - armLift) / reach));
  const axis = new Vector3().crossVectors(d0, UP).normalize();
  const turn = new Quaternion().setFromAxisAngle(axis, theta);
  const grip = wrist0.clone().add(grip0.clone().sub(wrist0).applyQuaternion(turn)).add(raise);
  const stick = d0.clone().applyQuaternion(turn);

  // the stick runs ahead of the hand in the fulcrum: the hand turns back about the grip
  const play = Math.min(PLAY_MAX, PLAY_PER_SPEED * Math.abs(speed));
  const lag = new Quaternion().setFromAxisAngle(axis, -play);
  const q = lag.clone().multiply(turn).multiply(q0);
  const wristWanted = grip.clone().sub(gripLocal.applyQuaternion(q));

  // elbows hang by the ribs, a little out and behind the hands
  const out = hand === 'lead' ? 1 : -1;
  const pole = new Vector3(out * (0.35 + time.sway), -1, 0.45);
  const { joint, end } = solveTwoBone(shoulder, wristWanted, BODY.upperArm, BODY.forearm, pole);
  // out of reach, the hand stays on the arm and the stick goes with it
  grip.add(end.clone().sub(wristWanted));
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

/** The sole under a foot point, metres off the board. */
const SOLE = 0.028;
/** The ball of the foot to the end of the toes. */
const TOES = 0.07;

/**
 * A leg, from where its foot sits on a pedal board tipped up `board` radians.
 *
 * The foot is placed by the board, not the other way round: a heel-up foot
 * keeps its ball on the board and pivots the heel up from there (the toes
 * staying flat); a toe-up foot keeps its heel on the board and lifts the ball.
 * A swivel turns the foot about its contact with the board. The ankle sits in
 * the foot's own frame, so a steep foot carries the shin forward over it, and
 * the knee is solved from the hip to that.
 */
function leg(foot: Foot, board: number, stance: FootStance): LegPose {
  const pedal = foot === 'kickFoot' ? KICK_PEDAL : HAT_PEDAL;
  const plate = v(pedal.heel);
  const toward = dir(pedal.toward);
  const along = toward.clone().multiplyScalar(Math.cos(board)).addScaledVector(UP, Math.sin(board));
  const side = new Vector3().crossVectors(toward, UP).normalize();
  const normal = new Vector3().crossVectors(side, along).normalize();

  // heel out is away from the body's middle: +x for the kick foot, -x for the hat
  const out = foot === 'kickFoot' ? 1 : -1;
  const fAlong = along
    .clone()
    .multiplyScalar(Math.cos(stance.swivel))
    .addScaledVector(side, -out * Math.sin(stance.swivel));

  const under = plate.clone().addScaledVector(along, stance.slide * BOARD_LENGTH);
  let heel: Vector3;
  let ball: Vector3;
  let toe: Vector3;
  if (stance.pitch >= 0) {
    ball = under.addScaledVector(normal, SOLE);
    heel = ball
      .clone()
      .addScaledVector(fAlong, -Math.cos(stance.pitch) * BODY.foot)
      .addScaledVector(normal, Math.sin(stance.pitch) * BODY.foot);
    toe = ball.clone().addScaledVector(fAlong, TOES);
  } else {
    const q = -stance.pitch;
    const up = fAlong.clone().multiplyScalar(Math.cos(q)).addScaledVector(normal, Math.sin(q));
    heel = under.addScaledVector(fAlong, -BODY.foot).addScaledVector(normal, SOLE);
    ball = heel.clone().addScaledVector(up, BODY.foot);
    toe = ball.clone().addScaledVector(up, TOES);
  }

  const length = new Vector3().subVectors(ball, heel).normalize();
  const footSide = new Vector3().crossVectors(length, normal).normalize();
  const footUp = new Vector3().crossVectors(footSide, length).normalize();
  const ankle = heel.clone().addScaledVector(footUp, BODY.ankle).addScaledVector(length, 0.035);

  const hip = mirrorSide(BODY.hip, foot);
  // a heel swung out turns the knee in
  const pole = new Vector3(out * (0.25 - 1.2 * stance.swivel), 0.6, -1);
  const { joint } = solveTwoBone(hip, ankle, BODY.thigh, BODY.shin, pole);
  return { hip, knee: joint, ankle, heel, ball, toe, board };
}

/** How long a relaxed hand takes to cross the kit: a base, and seconds per metre. */
const MOVE_BASE = 0.14;
const MOVE_PER_M = 0.5;

function smootherstep(a: number, b: number, x: number): number {
  if (b <= a) return x >= b ? 1 : 0;
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * u * (u * (u * 6 - 15) + 10);
}

/**
 * Where a hand is between strokes: the piece it is coming from, the piece it
 * is going to, and how far along it is (0–1).
 *
 * A hand that has the time leaves early and takes a move as long as the
 * distance asks for, easing out and in (no sudden start or stop), to arrive a
 * moment before the stick comes down; one without the time leaves on the
 * rebound. With nothing to play it settles into a rest — the sticks in a
 * loose V over the snare — and comes out of it in time for the first note.
 */
interface HandPath {
  from: Target;
  to: Target;
  travel: number;
}

/** How long after its last note an idle hand starts to settle, seconds. */
const SETTLE_AFTER = 0.9;

function moveTime(a: Target, b: Target): number {
  return MOVE_BASE + MOVE_PER_M * a.tip.distanceTo(b.tip);
}

/** How far back a lead hand's time-keeping is remembered, seconds. */
const HOME_MEMORY = 4;
const isHome = (h: Hit) => h.piece === 'snare' || h.piece === 'hat' || h.piece === 'ride';

/**
 * Where a hand goes back to between other things: the snare for the other
 * hand, and for the lead hand whichever it was keeping time on last — the
 * hats or the ride.
 */
function homeOf(hits: readonly Hit[], i: number, hand: Hand, hatGap: number): Target {
  if (hand === 'lead') {
    for (let j = i; j >= 0 && hits[i].time - hits[j].time < HOME_MEMORY; j--) {
      const h = hits[j];
      if (h.piece === 'hat' || h.piece === 'ride') return targetOf(h, hand, hatGap);
    }
  }
  return targetOf(undefined, hand, hatGap);
}

function path(
  st: StrokeState,
  hits: readonly Hit[],
  hand: Hand,
  now: number,
  hatGap: number
): HandPath {
  const { prev, next } = st;
  const rest = restTarget(hand);
  if (prev && next) {
    const from = targetOf(prev, hand, hatGap);
    const to = targetOf(next, hand, hatGap);
    const gap = next.time - prev.time;
    const end = next.time - Math.min(0.03, gap * 0.2);
    // off a tom or a crash with time to spare, the hand goes home before the next note
    if (!isHome(prev)) {
      const home = homeOf(hits, lastAtOrBefore(hits, prev.time), hand, hatGap);
      const out = moveTime(from, home);
      const back = moveTime(home, to);
      const leave = prev.time + Math.min(0.12, gap * 0.15);
      if (leave + out + back + 0.15 < end) {
        if (now < leave + out) {
          return { from, to: home, travel: smootherstep(leave, leave + out, now) };
        }
        return { from: home, to, travel: smootherstep(end - back, end, now) };
      }
    }
    if (from.tip.distanceTo(to.tip) < 1e-4) return { from, to, travel: 1 };
    const start = Math.max(prev.time + Math.min(0.015, gap * 0.1), end - moveTime(from, to));
    return { from, to, travel: smootherstep(start, end, now) };
  }
  if (next) {
    const to = targetOf(next, hand, hatGap);
    const end = next.time - 0.03;
    return { from: rest, to, travel: smootherstep(end - moveTime(rest, to) - 0.1, end, now) };
  }
  if (prev) {
    let from = targetOf(prev, hand, hatGap);
    // off a tom or a crash, home first; then, with still nothing to play, the rest
    if (!isHome(prev)) {
      const home = homeOf(hits, lastAtOrBefore(hits, prev.time), hand, hatGap);
      const leave = prev.time + 0.12;
      const out = moveTime(from, home);
      if (now < leave + out) {
        return { from, to: home, travel: smootherstep(leave, leave + out, now) };
      }
      from = home;
    }
    const start = prev.time + SETTLE_AFTER;
    return { from, to: rest, travel: smootherstep(start, start + moveTime(from, rest) + 0.3, now) };
  }
  return { from: rest, to: rest, travel: 0 };
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
  const open = hatOpenAt(hatHits, now);
  const phase = beatPhase(timeline.clock, now);
  const hatFoot = hatFootAt(timeline.forLimb('hatFoot'), now, phase, groove, open);
  const hatLift = Math.max(open, hatFoot.lift);
  const hatGap = HAT_CLOSED_GAP + 0.024 * hatLift;

  const leadHits = timeline.forLimb('lead');
  const otherHits = timeline.forLimb('other');
  const strokes = {
    lead: strokeAt(leadHits, now, HAND),
    other: strokeAt(otherHits, now, HAND),
  };
  // how fast each stick is rising or falling: the hand lags it in the fulcrum
  const speed = (hand: Hand) =>
    (strokes[hand].lift -
      strokeAt(hand === 'lead' ? leadHits : otherHits, now - SPEED_DT, HAND).lift) /
    SPEED_DT;
  const paths = {
    lead: path(strokes.lead, leadHits, 'lead', now, hatGap),
    other: path(strokes.other, otherHits, 'other', now, hatGap),
  };

  // the torso turns toward where the hands are going and leans in to reach
  // the body and head go with where the hands are heading, averaged a little ahead:
  // they anticipate a move and ease into it rather than snapping after the sticks
  const lt = new Vector3();
  const ot = new Vector3();
  for (const dt of LOOK_AHEAD) {
    const at = now + dt;
    for (const [hand, hits, sum] of [
      ['lead', leadHits, lt],
      ['other', otherHits, ot],
    ] as const) {
      const p = path(strokeAt(hits, at, HAND), hits, hand, at, hatGap);
      sum.addScaledVector(p.from.tip.clone().lerp(p.to.tip, p.travel), 1 / LOOK_AHEAD.length);
    }
  }
  const midX = (lt.x + ot.x) / 2 + 0.12;
  const reach = -(lt.z + ot.z) / 2;
  const yaw = Math.max(-0.3, Math.min(0.3, -0.55 * midX));

  const pulse = 0.5 + 0.5 * Math.cos(2 * Math.PI * phase);
  const nodPulse = 0.5 + 0.5 * Math.cos(2 * Math.PI * (phase - 0.12));
  const breath = Math.sin((now * 2 * Math.PI) / 4.2);
  // the body works harder on big strokes, read over a fifth of a second so it swells
  // and eases rather than snapping with each stick
  let effort = 0;
  for (const dt of EFFORT_WINDOW) {
    const at = now - dt;
    const big = Math.max(strokeAt(leadHits, at, HAND).lift, strokeAt(otherHits, at, HAND).lift);
    effort += Math.max(0, big - 0.18) / EFFORT_WINDOW.length;
  }

  const ex = expressionAt(all, now);
  const bob = -0.012 * groove * pulse + 0.004 * breath + 0.05 * effort + groove * ex.dip;
  const lean = 0.08 + Math.max(0, reach - 0.3) * 0.35 + 0.025 * groove * pulse + groove * ex.lean;
  const roll = Math.max(-0.05, Math.min(0.05, -0.25 * (lt.y - ot.y)));
  const nod = 0.05 + 0.07 * groove * nodPulse * ex.nodScale + groove * ex.nod;
  // the head looks ahead at the kit; through a fill it follows the sticks round it
  const ahead = yaw * 0.6 + Math.max(-0.25, Math.min(0.25, -0.3 * (lt.x + 0.1)));
  const sticks = Math.max(-0.4, Math.min(0.4, -0.7 * ((lt.x + ot.x) / 2 + 0.05)));
  const headYaw = ahead + (sticks - ahead) * 0.6 * groove * ex.focus;
  const headTilt = groove * ex.tilt;

  const torso = new Euler(-lean, yaw, roll, 'YXZ');
  const pelvis = v(BODY.pelvis).add(new Vector3(0, bob, 0));

  // every part keeps time, playing or not. On the beat the sticks dip and the
  // shoulders settle, a moment behind the head; over two beats they rock a
  // little side to side. How much drifts with the mood, so it is never the same
  // bar twice
  const dip = 0.65 * pulse + 0.35 * (0.5 + 0.5 * Math.cos(4 * Math.PI * phase));
  const settle = 0.5 + 0.5 * Math.cos(2 * Math.PI * (phase - SHOULDER_LAG));
  const rock = Math.cos(2 * Math.PI * (beatPhase(timeline.clock, now, 2) - SHOULDER_LAG / 2));
  const timeOf = (hand: Hand): TimeKeeping => {
    const st = strokes[hand];
    const since = st.prev ? now - st.prev.time : Infinity;
    const until = st.next ? st.next.time - now : Infinity;
    const idle = smoothstep(...AIR_CLEAR, since) * smoothstep(...AIR_CLEAR, until);
    return {
      air: groove * idle * AIR_SWING * 2 * (0.5 - dip) * ex.nodScale,
      sway: groove * ex.nodScale * 0.1 * (0.5 - settle),
    };
  };
  const time = { lead: timeOf('lead'), other: timeOf('other') };
  const shoulderOf = (hand: Hand) => {
    const side = hand === 'lead' ? 1 : -1;
    // small: a shoulder that heaves with the strokes reads as a twitch, not a groove
    const keep = groove * ex.nodScale * (0.004 * (0.5 - settle) + 0.003 * side * rock);
    return mirrorSide(BODY.shoulder, hand)
      .add(new Vector3(0, keep, 0))
      .applyEuler(torso)
      .add(pelvis);
  };

  const kickHits = timeline.forLimb('kickFoot');
  const kick = strokeAt(kickHits, now, KICK);
  const stance = kickStanceAt(kickHits, now);

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
    headTilt,
    arms: {
      lead: arm('lead', strokes.lead, paths.lead, speed('lead'), shoulderOf('lead'), time.lead),
      other: arm(
        'other',
        strokes.other,
        paths.other,
        speed('other'),
        shoulderOf('other'),
        time.other
      ),
    },
    legs: {
      kickFoot: leg('kickFoot', 0.1 + 0.32 * kick.lift, {
        ...stance,
        // the leg lifts into the stroke: the heel rises with the beater
        pitch: stance.pitch + stance.drive * kick.lift,
      }),
      hatFoot: leg('hatFoot', 0.08 + 0.3 * hatLift, hatFoot.stance),
    },
    beater: BEATER_CONTACT + 0.95 * kick.lift,
    hatGap,
    hits,
  };
}

/** Every piece the kit has, for a scene to build one of each. */
export const PIECE_IDS = Object.keys(PIECES) as PieceId[];
