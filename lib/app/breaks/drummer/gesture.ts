import { Matrix4, Quaternion, Vector3 } from 'three';

import { GRIP_IN_HAND, handFrame } from '@/lib/app/breaks/drummer/hold';
import { solveTwoBone } from '@/lib/app/breaks/drummer/ik';
import { BODY, type Hand, TIP_REACH } from '@/lib/app/breaks/drummer/kit-layout';
import { lastAtOrBefore, smoothstep } from '@/lib/app/breaks/drummer/strokes';
import type { Hit } from '@/lib/app/breaks/drummer/timeline';
import { makeRng } from '@/lib/app/breaks/rng';
import type { ArmPose } from '@/lib/app/breaks/drummer/pose';

/**
 * A little show while the drummer waits for Play (experiment: the drummer
 * view): one hand passes its stick to the other, which holds the pair while
 * the free hand waves at you — or gives you a thumbs-up — with the head
 * turned to look at you; then the hand comes back, takes its stick, and both
 * settle into the rest.
 *
 * It exercises the hand as the anatomy has it: the pass is two matched grips
 * meeting, one closing on a second stick; the wave is the forearm up, palm
 * to the camera, swung from the shoulder with the wrist trailing; the
 * thumbs-up a fist held out thumb-up, the forearm turned to neutral. Every
 * hand is a shape from `anatomy/hand.ts` and every arm is solved through the
 * same two-bone IK as the strokes, inside the ranges in `anatomy/rom.ts`
 * (`gesture.test.ts` holds every frame of every show to them).
 *
 * Seeded from the time, like the stick twirls, so it holds still across
 * frames; and only ever waiting — never near a note or a count, and put away
 * as soon as the groove comes in.
 */

export type GestureKind = 'wave' | 'thumbsUp';

export interface Show {
  /** When it starts, seconds on the timeline's clock. */
  start: number;
  kind: GestureKind;
  /** The hand that passes its stick and gestures; the other keeps both sticks. */
  giver: Hand;
}

/** A show can come once in each of these windows, seconds, and does in this share of them. */
const SHOW_WINDOW = 18;
const SHOW_CHANCE = 0.6;
/** How long one lasts, seconds. */
export const SHOW_LENGTH = 6.5;
/** How long either side of a show the hands must have nothing to play, seconds. */
const SHOW_CLEAR = 1.5;
/** A show is put away by this much groove: a moment after Play. */
const SHOW_GROOVE = 0.15;

/** The show a window holds, if it holds one. */
function showIn(window: number): Show | null {
  const rng = makeRng(((window * 3266489917) ^ 0x27d4eb2f) >>> 0);
  if (rng() >= SHOW_CHANCE) return null;
  return {
    start: window * SHOW_WINDOW + 1 + rng() * (SHOW_WINDOW - SHOW_LENGTH - 2),
    kind: rng() < 0.5 ? 'wave' : 'thumbsUp',
    giver: rng() < 0.5 ? 'lead' : 'other',
  };
}

/** Whether a show is kept off by a note near it: the hands are needed for playing. */
function crowded(show: Show, hits: readonly Hit[]): boolean {
  const near = lastAtOrBefore(hits, show.start + SHOW_LENGTH + SHOW_CLEAR);
  return near >= 0 && hits[near].time >= show.start - SHOW_CLEAR;
}

/**
 * Whether a show that will play reaches into `from`–`to` (seconds), so a
 * stick twirl can stay out of its way — and only one that will: a show kept
 * off by a note near it leaves the twirls be.
 */
export function showOverlaps(from: number, to: number, hits: readonly Hit[] = []): boolean {
  const first = Math.floor(from / SHOW_WINDOW);
  const last = Math.floor(to / SHOW_WINDOW);
  for (let w = first - 1; w <= last; w++) {
    const s = showIn(w);
    if (s && s.start < to && s.start + SHOW_LENGTH > from && !crowded(s, hits)) return true;
  }
  return false;
}

