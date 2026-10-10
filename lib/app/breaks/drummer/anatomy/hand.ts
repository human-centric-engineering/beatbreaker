import { Euler, Quaternion, Vector3 } from 'three';

import { ROM, splayLimit } from '@/lib/app/breaks/drummer/anatomy/rom';
import { STICK } from '@/lib/app/breaks/drummer/kit-layout';
import type { Grip } from '@/lib/app/breaks/drummer/grips';
import type { ArmPose } from '@/lib/app/breaks/drummer/pose';

/**
 * How a hand's fingers and thumb are set, from what its arm is doing
 * (experiment: the drummer view).
 *
 * One table for every figure at the kit: the dressed drummers and the
 * skeleton bend the same joints by the same angles, so a grip is the same
 * grip whoever holds the stick. The hand's frame is the pose's: `z` from the
 * wrist toward the knuckles, `y` out of the back of the hand, the thumb on
 * the `side` given (`+x` for the lead hand, `-x` for the other).
 */

/** One finger, first to little: its knuckle across the hand (`x`, lead side), its three segments, its radius. */
export interface Digit {
  x: number;
  /**
   * Knuckle to joint to joint to the fingertip, metres: the proximal and
   * middle phalanx joint centre to joint centre, and the distal phalanx with
   * the fingertip's pad past the end of the bone ({@link PULP}).
   */
  lengths: [number, number, number];
  r: number;
}

/** How far the pad of a fingertip reaches past the end of its bone, metres. */
export const PULP = 0.004;

/**
 * The fingers. The phalanges are a man's measured lengths, joint space to
 * joint space (Buryanov & Kotiuk 2010, radiographs of 66 adults, scaled ×1.05
 * for a 1.78 m man). Their knuckles (the metacarpal heads) sit
 * {@link KNUCKLE_Z} out from the wrist and a little under the back of the
 * hand, in an arc across it.
 */
export const DIGITS: readonly Digit[] = [
  { x: 0.031, lengths: [0.0418, 0.0235, 0.0166 + PULP], r: 0.0095 },
  { x: 0.011, lengths: [0.0469, 0.0276, 0.0183 + PULP], r: 0.0098 },
  { x: -0.009, lengths: [0.0434, 0.0269, 0.0182 + PULP], r: 0.0092 },
  { x: -0.028, lengths: [0.0344, 0.019, 0.0168 + PULP], r: 0.0082 },
];

/**
 * How far the knuckles are out from the wrist, and down from the back of the
 * hand, metres. (The wrist's centre to the middle knuckle is 88 mm in de Leva
 * 1996, scaled to 1.78 m: this palm is 9 mm longer than that, and the grip
 * was fitted to it, so it keeps it for now.)
 */
export const KNUCKLE_Z = 0.097;
export const KNUCKLE_Y = -0.004;
/** How far a finger fans out from the middle, radians a metre of its knuckle's `x`. */
export const SPLAY = 1.2;

/** Where the thumb's base sits in the heel of the hand (lead side; `x` mirrors), metres. */
export const THUMB_BASE: readonly [number, number, number] = [0.03, -0.01, 0.026];

interface FingerGrip {
  /**
   * How far each joint bends at full curl, radians: the grip's posture. The
   * finger is then fitted to the stick where it lies (`fit`), so these say
   * how the finger comes to it, not where it ends.
   */
  bend: [number, number, number];
  /**
   * How the finger meets the stick: `wrap`, curling round it from the palm's
   * side until it touches; `under`, curled in under it so the stick lies on
   * its back (traditional's ring finger, the stick on its cuticle); or not
   * fitted at all, as the table has it (the little finger tucked under the
   * ring finger).
   */
  fit?: 'wrap' | 'under';
  /**
   * How much of its hold on the stick the finger keeps whatever the stroke,
   * 0–1: in matched grip the middle finger is the fulcrum the stick balances
   * on and never lets go; the first finger wraps beside it; the back two ease
   * off as the stick comes up — never leaving it (by up to `GIVE` of their
   * bend) — and close on it at the head.
   */
  hold: number;
}

/**
 * The matched grips' fingers, first to little. The stick balances on the middle
 * finger under the pad of the thumb, which lies flat along it pointing to the
 * tip; the first finger wraps beside it, mostly closed; the back two curl round
 * the butt where it crosses the palm to the heel of the hand, and open and
 * close with the stroke without ever leaving it.
 */
