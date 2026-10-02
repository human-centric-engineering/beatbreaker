/**
 * How a practice session climbs to each pattern's target tempo (D30).
 *
 * Each pattern's slot is a **climb** and then a **hold**. The climb takes the
 * first `climbPct` of the slot and ends at the target; the hold plays the rest
 * at the target. The climb has a shape:
 *
 * - `steady` — linear.
 * - `gentle-start` — ease-in: more of the climb is spent near the start tempo.
 * - `gentle-finish` — ease-out: more of it is spent near the target.
 * - `steps` — `climbSteps` equal steps, each held for an equal share.
 *
 * Pure, and shared by every client: the runner reads {@link tempoAt} at each
 * cycle boundary — the tempo only changes there — and native clients (D14)
 * run the same sums.
 */

export const CLIMB_SHAPES = ['steady', 'gentle-start', 'gentle-finish', 'steps'] as const;
export type ClimbShape = (typeof CLIMB_SHAPES)[number];

/** What each climb shape is called on screen. */
export const SHAPE_LABEL: Record<ClimbShape, string> = {
  steady: 'Steady',
  'gentle-start': 'Gentle start',
  'gentle-finish': 'Gentle finish',
  steps: 'Steps',
};

/** The slowest tempo a session plays, as the slowest a speed record claims. */
export const PRACTICE_BPM_MIN = 40;

/** The session's defaults, before any pattern overrides them. */
export const CLIMB_DEFAULTS = {
  /** How far below the target a pattern starts, in percent. */
  startPct: 20,
  /** How much of the slot the climb takes, in percent. Two-thirds. */
  climbPct: 67,
  climbShape: 'steady' as ClimbShape,
  /** The number of steps, for the `steps` shape. */
  climbSteps: 4,
} as const;

export const START_PCT_RANGE = { min: 5, max: 50 } as const;
export const CLIMB_PCT_RANGE = { min: 10, max: 100 } as const;
export const CLIMB_STEPS_RANGE = { min: 2, max: 8 } as const;

/** How a session or a pattern climbs. On a pattern, null means "the session's". */
export interface ClimbSettings {
  startPct: number;
  climbPct: number;
  climbShape: ClimbShape;
  climbSteps: number;
}

export type ClimbOverrides = { [K in keyof ClimbSettings]: ClimbSettings[K] | null };

/** A pattern's own settings where it has them, the session's where it does not. */
export function effectiveClimb(
  session: ClimbSettings,
  item: Partial<ClimbOverrides>
): ClimbSettings {
  return {
    startPct: item.startPct ?? session.startPct,
    climbPct: item.climbPct ?? session.climbPct,
    climbShape: item.climbShape ?? session.climbShape,
    climbSteps: item.climbSteps ?? session.climbSteps,
  };
}

/** Where a pattern starts: `startPct` below its target, never under 40. */
export function startBpm(targetBpm: number, startPct: number): number {
  return Math.max(PRACTICE_BPM_MIN, Math.round(targetBpm * (1 - startPct / 100)));
}

/** Everything {@link tempoAt} needs about one slot. */
export interface SlotPlan {
  startBpm: number;
  targetBpm: number;
  /** The slot's length. */
  seconds: number;
  climbPct: number;
  climbShape: ClimbShape;
  climbSteps: number;
}

/** The plan for one slot, from its minutes, its target and its climb. */
export function slotPlan(minutes: number, targetBpm: number, climb: ClimbSettings): SlotPlan {
  return {
    startBpm: Math.min(targetBpm, startBpm(targetBpm, climb.startPct)),
    targetBpm,
    seconds: minutes * 60,
    climbPct: climb.climbPct,
    climbShape: climb.climbShape,
    climbSteps: climb.climbSteps,
  };
}

/** How far through the climb a fraction of its time has got, by shape. */
function progress(x: number, shape: ClimbShape, steps: number): number {
  switch (shape) {
    case 'steady':
      return x;
    case 'gentle-start':
      return x * x;
    case 'gentle-finish':
      return 1 - (1 - x) * (1 - x);
    case 'steps': {
      const n = Math.max(1, Math.floor(steps));
      return Math.floor(x * n) / n;
    }
  }
}

/**
 * The tempo, in whole bpm, `elapsed` seconds into a slot. It starts at the
 * start tempo, never goes down, reaches the target when the climb's share of
 * the slot has passed, and stays there.
 */
export function tempoAt(elapsed: number, plan: SlotPlan): number {
  const climb = (plan.seconds * plan.climbPct) / 100;
  if (elapsed >= climb) return plan.targetBpm;
  const x = Math.max(0, elapsed) / climb;
  const f = progress(x, plan.climbShape, plan.climbSteps);
  return Math.round(plan.startBpm + f * (plan.targetBpm - plan.startBpm));
}
