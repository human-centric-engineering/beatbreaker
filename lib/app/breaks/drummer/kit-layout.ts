import type { LaneKey } from '@/lib/app/breaks/types';

/**
 * Where everything on the 3D kit sits (experiment: the drummer view).
 *
 * One kit, laid out for a **right-handed** drummer, in metres: the throne at
 * the origin, `y` up, the drummer facing `-z` and `+x` to the drummer's right.
 * A left-handed kit is not a second table — it is this one mirrored in `x`,
 * drummer and all, which is what a left-handed player's kit is. Everything
 * here and in the stroke planner is therefore written in terms of the *lead*
 * hand (the one on the hats and ride) and the *other* hand; the scene flips
 * the whole rig at the end.
 */

export type V3 = readonly [number, number, number];

export type PieceId =
  | 'kick'
  | 'snare'
  | 'hat'
  | 'tom1'
  | 'tom2'
  | 'floor'
  | 'ride'
  | 'crash'
  | 'perc1'
  | 'perc2'
  /** Not a drum: where the sticks meet to count the band in. */
  | 'sticks';

export type PieceKind = 'drum' | 'kick' | 'cymbal' | 'hat' | 'perc' | 'air';

export interface Piece {
  id: PieceId;
  kind: PieceKind;
  /** Centre of the playing surface (the batter head, the cymbal's bell). */
  centre: V3;
  radius: number;
  /** Shell depth, for drums. */
  depth: number;
  /** Tilt toward the drummer (about `x`) and to the side (about `z`), radians. */
  tilt: readonly [number, number];
}

export const PIECES: Record<PieceId, Piece> = {
  kick: {
    id: 'kick',
    kind: 'kick',
    centre: [0.04, 0.29, -0.76],
    radius: 0.28,
    depth: 0.4,
    tilt: [0, 0],
  },
  snare: {
    id: 'snare',
    kind: 'drum',
    centre: [-0.07, 0.7, -0.22],
    radius: 0.178,
    depth: 0.14,
    tilt: [0.09, -0.04],
  },
  hat: {
    id: 'hat',
    kind: 'hat',
    centre: [-0.4, 0.88, -0.34],
    radius: 0.18,
    depth: 0,
    tilt: [0.03, 0],
  },
  tom1: {
    id: 'tom1',
    kind: 'drum',
    centre: [-0.12, 0.93, -0.56],
    radius: 0.127,
    depth: 0.2,
    tilt: [0.38, -0.12],
  },
  tom2: {
    id: 'tom2',
    kind: 'drum',
    centre: [0.18, 0.93, -0.56],
    radius: 0.152,
    depth: 0.22,
    tilt: [0.38, 0.12],
  },
  floor: {
    id: 'floor',
    kind: 'drum',
    centre: [0.45, 0.66, -0.24],
    radius: 0.203,
    depth: 0.4,
    tilt: [0.05, 0.03],
  },
  ride: {
    id: 'ride',
    kind: 'cymbal',
    centre: [0.6, 1.0, -0.5],
    radius: 0.27,
    depth: 0,
    tilt: [0.2, 0.1],
  },
  crash: {
    id: 'crash',
    kind: 'cymbal',
    centre: [-0.4, 1.2, -0.56],
    radius: 0.23,
    depth: 0,
    tilt: [0.32, -0.08],
  },
  perc1: {
    id: 'perc1',
    kind: 'perc',
    centre: [0.42, 0.9, -0.5],
    radius: 0.06,
    depth: 0.12,
    tilt: [0.2, 0],
  },
  perc2: {
    id: 'perc2',
    kind: 'perc',
    centre: [-0.66, 0.98, -0.42],
    radius: 0.06,
    depth: 0.12,
    tilt: [0.2, 0],
  },
  sticks: {
    id: 'sticks',
    kind: 'air',
    centre: [0, 1.06, -0.1],
    radius: 0,
    depth: 0,
    tilt: [0, 0],
  },
};

/**
 * The two pedals: the heel plate the board hinges at, which way the board
 * points from it, and (for the kick) the beater's axle above the board's toe.
 */
export const KICK_PEDAL = {
  heel: [0.1, 0.025, -0.14] as V3,
  toward: [0, 0, -1] as V3,
  axle: [0.08, 0.11, -0.49] as V3,
  /** The beater's shaft, axle to the middle of its head. */
  beater: 0.19,
} as const;