const AMERICAN: readonly FingerGrip[] = [
  { bend: [0.85, 1.5, 1.0], hold: 0.7, fit: 'wrap' },
  { bend: [1.15, 1.45, 0.9], hold: 1, fit: 'wrap' },
  { bend: [1.45, 1.55, 1.0], hold: 0, fit: 'wrap' },
  { bend: [1.45, 1.55, 1.0], hold: 0, fit: 'wrap' },
];

/** First, middle, ring, little: how each finger bends, and how much of it it holds, per grip. */
export const FINGER_GRIP: Record<Grip, readonly FingerGrip[]> = {
  // palm down, the stroke the wrist's: the back fingers stay wrapped round the butt,
  // giving little — German grip limits what the fingers can do
  german: [
    { bend: [1.0, 1.4, 0.88], hold: 0.75, fit: 'wrap' },
    { bend: [1.2, 1.5, 0.95], hold: 1, fit: 'wrap' },
    { bend: [1.45, 1.55, 1.0], hold: 0.45, fit: 'wrap' },
    { bend: [1.45, 1.55, 1.0], hold: 0.45, fit: 'wrap' },
  ],
  american: AMERICAN,
  // thumb on top, the stroke the fingers': they lie along the side of the stick, less
  // wrapped, and all but the first open and close with it, pulling the butt in to play
  french: [
    { bend: [0.85, 1.3, 0.8], hold: 0.75, fit: 'wrap' },
    { bend: [1.0, 1.4, 0.88], hold: 0.35, fit: 'wrap' },
    { bend: [1.25, 1.5, 0.95], hold: 0, fit: 'wrap' },
    { bend: [1.3, 1.5, 0.95], hold: 0, fit: 'wrap' },
  ],
  // the first two lie over the stick, pressing it down into the stroke; the ring
  // finger is curled under it and carries it on its cuticle, the little finger tucked
  // in under the ring finger
  traditional: [
    { bend: [0.7, 0.95, 0.6], hold: 0.6, fit: 'wrap' },
    { bend: [0.85, 1.1, 0.7], hold: 0.5, fit: 'wrap' },
    { bend: [1.0, 1.6, 1.1], hold: 1, fit: 'under' },
    { bend: [1.35, 1.6, 1.1], hold: 1 },
  ],
};

/**
 * A cross-stick's fingers, first to little: relaxed, the hand arched over the
 * stick, each curving gently from the knuckle back down — the first onto the
 * stick, the rest to the head beside it — and curling in a little more as they
 * lift it (by up to `CROSS_LIFT_CURL` radians a joint, at `CROSS_LIFT_FULL` metres).
 * Closer together than a hand spread to play (`CROSS_SPLAY` of the spread).
 */
export const FINGER_CROSS: readonly [number, number, number][] = [
  [0.4, 0.56, 0.32],
  [0.48, 0.67, 0.38],
  [0.48, 0.67, 0.38],
  [0.5, 0.7, 0.4],
];
const CROSS_LIFT_CURL = 0.15;
const CROSS_SPLAY = 0.6;
/**
 * The first finger ready to pick a cross-stick up (`ArmPose.ready`): curving
 * down over the stick, which runs under it, and curled a little more so its end
 * hooks down the far side — the thumb against the near side, the stick between them.
 * `splay` turns the finger toward the thumb's side, radians; `bend` is each
 * joint's, knuckle out. Fitted round the stick where it lies, clear of the head.
 */
const CROSS_HOOK: { splay: number; bend: [number, number, number] }[] = [
  { splay: 0, bend: [0.44, 0.7, 0.36] },
];
const CROSS_LIFT_FULL = 0.1;

/** Where the thumb's base turns, per grip (`y` and `z` mirrored for the other hand). */
const THUMB_MATCHED = [0.38, -0.55, 0.5] as const;
export const THUMB: Record<Grip, readonly [number, number, number]> = {
  // along the stick on top of the fulcrum, pointing to the tip
  german: THUMB_MATCHED,
  american: THUMB_MATCHED,
  french: THUMB_MATCHED,
  // over the stick where it leaves the web, its pad on the first finger's first knuckle
  traditional: [0.1, 0.2, 0.95],
};