/**
 * The show playing at `now`, how far into it (`t`, seconds) and how much of
 * it is left after the groove has started coming in (`fade`, 0–1); null if
 * none is. Never with a note anywhere near it.
 */
export function showAt(
  now: number,
  groove: number,
  hits: readonly Hit[] = []
): { show: Show; t: number; fade: number } | null {
  const fade = 1 - smoothstep(0, SHOW_GROOVE, groove);
  if (fade <= 0) return null;
  const w = Math.floor(now / SHOW_WINDOW);
  for (const k of [w, w - 1]) {
    const show = showIn(k);
    if (!show) continue;
    const t = now - show.start;
    if (t < 0 || t > SHOW_LENGTH || crowded(show, hits)) continue;
    return { show, t, fade };
  }
  return null;
}

/* ---- the timing ------------------------------------------------------ */

/**
 * The show's beats, seconds from its start: the hands meet and the stick is
 * passed; the free hand goes off to its gesture and makes it; it comes back
 * and takes its stick, and both hands go home.
 */
export const BEATS = {
  meet: [0, 0.9],
  pass: [0.95, 1.25],
  away: [1.3, 2.1],
  gesture: [2.1, 4.4],
  back: [4.4, 5.2],
  take: [5.25, 5.55],
  home: [5.6, SHOW_LENGTH],
} as const;

const ss = (span: readonly [number, number], t: number) => smoothstep(span[0], span[1], t);

/** How far the hands are from their rest (both of them): out over the meeting, back home at the end. */
function out(t: number): number {
  return ss(BEATS.meet, t) * (1 - ss(BEATS.home, t));
}

/** How far the giving hand is from the meeting toward its gesture. */
function gesturing(t: number): number {
  return ss(BEATS.away, t) * (1 - ss(BEATS.back, t));
}

/**
 * How much the keeping hand has the giver's stick, 0–1: over the pass it goes
 * from one hand to the other, while both hands are at the meeting holding it
 * together, and back over the take.
 */
function kept(t: number): number {
  return ss(BEATS.pass, t) * (1 - ss(BEATS.take, t));
}

/** The wave: swings a second, the swing's half-width, radians, and the wrist's. */
const WAVE_RATE = 2.2;
const WAVE_SWING = 0.3;
const WAVE_WRIST = 0.14;
/** The thumbs-up's push toward you, metres, and how many a second. */
const THUMB_PUSH = 0.025;
const THUMB_RATE = 1.4;

/* ---- the geometry ---------------------------------------------------- */

/** A stick against a hand: its tip and its line, in the hand's frame. */
interface InHand {
  tip: Vector3;
  dir: Vector3;
}

/** A hand: where its wrist is and how it is turned, and where its elbow goes (the pole). */
interface Placed {
  wrist: Vector3;
  hand: Quaternion;
  pole: Vector3;
}

function inHand(a: { wrist: Vector3; hand: Quaternion }, tip: Vector3, dir: Vector3): InHand {
  const inv = a.hand.clone().invert();
  return {
    tip: tip.clone().sub(a.wrist).applyQuaternion(inv),
    dir: dir.clone().applyQuaternion(inv),
  };
}

function inWorld(
  a: { wrist: Vector3; hand: Quaternion },
  s: InHand
): { tip: Vector3; dir: Vector3 } {
  return {
    tip: s.tip.clone().applyQuaternion(a.hand).add(a.wrist),
    dir: s.dir.clone().applyQuaternion(a.hand).normalize(),
  };
}

function mixHeld(a: InHand, b: InHand, k: number): InHand {
  return { tip: a.tip.clone().lerp(b.tip, k), dir: a.dir.clone().lerp(b.dir, k).normalize() };
}

/**
 * The forearm's frame for a hand placed at `p` from `shoulder`: `z` down the
 * forearm, `x` along the elbow's hinge.
 */
