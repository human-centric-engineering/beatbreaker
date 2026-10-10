/**
 * How a drummer holds the sticks (experiment: the drummer view): the grips,
 * and what each asks of the arm.
 *
 * Three matched grips, told apart by how far the forearm is turned — German
 * palm down, American about half way, French thumbs up — and traditional, the
 * left hand of the old military snare: palm up, the stick in the web of the
 * thumb, played by turning the forearm like a doorknob. The numbers, and
 * where they come from, are in `.context/app/planning/grip-research.md`.
 */

export type Grip = 'german' | 'american' | 'french' | 'traditional';

export const GRIPS: readonly Grip[] = ['german', 'american', 'french', 'traditional'];

export interface GripStyle {
  /**
   * How far the back of the hand is rolled out from facing up on a drum,
   * radians — measured against the drum, as teachers give it: German's palm
   * near flat to the head, American's at about 45° to it, French's thumb up,
   * the palms facing. What that asks of the forearm depends on where the
   * elbow is (German's, out from the body, flattens the palm for it).
   * Traditional's is set by the web of the thumb (see `pose.ts`), not this.
   */
  roll: number;
  /**
   * How much of a matched stroke's lift is the forearm turning about its own
   * length rather than the wrist bending, 0–1. Palm down the wrist lifts the
   * stick straight up by extending; thumb up, extending would swing it
   * sideways, and radial deviation has only 20°, so the forearm's turn and
   * the fingers do it. Traditional's is all but the whole stroke.
   */
  turn: number;
  /** How much of a stroke the stick turns loose in the fingers, at rest: the fingers' share. */
  loose: number;
  /** How much of a big stroke above `ARM_FROM` the forearm lifts: German and French bring the arm in most. */
  arm: number;
  /** How far the elbow sits out from the ribs, in pole units: out with the palm down, in with the thumb up. */
  elbow: number;
  /**
   * The forearm's turn a matched grip holds, radians from thumb-up (palm down
   * positive): German about 70° — near the end of the forearm's range, its
   * elbows out doing the rest of the palm-down — American about 45°, French
   * about 10°. The matched arm is solved with the hand turned so (`pose.ts`).
   */
  pronation: number;
}

/**
 * Each grip's numbers. Practitioner sources agree on the forearm's turn and
 * the elbow; no study gives each joint's share of a stroke, so `turn`,
 * `loose` and `arm` are estimates read from the motion studies (Dahl 2011;
 * Bouënard, Wanderley & Gibet 2008: French grip's tip travels twice German's,
 * from the elbow; German's from the wrist with the shoulder still).
 */
export const GRIP_STYLE: Record<Grip, GripStyle> = {
  german: { roll: 0.35, turn: 0, loose: 0.08, arm: 0.3, elbow: 0.55, pronation: 1.2 },
  american: { roll: 0.72, turn: 0.1, loose: 0.12, arm: 0.35, elbow: 0.35, pronation: 0.78 },
  french: { roll: 1.45, turn: 0.55, loose: 0.3, arm: 0.5, elbow: 0.15, pronation: 0.17 },
  traditional: { roll: 0.72, turn: 0.65, loose: 0.12, arm: 0.35, elbow: 0.35, pronation: -0.7 },
};

/** Which grip each hand holds: the lead hand is on the hats. */
export type Grips = Record<'lead' | 'other', Grip>;

/**
 * The grip choices the drummer view offers: a matched grip in both hands, or
 * traditional in the hand away from the hats (the lead stays American, as
 * traditional players' does), or in both — rare on a kit, but it is played.
 */
export const GRIP_CHOICES = [
  'american',
  'german',
  'french',
  'traditional',
  'traditionalBoth',
] as const;
export type GripChoice = (typeof GRIP_CHOICES)[number];

/** Each hand's grip for a choice. */
export function gripsFor(choice: GripChoice): Grips {
  if (choice === 'traditionalBoth') return { lead: 'traditional', other: 'traditional' };
  if (choice === 'traditional') return { lead: 'american', other: 'traditional' };
  return { lead: choice, other: choice };
}

export const DEFAULT_GRIPS: Grips = gripsFor('american');