/**
 * A thumb set down for a cross-stick: forward along the side of the hand on
 * the drummer's side of the stick (which runs under the first finger), its
 * nail up and out, bent well over at the end — a few millimetres off the stick,
 * relaxed, just after one is played.
 */
const THUMB_CROSS: [number, number, number] = [0.2, 0.8, -0.65];
/**
 * And ready to pick it up (`ArmPose.ready`): turned in a touch, so the end of
 * the thumb rests against the stick's near side — the first finger
 * hooked round the far side, the stick between them. Fitted where the stick
 * lies: the thumb within 30° of the fingers' line, clear of the head.
 * `THUMB_BEND` is the end joint's bend, relaxed and ready.
 */
const THUMB_PINCH: [number, number, number] = [0.1, 0.45, -0.45];
const THUMB_BEND = [0.85, 0.7] as const;
/** The thumb's end joint, holding a stick to play it. */
export const THUMB_TIP = 0.25;

export interface FingerSet {
  /** The finger fanned out about the back of the hand's axis, radians (toward the thumb positive on the lead hand). */
  splay: number;
  /** Each joint's bend toward the palm, knuckle out, radians. */
  bend: [number, number, number];
}

export interface HandSet {
  /** First to little. */
  fingers: FingerSet[];
  /** The thumb's base turn, as Euler angles in `YXZ` order (already mirrored for `side`). */
  thumb: [number, number, number];
  /** The thumb's end joint's bend, radians. */
  thumbTip: number;
  /** And as the grip alone has it, before any shape: what a thumb is fitted to the grip by. */
  thumbHeld: number;
  /**
   * How far the hand is into a {@link HandShape}, 0–1, and the shape's bend
   * at the thumb's MCP — which a figure with a thumb metacarpal of its own
   * (the skeleton) bends; holding a stick, it fits its thumb to the grip instead.
   */
  shaped: number;
  thumbMcp: number;
}

/**
 * A hand made to say something rather than hold a stick: open, letting go of
 * one or taking it; open and spread to wave; a fist with the thumb up; the
 * "cigar grip" a propeller twirl spins the stick in; or, learning a grip (the
 * grip guide), held out flat before taking the stick, and with the first
 * finger bent at its two end knuckles into the pocket the stick lies in.
 */
export type HandShape = 'open' | 'wave' | 'thumbsUp' | 'cigar' | 'flat' | 'pocket';

interface Shape {
  /** Each finger's MCP, PIP and DIP bend, first to little, radians. */
  bend: [number, number, number][];
  /** How far the fingers fan from the middle, as `SPLAY` does (the knuckles' bend still limits it). */
  spread: number;
  /** Or each finger's own fan, first to little, radians toward the thumb (the knuckles' bend still limits it). */
  splay?: [number, number, number, number];
  /** The thumb's base turn (lead side, mirrored for the other), its MCP and its IP. */
  thumb: [number, number, number];
  thumbMcp: number;
  thumbTip: number;
}

/** Each DIP at this share of its PIP: the flexor and the oblique retinacular ligament (`rom.ts`). */
const dips = (mcp: number[], pip: number[], k = 0.6): [number, number, number][] =>
  mcp.map((m, i) => [m, pip[i], pip[i] * k]);

/**
 * The shapes, as joint angles inside the ranges in `rom.ts`. Open, the
 * fingers keep the resting cascade — a little more bend toward the little
 * finger (Kapandji). To wave, they straighten and spread, the thumb out from
 * the palm. For a thumbs-up the fingers close to a fist — knuckles near 90°,
 * PIPs near 100° — and the thumb stands out from it, swung out at its base
 * across the knuckles' line and straight at its joints.
 */
