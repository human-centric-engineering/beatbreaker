import { Euler, Quaternion, Vector3 } from 'three';

import { BODY } from '@/lib/app/breaks/drummer/kit-layout';
import type { Pose } from '@/lib/app/breaks/drummer/pose';

/**
 * The spine of the skeleton drummer (experiment: the drummer view).
 *
 * The pose turns the torso as one piece about the pelvis — leaning in, turning
 * toward the hands, tilting — and puts the shoulders where that leaves them.
 * A body does it by bending a column of twenty-four vertebrae on a pelvis
 * that rocks on the seat, each region taking the share its joints allow: the
 * lumbar spine most of the forward bend and almost none of the turn, the
 * thoracic spine most of the turn and less of the bend, the pelvis rolling
 * forward on the seat bones for some of the lean (see `rom.ts` for the
 * ranges). This shares the pose's turn out that way, bottom to top, and
 * keeps the top of the chest exactly where the pose has it, so the ribs and
 * shoulder girdle meet the arms the pose solved.
 *
 * Positions are in the torso's frame at rest — origin `BODY.pelvis`, `y` up,
 * `+z` back — and the result in model space.
 */

export type Region = 'cervical' | 'thoracic' | 'lumbar';

export interface Level {
  name: string;
  region: Region;
  /** The body's centre at rest: height, and how far back. */
  y: number;
  z: number;
  /** The body's height (the discs are the gaps between), metres. */
  height: number;
  /** Its size against a mid-thoracic vertebra's. */
  scale: number;
}

/**
 * Bottom to top, L5 to C1, at rest in a seated drummer: the lumbar curve
 * flattened by sitting, the thoracic kyphosis, and the neck's lordosis.
 *
 * Heights follow the column's measured lengths (Gray's Anatomy: the thoracic
 * spine about 28 cm and the lumbar about 18 cm with their discs, the bodies
 * thickening down the spine), placed so T2 is level with the shoulder joints
 * — as it is — and the top of the sacrum about 9 cm above the hip joints. The
 * lumbar curve is the flatter one of sitting (Lord et al. 1997: L1–S1
 * lordosis 49° standing, 34° seated).
 */
export const SPINE: readonly Level[] = (() => {
  const out: Level[] = [];
  // the lumbar curve, flattened by sitting
  const lumbar = [
    { y: 0.097, z: 0.058, h: 0.028 },
    { y: 0.14, z: 0.052, h: 0.029 },
    { y: 0.184, z: 0.049, h: 0.029 },
    { y: 0.227, z: 0.05, h: 0.028 },
    { y: 0.27, z: 0.054, h: 0.027 },
  ];
  lumbar.forEach((l, i) =>
    out.push({ name: `L${5 - i}`, region: 'lumbar', y: l.y, z: l.z, height: l.h, scale: 1 })
  );
  // T12 to T1: the kyphosis bowing back through the middle of the chest
  for (let k = 12; k >= 1; k--) {
    const t = (12 - k) / 11;
    out.push({
      name: `T${k}`,
      region: 'thoracic',
      y: 0.31 + 0.315 * t,
      z: 0.058 + 0.026 * Math.sin(Math.PI * (0.15 + 0.85 * t)) - 0.012 * t,
      height: 0.025 - 0.008 * t,
      scale: 1.2 - 0.3 * t,
    });
  }
  // C7 to C1: the neck's forward curve
  for (let k = 7; k >= 1; k--) {
    const t = (7 - k) / 6;
    out.push({
      name: `C${k}`,
      region: 'cervical',
      y: 0.648 + 0.112 * t,
      z: 0.04 - 0.02 * Math.sin(Math.PI * t * 0.8),
      height: 0.013,
      scale: 1.05 - 0.15 * t,
    });
  }
  return out;
})();

/** The top of the sacrum (the S1 endplate) at rest, in the torso's frame. */
export const SACRUM_TOP = new Vector3(0, 0.072, 0.066);
/** Where the skull rests on C1 at rest, in the torso's frame: the occipital condyles. */
export const SKULL_REST = new Vector3(0, 0.776, 0.016);

