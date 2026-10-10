import { Matrix4, Quaternion, Vector3 } from 'three';

import type { Hand } from '@/lib/app/breaks/drummer/kit-layout';

/**
 * How a hand holds a stick in matched grip (experiment: the drummer view):
 * where the fulcrum sits in the hand, and the hand's frame for a stick
 * pointing a given way. The stroke planner holds every stick this way, and
 * the idle gestures hand sticks between the hands the same way.
 */

const UP = new Vector3(0, 1, 0);

/**
 * Where the fulcrum sits in the hand's frame, for the lead hand (the other
 * mirrors `x`): in the fingers, not the palm — inside the first finger's
 * curl, against its middle and end bones at the first crease, the pad of the
 * thumb on the stick's side (Packer; wikiHow, American grip). Found as the
 * place a stick is hugged by the first finger bent as the grip bends it.
 */
export const GRIP_IN_HAND = new Vector3(0.03, -0.07, 0.106);

/**
 * The stick's line in the hand, butt to tip, for the lead hand (the other
 * mirrors `x`): from the heel of the hand, under the little finger, out
 * through the fulcrum — about 39° across the palm toward the thumb, and
 * tipped about 19° away from it, the butt near the palm and the tip held out
 * in the fingers, with a gap between stick and palm for it to pivot in.
 */
export const STICK_IN_HAND = new Vector3(0.693, -0.497, 0.551).normalize();

/** The stick's line in `hand`, `k` of the way from lying along the fingers (0) to as the grip lays it (1). */
export function stickInHand(hand: Hand, k = 1): Vector3 {
  const s = new Vector3(0, 0, 1).lerp(STICK_IN_HAND, k).normalize();
  if (hand === 'other') s.x = -s.x;
  return s;
}

/**
 * The hand's frame holding a stick along `stick` (a unit vector), the back of
 * the hand rolled `roll` radians out from facing up about it, and the stick
 * lying in the hand along `stickInHand(hand, k)`.
 */
export function handFrame(hand: Hand, stick: Vector3, roll: number, k = 1): Quaternion {
  // the stick's own frame in the room, and the same frame in the hand: along the stick, and
  // the back of the hand made square to it
  const zs = stickInHand(hand, k);
  const ys = new Vector3(0, 1, 0).addScaledVector(zs, -zs.y).normalize();
  const inHand = new Quaternion().setFromRotationMatrix(
    new Matrix4().makeBasis(new Vector3().crossVectors(ys, zs), ys, zs)
  );
  return frameAlong(hand, stick, roll).multiply(inHand.invert());
}

/**
 * A frame pointing along `fwd` (its `z`), its `y` — the back of a hand —
 * rolled `roll` radians out from facing up, toward the hand's own side.
 */
export function frameAlong(hand: Hand, fwd: Vector3, roll: number): Quaternion {
  const outward = hand === 'lead' ? 1 : -1;
  const up = UP.clone()
    .sub(fwd.clone().multiplyScalar(fwd.dot(UP)))
    .normalize();
  const side = new Vector3().crossVectors(fwd, up).normalize().multiplyScalar(outward);
  const back = up
    .clone()
    .multiplyScalar(Math.cos(roll))
    .addScaledVector(side, Math.sin(roll))
    .normalize();
  const x = new Vector3().crossVectors(back, fwd);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, back, fwd));
}