export const SHAPES: Record<HandShape, Shape> = {
  open: {
    bend: dips([0.15, 0.2, 0.25, 0.3], [0.25, 0.3, 0.32, 0.35]),
    spread: 2.5,
    thumb: [0.15, 0.45, 0.15],
    thumbMcp: 0.1,
    thumbTip: 0.15,
  },
  wave: {
    bend: dips([0.04, 0.05, 0.07, 0.09], [0.08, 0.08, 0.1, 0.12]),
    spread: 4.5,
    thumb: [0.05, 0.65, 0.1],
    thumbMcp: 0.05,
    thumbTip: 0.05,
  },
  thumbsUp: {
    bend: dips([1.45, 1.5, 1.52, 1.52], [1.65, 1.7, 1.72, 1.7]),
    spread: 0,
    thumb: [-0.15, 1.45, 0.45],
    thumbMcp: 0,
    thumbTip: -0.1,
  },
  // the fingers straight and together, the thumb alongside: a hand held out to take a stick
  flat: {
    bend: dips([0.06, 0.06, 0.08, 0.1], [0.08, 0.08, 0.1, 0.12]),
    spread: 0.5,
    thumb: [0.1, 0.3, 0.1],
    thumbMcp: 0.05,
    thumbTip: 0.05,
  },
  // and the first finger bent at its middle and end knuckles, its tip in line with the
  // edge of the palm: the pocket the stick lies in, under it (wikiHow, American grip)
  pocket: {
    bend: [
      [0.2, 1.45, 0.95],
      [0.06, 0.08, 0.05],
      [0.08, 0.1, 0.06],
      [0.1, 0.12, 0.07],
    ],
    spread: 0.5,
    thumb: [0.1, 0.3, 0.1],
    thumbMcp: 0.05,
    thumbTip: 0.05,
  },
  // the first and middle fingers near straight, parted round the stick and clamping it at
  // their first bones; the back two out of its way; the thumb parked alongside
  cigar: {
    bend: dips([0.12, 0.12, 0.3, 0.35], [0.15, 0.15, 0.35, 0.4]),
    spread: 0,
    splay: [0.3, -0.2, -0.2, -0.25],
    thumb: [0.15, 0.45, 0.15],
    thumbMcp: 0.1,
    thumbTip: 0.15,
  },
};

/** A thumb's radius where it lies on the stick, metres: it sits the stick's radius and this out from its line. */
const THUMB_R = 0.011;
/** How far back from the fulcrum along the stick a matched thumb's pad lies, metres. */
const THUMB_BACK = 0.012;
/** How far out of the web along the stick a traditional thumb's pad lies, on the first finger's knuckle, metres. */
const THUMB_AHEAD = 0.03;
/** Up, in the room. */
const UP = new Vector3(0, 1, 0);

/**
 * The thumb's base turn (Euler `YXZ`) for a thumb lying on a stick whose
 * fulcrum is at `grip` and which points along `dir` (both in the hand's
 * frame): aimed from its base at the stick's surface on the side `toward`
 * points, `back` metres behind the fulcrum along it (ahead, if negative), its
 * nail turned out — as near the stick as a thumb of its length reaches.
 */
function thumbAlong(
  side: 1 | -1,
  grip: Vector3,
  dir: Vector3,
  toward: Vector3,
  back: number
): [number, number, number] {
  const outward = toward.clone();
  outward.addScaledVector(dir, -outward.dot(dir)).normalize();
  const target = grip
    .clone()
    .addScaledVector(outward, STICK_RADIUS + THUMB_R)
    .addScaledVector(dir, -back);
  const base = new Vector3(side * THUMB_BASE[0], THUMB_BASE[1], THUMB_BASE[2]);
  const aim = target.sub(base).normalize();
  // pointing at it, then turned about its own length so the nail faces away from the stick
  const point = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), aim);
  const nail = new Vector3(0, 1, 0).applyQuaternion(point);
  const want = outward.clone().addScaledVector(aim, -outward.dot(aim)).normalize();
  const roll = Math.atan2(new Vector3().crossVectors(nail, want).dot(aim), nail.dot(want));
  const q = new Quaternion().setFromAxisAngle(aim, roll).multiply(point);
  const e = new Euler().setFromQuaternion(q, 'YXZ');
  return [e.x, e.y, e.z];
}

/** The thumb's base turn for a grip, set down for a cross-stick (`cross`) and ready to pick it up (`ready`). */
export function thumbTurn(
  side: 1 | -1,
  held: Grip,
  cross = 0,
  ready = 0
): [number, number, number] {
  const [x, y, z] = THUMB[held].map((a, k) => {
    const set = THUMB_CROSS[k] + (THUMB_PINCH[k] - THUMB_CROSS[k]) * ready;
    return a + (set - a) * cross;
  });
  return [x, side * y, side * z];
}