export const HAT_PEDAL = {
  heel: [-0.33, 0.025, -0.06] as V3,
  toward: [-0.23, 0, -0.97] as V3,
} as const;

/** The pedal board, heel plate to toe. */
export const BOARD_LENGTH = 0.28;

/** The piece each lane is played on. The foot hat is the hat, from below. */
export const LANE_PIECE: Record<LaneKey, PieceId> = {
  k: 'kick',
  s: 'snare',
  h: 'hat',
  hf: 'hat',
  r: 'ride',
  c: 'crash',
  t1: 'tom1',
  t2: 'tom2',
  t3: 'floor',
  p1: 'perc1',
  p2: 'perc2',
};

/** The two hands: the lead (hats and ride) and the other. */
export type Hand = 'lead' | 'other';
export type Foot = 'kickFoot' | 'hatFoot';
export type Limb = Hand | Foot;

/** Where a hand hangs when it is not going anywhere — above its usual drum. */
export const HAND_REST: Record<Hand, PieceId> = { lead: 'hat', other: 'snare' };

/**
 * The point each hand's stick is aimed from. A stick does not point from the
 * shoulder to the drum — it is held out in front of the body and swung across
 * — so the horizontal line of the stick is the line from here to where it
 * lands.
 */
export const AIM_FROM: Record<Hand, V3> = {
  lead: [0.3, 0.95, 0.26],
  other: [-0.3, 0.95, 0.26],
};

/** The body, in metres: an adult of about 1.78 m on a 55 cm throne. */
export const BODY = {
  /** The pelvis, where the spine bends from. */
  pelvis: [0, 0.62, 0.24] as V3,
  /** A shoulder joint, from the pelvis with the spine upright (the lead side; the other is mirrored). */
  shoulder: [0.185, 0.6, 0.02] as V3,
  hip: [0.1, 0.6, 0.25] as V3,
  upperArm: 0.3,
  forearm: 0.27,
  thigh: 0.45,
  shin: 0.44,
  /** Ankle above the heel. */
  ankle: 0.075,
  /** Heel to the ball of the foot. */
  foot: 0.17,
} as const;

/** A stick: 16" long, held a third of the way up. */
export const STICK = { length: 0.406, grip: 0.13 } as const;
/** From the fulcrum to the tip. */
export const TIP_REACH = STICK.length - STICK.grip;

/** How a stick meets a piece: the articulations that move where it lands. */
export type Contact = 'centre' | 'edge' | 'bell' | 'rim' | 'cross';

/** The bell of every cymbal: its radius and how far it stands above the bow. */
export const BELL = { radius: 0.055, height: 0.024 } as const;

/**
 * A cymbal's top surface, as height above its centre at `rho` metres out:
 * the bell, then a bow that falls away to the edge. The scene lathes the
 * cymbal from this same curve, so a stick aimed at it meets the bronze.
 */
export function cymbalY(rho: number, radius: number): number {
  if (rho <= BELL.radius)
    return BELL.height * Math.pow(Math.cos((rho / BELL.radius) * (Math.PI / 2)), 0.7);
  const u = Math.min(1, (rho - BELL.radius) / (radius - BELL.radius));
  return -0.075 * radius * Math.pow(u, 1.3);
}

/**
 * A point on a piece, from its own frame (`y` out of the playing surface,
 * `+z` toward the drummer) to the kit's: the piece's tilt, then its centre.
 * The scene turns each piece's group by the same Euler angles (`XYZ`: roll
 * about `z` first, then the tilt about `x`).
 */
export function onPiece(p: Piece, local: V3): V3 {
  const [ax, az] = p.tilt;
  const [x0, y0, z0] = local;
  // about z
  const x1 = x0 * Math.cos(az) - y0 * Math.sin(az);
  const y1 = x0 * Math.sin(az) + y0 * Math.cos(az);
  // about x
  const y2 = y1 * Math.cos(ax) - z0 * Math.sin(ax);
  const z2 = y1 * Math.sin(ax) + z0 * Math.cos(ax);
  return [p.centre[0] + x1, p.centre[1] + y2, p.centre[2] + z2];
}

/** How far above the surface the tip's centre is when it touches: the bead's radius. */
const BEAD = 0.006;

/** How far a note can land from its mark, metres either way in the piece's plane. */
const SCATTER: Partial<Record<PieceKind, number>> = {
  drum: 0.028,
  cymbal: 0.035,
  hat: 0.02,
  perc: 0.008,
};

