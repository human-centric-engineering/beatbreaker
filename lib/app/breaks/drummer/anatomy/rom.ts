import type { ArmAngles } from '@/lib/app/breaks/drummer/anatomy/arm';

/**
 * How far each joint a drummer plays with can move (experiment: the drummer
 * view's skeleton), in radians.
 *
 * Two ranges for each motion. `hard` is the anatomical limit — the end of an
 * adult's active range, past which the joint is being forced — from the
 * clinical norms (AAOS, *Joint Motion: Method of Measuring and Recording*,
 * 1965; Greene & Heckman 1994) checked against measured series where they
 * exist. `soft` is the range everyday use stays inside (the functional
 * range): a body at ease works there, and a pose out past it is straining.
 * The research behind every number, and its source, is in
 * `.context/app/planning/anatomy-research.md`.
 */

const D = Math.PI / 180;

export interface Range {
  min: number;
  max: number;
}

export interface Motion {
  hard: Range;
  soft: Range;
}

const r = (min: number, max: number): Range => ({ min: min * D, max: max * D });

export const ROM = {
  /** The elbow's bend (0 straight; AAOS 0–150, men about 145; Morrey et al. 1981: 30–130 in daily use). */
  elbowFlexion: { hard: r(-5, 145), soft: r(30, 130) },
  /** The forearm's turn, palm down positive (AAOS 80 each way; Morrey 1981: 50 each way in use). */
  pronation: { hard: r(-85, 80), soft: r(-50, 50) },
  /** The wrist toward the palm, positive (AAOS 80 flexion, 70 extension; Ryu et al. 1991: 54 and 60 in use). */
  wristFlexion: { hard: r(-70, 80), soft: r(-60, 54) },
  /** The wrist toward the thumb, positive (AAOS 20 radial, 30–35 ulnar; Ryu 1991: 17 and 40). */
  deviation: { hard: r(-35, 20), soft: r(-30, 17) },
  /** The humerus turned in, positive (AAOS, at 90° abduction: 70 in, 90 out). */
  shoulderRotation: { hard: r(-90, 70), soft: r(-60, 60) },
  /** The humerus raised (AAOS 180 with the scapula; about 120 of it at the shoulder joint itself). */
  shoulderElevation: { hard: r(0, 180), soft: r(0, 120) },
  /** The fingers' joints, II–V (AAOS; Bain et al. 2015 for the ranges used, 19–71, 23–87, 10–64). */
  mcp: { hard: r(-30, 90), soft: r(19, 71) },
  /** A finger fanned at its knuckle, each way at a straight knuckle: it shrinks as the knuckle bends ({@link splayLimit}). */
  mcpSplay: { hard: r(-20, 20), soft: r(-15, 15) },
  pip: { hard: r(0, 105), soft: r(23, 87) },
  dip: { hard: r(-10, 85), soft: r(10, 64) },
  /**
   * The thumb's CMC flexion (+) and extension (−): a saddle joint of two
   * offset, non-perpendicular axes (Hollister et al. 1992), 53° flexion to
   * extension all told (Cooney et al. 1981).
   */
  thumbCmc: { hard: r(-25, 30), soft: r(-15, 20) },
  /** The thumb's MCP and IP (AAOS 0–50 and 0–80, IP hyperextending 20; Hume et al. 1990: 21 and 18 in use). */
  thumbMcp: { hard: r(-10, 55), soft: r(0, 40) },
  thumbIp: { hard: r(-20, 80), soft: r(0, 50) },
} as const satisfies Record<string, Motion>;

/**
 * The DIP joint follows the PIP: the deep flexor and the oblique retinacular
 * ligament leave it about two thirds of the PIP's bend (Rijpkema & Girard
 * 1991), anywhere from half to four fifths of it in a natural hand.
 */
export const DIP_OF_PIP = { typical: 2 / 3, min: 0.5, max: 0.8 } as const;

/**
 * How far a finger can fan at a knuckle bent `flexion` radians: its collateral
 * ligaments tighten over the cam of the metacarpal's head as it bends, so the
 * fan closes toward nothing at 90° (Kapandji).
 */
export function splayLimit(flexion: number): number {
  return ROM.mcpSplay.hard.max * Math.cos(Math.min(Math.PI / 2, Math.max(0, flexion))) ** 2;
}

/**
 * The scapulohumeral rhythm: how much of the arm's elevation is the scapula
 * turning upward on the chest. Little in the first 30° (Poppen & Walker 1976:
 * about 4:1 there), then about 5 of every 9 degrees at the shoulder joint and
 * 4 at the scapula (5:4), up to the scapula's upward rotation of 50°
 * (McClure et al. 2001). Radians of scapular upward rotation for an
 * elevation of `elevation` radians.
 */
export function scapularRotation(elevation: number): number {
  const from = 30 * D;
  const early = Math.min(elevation, from) * 0.2;
  const late = Math.max(0, elevation - from) * (4 / 9);
  return Math.min(50 * D, early + late);
}

/** How far `value` is outside `range`, radians: 0 inside it. */
export function beyond(value: number, range: Range): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, range.min - value, value - range.max);
}

/** Each joint of an arm that is past its anatomical limit, and by how far (radians). */
export function armStrain(a: ArmAngles): Partial<Record<keyof typeof ROM, number>> {
  const out: Partial<Record<keyof typeof ROM, number>> = {};
  const check = (key: keyof typeof ROM, v: number) => {
    const over = beyond(v, ROM[key].hard);
    if (over > 0) out[key] = over;
  };
  check('elbowFlexion', a.flexion);
  check('pronation', a.pronation);
  check('wristFlexion', a.wristFlexion);
  check('deviation', a.deviation);
  check('shoulderRotation', a.rotation);
  check('shoulderElevation', a.elevation);
  return out;
}
