import {
  crashOn,
  drift,
  lastAtOrBefore,
  seedOf,
  smoothstep,
} from '@/lib/app/breaks/drummer/strokes';
import type { Downbeat, Hit } from '@/lib/app/breaks/drummer/timeline';
import { makeRng } from '@/lib/app/breaks/rng';

/**
 * The drummer's character (experiment: the drummer view): what the head and
 * the upper body do on top of nodding along.
 *
 * Five things, all chosen by seeded rolls so they are not there every time —
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
 * - **the one** — the whole body gathers just before a bar's first beat (up,
 *   back, a breath in the shoulders) and lets go into it. Some bars, not all,
 *   and by how much is rolled for each; where the pattern changes, always, and
 *   bigger.
 * - **a glance** — now and then, outside a fill, a look out at the camera for
 *   up to two seconds: just a look, or with any of a nod, a tilt of the head,
 *   the eyebrows up in a hello, or (now and then) a wink. And a blink every
 *   few seconds, playing or not.
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
  /** The shoulders up (a breath in) or dropped, metres. */
  shrug: number;
  glance: Glance;
  /** 0–1: how shut both eyes are, for a blink. */
  blink: number;
}

/** A look out at the camera. */
export interface Glance {
  /** 0–1: how far the head has turned to the camera. */
  look: number;
  /** A nod to it, radians (forward), and a tilt of the head, radians. */
  nod: number;
  tilt: number;
  /** 0–1: how far one eye is shut, and which one (1 the lead side). */
  wink: number;
  eye: 1 | -1;
  /** 0–1: the eyebrows raised, a hello. */
  brows: number;
}

const NO_GLANCE: Glance = { look: 0, nod: 0, tilt: 0, wink: 0, eye: 1, brows: 0 };

/** How far back a busy passage is counted, seconds. */
const BUSY_WINDOW = 0.7;
/** Hand strokes on drums in that window that make a passage busy. */
const BUSY_STROKES = 5;
/** How long a landing takes to play out, seconds, and when it is deepest. */
const LANDING = 0.7;
const LANDING_PEAK = 0.17;
/** The mood changes over this long, seconds. */
const MOOD_PERIOD = 3.2;
/** How often a bar's one is marked when the pattern carries on (it always is when it changes). */
const ONE_CHANCE = 0.45;
/**
 * The breath in before a one: it starts this long before, seconds (rolled
 * between these — about a beat), and is full this long before it lands, so
 * the body is already gathered and waiting as the one comes.
 */
const GATHER_LEAD = [0.4, 0.7] as const;
const GATHER_FULL = 0.12;
/**
 * The let-go into a one: it starts this long before the one and is deepest
 * this long after it starts, seconds — so the head comes down on the one,
 * not after it.
 */
const RELEASE_LEAD = 0.09;
const RELEASE_PEAK = 0.1;
/** A glance can come once in each of these windows, seconds, and does in this share of them. */
const GLANCE_WINDOW = 11;
const GLANCE_CHANCE = 0.4;
/** How long a glance lasts, seconds: rolled between these. */
const GLANCE_SHORTEST = 0.6;
const GLANCE_LONGEST = 2;
/** A blink can come in each of these windows, seconds, does in this share of them, and takes this long. */
const BLINK_WINDOW = 3.5;
const BLINK_CHANCE = 0.8;
const BLINK = 0.15;

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

/**
 * How big the body's gesture into a one is, rolled between these: only a
 * one that brings in a crash gets the whole body; in the run of the groove,
 * new pattern or not, it is a small thing.
 */
const ONE_SIZE = [0.1, 0.2] as const;
const ONE_SIZE_CHANGE = [0.3, 0.45] as const;
const ONE_SIZE_CRASH = [0.8, 1.2] as const;

/**
 * How the body meets the ones around `now`: `gather` (0–1-ish) rising into
 * each, `release` after it, each scaled by that bar's rolled size.
 */
