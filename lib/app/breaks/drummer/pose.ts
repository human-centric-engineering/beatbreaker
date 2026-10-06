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
  STICK,
  TIP_REACH,
  onPiece,
  type V3,
  strikeTarget,
} from '@/lib/app/breaks/drummer/kit-layout';
import { type Glance, expressionAt } from '@/lib/app/breaks/drummer/expression';
import { hatFootAt } from '@/lib/app/breaks/drummer/hat-foot';
import { type FootStance, kickStanceAt } from '@/lib/app/breaks/drummer/kick-foot';
import {
  HAND,
  KICK,
  type StrokeState,
  hatOpenAt,
  drift,
  lastAtOrBefore,
  seedOf,
  smoothstep,
  strokeAt,
} from '@/lib/app/breaks/drummer/strokes';
import { makeRng } from '@/lib/app/breaks/rng';
import type { Downbeat, Hit, StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';

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
  /** A look out at the camera, now and then: the model turns the head to wherever it is. */
  glance: Glance;
  /** 0–1: both eyes shut for a blink. */
  blink: number;
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
  /**
   * How far this note's stroke leans off the stick's straight-up plane,
   * radians about the vertical at the fulcrum: the stick goes up a little to
   * one side and comes down along the same line onto the note.
   */
  lean: number;
  /** How far the back of the hand rolls out from flat, radians (see `ROLL`). */
  roll: number;
}

/**
 * How far the back of the hand rolls out from flat on each kind of piece,
 * radians: about 40° on the drums (American grip, between German's flat palm
 * and French's thumb up), further toward the thumb on the ride — where the
 * fingers do more of the work — and the cymbals and hats in between.
 */
const ROLL: Partial<Record<PieceId, number>> = { ride: 1.05, crash: 0.85, hat: 0.75 };
const ROLL_DRUM = 0.72;
/** A hand at rest or counting in, relaxed and a little flatter. */
const ROLL_REST = 0.6;

/** How far a note's stroke can lean off straight up, radians either way. */
const STROKE_LEAN = 0.12;

function targetOf(hit: Hit | undefined, hand: Hand, hatGap: number): Target {
  const piece: PieceId = hit?.piece ?? HAND_REST[hand];
  if (piece === 'sticks') return countTarget(hand);
  const scatter = hit ? scatterOf(hit, hand) : undefined;
  const { tip, pitch } = strikeTarget(piece, hit?.contact, scatter);
  const out = v(tip);
  // the top hat cymbal rides up as the pedal opens
  if (piece === 'hat') out.y += hatGap - HAT_CLOSED_GAP;
  // a note landing to one side was thrown from that side: the lean follows the scatter
  return {
    tip: out,
    pitch,
    lean: scatter ? STROKE_LEAN * (0.6 * scatter[0] + 0.4 * scatter[2]) : 0,
    roll: hit ? (ROLL[piece] ?? ROLL_DRUM) : ROLL_REST,
  };
}

/** How long a sweep across the ride takes to wander from one side to the other, seconds. */
const RIDE_SWEEP_PERIOD = 1.4;

/**
 * Where in its piece's plane a note lands, each -1..1: seeded from the note, so it holds still.
 *
 * The ride is the exception across the cymbal: its notes follow a slow seeded
 * drift, so a run of them wipes left to right or right to left across the
 * bow, and sometimes sits still — the stroke leaning with it.
 */
export function scatterOf(hit: Hit, hand: Hand): [number, number, number] {
  const rng = makeRng(seedOf(hit) ^ (hand === 'lead' ? 0x5f3759df : 0x7a3c91e5));
  const s: [number, number, number] = [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1];
  if (hit.piece === 'ride' && hit.contact !== 'bell') {
    s[0] = 0.85 * drift(hit.step, RIDE_SWEEP_PERIOD, 0x51de) + 0.15 * s[0];
  }
  return s;
}

/**
 * Counting in: the sticks crossed in an X in front of the chest, both raised
 * at an angle, meeting about halfway along — shaft on shaft, not tip on tip.
 * The target is the tip, so each sits past the crossing by that much along its
 * own stick.
 */