/**
 * How far out a cymbal is struck, as a share of its radius: the ride on the
 * outer bow, the crash at the edge, and no stroke past `limit`.
 */
export const CYMBAL_MARK = { ride: 0.78, crash: 0.92, limit: 0.97 } as const;
/** How far a ride stroke can sweep to either side of its mark, metres. */
export const RIDE_SWEEP = 0.07;
/**
 * How far out from the bell a bell note's tip lands, metres: aimed at it, on
 * the bow beside it — nobody plays in the middle of the dome.
 */
export const BELL_SHORT = 0.04;

/**
 * Where the tip lands, and how steeply the stick comes down onto it.
 *
 * Drums are struck a little in front of centre; cymbals toward the edge with
 * the stick flatter; a bell is the dome; an open or accented hat is the edge
 * of the top cymbal with the shoulder of the stick; a cross-stick lays the
 * stick across the rim with its far end raised off the head.
 *
 * `scatter` (each -1..1) moves the mark in the piece's plane: no drummer lands
 * on the same spot twice. A rim shot and a cross-stick are placed by the rim
 * and do not move.
 */
export function strikeTarget(
  id: PieceId,
  contact: Contact = 'centre',
  scatter: readonly number[] = [0, 0]
): { tip: V3; pitch: number } {
  const p = PIECES[id];
  const r = p.radius;
  const s = SCATTER[p.kind] ?? 0;
  const [sx, sz] = [scatter[0] * s, scatter[1] * s];
  switch (p.kind) {
    case 'cymbal': {
      /* The bell is played by aiming at it, not on it: the tip lands on the bow
         just short of the dome, on the line from the hand to the bell, with
         the stick only a little steeper than on the bow — it never touches
         the dome itself. */
      if (contact === 'bell') {
        const [dx, dz] = [p.centre[0] - AIM_FROM.lead[0], p.centre[2] - AIM_FROM.lead[2]];
        const a = Math.atan2(-dx, -dz) + 0.15 * scatter[0];
        const rho = BELL.radius + BELL_SHORT * (1 + 0.3 * scatter[1]);
        const tip = onPiece(p, [rho * Math.sin(a), cymbalY(rho, r) + BEAD, rho * Math.cos(a)]);
        return { tip, pitch: 0.18 };
      }
      // the ride is played on the bow, out toward the edge; a crash right at its edge
      const rho0 = r * (id === 'ride' ? CYMBAL_MARK.ride : CYMBAL_MARK.crash);
      // the ride is swept across, so it moves further side to side than it does in and out
      let x = -0.05 + (id === 'ride' ? scatter[0] * RIDE_SWEEP : sx);
      let z = Math.sqrt(rho0 * rho0 - 0.0025) + sz;
      // scatter moves the stick about, never off the bronze
      const k = Math.min(1, (r * CYMBAL_MARK.limit) / Math.hypot(x, z));
      x *= k;
      z *= k;
      return { tip: onPiece(p, [x, cymbalY(Math.hypot(x, z), r) + BEAD, z]), pitch: 0.12 };
    }
    case 'hat': {
      // a closed note on the outer bow, well off the bell; an open one at the very edge
      const rho = (contact === 'edge' ? r * 0.97 : r * 0.72) + (contact === 'edge' ? 0 : sz);
      const [dx, dz] = [0.55, 0.83];
      // along the edge for an open note, in and out across the bow for a closed one
      const [x, z] = [dx * rho - dz * sx, dz * rho + dx * sx];
      return {
        tip: onPiece(p, [x, cymbalY(Math.hypot(x, z), r) + BEAD, z]),
        pitch: contact === 'edge' ? 0.06 : 0.2,
      };
    }
    case 'perc':
      return { tip: onPiece(p, [sx, 0.035 + BEAD, 0.01 + sz]), pitch: 0.25 };
    case 'air':
      return { tip: p.centre, pitch: -0.3 };
    default: {
      if (contact === 'cross') return { tip: onPiece(p, [r * 0.3, 0.035, -r * 0.15]), pitch: 0.1 };
      if (contact === 'rim') return { tip: onPiece(p, [0, 0.012 + BEAD, r * 0.94]), pitch: 0.3 };
      return { tip: onPiece(p, [sx, 0.002 + BEAD, r * 0.18 + sz]), pitch: 0.32 };
    }
  }
}