/**
 * How the torso's lean, turn and tilt are shared out, bottom to top: the
 * pelvis's share, then the lumbar spine's and the thoracic's, which split it
 * level by level. Each row sums to 1.
 *
 * The split follows the segmental ranges (White & Panjabi, *Clinical
 * Biomechanics of the Spine*, 1990): the lumbar levels bend 12–17° each and
 * turn barely 1–2°, the thoracic bend 4–6° and turn up to 8° (about half that
 * in a living, seated body), and side bend is spread through both. How much
 * of a seated reach the pelvis takes, rolling on the seat bones, has not been
 * measured for drummers: a third is an estimate.
 */
export const SHARE = {
  lean: { pelvis: 0.3, lumbar: 0.45, thoracic: 0.25 },
  yaw: { pelvis: 0.05, lumbar: 0.12, thoracic: 0.83 },
  roll: { pelvis: 0.1, lumbar: 0.4, thoracic: 0.5 },
} as const;

/**
 * Within the lumbar spine the bend is not even: most at the bottom (L5–S1 17°,
 * L4–5 16°, L3–4 15°, L2–3 14°, L1–2 12°, White & Panjabi), least at the top.
 * Each level's part of the lumbar share, L5 first.
 */
const LUMBAR_BEND = [0.23, 0.21, 0.2, 0.19, 0.17];

/**
 * How much of the head's turn on the torso each joint of the neck takes —
 * C7–T1 first, then up the neck to C1–C2, and the skull on C1 last — in
 * proportion to each joint's range (White & Panjabi): nodding is spread down
 * the neck with the most at the skull on the atlas; half of all turning is at
 * the atlas on the axis; side bend is the lower neck's.
 */
export const NECK_SHARE = {
  pitch: [0.06, 0.12, 0.14, 0.14, 0.11, 0.07, 0.11, 0.25],
  yaw: [0.03, 0.08, 0.09, 0.09, 0.09, 0.04, 0.53, 0.05],
  roll: [0.06, 0.12, 0.17, 0.17, 0.16, 0.15, 0.08, 0.09],
} as const;

export interface Frame {
  position: Vector3;
  quaternion: Quaternion;
}

/** Cumulative shares up the column: for each level (L5 first), how much of each turn is done at it. */
function shares(): { lean: number; yaw: number; roll: number }[] {
  const lumbar = SPINE.filter((l) => l.region === 'lumbar').length;
  const thoracic = SPINE.filter((l) => l.region === 'thoracic').length;
  let lean: number = SHARE.lean.pelvis;
  let yaw: number = SHARE.yaw.pelvis;
  let roll: number = SHARE.roll.pelvis;
  return SPINE.map((l, i) => {
    if (l.region === 'lumbar') {
      lean += SHARE.lean.lumbar * LUMBAR_BEND[i];
      yaw += SHARE.yaw.lumbar / lumbar;
      roll += SHARE.roll.lumbar / lumbar;
    } else if (l.region === 'thoracic') {
      lean += SHARE.lean.thoracic / thoracic;
      yaw += SHARE.yaw.thoracic / thoracic;
      roll += SHARE.roll.thoracic / thoracic;
    }
    return { lean: Math.min(1, lean), yaw: Math.min(1, yaw), roll: Math.min(1, roll) };
  });
}

const CUMULATIVE = shares();

function turn(pose: Pick<Pose, 'lean' | 'yaw' | 'roll'>, lean: number, yaw: number, roll: number) {
  return new Quaternion().setFromEuler(
    new Euler(-pose.lean * lean, pose.yaw * yaw, pose.roll * roll, 'YXZ')
  );
}

export interface SpinePose {
  /** The pelvis: midway between the hip joints, rolled by its share. */
  pelvis: Frame;
  /** Each vertebra, L5 to C1 (as {@link SPINE}). The neck is the torso's: the head turns on it separately. */
  levels: Frame[];
  /** The torso's own frame: what the ribs above T1 and the shoulder girdle ride on. */
  torso: Frame;
}