function forearmOf(shoulder: Vector3, p: { wrist: Vector3; pole: Vector3 }): Quaternion {
  const { joint, end } = solveTwoBone(shoulder, p.wrist, BODY.upperArm, BODY.forearm, p.pole);
  const z = end.clone().sub(joint).normalize();
  const x = new Vector3().crossVectors(joint.clone().sub(shoulder), z);
  if (x.lengthSq() < 1e-10) x.copy(p.pole).cross(z);
  x.normalize();
  const y = new Vector3().crossVectors(z, x);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
}

/**
 * Part of the way from one placed hand to another. The hand is turned
 * between them against its forearm, not in the room: the wrist's bend and the
 * forearm's turn go from one to the other, so a move between two hands the
 * joints allow stays inside what they allow on the way.
 */
function mixPlaced(shoulder: Vector3, a: Placed, b: Placed, k: number): Placed {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const ra = forearmOf(shoulder, a).invert().multiply(a.hand);
  const rb = forearmOf(shoulder, b).invert().multiply(b.hand);
  const p = { wrist: a.wrist.clone().lerp(b.wrist, k), pole: a.pole.clone().lerp(b.pole, k) };
  return { ...p, hand: forearmOf(shoulder, p).multiply(ra.slerp(rb, k)) };
}

/** Where a planned arm's elbow is pointing: the pole that would put it there again. */
function poleOf(a: ArmPose): Vector3 {
  const mid = a.shoulder.clone().lerp(a.wrist, 0.5);
  return a.elbow.clone().sub(mid).normalize();
}

/** The torso's frame, as the pose has it: a point and a direction in it, in model space. */
interface Torso {
  at: (x: number, y: number, z: number) => Vector3;
  dir: (x: number, y: number, z: number) => Vector3;
}

export function torsoFrame(q: Quaternion, bob: number): Torso {
  const origin = new Vector3(BODY.pelvis[0], BODY.pelvis[1] + bob, BODY.pelvis[2]);
  return {
    at: (x, y, z) => new Vector3(x, y, z).applyQuaternion(q).add(origin),
    dir: (x, y, z) => new Vector3(x, y, z).applyQuaternion(q).normalize(),
  };
}

/**
 * The pass, in the torso's frame (the keeper's side positive): the keeping
 * hand out in front, just over the middle, its stick pointing forward and up;
 * the giving hand offering its own stick butt first, alongside, so that the
 * butt lies in the keeper's palm beside the keeper's stick and the giver's
 * hand is a hand's breadth further along it. Both hands rolled toward
 * thumb-up, as in American grip. Found by searching where both arms are
 * inside their everyday ranges at once (`anatomy/rom.ts`): held across to
 * the other hand's side, the giver's wrist would need to bend 100°.
 */
const KEEP_GRIP = [-0.08, 0.3, -0.42] as const;
const KEEP_STICK = [-0.15, 0.5, -1] as const;
const KEEP_ROLL = 0.9;
/** While the other hand gestures, the pair is held lower and nearer, at ease. */
const CARRY_GRIP = [0.04, 0.22, -0.36] as const;
const CARRY_STICK = [-0.15, 0.35, -1] as const;
/** How far apart the two sticks lie in the keeping hand, and how far along its stick the giver holds its own. */
const PAIR_GAP = 0.018;
const GIVER_AHEAD = 0.1;

function gripLocalFor(hand: Hand): Vector3 {
  const g = GRIP_IN_HAND.clone();
  if (hand === 'other') g.x = -g.x;
  return g;
}

/** A matched grip on a stick along `dir`, the fulcrum at `grip`, the hand rolled toward thumb-up. */
function matched(hand: Hand, grip: Vector3, dir: Vector3, pole: Vector3): Placed {
  const q = handFrame(hand, dir, KEEP_ROLL);
  return { wrist: grip.clone().sub(gripLocalFor(hand).applyQuaternion(q)), hand: q, pole };
}