/** A stick's radius, metres: a 5B is 7.5 mm, and the figures' sticks are drawn a touch heavier. */
export const STICK_RADIUS = 0.009;

/** A finger's three bones placed by its bends, in the hand's frame: knuckle, PIP, DIP, fingertip. */
export function fingerJoints(
  d: Digit,
  side: 1 | -1,
  splay: number,
  bend: readonly [number, number, number]
): Vector3[] {
  const at = new Vector3(d.x * side, KNUCKLE_Y, KNUCKLE_Z);
  const out = [at.clone()];
  // each joint as `bendFingers` sets it: the knuckle turned about `y` (the fan) inside its
  // bend about `x`, the next two bending about `x` alone (Euler XYZ)
  const q = new Quaternion().setFromEuler(new Euler(bend[0], splay, 0, 'XYZ'));
  d.lengths.forEach((len, k) => {
    if (k > 0) q.multiply(new Quaternion().setFromAxisAngle(X_AXIS, bend[k]));
    at.addScaledVector(new Vector3(0, 0, 1).applyQuaternion(q), len);
    out.push(at.clone());
  });
  return out;
}

const X_AXIS = new Vector3(1, 0, 0);

/** The nearest two segments come, `a0`–`a1` and `b0`–`b1`, metres. */
function segmentGap(a0: Vector3, a1: Vector3, b0: Vector3, b1: Vector3): number {
  const u = a1.clone().sub(a0);
  const v = b1.clone().sub(b0);
  const w = a0.clone().sub(b0);
  const a = u.dot(u);
  const b = u.dot(v);
  const c = v.dot(v);
  const d = u.dot(w);
  const e = v.dot(w);
  const den = a * c - b * b;
  let s = den > 1e-12 ? Math.min(1, Math.max(0, (b * e - c * d) / den)) : 0;
  let t = c > 1e-12 ? Math.min(1, Math.max(0, (a * s + e) / c)) : 0;
  s = a > 1e-12 ? Math.min(1, Math.max(0, (b * t - d) / a)) : 0;
  t = c > 1e-12 ? Math.min(1, Math.max(0, (a * s + e) / c)) : 0;
  return a0.clone().addScaledVector(u, s).distanceTo(b0.clone().addScaledVector(v, t));
}

/** How far a finger set this way is off the stick's surface, metres: negative inside it. */
export function fingerGap(
  d: Digit,
  side: 1 | -1,
  splay: number,
  bend: readonly [number, number, number],
  butt: Vector3,
  tip: Vector3
): number {
  const j = fingerJoints(d, side, splay, bend);
  let gap = Infinity;
  for (let k = 0; k < 3; k++) {
    const r = d.r * (1 - 0.07 * k);
    gap = Math.min(gap, segmentGap(j[k], j[k + 1], butt, tip) - r - STICK_RADIUS);
  }
  return gap;
}

/** How much of its bend a finger opens by, at most, easing off the stick as it comes up. */
const GIVE = 0.2;
/**
 * What a wrapped finger's fit weighs, against a millimetre off the stick
 * (squared): being pressed into it (times), and each radian squared of the
 * knuckle moved off the grip's bend and of the curl changed from it.
 */
const WRAP_PRESS = 4;
const WRAP_KNUCKLE = 40;
const WRAP_CURL = 20;
/** How far a finger may close past its table to reach the stick, as a share of its bend. */
const REACH = 1.6;