/** Midway between the hip joints, in model space. */
export const HIP_MID = new Vector3(0, BODY.hip[1], BODY.hip[2]);

/**
 * The spine for a pose: the pelvis rolled forward on the seat by its share of
 * the lean, each vertebra turned by the share done below it, and the chain
 * nudged level by level so that the top of the thoracic spine lands where the
 * pose's torso has it (a bent column ends nearer its base than a rigid one
 * turned as far — the difference is spread through the discs).
 */
export function spineAt(pose: Pick<Pose, 'lean' | 'yaw' | 'roll' | 'bob'>): SpinePose {
  const origin = new Vector3(BODY.pelvis[0], BODY.pelvis[1], BODY.pelvis[2]);
  const torsoQ = turn(pose, 1, 1, 1);
  const torsoAt = origin.clone().add(new Vector3(0, pose.bob, 0));

  // the pelvis turns about the hip joints, not the torso's origin
  const pelvisQ = turn(pose, SHARE.lean.pelvis, SHARE.yaw.pelvis, SHARE.roll.pelvis);
  const restMid = HIP_MID.clone().sub(origin);
  const pelvisAt = HIP_MID.clone();
  const toSacrum = SACRUM_TOP.clone().sub(restMid).applyQuaternion(pelvisQ);

  // up the chain, each segment turned by the share done below its middle
  const chain: Vector3[] = [];
  const quats: Quaternion[] = [];
  let at = pelvisAt.clone().add(toSacrum);
  let prev = SACRUM_TOP;
  let below: { lean: number; yaw: number; roll: number } = {
    lean: SHARE.lean.pelvis,
    yaw: SHARE.yaw.pelvis,
    roll: SHARE.roll.pelvis,
  };
  SPINE.forEach((l, i) => {
    const s = l.region === 'cervical' ? { lean: 1, yaw: 1, roll: 1 } : CUMULATIVE[i];
    const mid = turn(
      pose,
      (below.lean + s.lean) / 2,
      (below.yaw + s.yaw) / 2,
      (below.roll + s.roll) / 2
    );
    const rest = new Vector3(0, l.y, l.z);
    at = at.clone().add(rest.clone().sub(prev).applyQuaternion(mid));
    chain.push(at);
    quats.push(turn(pose, s.lean, s.yaw, s.roll));
    prev = rest;
    below = s;
  });

  // the top of the thoracic spine where the torso has it, the difference spread down
  const top = SPINE.findIndex((l) => l.name === 'T1');
  const want = new Vector3(0, SPINE[top].y, SPINE[top].z).applyQuaternion(torsoQ).add(torsoAt);
  const miss = want.clone().sub(chain[top]);
  const levels = SPINE.map((l, i): Frame => {
    if (l.region === 'cervical') {
      // the neck rides on the torso: the head's turn is shared down it separately
      return {
        position: new Vector3(0, l.y, l.z).applyQuaternion(torsoQ).add(torsoAt),
        quaternion: torsoQ.clone(),
      };
    }
    const k = (i + 1) / (top + 1);
    return { position: chain[i].clone().addScaledVector(miss, k), quaternion: quats[i] };
  });

  return {
    pelvis: { position: pelvisAt, quaternion: pelvisQ },
    levels,
    torso: { position: torsoAt, quaternion: torsoQ },
  };
}

/**
 * The neck for a head turned `head` (Euler `YXZ`, on the torso): each
 * cervical vertebra's turn on the torso, C7 first, and the skull's last —
 * the head's whole turn, shared down the joints by {@link NECK_SHARE}.
 */
export function neckTurns(head: Euler): Quaternion[] {
  const out: Quaternion[] = [];
  let pitch = 0;
  let yaw = 0;
  let roll = 0;
  for (let k = 0; k < NECK_SHARE.pitch.length; k++) {
    pitch += NECK_SHARE.pitch[k];
    yaw += NECK_SHARE.yaw[k];
    roll += NECK_SHARE.roll[k];
    out.push(
      new Quaternion().setFromEuler(new Euler(head.x * pitch, head.y * yaw, head.z * roll, 'YXZ'))
    );
  }
  return out;
}
