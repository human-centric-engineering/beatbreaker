import { splayLimit } from '@/lib/app/breaks/drummer/anatomy/rom';
import type { ArmPose, Grip } from '@/lib/app/breaks/drummer/pose';

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

/** First, middle, ring, little: how each finger bends, and how much of it it holds, per grip. */
export const FINGER_GRIP: Record<Grip, readonly FingerGrip[]> = {
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
export const THUMB: Record<Grip, readonly [number, number, number]> = {
  // along the stick on top of the fulcrum
  matched: [0.38, -0.55, 0.5],
  // over the stick where it leaves the web, pointing along it toward the first finger
  military: [0.1, 0.2, 0.95],
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
 * one or taking it; open and spread to wave; or a fist with the thumb up.
 */
export type HandShape = 'open' | 'wave' | 'thumbsUp';

interface Shape {
  /** Each finger's MCP, PIP and DIP bend, first to little, radians. */
  bend: [number, number, number][];
  /** How far the fingers fan from the middle, as `SPLAY` does (the knuckles' bend still limits it). */
  spread: number;
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
};

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

/** How a hand on `side` (the thumb's side of `x`) is set, from its arm's pose. */
export function handSetOf(a: ArmPose, side: 1 | -1): HandSet {
  const grips = FINGER_GRIP[a.held];
  const lifting = CROSS_LIFT_CURL * Math.min(1, a.lift / CROSS_LIFT_FULL);
  const fingers = DIGITS.map((d, n): FingerSet => {
    const f = grips[n];
    const c = f.hold + (1 - f.hold) * a.curl;
    // set down for a cross-stick, the fingers lie out along the stick — and the first one
    // hooked round it, ready to lift it, but for a moment flat after each one
    const hook = CROSS_HOOK[n];
    const ready = hook ? a.ready : 0;
    const bend = f.bend.map((b, k) => {
      const laid = FINGER_CROSS[n][k] + lifting;
      const set = laid + ((hook?.bend[k] ?? laid) - laid) * ready;
      return b * c + (set - b * c) * a.cross;
    }) as [number, number, number];
    // a little splay from the middle, and in toward the stick when hooked round it — never
    // more than the knuckle allows bent that far: the fan closes as the fingers curl
    const fan =
      -d.x * side * SPLAY * (1 - (1 - CROSS_SPLAY) * a.cross) +
      (hook?.splay ?? 0) * side * ready * a.cross;
    const most = splayLimit(bend[0]);
    return { splay: Math.max(-most, Math.min(most, fan)), bend };
  });
  // the thumb helps pick it up: against the stick's near side, the first finger hooked round the far
  const tipBend = THUMB_BEND[0] + (THUMB_BEND[1] - THUMB_BEND[0]) * a.ready;
  const held: HandSet = {
    fingers,
    thumb: thumbTurn(side, a.held, a.cross, a.ready),
    thumbTip: THUMB_TIP + (tipBend - THUMB_TIP) * a.cross,
    shaped: 0,
    thumbMcp: 0,
  };
  return a.shape && a.shape.amount > 0 ? toward(held, a.shape.kind, a.shape.amount, side) : held;
}

/** A hand `k` (0–1) of the way from how it holds its stick to a {@link HandShape}. */
function toward(held: HandSet, kind: HandShape, k: number, side: 1 | -1): HandSet {
  const shape = SHAPES[kind];
  const mix = (a: number, b: number) => a + (b - a) * k;
  return {
    fingers: held.fingers.map((f, n) => {
      const bend = f.bend.map((b, j) => mix(b, shape.bend[n][j])) as [number, number, number];
      const fan = mix(f.splay, -DIGITS[n].x * side * shape.spread);
      const most = splayLimit(bend[0]);
      return { splay: Math.max(-most, Math.min(most, fan)), bend };
    }),
    thumb: held.thumb.map((a, j) => mix(a, (j === 0 ? 1 : side) * shape.thumb[j])) as [
      number,
      number,
      number,
    ],
    thumbTip: mix(held.thumbTip, shape.thumbTip),
    shaped: k,
    thumbMcp: shape.thumbMcp * k,
  };
}
