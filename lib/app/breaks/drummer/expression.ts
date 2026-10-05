import { seedOf } from '@/lib/app/breaks/drummer/kick-foot';
import { lastAtOrBefore, smoothstep } from '@/lib/app/breaks/drummer/strokes';
import type { Hit } from '@/lib/app/breaks/drummer/timeline';
import { makeRng } from '@/lib/app/breaks/rng';

/**
 * The drummer's character (experiment: the drummer view): what the head and
 * the upper body do on top of nodding along.
 *
 * Three things, all chosen by seeded rolls so they are not there every time —
 * a player who throws their head at every crash looks like a machine too:
 *
 * - **landings** — coming home to the one after a busy passage (a fill into
 *   a crash, or straight back onto the hats) is more often than not met with
 *   the head thrown down into it and the shoulders dropping, recovering over
 *   half a second. A crash out of a plain groove gets it only now and then,
 *   and smaller.
 * - **busy passages** — through a fill the head follows the sticks round the
 *   toms, the body leans in, and the head cocks a little to one side.
 * - **mood** — a slow drift, every few seconds, in how hard the head nods and
 *   which way it tilts, so the same groove is not played with the same face.
 *
 * Pure: a function of the strokes and the time.
 */

export interface Expression {
  /** Extra nod, radians (forward). */
  nod: number;
  /** Head tilt to one side, radians. */
  tilt: number;
  /** Extra torso dip, metres (down is negative). */
  dip: number;
  /** Extra lean forward, radians. */
  lean: number;
  /** 0–1: how much the head follows the hands rather than looking ahead. */
  focus: number;
  /** How much the groove's own nod is scaled, around 1. */
  nodScale: number;
}

/** How far back a busy passage is counted, seconds. */
const BUSY_WINDOW = 0.7;
/** Hand strokes on drums in that window that make a passage busy. */
const BUSY_STROKES = 5;
/** How long a landing takes to play out, seconds, and when it is deepest. */
const LANDING = 0.7;
const LANDING_PEAK = 0.17;
/** The mood changes over this long, seconds. */
const MOOD_PERIOD = 3.2;

const isHand = (h: Hit) => h.limb === 'lead' || h.limb === 'other';
const isDrum = (h: Hit) => h.piece !== 'hat' && h.piece !== 'ride' && h.piece !== 'crash';

/**
 * How busy the hands are on the drums over the window before `t`, 0–1.
 *
 * Each stroke is weighted by a bump over its age — nothing as it lands,
 * most in the middle of the window, nothing as it leaves — so the measure
 * rises and falls smoothly rather than stepping as strokes come and go (the
 * head follows it, and a step there is a twitch).
 */
function busyness(hits: readonly Hit[], t: number, end: number): number {
  let n = 0;
  let toms = 0;
  for (let i = end; i >= 0; i--) {
    const h = hits[i];
    const age = t - h.time;
    if (age >= BUSY_WINDOW) break;
    if (age < 0 || !isHand(h) || !isDrum(h)) continue;
    const w = Math.sin((Math.PI * age) / BUSY_WINDOW) ** 2;
    n += w;
    if (h.piece !== 'snare') toms += w;
  }
  // a steady stream averages half a stroke's weight per stroke
  return Math.min(1, n / (BUSY_STROKES * 0.5) + toms * 0.12);
}

/** A seeded noise value in -1..1 at a time, smooth across `period`. */
function drift(now: number, period: number, salt: number): number {
  const k = Math.floor(now / period);
  const at = (i: number) => makeRng(((i * 2654435761) ^ salt) >>> 0)() * 2 - 1;
  return at(k) + (at(k + 1) - at(k)) * smoothstep(0, 1, now / period - k);
}

/**
 * How big a landing a cymbal stroke gets (0: none), by a seeded roll. A crash
 * can always be one; any other cymbal only coming home out of a fill.
 */
function landingOf(hits: readonly Hit[], i: number): number {
  const h = hits[i];
  if (!isHand(h) || isDrum(h)) return 0;
  const busy = busyness(hits, h.time - 1e-6, i - 1);
  if (h.piece !== 'crash' && busy < 0.6) return 0;
  const roll = makeRng(seedOf(h) ^ 0x3c6ef372)();
  // after a fill: more often than not, and big; out of a groove: now and then, and smaller
  const chance = (h.piece === 'crash' ? 0.2 : 0.05) + 0.45 * busy;
  if (roll >= chance) return 0;
  return (0.45 + 0.55 * busy) * (0.75 + 0.5 * (roll / chance));
}

export function expressionAt(hits: readonly Hit[], now: number): Expression {
  const last = lastAtOrBefore(hits, now);

  // every landing still playing out, added: a second one builds on the first, not over it.
  // Each is one smooth throw, easing in to its deepest at LANDING_PEAK and out more slowly.
  let landing = 0;
  let sided = 0;
  let moment = Infinity;
  let biggest = 0;
  let side = 0;
  const add = () => {
    const u = (now - moment) / LANDING_PEAK;
    const shape = u * u * Math.exp(2 * (1 - u));
    landing += biggest * shape;
    sided += side * biggest * shape;
  };
  for (let i = last; i >= 0; i--) {
    const h = hits[i];
    if (now - h.time > LANDING) break;
    const size = landingOf(hits, i);
    if (!size) continue;
    // strokes landing together (a crash with the ride) are one landing: the biggest of them
    if (moment - h.time > 0.03) {
      if (biggest) add();
      moment = h.time;
      biggest = 0;
    }
    if (size > biggest) {
      biggest = size;
      side = makeRng(seedOf(h) ^ 0x1b873593)() < 0.5 ? -1 : 1;
    }
  }
  if (biggest) add();
  // landings one after another build, but ease off rather than stack without end
  landing = 1.2 * Math.tanh(landing / 1.2);
  sided = 1.2 * Math.tanh(sided / 1.2);

  // busy now, and about to be (the head goes with the fill as it starts)
  const busy = Math.max(
    busyness(hits, now, last),
    0.7 * busyness(hits, now + 0.25, hits.length - 1)
  );
  const passage = smoothstep(0.3, 1, busy);

  const mood = drift(now, MOOD_PERIOD, 0x7f4a7c15);
  const lean = drift(now, MOOD_PERIOD * 1.7, 0x2545f491);
  return {
    nod: 0.2 * landing + 0.05 * passage,
    tilt: 0.09 * sided + 0.06 * passage * lean + 0.035 * mood,
    dip: -0.012 * landing,
    lean: 0.025 * landing + 0.03 * passage,
    focus: passage,
    nodScale: 1 + 0.25 * mood,
  };
}