function countTarget(hand: Hand): Target {
  // the lead stick lands on top of the other: its centre a stick's thickness above
  const cross = v(PIECES.sticks.centre).add(new Vector3(0, hand === 'lead' ? 0.102 : 0.08, -0.08));
  const pitch = hand === 'lead' ? -0.5 : -0.62;
  const past = hand === 'lead' ? 0.18 : 0.16;
  return {
    tip: cross.clone().addScaledVector(aim(hand, cross, pitch), past),
    pitch,
    lean: 0,
    roll: ROLL_REST,
  };
}

/**
 * Where a hand rests with nothing to play: the sticks in a loose V over the
 * near half of the snare, low, the hands relaxed.
 */
function restTarget(hand: Hand): Target {
  const snare = PIECES.snare;
  const x = hand === 'lead' ? 0.08 : -0.08;
  return {
    tip: v(onPiece(snare, [x, 0.03, snare.radius * 0.2])),
    pitch: 0.24,
    lean: 0,
    roll: ROLL_REST,
  };
}

/** The stick's direction when it meets a target: aimed across the body, pitched down onto the piece. */
function aim(hand: Hand, tip: Vector3, pitch: number): Vector3 {
  const from = AIM_FROM[hand];
  const h = new Vector3(tip.x - from[0], 0, tip.z - from[2]);
  if (h.lengthSq() < 1e-8) h.set(0, 0, -1);
  h.normalize().multiplyScalar(Math.cos(pitch));
  return new Vector3(h.x, -Math.sin(pitch), h.z).normalize();
}

/**
 * Where the fulcrum sits in the hand's frame, for the lead hand (the other
 * mirrors `x`): under the pad of the thumb, the stick balanced on the middle
 * finger with the first finger wrapped beside it — out past the knuckles and
 * under them.
 */
const GRIP_IN_HAND = new Vector3(0.023, -0.026, 0.12);
/**
 * How far the hand's long axis turns out from the stick. The stick runs across
 * the palm from the fulcrum to the heel of the hand, so the back fingers wrap
 * it behind the fulcrum and the butt shows past the little finger.
 */
const HAND_SPLAY = 0.7;
function handFrame(hand: Hand, stick: Vector3, roll: number): Quaternion {
  const outward = hand === 'lead' ? 1 : -1;
  const up = UP.clone()
    .sub(stick.clone().multiplyScalar(stick.dot(UP)))
    .normalize();
  const side = new Vector3().crossVectors(stick, up).normalize().multiplyScalar(outward);
  const back = up
    .clone()
    .multiplyScalar(Math.cos(roll))
    .addScaledVector(side, Math.sin(roll))
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
  /** How the hand's strokes are drifting, around 1: a little higher for a while, then lower. */
  height: number;
  /** How far the elbow swings out, in pole units. */
  sway: number;
  /** The stroke's lift `WRIST_LEAD` from now, metres: what the wrist is already doing. */
  ahead: number;
  /** A stick trick while waiting for Play. */
  twirl: Twirl;
}

/**
 * How much taller the strokes into a new bar grow, as a share: rolled between
 * these for each bar — a touch when the pattern carries on, more when it changes.
 */
const BAR_CUE = [0.08, 0.22] as const;
const BAR_CUE_CHANGE = [0.25, 0.45] as const;
/** And for the hand bringing a crash in on the one. */
const BAR_CUE_CRASH = [0.6, 1.1] as const;
/** How long before the one the hands start to come up, seconds: rolled between these. */
const BAR_CUE_LEAD = [0.3, 0.6] as const;

/**
 * How much taller a hand's strokes are at `now` as a new bar comes: a share
 * over 1. Over the last moments of a bar the hands come up a little higher —
 * a cue the band can read that the one is coming — by a different amount
 * each bar, and clearly higher for the hand that is about to bring a crash
 * in on it. It is the strokes that grow, not a lift on top of them, so every
 * note still meets its head; it settles back as the one lands.
 */
