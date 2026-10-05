import type { V3 } from '@/lib/app/breaks/drummer/kit-layout';

/**
 * The camera's set shots round the 3D drummer (experiment). Each is a place
 * to fly to; once there, the orbit controls take over and the shot is only a
 * starting point. Written for the right-handed kit and mirrored for the left,
 * so "Side" is always the lead-hand side and "Hands" always looks at the
 * hats crossing over the snare.
 */

export const CAMERA_VIEWS = ['front', 'seat', 'side', 'hands', 'feet', 'above'] as const;
export type CameraView = (typeof CAMERA_VIEWS)[number];

export const CAMERA_LABELS: Record<CameraView, string> = {
  front: 'Front',
  seat: 'Drummer’s seat',
  side: 'Side',
  hands: 'Hands',
  feet: 'Feet',
  above: 'Above',
};

const SHOTS: Record<CameraView, { position: V3; target: V3 }> = {
  front: { position: [1.25, 1.55, -2.55], target: [0, 0.82, -0.28] },
  seat: { position: [0.06, 1.74, 0.62], target: [0, 0.78, -0.5] },
  side: { position: [2.35, 1.25, -0.4], target: [0, 0.82, -0.25] },
  hands: { position: [-0.62, 1.5, 0.5], target: [-0.1, 0.82, -0.22] },
  feet: { position: [0.62, 0.34, 0.62], target: [-0.02, 0.12, -0.28] },
  above: { position: [0.001, 3.3, -0.32], target: [0, 0.6, -0.32] },
};

export function cameraFor(view: CameraView, lefty: boolean): { position: V3; target: V3 } {
  const shot = SHOTS[view];
  if (!lefty) return shot;
  const flip = ([x, y, z]: V3): V3 => [-x, y, z];
  return { position: flip(shot.position), target: flip(shot.target) };
}