function onesAt(
  downbeats: readonly Downbeat[],
  hits: readonly Hit[],
  now: number
): { gather: number; release: number } {
  let gather = 0;
  let release = 0;
  for (const d of downbeats) {
    if (d.time < now - 0.9 || d.time > now + GATHER_LEAD[1]) continue;
    const rng = makeRng((Math.round(d.time * 1000) ^ 0x6a09e667) >>> 0);
    const roll = rng();
    const crash = crashOn(hits, d.time);
    if (!crash && !d.change && roll >= ONE_CHANCE) continue;
    // a bar like the last is only touched on, a new one a little more; a crash with the whole body
    const [lo, hi] = crash ? ONE_SIZE_CRASH : d.change ? ONE_SIZE_CHANGE : ONE_SIZE;
    const size = lo + (hi - lo) * rng();
    // the breath in: from about a beat before, held through the last moment, cut off as the one lands
    const lead = GATHER_LEAD[0] + (GATHER_LEAD[1] - GATHER_LEAD[0]) * rng();
    const up = smoothstep(d.time - lead, d.time - GATHER_FULL, now);
    // handing over to the let-go as it starts
    gather += size * up * (1 - smoothstep(d.time - RELEASE_LEAD, d.time + 0.03, now));
    if (now > d.time - RELEASE_LEAD) {
      const u = (now - d.time + RELEASE_LEAD) / RELEASE_PEAK;
      release += size * u * u * Math.exp(2 * (1 - u));
    }
  }
  return { gather, release };
}

/**
 * The glance at `now`, if one is playing. One can come in each window, at a
 * seeded moment, unless the hands are busy then: nobody looks up mid-fill.
 */
function glanceAt(hits: readonly Hit[], now: number): Glance {
  const k = Math.floor(now / GLANCE_WINDOW);
  for (const w of [k, k - 1]) {
    const rng = makeRng(((w * 2654435761) ^ 0x9e3779b9) >>> 0);
    if (rng() >= GLANCE_CHANCE) continue;
    const start = w * GLANCE_WINDOW + 1 + rng() * (GLANCE_WINDOW - 3);
    const length = GLANCE_SHORTEST + (GLANCE_LONGEST - GLANCE_SHORTEST) * rng();
    const end = start + length;
    if (now < start || now > end) continue;
    if (busyness(hits, start, lastAtOrBefore(hits, start)) > 0.35) return NO_GLANCE;
    // each gesture comes or not on its own, so they combine: a tilt with a wink, a nod with the brows
    const nods = rng() < 0.35;
    const tilts = rng() < 0.4;
    const winks = rng() < 0.15;
    const hello = rng() < 0.3;
    const eye = rng() < 0.5 ? 1 : -1;
    const look = smoothstep(start, start + 0.25, now) * (1 - smoothstep(end - 0.35, end, now));
    const beat = (at: number, width: number) =>
      now > at && now < at + width ? Math.sin((Math.PI * (now - at)) / width) : 0;
    // the brows go up as the eyes meet the camera, hold a moment, and come down
    const up = Math.min(0.7, length - 0.45);
    const brows = hello
      ? smoothstep(start + 0.1, start + 0.3, now) *
        (1 - smoothstep(start + up, start + up + 0.2, now))
      : 0;
    return {
      look,
      nod: nods ? 0.12 * beat(start + 0.3, 0.4) : 0,
      tilt: tilts ? 0.13 * eye * look : 0,
      wink: winks ? beat(start + 0.35, 0.24) : 0,
      eye,
      brows,
    };
  }
  return NO_GLANCE;
}

/**
 * How shut both eyes are for a blink, 0–1: every few seconds, at a seeded
 * moment, now and then twice in quick succession.
 */
function blinkAt(now: number): number {
  const k = Math.floor(now / BLINK_WINDOW);
  let shut = 0;
  for (const w of [k, k - 1]) {
    const rng = makeRng(((w * 3266489917) ^ 0x27d4eb2f) >>> 0);
    if (rng() >= BLINK_CHANCE) continue;
    const start = w * BLINK_WINDOW + rng() * (BLINK_WINDOW - 0.5);
    const twice = rng() < 0.15;
    for (const at of twice ? [start, start + 0.28] : [start]) {
      if (now > at && now < at + BLINK)
        shut = Math.max(shut, Math.sin((Math.PI * (now - at)) / BLINK));
    }
  }
  return shut;
}

export function expressionAt(
  hits: readonly Hit[],
  now: number,
  downbeats: readonly Downbeat[] = []
): Expression {
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
  // a crash landing on the one already throws the body: the one's own let-go gives way to it
  const one = onesAt(downbeats, hits, now);
  const gather = one.gather;
  const release = one.release * (1 - 0.5 * Math.min(1, landing));
  return {
    nod: 0.2 * landing + 0.05 * passage - 0.07 * gather + 0.11 * release,
    tilt: 0.09 * sided + 0.06 * passage * lean + 0.035 * mood,
    dip: -0.012 * landing + 0.012 * gather - 0.016 * release,
    lean: 0.025 * landing + 0.03 * passage - 0.02 * gather + 0.03 * release,
    focus: passage,
    nodScale: 1 + 0.25 * mood,
    shrug: 0.012 * gather - 0.008 * release,
    glance: glanceAt(hits, now),
    blink: blinkAt(now),
  };
}