export function barCueAt(ones: readonly Downbeat[], hits: readonly Hit[], now: number): number {
  let cue = 0;
  for (const d of ones) {
    if (d.time < now - 0.2 || d.time > now + BAR_CUE_LEAD[1]) continue;
    const rng = makeRng((Math.round(d.time * 1000) ^ 0x1f83d9ab) >>> 0);
    const lead = BAR_CUE_LEAD[0] + (BAR_CUE_LEAD[1] - BAR_CUE_LEAD[0]) * rng();
    const at = lastAtOrBefore(hits, d.time + 0.01);
    const crash = at >= 0 && hits[at].piece === 'crash' && Math.abs(hits[at].time - d.time) < 0.03;
    const [lo, hi] = crash ? BAR_CUE_CRASH : d.change ? BAR_CUE_CHANGE : BAR_CUE;
    const size = lo + (hi - lo) * rng();
    const up = smoothstep(d.time - lead, d.time - 0.05, now);
    cue = Math.max(cue, size * up * (1 - smoothstep(d.time, d.time + 0.15, now)));
  }
  return cue;
}

/** A trick can come once in each of these windows while waiting, seconds, and does in this share of them. */
const TWIRL_WINDOW = 10;
const TWIRL_CHANCE = 0.38;
/** The trick: up, spun round the fingers, and back down, seconds. */
const TWIRL_UP = 0.35;
const TWIRL_SPIN = 0.8;
const TWIRL_DOWN = 0.45;
/** How high the hand comes up for it, metres: rolled between these each time. */
const TWIRL_LOW = 0.11;
const TWIRL_HIGH = 0.3;
/** How often both hands do it together, the second a beat behind the first. */
const TWIRL_BOTH = 0.1;
const TWIRL_FOLLOW = 0.15;
/** A trick is put away by this much groove: a moment after Play. */
const TWIRL_GROOVE = 0.15;
/** How long either side of a trick the hands must have nothing to play, seconds. */
const TWIRL_CLEAR = 1.5;

export interface Twirl {
  /** 0–1: how far into the trick the hand is. */
  amount: number;
  /** How far the stick has spun, radians. */
  spin: number;
  /** How high the hand comes up for it, metres. */
  raise: number;
}

/**
 * Waiting for Play, now and then a hand lifts its stick and twirls it round
 * the fingers and settles back into the rest — either hand, sometimes both,
 * to its own height and for one to three turns. Only waiting: never with a
 * note (or a count) anywhere near it, and put away as soon as the groove
 * starts to come in — pressing Play mid-trick winds the stick quickly home
 * rather than snapping it. Seeded from the time, so it holds still across
 * frames.
 */
export function twirlAt(
  now: number,
  groove: number,
  hits: readonly Hit[] = []
): Record<Hand, Twirl> {
  const none: Twirl = { amount: 0, spin: 0, raise: 0 };
  const out: Record<Hand, Twirl> = { lead: none, other: none };
  const fade = 1 - smoothstep(0, TWIRL_GROOVE, groove);
  if (fade <= 0) return out;
  const k = Math.floor(now / TWIRL_WINDOW);
  for (const w of [k, k - 1]) {
    const rng = makeRng(((w * 2246822519) ^ 0x85ebca77) >>> 0);
    if (rng() >= TWIRL_CHANCE) continue;
    const start = w * TWIRL_WINDOW + 0.5 + rng() * (TWIRL_WINDOW - 4);
    const first: Hand = rng() < 0.5 ? 'lead' : 'other';
    const both = rng() < TWIRL_BOTH;
    for (const [hand, delay] of both
      ? ([
          [first, 0],
          [first === 'lead' ? 'other' : 'lead', TWIRL_FOLLOW],
        ] as const)
      : ([[first, 0]] as const)) {
      // each hand its own height and its own number of turns: mostly one or two, now and then three
      const r = rng();
      const turns = r < 0.45 ? 1 : r < 0.85 ? 2 : 3;
      const raise = TWIRL_LOW + (TWIRL_HIGH - TWIRL_LOW) * rng();
      const from = start + delay;
      const spinEnd = from + TWIRL_UP + TWIRL_SPIN * turns;
      const end = spinEnd + TWIRL_DOWN;
      if (now < from || now > end) continue;
      const near = lastAtOrBefore(hits, end + TWIRL_CLEAR);
      if (near >= 0 && hits[near].time >= start - TWIRL_CLEAR) continue;
      const amount =
        fade * smoothstep(from, from + TWIRL_UP, now) * (1 - smoothstep(spinEnd, end, now));
      // fast through the middle of each turn, easing in and out of the spin
      const spin = fade * 2 * Math.PI * turns * smootherstep(from + TWIRL_UP, spinEnd, now);
      out[hand] = { amount, spin, raise };
    }
  }
  return out;
}

