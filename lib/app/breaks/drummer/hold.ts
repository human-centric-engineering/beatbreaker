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
 * mirrors `x`): under the pad of the thumb, the stick balanced on the middle
 * finger with the first finger wrapped beside it — out past the knuckles and
 * under them.
 */
export const GRIP_IN_HAND = new Vector3(0.023, -0.026, 0.12);

/**
 * How far the hand's long axis turns out from the stick. The stick runs across
 * the palm from the fulcrum to the heel of the hand, so the back fingers wrap
 * it behind the fulcrum and the butt shows past the little finger.
 */
export const HAND_SPLAY = 0.7;
export function handFrame(
  hand: Hand,
  stick: Vector3,
  roll: number,
  splay = HAND_SPLAY
): Quaternion {
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
  const fwd = stick.clone().multiplyScalar(Math.cos(splay)).addScaledVector(side, Math.sin(splay));
  fwd.sub(back.clone().multiplyScalar(fwd.dot(back))).normalize();
  const x = new Vector3().crossVectors(back, fwd);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, back, fwd));
}
