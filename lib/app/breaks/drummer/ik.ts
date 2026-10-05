import { Vector3 } from 'three';

/**
 * Two-bone inverse kinematics: where the elbow (or knee) goes for the hand
 * (or ankle) to be at `target`, with the bend on the side `pole` points to.
 *
 * Analytic — the law of cosines in the plane through the root, the target
 * and the pole — so it is exact and costs nothing per frame. Out of reach,
 * the limb points straight at the target and stops short of it, rather than
 * stretching.
 */
export function solveTwoBone(
  root: Vector3,
  target: Vector3,
  upper: number,
  lower: number,
  pole: Vector3
): { joint: Vector3; end: Vector3 } {
  const toTarget = new Vector3().subVectors(target, root);
  const reach = upper + lower - 1e-4;
  const d = Math.min(Math.max(toTarget.length(), Math.abs(upper - lower) + 1e-4), reach);
  const dir = toTarget.lengthSq() > 1e-12 ? toTarget.normalize() : new Vector3(0, -1, 0);

  // the bend direction: the pole, with its component along the limb removed
  const bend = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));
  if (bend.lengthSq() < 1e-10) bend.set(0, 0, 1).sub(dir.clone().multiplyScalar(dir.z));
  bend.normalize();

  const cosA = (upper * upper + d * d - lower * lower) / (2 * upper * d);
  const a = Math.acos(Math.min(1, Math.max(-1, cosA)));
  const joint = root
    .clone()
    .addScaledVector(dir, upper * Math.cos(a))
    .addScaledVector(bend, upper * Math.sin(a));
  const end = root.clone().addScaledVector(dir, d);
  return { joint, end };
}