/**
 * How far ahead of the stick the wrist moves, seconds. A stroke starts at the
 * wrist: it rises while the tip is still low and drops while the tip is still
 * up, and the stick follows like the end of a whip.
 */
const WRIST_LEAD = 0.035;
/** How much of a stroke's lift the wrist joint itself rises with. */
const WRIST_RISE = 0.12;
/** Counting in: how much of the stroke is the arm lifting (the rest the wrist), and how far the elbow flares with it. */
const COUNT_ARM = 0.85;
const COUNT_ELBOW = 3;
/** The tip height under which the wrist's lead fades out toward the head, metres. */
const WRIST_FADE = 0.04;

/** How long either side of a note a hand is too busy to keep time in the air, seconds. */
const AIR_CLEAR = [0.16, 0.42] as const;
/** How far the idle stick swings, metres either way of where it waits. */
const AIR_SWING = 0.028;

/** When the body's effort is read, seconds before now. */
const EFFORT_WINDOW = [0, 0.04, 0.08, 0.12, 0.16, 0.2];

/** How far behind the beat the shoulders settle, in beats. */
const SHOULDER_LAG = 0.1;

/** How much of a stroke's angle is the stick loose in the fingers, at rest and just off the head. */
const LOOSE_REST = 0.12;
const LOOSE_REBOUND = 0.85;
/** On the ride, where the fingers do more: the stick bounces up in them, not only the hand. */
const LOOSE_RIDE = 0.35;
/** How much of a time-keeping stroke on the hats or ride the hand itself rises with. */
const CARRY = 0.35;
/** Less on the ride: more of its stroke is the stick coming up off the bow. */
const CARRY_RIDE = 0.2;
/** How far a hand's stroke heights drift, either way, and how slowly. */
const HEIGHT_DRIFT = 0.12;
const HEIGHT_PERIOD = 2.3;

/** The forearm joins a stroke past this tip height, and with this share of the rest. */
const ARM_FROM = 0.2;
const ARM_SHARE = 0.35;

/**
 * How much of the stick's angle is the stick turning in the fingers rather
 * than the hand turning at the wrist. Off the head, nearly all of it: the stick
 * rebounds on its own, the back fingers open, and the hand stays where it hit.
 * Then the hand comes up to catch it and the wrist takes over — by the time the
 * next stroke is thrown, the stick is back in the hand.
 */
function looseness(st: StrokeState): number {
  // on the ride the hand is turned thumb-up and the fingers play more of the stroke
  const rest = (st.next ?? st.prev)?.piece === 'ride' ? LOOSE_RIDE : LOOSE_REST;
  if (!st.prev) return rest;
  const gap = st.next ? st.next.time - st.prev.time : 0.5;
  const settle = Math.min(0.2, Math.max(0.05, gap * 0.4));
  return rest + (LOOSE_REBOUND - rest) * Math.exp(-st.since / settle);
}

/** The tip height a stroke reaches its full lean at, metres. */
const LEAN_FULL = 0.2;

/** How far a hand turns into the line of its forearm, 0–1: the rest is the stick's angle across the palm. */
const FOLLOW_FOREARM = 0.65;

/**
 * Turn a hand in its own plane (about the axis out of its back) part of the
 * way toward the forearm's line: the wrist's side-to-side bend eases, its
 * up-and-down — the stroke — is left alone.
 */
function alignHand(q: Quaternion, forearm: Vector3, k: number): Quaternion {
  const back = new Vector3(0, 1, 0).applyQuaternion(q);
  const fwd = new Vector3(0, 0, 1).applyQuaternion(q);
  const along = forearm.clone().sub(back.clone().multiplyScalar(forearm.dot(back)));
  if (along.lengthSq() < 1e-8) return q;
  const target = fwd.clone().lerp(along.normalize(), k).normalize();
  const angle = Math.atan2(new Vector3().crossVectors(fwd, target).dot(back), fwd.dot(target));
  return new Quaternion().setFromAxisAngle(back, angle).multiply(q);
}