/** The largest `x` in `lo`–`hi` with `ok(x)`, given `ok(lo)` and not `ok(hi)`. */
function bisect(lo: number, hi: number, ok: (x: number) => boolean): number {
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * A finger fitted to the stick running `butt` to `tip` (the hand's frame): its
 * knuckle kept at the grip's bend unless that would put the first bone into
 * the stick, and the two joints past it closed together — the end joint
 * following the middle one — until the finger lies on the stick's surface.
 * A `wrap` finger starts from the grip's own curl and closes onto the stick,
 * or opens off it if the stick lies inside the curl; an `under` finger is
 * curled in until it is clear of it, the stick resting on its back. Out of
 * reach, it curls as far as it goes.
 */
function fitted(
  d: Digit,
  side: 1 | -1,
  splay: number,
  set: readonly [number, number, number],
  fit: 'wrap' | 'under',
  butt: Vector3,
  tip: Vector3
): [number, number, number] {
  const top = [ROM.mcp.hard.max, ROM.pip.hard.max, ROM.dip.hard.max];
  const gap = (b: [number, number, number]) => fingerGap(d, side, splay, b, butt, tip);
  let m = set[0];
  if (fit === 'wrap') {
    // the first bone clear of the stick: the stick crosses further out, under the middle one
    const first = (x: number) =>
      fingerGap({ ...d, lengths: [d.lengths[0], 1e-6, 1e-6] }, side, splay, [x, 0, 0], butt, tip) >=
      0;
    if (!first(m)) m = first(0) ? bisect(0, m, first) : 0;
  }
  const most = Math.min(REACH, top[1] / set[1], top[2] / set[2]);
  const at = (k: number): [number, number, number] => [m, set[1] * k, set[2] * k];
  if (fit === 'wrap') {
    // the knuckle and the curl together, as near the grip's own posture as lets the finger
    // lie on the stick — round it, not pressed into it nor short of it: a few tries across
    // both, then narrowed in on the best
    const cost = (dm: number, k: number) => {
      const mm = Math.max(0, Math.min(top[0], m + dm));
      const g = fingerGap(d, side, splay, [mm, set[1] * k, set[2] * k], butt, tip) * 1000;
      return g * g * (g < 0 ? WRAP_PRESS : 1) + WRAP_KNUCKLE * dm * dm + WRAP_CURL * (k - 1) ** 2;
    };
    let best = { dm: 0, k: 1, c: cost(0, 1) };
    for (let dm = -0.6; dm <= 0.61; dm += 0.15) {
      for (let k = 0.2; k <= most + 1e-9; k += 0.2) {
        const c = cost(dm, k);
        if (c < best.c) best = { dm, k, c };
      }
    }
    for (let step = 0.075; step > 0.005; step /= 2) {
      for (const [ddm, dk] of [
        [step, 0],
        [-step, 0],
        [0, step],
        [0, -step],
      ]) {
        const k = Math.min(most, Math.max(0, best.k + dk));
        const c = cost(best.dm + ddm, k);
        if (c < best.c) best = { dm: best.dm + ddm, k, c };
      }
    }
    const mm = Math.max(0, Math.min(top[0], m + best.dm));
    return [mm, set[1] * best.k, set[2] * best.k];
  }
  if (gap(at(1)) >= 0) return at(1);
  if (gap(at(most)) >= 0) return at(bisect(most, 1, (x) => gap(at(x)) >= 0));
  // curled as far as it goes and still into it: the stick lies further out than the end of the
  // finger, so it opens instead, until the stick rests on its tip's back
  const opened = [0.75, 0.5, 0.25, 0].find((k) => gap(at(k)) >= 0);
  return opened === undefined ? at(most) : at(bisect(opened, 1, (x) => gap(at(x)) >= 0));
}

/** How a hand on `side` (the thumb's side of `x`) is set, from its arm's pose. */
export function handSetOf(a: ArmPose, side: 1 | -1): HandSet {
  const grips = FINGER_GRIP[a.held];
  const lifting = CROSS_LIFT_CURL * Math.min(1, a.lift / CROSS_LIFT_FULL);
  // the stick in the hand's frame, butt to tip
  const inHand = a.hand.clone().invert();
  const tip = a.tip.clone().sub(a.wrist).applyQuaternion(inHand);
  const butt = a.tip
    .clone()
    .addScaledVector(a.stick, -STICK.length)
    .sub(a.wrist)
    .applyQuaternion(inHand);
  const fingers = DIGITS.map((d, n): FingerSet => {
    const f = grips[n];
    const c = f.hold + (1 - f.hold) * a.curl;
    // a little splay from the middle, and in toward the stick when hooked round it — never
    // more than the knuckle allows bent that far: the fan closes as the fingers curl
    const hook = CROSS_HOOK[n];
    const ready = hook ? a.ready : 0;
    const fan =
      -d.x * side * SPLAY * (1 - (1 - CROSS_SPLAY) * a.cross) +
      (hook?.splay ?? 0) * side * ready * a.cross;
    const fanAt = (b: number) => Math.max(-splayLimit(b), Math.min(splayLimit(b), fan));
    // on the stick where it lies, easing off it as it comes up
    const table = f.bend;
    const held =
      f.fit && a.cross < 1 ? fitted(d, side, fanAt(table[0]), table, f.fit, butt, tip) : table;
    const eased = held.map((b) => b * (1 - GIVE * (1 - c)));
    // set down for a cross-stick, the fingers lie out along the stick — and the first one
    // hooked round it, ready to lift it, but for a moment flat after each one
    const bend = eased.map((b, k) => {
      const laid = FINGER_CROSS[n][k] + lifting;
      const set = laid + ((hook?.bend[k] ?? laid) - laid) * ready;
      return b + (set - b) * a.cross;
    }) as [number, number, number];
    return { splay: fanAt(bend[0]), bend };
  });
  // the thumb helps pick it up: against the stick's near side, the first finger hooked round the far
  const tipBend = THUMB_BEND[0] + (THUMB_BEND[1] - THUMB_BEND[0]) * a.ready;
  // in a matched grip the thumb lies flat along the stick's side, pointing to its tip; in
  // traditional grip it lies over the top of the stick, out of the web, its pad on the
  // first finger's first knuckle
  const table = thumbTurn(side, a.held, a.cross, a.ready);
  const fulcrum = a.grip.clone().sub(a.wrist).applyQuaternion(inHand);
  const line = tip.clone().sub(butt).normalize();
  const along =
    a.cross >= 1
      ? table
      : a.held === 'traditional'
        ? thumbAlong(side, fulcrum, line, UP.clone().applyQuaternion(inHand), -THUMB_AHEAD)
        : thumbAlong(side, fulcrum, line, new Vector3(side, 0.6, 0), THUMB_BACK);
  const held: HandSet = {
    fingers,
    thumb: table.map((x, k) => along[k] + (x - along[k]) * a.cross) as [number, number, number],
    thumbTip: THUMB_TIP + (tipBend - THUMB_TIP) * a.cross,
    thumbHeld: THUMB_TIP + (tipBend - THUMB_TIP) * a.cross,
    shaped: 0,
    thumbMcp: 0,
  };
  // learning the grip: each finger and the thumb only part of the way onto the stick yet
  const learning = a.unheld ? digitsToward(held, a.unheld.to, a.unheld.by, side) : held;
  const shape = a.shape;
  if (!shape || shape.amount <= 0) return learning;
  const first = toward(learning, shape.kind, shape.amount, side);
  // and on from that shape into another: open, then into a wave or a fist
  return shape.then && shape.then.amount > 0
    ? toward(first, shape.then.kind, shape.then.amount, side)
    : first;
}

/**
 * A hand each digit of the way from how it holds its stick to a
 * {@link HandShape}: `by` first, middle, ring, little finger and thumb, 0–1.
 */
function digitsToward(
  held: HandSet,
  kind: HandShape,
  by: readonly [number, number, number, number, number],
  side: 1 | -1
): HandSet {
  const shape = SHAPES[kind];
  const mix = (a: number, b: number, k: number) => a + (b - a) * k;
  const t = by[4];
  return {
    fingers: held.fingers.map((f, n) => {
      const k = by[n];
      const bend = f.bend.map((b, j) => mix(b, shape.bend[n][j], k)) as [number, number, number];
      const fan = mix(f.splay, (shape.splay?.[n] ?? -DIGITS[n].x * shape.spread) * side, k);
      const most = splayLimit(bend[0]);
      return { splay: Math.max(-most, Math.min(most, fan)), bend };
    }),
    thumb: held.thumb.map((a, j) => mix(a, (j === 0 ? 1 : side) * shape.thumb[j], t)) as [
      number,
      number,
      number,
    ],
    thumbTip: mix(held.thumbTip, shape.thumbTip, t),
    thumbHeld: held.thumbHeld,
    shaped: 1 - (1 - held.shaped) * (1 - t),
    thumbMcp: mix(held.thumbMcp, shape.thumbMcp, t),
  };
}

/** A hand `k` (0–1) of the way from how it holds its stick to a {@link HandShape}. */
function toward(held: HandSet, kind: HandShape, k: number, side: 1 | -1): HandSet {
  return digitsToward(held, kind, [k, k, k, k, k], side);
}
