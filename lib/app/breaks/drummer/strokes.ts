import type { Hit } from '@/lib/app/breaks/drummer/timeline';
import { makeRng } from '@/lib/app/breaks/rng';

/**
 * How a stick (or a beater) moves between two strokes (experiment: the
 * drummer view).
 *
 * A stroke is not a sine wave. The stick comes off the head on the rebound,
 * goes to the height the *next* note wants, waits there if there is time, and
 * then falls — accelerating, so it is moving fastest at the instant it meets
 * the head, which is the instant the note sounds. Three consequences a
 * drummer will recognise fall out of that and nothing else:
 *
 * - a ghost note is played from an inch: its stroke is small, quick and late;
 * - an accent after quiet notes is an **upstroke** — the stick rises on the
 *   tap before it — and a tap after an accent is a **downstroke**, the stick
 *   stopped low as it comes down;
 * - fast notes cannot go high: the height is capped by the time available, so
 *   sixteenths at 160 are played close to the head however loud they are.
 */

export interface StrokeProfile {
  /** Height (in the profile's units) a stroke of this strength is played from. */
  height: (strength: number) => number;
  /**
   * How much of that height a stroke on this piece takes, around 1. A crash is
   * hit hard but from low — a glancing blow across the edge, not a stick
   * raised overhead — and a ride is played close.
   */
  reach?: (hit: Hit) => number;
  /** Where the stick waits with nothing coming. */
  rest: number;
  /** Fraction of a stroke's height the rebound returns on its own. */
  rebound: number;
  /** The fastest the stick can climb, in units per second, which caps fast strokes. */
  speed: number;
  /** How long the fall takes: `fall + fallPerUnit × height`, seconds. */
  fall: number;
  fallPerUnit: number;
  /** How long the rebound takes to come up: `rise + risePerUnit × height`. */
  rise: number;
  risePerUnit: number;
  /** How far above the next stroke's height a rebound is let go before it is stopped. */
  stop: number;
  /**
   * When the stick is lifted for the next stroke: `prep + prepPerUnit × height`
   * seconds before it is thrown. Until then it waits at the rebound's height
   * (or lower), so an upstroke comes late, not across the whole gap. Without
   * it the stick moves to the next height over all the time there is.
   */
  prep?: number;
  prepPerUnit?: number;
}