/**
 * An arm, from what its stick is doing.
 *
 * The stick is placed where it meets the piece, and the hand holding it there.
 * A stroke then turns the stick up by however far the planner wants the tip,
 * shared between two joints: the wrist, which turns hand and stick together,
 * and the fulcrum, where the stick turns loose between thumb and finger. Off
 * the head the fulcrum takes nearly all of it — the tip bounces up a long way
 * while the hand hardly moves — and the wrist takes it back as the hand comes
 * up to catch the stick and throw the next one (see `looseness`). Only a big
 * stroke brings the forearm in, and then not far.
 */
function arm(
  hand: Hand,
  st: StrokeState,
  p: HandPath,
  shoulder: Vector3,
  time: TimeKeeping,
  cap = Infinity
): ArmPose {
  const { from, to, travel } = p;
  const tip0 = from.tip.clone().lerp(to.tip, travel);
  const pitch = from.pitch + (to.pitch - from.pitch) * travel;
  const lean = from.lean + (to.lean - from.lean) * travel;
  // a hand crossing the kit goes up and over, not through the drums in between
  const arc = Math.min(0.1, from.tip.distanceTo(to.tip) * 0.3) * Math.sin(Math.PI * travel);
  // counting in, the stick is held fixed and the arm plays it: a signal the band can see.
  // The other hand's stroke is the lead's upside down: it sinks between the clicks and
  // comes up to meet each one
  const piece = (st.next ?? st.prev)?.piece;
  const counting = piece === 'sticks';
  const sign = counting && hand === 'other' ? -1 : 1;
  const lift = Math.min(cap, sign * st.lift * time.height + arc + time.air);
  // the wrist leads the next throw, not the rebound — off the head the stick bounces in the
  // fingers and the hand waits (see `looseness`) — and its lead fades out at the head, so
  // the stick still meets it where it is aimed
  const loose = counting ? 0 : looseness(st);
  const rest = piece === 'ride' ? LOOSE_RIDE : LOOSE_REST;
  const caught = counting ? 1 : Math.max(0, 1 - (loose - rest) / (LOOSE_REBOUND - rest)) ** 2;
  const early = Math.min(cap, sign * time.ahead * time.height + arc + time.air);
  const ahead = lift + (early - lift) * caught * Math.min(1, Math.abs(lift) / WRIST_FADE);
  const roll = from.roll + (to.roll - from.roll) * travel;

  // the stick as it meets the piece, and the hand holding it there
  const d0 = aim(hand, tip0, pitch);
  const gripLocal = GRIP_IN_HAND.clone();
  if (hand === 'other') gripLocal.x = -gripLocal.x;
  const grip0 = tip0.clone().addScaledVector(d0, -TIP_REACH);
  const q0 = handFrame(hand, d0, roll);
  const wrist0 = grip0.clone().sub(gripLocal.clone().applyQuaternion(q0));

  // the forearm comes up a little for the big strokes, a touch back toward the body; keeping
  // time on the hats or the ride, the hand rides up and down with every stroke. All of it
  // a moment ahead of the stick: the wrist starts the stroke and the tip follows
  const carry = piece === 'hat' ? CARRY * ahead : piece === 'ride' ? CARRY_RIDE * ahead : 0;
  const armLift = counting
    ? COUNT_ARM * ahead
    : ARM_SHARE * Math.max(0, ahead - ARM_FROM) + carry + WRIST_RISE * caught * ahead;
  const back = new Vector3(-d0.x, 0, -d0.z).normalize();
  const raise = new Vector3().addScaledVector(UP, armLift).addScaledVector(back, armLift * 0.25);
  // a trick: the hand comes up and out in front, to be seen
  const tw = time.twirl;
  raise.addScaledVector(UP, tw.raise * tw.amount).addScaledVector(back, -0.05 * tw.amount);

  // the rest is the stick turning up: part in the fingers, part at the wrist
  const wristArm = grip0.distanceTo(wrist0);
  const theta = Math.asin(
    Math.max(-0.97, Math.min(0.97, (lift - armLift) / (TIP_REACH + wristArm * (1 - loose))))
  );
  const axis = new Vector3().crossVectors(d0, UP).normalize();
  const turn = new Quaternion().setFromAxisAngle(axis, theta * (1 - loose));
  const grip = wrist0.clone().add(grip0.clone().sub(wrist0).applyQuaternion(turn)).add(raise);
  // the stroke leans a little to one side as it rises, and comes back down along the same
  // line: nothing at the head, the whole lean at the top of a full stroke
  const sway = new Quaternion().setFromAxisAngle(UP, lean * Math.min(1, lift / LEAN_FULL));
  const stick = d0.clone().applyAxisAngle(axis, theta).applyQuaternion(sway);
  const q = sway.clone().multiply(turn).multiply(q0);

  // elbows hang by the ribs, a little out and behind the hands
  const out = hand === 'lead' ? 1 : -1;
  // counting, the elbow swings out as the arm comes up
  const flare = counting ? COUNT_ELBOW * armLift : 0;
  const pole = new Vector3(out * (0.35 + time.sway + flare), -1, 0.45);
  const reachFor = (frame: Quaternion) => {
    const wrist = grip.clone().sub(gripLocal.clone().applyQuaternion(frame));
    return { wrist, ...solveTwoBone(shoulder, wrist, BODY.upperArm, BODY.forearm, pole) };
  };
  // the stick rolls a little in the palm so the hand can follow the forearm: solve
  // the arm, turn the hand most of the way into the forearm's line about the
  // fulcrum (the stick stays put), and solve again
  const first = reachFor(q);
  const forearm = first.end.clone().sub(first.joint).normalize();
  const aligned = alignHand(q, forearm, FOLLOW_FOREARM);
  const { wrist: wristWanted, joint, end } = reachFor(aligned);
  // out of reach, the hand stays on the arm and the stick goes with it
  grip.add(end.clone().sub(wristWanted));
  // a twirl spins the stick end over end round the fingers, about the line across the knuckles
  if (tw.spin) stick.applyAxisAngle(new Vector3(1, 0, 0).applyQuaternion(aligned), tw.spin);
  const tip = grip.clone().addScaledVector(stick, TIP_REACH);

  const squeeze = st.prev ? st.prev.strength * Math.exp(-st.since * 22) : 0;
  // and the fingers open to let it turn
  const give = Math.min(1, lift / 0.15) + 1.6 * tw.amount;
  return {
    shoulder,
    elbow: joint,
    wrist: end,
    hand: aligned,
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

/** A move shorter than this is eased across the whole gap, metres. */
const SMALL_MOVE = 0.1;

/** How long after its last note an idle hand starts to settle, seconds. */
const SETTLE_AFTER = 0.9;

function moveTime(a: Target, b: Target): number {
  return MOVE_BASE + MOVE_PER_M * a.tip.distanceTo(b.tip);
}

/** How far back a lead hand's time-keeping is remembered, seconds. */
const HOME_MEMORY = 4;
const isHome = (h: Hit) => h.piece === 'snare' || h.piece === 'hat' || h.piece === 'ride';
/** A reach away from the snare, which a drummer starts early: the toms and the cymbals. */
const isReach = (h: Hit) =>
  h.piece === 'tom1' ||
  h.piece === 'tom2' ||
  h.piece === 'floor' ||
  PIECES[h.piece].kind === 'cymbal';
/**
 * The longest an anticipated move is spread over, in multiples of its
 * relaxed time: with a long gap the hand gets there and waits, rather than
 * drifting across the whole of it.
 */
const ANTICIPATE_MAX = 2;

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
    // off a tom or a crash with time to spare, the hand goes home before the next note;
    // counting in, it stays up between the clicks
    const counting = prev.piece === 'sticks' && next.piece === 'sticks';
    if (!isHome(prev) && !counting) {
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
    const dist = from.tip.distanceTo(to.tip);
    if (dist < 1e-4) return { from, to, travel: 1 };
    // off the snare to a tom or a cymbal, the hand sees it coming: it heads
    // there as the stick leaves the head, not at the last moment
    if (prev.piece === 'snare' && isReach(next)) {
      const start = prev.time + Math.min(0.015, gap * 0.1);
      const span = Math.min(end - start, ANTICIPATE_MAX * moveTime(from, to));
      return { from, to, travel: smootherstep(start, start + span, now) };
    }
    // a small adjustment — the next note on the same piece landing a little
    // elsewhere — is made over the whole stroke, not snapped in at the end
    const small = dist < SMALL_MOVE ? 1 - dist / SMALL_MOVE : 0;
    const quick = Math.max(prev.time + Math.min(0.015, gap * 0.1), end - moveTime(from, to));
    const start = quick + (prev.time + Math.min(0.015, gap * 0.1) - quick) * small;
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

/** How far apart the two sticks' centre lines must stay where they cross: a stick's thickness and a little air. */
export const STICK_CLEAR = 0.02;

/**
 * How far the other stick's centre line is above the lead stick's where the
 * two cross, seen from above (negative: below). Undefined if they do not cross.
 */
export function overLead(lead: ArmPose, other: ArmPose): number | undefined {
  const a = lead.grip.clone().addScaledVector(lead.stick, -STICK.grip);
  const b = other.grip.clone().addScaledVector(other.stick, -STICK.grip);
  const r = lead.tip.clone().sub(a);
  const u = other.tip.clone().sub(b);
  const den = r.x * u.z - r.z * u.x;
  if (Math.abs(den) < 1e-9) return undefined;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const s = (dx * u.z - dz * u.x) / den;
  const t = (dx * r.z - dz * r.x) / den;
  if (s < 0 || s > 1 || t < 0 || t > 1) return undefined;
  return b.y + t * u.y - (a.y + s * r.y);
}

/**
 * The other arm, kept under the lead stick. Crossed over, the lead hand plays
 * the hats above the other stick; the other stick cannot come up through it,
 * so a stroke that would is played from as high as there is room for.
 */
function underLead(lead: ArmPose, solve: (cap: number) => ArmPose): ArmPose {
  const free = solve(Infinity);
  const over = overLead(lead, free);
  if (over === undefined || over < -STICK_CLEAR) return free;
  let lo = 0;
  let hi = free.lift;
  let best = solve(lo);
  // over the lead stick even on the head: it is not coming up through it
  const floor = overLead(lead, best);
  if (floor !== undefined && floor >= -STICK_CLEAR) return free;
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    const pose = solve(mid);
    const o = overLead(lead, pose);
    if (o === undefined || o < -STICK_CLEAR) {
      lo = mid;
      best = pose;
    } else hi = mid;
  }
  return best;
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

  const ex = expressionAt(all, now, timeline.downbeats());
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
  const ones = timeline.downbeats();
  const barCue = (hand: Hand) => barCueAt(ones, hand === 'lead' ? leadHits : otherHits, now);
  const twirls = twirlAt(
    now,
    groove,
    all.filter((h) => h.limb === 'lead' || h.limb === 'other')
  );
  const timeOf = (hand: Hand): TimeKeeping => {
    const st = strokes[hand];
    const hits = hand === 'lead' ? leadHits : otherHits;
    const since = st.prev ? now - st.prev.time : Infinity;
    const until = st.next ? st.next.time - now : Infinity;
    const idle = smoothstep(...AIR_CLEAR, since) * smoothstep(...AIR_CLEAR, until);
    const salt = hand === 'lead' ? 0x68e31da4 : 0x1b56c4e9;
    return {
      air: groove * idle * AIR_SWING * 2 * (0.5 - dip) * ex.nodScale,
      height: (1 + HEIGHT_DRIFT * drift(now, HEIGHT_PERIOD, salt)) * (1 + groove * barCue(hand)),
      sway: groove * ex.nodScale * 0.1 * (0.5 - settle),
      ahead: strokeAt(hits, now + WRIST_LEAD, HAND).lift,
      twirl: twirls[hand],
    };
  };
  const time = { lead: timeOf('lead'), other: timeOf('other') };
  const shoulderOf = (hand: Hand) => {
    const side = hand === 'lead' ? 1 : -1;
    // small: a shoulder that heaves with the strokes reads as a twitch, not a groove
    const keep =
      groove * ex.nodScale * (0.004 * (0.5 - settle) + 0.003 * side * rock) + groove * ex.shrug;
    return mirrorSide(BODY.shoulder, hand)
      .add(new Vector3(0, keep, 0))
      .applyEuler(torso)
      .add(pelvis);
  };

  const leadArm = arm('lead', strokes.lead, paths.lead, shoulderOf('lead'), time.lead);
  const otherArm = underLead(leadArm, (cap) =>
    arm('other', strokes.other, paths.other, shoulderOf('other'), time.other, cap)
  );

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
    // playing or waiting for Play: a look at the camera is for either
    glance: ex.glance,
    blink: ex.blink,
    arms: {
      lead: leadArm,
      other: otherArm,
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