/** A hand frame from where the knuckles point and where the back of the hand faces (`x = y × z`). */
function frame(knuckles: Vector3, back: Vector3): Quaternion {
  const z = knuckles.clone().normalize();
  const y = back.clone().addScaledVector(z, -back.dot(z)).normalize();
  const x = new Vector3().crossVectors(y, z);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
}

/** Toward `audience` from the head, kept to the front: the camera if it is somewhere a drummer could look. */
function toward(audience: Vector3, head: Vector3): Vector3 {
  const d = audience.clone().sub(head);
  const yaw = Math.max(-1, Math.min(1, Math.atan2(-d.x, -d.z)));
  const pitch = Math.max(-0.3, Math.min(0.35, Math.atan2(d.y, Math.hypot(d.x, d.z))));
  return new Vector3(
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  );
}

/** Where a show looks when there is no camera to look at: out front, at head height. */
export const AUDIENCE = new Vector3(0.3, 1.45, -2.6);

/**
 * The free hand's gesture at `t`: where the wrist goes, how the hand is
 * turned, and where the elbow points.
 */
function gesturePlace(
  kind: GestureKind,
  hand: Hand,
  shoulder: Vector3,
  torso: Torso,
  look: Vector3,
  t: number
): Placed {
  const s = hand === 'lead' ? 1 : -1;
  const up = torso.dir(0, 1, 0);
  const side = torso.dir(s, 0, 0);
  const ahead = new Vector3(look.x, 0, look.z).normalize();
  const swing =
    ss([BEATS.gesture[0], BEATS.gesture[0] + 0.4], t) *
    (1 - ss([BEATS.gesture[1] - 0.4, BEATS.gesture[1]], t));
  const along = t - BEATS.gesture[0];

  if (kind === 'wave') {
    // the hand up by the side of the head, out in front a little; the elbow out and down
    const pole = side.clone().addScaledVector(up, -0.8).addScaledVector(ahead, -0.2);
    const rest = shoulder
      .clone()
      .addScaledVector(up, 0.25)
      .addScaledVector(side, 0.16)
      .addScaledVector(ahead, 0.14);
    const elbow = solveTwoBone(shoulder, rest, BODY.upperArm, BODY.forearm, pole).joint;
    // swung side to side from the shoulder (the humerus turning), the forearm sweeping across
    // the camera's view, the wrist trailing a little behind the swing
    const phase = 2 * Math.PI * WAVE_RATE * along;
    const wrist = rest
      .clone()
      .sub(elbow)
      .applyAxisAngle(look, s * WAVE_SWING * swing * Math.sin(phase))
      .add(elbow);
    const fore = wrist.clone().sub(elbow).normalize();
    // the palm to the camera, turned a little in toward the face as a wave is
    const palm = look.clone().addScaledVector(side, -0.35);
    const fingers = fore
      .clone()
      .applyAxisAngle(palm.clone().normalize(), -s * WAVE_WRIST * swing * Math.sin(phase - 0.9));
    return { wrist, hand: frame(fingers, palm.negate()), pole };
  }

  // the thumbs-up: a fist held out toward you at chest height, pushed at you now and then
  const pole = side
    .clone()
    .multiplyScalar(0.7)
    .addScaledVector(up, -1)
    .addScaledVector(ahead, -0.2);
  const push =
    (THUMB_PUSH * swing * (1 - Math.cos(2 * Math.PI * THUMB_RATE * Math.max(0, along - 0.4)))) / 2;
  const target = shoulder
    .clone()
    .addScaledVector(ahead, 0.33 + push)
    .addScaledVector(up, -0.13)
    .addScaledVector(side, -0.04);
  const { joint } = solveTwoBone(shoulder, target, BODY.upperArm, BODY.forearm, pole);
  const fore = target.clone().sub(joint).normalize();
  // the forearm at neutral, thumb up: the back of the hand faces out to the side (in toward the
  // body for the other hand's frame, whose x is the little finger's)
  const thumbUp = up.clone().addScaledVector(fore, -up.dot(fore)).normalize();
  const back = new Vector3().crossVectors(fore, thumbUp).multiplyScalar(s);
  return { wrist: target, hand: frame(fore, back), pole };
}