/** A seed from a note's grid time, the same for its forecast and its scheduled stroke. */
export function seedOf(h: Hit): number {
  // murmur3's finaliser: neighbouring milliseconds land on unrelated seeds
  let x = Math.round(h.step * 1000) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

/** A seeded noise value in -1..1 at a time, smooth across `period`. */
export function drift(now: number, period: number, salt: number): number {
  const k = Math.floor(now / period);
  const at = (i: number) => makeRng(((i * 2654435761) ^ salt) >>> 0)() * 2 - 1;
  return at(k) + (at(k + 1) - at(k)) * smoothstep(0, 1, now / period - k);
}

/** How much one hand stroke's height varies from the next, either way. */
const STROKE_JITTER = 0.12;

/** A note's own small difference in height, seeded from it: no two strokes quite the same. */
function jitterOf(h: Hit): number {
  return 1 + STROKE_JITTER * (makeRng(seedOf(h) ^ 0x2c1b3c6d)() * 2 - 1);
}

/**
 * How high a hand stroke is played on each cymbal, as a share of its strength's
 * height. The ride is played from full height: the stick bounces off it and
 * comes up like it does off the hats.
 */
const CYMBAL_REACH: Partial<Record<Hit['piece'], number>> = { crash: 0.5 };
/** The ride's bell: louder, but played from about the height of the bow beside it. */
const BELL_REACH = 0.7;

/** A hand, in metres the tip lifts. */
export const HAND: StrokeProfile = {
  height: (s) => 0.012 + 0.3 * Math.pow(s, 1.6),
  reach: (h) => (h.contact === 'bell' ? BELL_REACH : (CYMBAL_REACH[h.piece] ?? 1)) * jitterOf(h),
  rest: 0.05,
  rebound: 0.75,
  speed: 1.5,
  fall: 0.04,
  fallPerUnit: 0.32,
  rise: 0.06,
  risePerUnit: 0.25,
  stop: 0.04,
  prep: 0.07,
  prepPerUnit: 0.5,
};

/** A foot: 0 is the beater on the head, 1 the beater fully back. */
export const KICK: StrokeProfile = {
  height: (s) => 0.35 + 0.65 * s,
  rest: 0.55,
  rebound: 0.6,
  speed: 6,
  fall: 0.04,
  fallPerUnit: 0.05,
  rise: 0.05,
  risePerUnit: 0.06,
  stop: 0.15,
};

export interface StrokeState {
  /** The stroke just played, if any. */
  prev: Hit | undefined;
  /** The stroke coming, if any is known. */
  next: Hit | undefined;
  /** How high the stick (or beater) is, in the profile's units. 0 is touching. */
  lift: number;
  /** 0 at `prev`'s piece, 1 at `next`'s: how far across the kit the hand has come. */
  travel: number;
  /** Seconds since `prev` sounded (Infinity before the first). */
  since: number;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function smoothstep(a: number, b: number, x: number): number {
  if (b <= a) return x >= b ? 1 : 0;
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
}

/** The last stroke at or before `now`, by binary search over a time-ordered list. */
/**
 * Does a hand bring a crash in at `time`? Forecast strokes sit on the grid and
 * scheduled ones a few milliseconds off it, so near enough counts.
 */
export function crashOn(hits: readonly Hit[], time: number): boolean {
  for (let i = lastAtOrBefore(hits, time + 0.04); i >= 0 && hits[i].time >= time - 0.04; i--) {
    const h = hits[i];
    if (h.piece === 'crash' && (h.limb === 'lead' || h.limb === 'other')) return true;
  }
  return false;
}

export function lastAtOrBefore(hits: readonly Hit[], now: number): number {
  let lo = 0;
  let hi = hits.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (hits[mid].time <= now) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

/**
 * Where one limb is at `now`, given its strokes in time order.
 *
 * Pure: it holds no state between frames, so a dropped frame or a seek lands
 * on the right pose rather than catching up to it.
 */
export function strokeAt(hits: readonly Hit[], now: number, p: StrokeProfile): StrokeState {
  const i = lastAtOrBefore(hits, now);
  const prev = i >= 0 ? hits[i] : undefined;
  const next = hits[i + 1];

  if (!prev && !next) return { prev, next, lift: p.rest, travel: 0, since: Infinity };

  const since = prev ? now - prev.time : Infinity;
  const gap = prev && next ? next.time - prev.time : Infinity;
  // the highest a stick can get and back in the time there is
  const cap = Number.isFinite(gap) ? p.speed * gap * 0.5 : Infinity;
  const heightOf = (h: Hit) => p.height(h.strength) * (p.reach?.(h) ?? 1);
  const target = next ? Math.min(heightOf(next), cap) : p.rest;
  // a downstroke: a loud note going to a soft one is stopped low on the rebound, not let fly
  const free = prev ? Math.min(heightOf(prev) * p.rebound, cap) : target;
  const bounce = next ? Math.min(free, target + p.stop) : free;

  let fall = next ? p.fall + p.fallPerUnit * target : 0;
  let rise = prev ? p.rise + p.risePerUnit * bounce : 0;
  if (Number.isFinite(gap) && rise + fall > gap) {
    const k = gap / (rise + fall);
    rise *= k;
    fall *= k;
  }
  // with no time to wait, the rebound goes straight to the next stroke's height
  const peak = Number.isFinite(gap) && gap - rise - fall < 0.03 ? target : bounce;

  let lift: number;
  if (prev && since < rise) {
    const u = since / rise;
    lift = peak * (1 - (1 - u) * (1 - u));
  } else if (next && now > next.time - fall) {
    const v = clamp01((now - (next.time - fall)) / fall);
    lift = target * (1 - v * v);
  } else if (prev && next) {
    const lo = prev.time + rise;
    const hi = next.time - fall;
    if (p.prep === undefined) {
      lift = peak + (target - peak) * smoothstep(lo, hi, now);
    } else {
      // wait no higher than the next stroke wants, then lift for it just before the throw
      const up = Math.min(hi - lo, p.prep + (p.prepPerUnit ?? 0) * target);
      const hold = Math.min(peak, target);
      lift =
        now < hi - up
          ? peak + (hold - peak) * smoothstep(lo, hi - up, now)
          : hold + (target - hold) * smoothstep(hi - up, hi, now);
    }
  } else if (prev) {
    // nothing coming: settle from the rebound to where the stick waits
    lift = p.rest + (peak - p.rest) * Math.exp(-(since - rise) * 3);
  } else {
    lift = target;
  }

  let travel = 1;
  if (prev && next) {
    const end = next.time - fall * 0.5;
    const start = Math.max(prev.time + Math.min(0.02, gap * 0.1), end - 0.3);
    travel = smoothstep(start, end, now);
  } else if (prev) travel = 0;

  return { prev, next, lift: Math.max(0, lift), travel, since };
}

/**
 * How open the hats are at `now`, 0 closed to 1 fully open, from the hat
 * strokes and the foot's chicks in time order.
 *
 * An open note leaves the foot up; the next closed note or chick shuts it.
 * The foot lifts a moment before the open note (so the stick meets a cymbal
 * already apart) and closes a moment before the closing one.
 */
export function hatOpenAt(hatHits: readonly Hit[], now: number): number {
  const amount = (h: Hit | undefined) => (h?.hat === 'open' ? 1 : h?.hat === 'half' ? 0.4 : 0);
  const i = lastAtOrBefore(hatHits, now);
  const prev = i >= 0 ? hatHits[i] : undefined;
  const next = hatHits[i + 1];
  const here = amount(prev);
  if (!next) return here;
  const there = amount(next);
  const lead = there > here ? 0.05 : 0.06;
  return here + (there - here) * smoothstep(next.time - lead, next.time - 0.005, now);
}
