import type * as THREE from 'three';

import { place } from '@/components/app/studio/drummer/parts';
import type { HandSet } from '@/lib/app/breaks/drummer/anatomy/hand';
import { STICK } from '@/lib/app/breaks/drummer/kit-layout';
import type { ArmPose } from '@/lib/app/breaks/drummer/pose';

/**
 * What every figure does with its hand each frame (experiment: the drummer
 * view): bend the four fingers as the hand table has them, and put the stick
 * where the pose has it. One place, so the dressed drummers and the skeleton
 * can never come to hold a stick two different ways.
 */

/** Bend each finger's joints, knuckle out, and fan it at the knuckle. */
export function bendFingers(fingers: THREE.Object3D[][], set: HandSet): void {
  fingers.forEach((joints, n) => {
    const f = set.fingers[n];
    joints.forEach((j, k) => (j.rotation.x = f.bend[k]));
    joints[0].rotation.y = f.splay;
  });
}

/** The stick back from its bead, and the bead on its tip: where the pose has the tip. */
export function placeStick(stick: THREE.Object3D, bead: THREE.Object3D, a: ArmPose): void {
  // back from the bead: held up from the butt for a cross-stick, the fulcrum is not always the same way up it
  const butt = a.tip.clone().addScaledVector(a.stick, -STICK.length);
  place(stick, butt, a.tip);
  bead.position.copy(a.tip);
}