export interface ShowPose {
  arms: Record<Hand, ArmPose>;
  /** 0–1: how far the head has turned to the camera. */
  look: number;
  /** A nod down to watch the hands meet, radians. */
  watch: number;
  /** A wink with the thumbs-up, 0–1. */
  wink: number;
}

/**
 * Put an arm where a hand is placed, holding a stick at `stick` (`holds` of
 * it, 0–1: as much of the stick as this hand has goes with it): the elbow
 * solved. `out` is how far the hand is out of its rest into the show: past
 * half way it holds as the show does, in matched grip, whatever grip it
 * plays in — as a military hand turns over to matched for a cross-stick.
 */
function armAt(
  base: ArmPose,
  p: Placed,
  stick: { tip: Vector3; dir: Vector3 },
  holds: number,
  out: number,
  shape: ArmPose['shape']
): ArmPose {
  const { joint, end } = solveTwoBone(base.shoulder, p.wrist, BODY.upperArm, BODY.forearm, p.pole);
  // out of reach, the hand stays on the arm, and a stick it holds goes with it
  const shift = end.clone().sub(p.wrist);
  const tip = stick.tip.clone().addScaledVector(shift, holds);
  return {
    ...base,
    held: out > 0.5 ? 'matched' : base.held,
    elbow: joint,
    wrist: end,
    hand: p.hand,
    tip,
    stick: stick.dir,
    grip: tip.clone().addScaledVector(stick.dir, -TIP_REACH),
    lift: 0,
    cross: 0,
    shape,
  };
}

/**
 * Both arms at `t` into a show, from where the planner has them resting
 * (`rest`): the keeping hand out to take the stick and holding the pair, the
 * giving hand passing it, off to its gesture and back for it. `audience` is
 * where to look and wave, in model space.
 */
