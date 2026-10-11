/**
 * The hi-hat pedal moving under the foot (experiment: the drummer view).
 *
 * Board, pull rod and top cymbal are one sprung piece: the stand's spring
 * pushes the board up and the hats apart, the bottom cymbal stops the top one
 * and throws it back, and the foot can only push down. So:
 *
 * - **Opening.** The foot eases off and the spring lifts the board after it —
 *   quickly, not at once: a toe snatched up for a chick leaves the board a
 *   moment behind it at the top.
 * - **A chick.** The foot drives the top cymbal onto the bottom one; it comes
 *   back off it a little, into a sole still pressing, which shuts it again.
 * - **Held closed.** The foot presses the board down against the spring, and
 *   the cymbals stay together.
 *
 * Units are the foot's (`hatFootAt`, `hatOpenAt`): 0 the hats closed, 1 fully
 * open. The foot's motion is the planner's; the pedal is simulated against it
 * over the last moment, from where the foot had it then — the spring and the
 * sole forget faster than that. Pure: a function of the foot and the time.
 */

/** The stand's spring, rad/s: the board up from closed in about a twentieth of a second. */
const SPRING = 2 * Math.PI * 5;
const SPRING_DAMP = 0.2;
/** The sole on the board: firm, and soft enough to give a little under a chick. */
const FOOT = 2 * Math.PI * 15;
const FOOT_DAMP = 0.6;
/**
 * How far the foot presses past where it means the board, per unit of the
 * spring's push: what the sole gives under the spring, and a little more, so a
 * held pedal is shut rather than sagging open against the sole.
 */
const SAG = 1.2 * (SPRING / FOOT) ** 2;
/** The top cymbal off the bottom one: felt, a clutch and two plates. A guess; nothing is measured. */
const CLASH = 0.3;

const STEP = 0.001;
const SUB = 4;
const DT = STEP / SUB;
/** How far back the pedal is simulated from, seconds: long enough for a chick's bounce to die. */
const MEMORY = 0.25;

/**
 * Where the hat pedal is at `now`, 0 closed to 1 fully open, under a foot that
 * means it to be at `foot(t)` (on the same scale).
 */
export function hatPedalAt(foot: (t: number) => number, now: number): number {
  const t0 = now - MEMORY;
  let f = foot(t0);
  let x = Math.max(0, f);
  let v = x > 0 ? (foot(t0 + STEP) - f) / STEP : 0;
  for (let k = 1; k * STEP <= MEMORY + 1e-9; k++) {
    const f1 = foot(t0 + k * STEP);
    // where the sole is, and how fast it goes
    const fv = ((f1 - f) / STEP) * (1 + SAG);
    for (let j = 0; j < SUB; j++) {
      const at = f + (f1 - f) * ((j + 0.5) / SUB);
      const sole = at - SAG * (1 - at);
      // the spring up; the sole, only ever down onto the board
      let a = SPRING * SPRING * (1 - x) - 2 * SPRING_DAMP * SPRING * v;
      if (x > sole) a += -FOOT * FOOT * (x - sole) - 2 * FOOT_DAMP * FOOT * (v - fv);
      v += a * DT;
      x += v * DT;
      // the bottom cymbal: the top one driven onto it comes back off
      if (x < 0) {
        x = 0;
        if (v < 0) v = -CLASH * v;
      }
    }
    f = f1;
  }
  return Math.min(1, x);
}