export function showPose(
  show: Show,
  t: number,
  fade: number,
  rest: Record<Hand, ArmPose>,
  torso: Torso,
  audience: Vector3 = AUDIENCE
): ShowPose {
  const giver = show.giver;
  const keeper: Hand = giver === 'lead' ? 'other' : 'lead';
  const sk = keeper === 'lead' ? 1 : -1;
  const look = toward(audience, torso.at(0, 0.78, 0));

  // the meeting: the keeper's grip and its stick, the giver's stick beside it in the keeper's palm
  const keepDir = torso.dir(sk * KEEP_STICK[0], KEEP_STICK[1], KEEP_STICK[2]);
  const keepGrip = torso.at(sk * KEEP_GRIP[0], KEEP_GRIP[1], KEEP_GRIP[2]);
  const keepPole = torso.dir(sk * 0.6, -1, 0.3);
  const keepAt = matched(keeper, keepGrip, keepDir, keepPole);
  const carryDir = torso.dir(sk * CARRY_STICK[0], CARRY_STICK[1], CARRY_STICK[2]);
  const carryAt = matched(
    keeper,
    torso.at(sk * CARRY_GRIP[0], CARRY_GRIP[1], CARRY_GRIP[2]),
    carryDir,
    keepPole
  );
  // side by side across the palm, the giver's toward the giver's side
  const across = new Vector3().crossVectors(keepDir, torso.dir(0, 1, 0)).normalize();
  if (across.dot(torso.dir(-sk, 0, 0)) < 0) across.negate();
  const pairPoint = keepGrip.clone().addScaledVector(across, PAIR_GAP);
  const giverGrip = pairPoint.clone().addScaledVector(keepDir, GIVER_AHEAD);
  const giveAt = matched(giver, giverGrip, keepDir, torso.dir(-sk * 0.6, -1, 0.2));

  // each stick against the hand that holds it, at rest and at the meeting
  const keeperOwn = {
    rest: inHand(rest[keeper], rest[keeper].tip, rest[keeper].stick),
    meet: inHand(keepAt, keepGrip.clone().addScaledVector(keepDir, TIP_REACH), keepDir),
  };
  const giverStick = {
    rest: inHand(rest[giver], rest[giver].tip, rest[giver].stick),
    meet: inHand(giveAt, giverGrip.clone().addScaledVector(keepDir, TIP_REACH), keepDir),
    // and in the keeper's hand, while it has it
    kept: inHand(keepAt, giverGrip.clone().addScaledVector(keepDir, TIP_REACH), keepDir),
  };

  const k = out(t) * fade;
  const g = gesturing(t);
  const restOf = (a: ArmPose): Placed => ({ wrist: a.wrist, hand: a.hand, pole: poleOf(a) });

  // the keeper: out to the meeting, down to carry the pair while the other gestures, back, home
  const ks = rest[keeper].shoulder;
  const keeperAt = mixPlaced(ks, restOf(rest[keeper]), mixPlaced(ks, keepAt, carryAt, g), k);
  const keeperStick = inWorld(keeperAt, mixHeld(keeperOwn.rest, keeperOwn.meet, k));
  const keeperArm = armAt(rest[keeper], keeperAt, keeperStick, 1, k, undefined);

  // the giver: to the meeting, off to its gesture and back, home
  const gestureAt = gesturePlace(show.kind, giver, rest[giver].shoulder, torso, look, t);
  const gs = rest[giver].shoulder;
  const giverAt = mixPlaced(gs, restOf(rest[giver]), mixPlaced(gs, giveAt, gestureAt, g), k);
  // who has the stick: scaled by the fade as the hands are, so a show cut short by Play hands it
  // back to the giver as both hands go home, rather than leaving it in the wrong one
  const owned = kept(t) * fade;
  const inGiver = inWorld(giverAt, mixHeld(giverStick.rest, giverStick.meet, k));
  const inKeeper = inWorld(keeperArm, giverStick.kept);
  const stick = {
    tip: inGiver.tip.clone().lerp(inKeeper.tip, owned),
    dir: inGiver.dir.clone().lerp(inKeeper.dir, owned).normalize(),
  };
  // the hand opens to let the stick go and to take it back, and makes its gesture between
  const open = Math.max(
    ss(BEATS.pass, t) * (1 - ss(BEATS.away, t)),
    ss([BEATS.back[1] - 0.3, BEATS.back[1]], t) * (1 - ss(BEATS.take, t))
  );
  const shaped = gesturing(t);
  const shape: ArmPose['shape'] =
    open <= 0 && shaped <= 0
      ? undefined
      : {
          kind: 'open',
          amount: Math.max(open, shaped) * fade,
          then: { kind: show.kind, amount: shaped * fade },
        };
  const giverArm = armAt(rest[giver], giverAt, stick, 1 - owned, k, shape);

  const lookAt =
    ss([BEATS.away[1] - 0.4, BEATS.gesture[0] + 0.2], t) *
    (1 - ss([BEATS.gesture[1] - 0.2, BEATS.back[0] + 0.4], t));
  const watch =
    0.25 *
    (ss([0.2, BEATS.meet[1]], t) * (1 - ss([BEATS.pass[1], BEATS.away[0] + 0.3], t)) +
      ss([BEATS.back[0] + 0.2, BEATS.back[1]], t) *
        (1 - ss([BEATS.take[1], BEATS.home[0] + 0.3], t)));
  const wink = show.kind === 'thumbsUp' ? ss([2.8, 2.95], t) * (1 - ss([3.25, 3.45], t)) : 0;
  return {
    arms:
      giver === 'lead'
        ? { lead: giverArm, other: keeperArm }
        : { lead: keeperArm, other: giverArm },
    look: lookAt * fade,
    watch: watch * fade,
    wink: wink * fade,
  };
}
