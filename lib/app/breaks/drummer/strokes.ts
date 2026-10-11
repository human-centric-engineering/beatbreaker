import { clamp01, smoothstep } from '@/lib/app/breaks/drummer/ease';
import {
  type Rebound,
  clickFlick,
  flight,
  flightTime,
  impactSpeed,
  reboundAt,
  restitution,
  simulate,
} from '@/lib/app/breaks/drummer/rebound';
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
  /**
   * A stick that bounces: its rebounds are simulated (`rebound.ts`) rather
   * than drawn, and the profile's `rebound` gives way to the head's own.
   */
  physics?: boolean;
  /** With `physics`, how much of every stroke the fingers play at least (the grip's). */
  fingers?: number;
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
  physics: true,
  fingers: 0.12,
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
  /**
   * How much of `lift` is the hand's turn at the wrist; the rest is the stick
   * turning in the fingers. All of it for a profile without a stick.
   */
  hand: number;
  /** 0–1: how closed the grip is on the stick, stopping a rebound. */
  grip: number;
  /** 0 at `prev`'s piece, 1 at `next`'s: how far across the kit the hand has come. */
  travel: number;
  /** Seconds since `prev` sounded (Infinity before the first). */
  since: number;
}

/**
 * Settling from the rebound's `peak` toward where the stick rests, `after`
 * seconds into it: eased in from the top, as a hand lets a stick down.
 */
function settled(p: StrokeProfile, peak: number, after: number): number {
  const k = 3 * Math.max(0, after);
  return p.rest + (peak - p.rest) * (1 + k) * Math.exp(-k);
}

export { smoothstep };

/** How far a slow stroke's rebound falls back before the next is prepared, and over what wait, seconds. */
const LOOP = 0.5;
const LOOP_ROOM = [0.1, 0.35] as const;

/** How long a stick takes to settle from a rebound let go too high to the next stroke's height, seconds. */
const SETTLE = 0.12;

/**
 * How long before the throw a waiting stick (or beater) comes up from where it
 * rests to the next stroke's height, seconds.
 */
const WAKE = 0.3;
/**
 * A gap this long, seconds, is waited out at rest: the stick settles as it does
 * with nothing coming and wakes for the next stroke. Shorter, it waits at the
 * next stroke's height; between, a mix. Past this, the next stroke may come into
 * view mid-gap or the last one drop out of memory, and both curves must agree.
 */
const LONG_GAP = [0.9, 1.2] as const;

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

/** The last stroke at or before `now`, by binary search over a time-ordered list. */
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

/** A stroke between two notes as planned: its heights and how long each part takes. */
interface Plan {
  prev: Hit | undefined;
  next: Hit | undefined;
  gap: number;
  /** The next note's height, as high as there is time for. */
  target: number;
  /** How high the rebound is let go, and how high it goes with no time to wait. */
  bounce: number;
  peak: number;
  rise: number;
  fall: number;
  /** The rise is the hand following a stick up, not the stick itself. */
  follows: boolean;
  /**
   * With a stick that bounces and the next note a long way off, the plan as if
   * nothing were coming: what a long wait is waited out as, so that the next
   * note coming into view changes nothing before the stick wakes for it.
   */
  idle?: Plan;
}

function heightOf(h: Hit, p: StrokeProfile): number {
  return p.height(h.strength) * (p.reach?.(h) ?? 1);
}

/** The highest a stick can get and back in a gap. */
function capOf(p: StrokeProfile, gap: number): number {
  return Number.isFinite(gap) ? p.speed * gap * 0.5 : Infinity;
}

/**
 * Plan the stroke from `prev` to `next`. `free` is how high the rebound off
 * `prev` would carry the stick on its own; without it, the profile's
 * `rebound` share of the stroke's height.
 */
function planOf(
  prev: Hit | undefined,
  next: Hit | undefined,
  p: StrokeProfile,
  free?: { height: number; speed: number }
): Plan {
  const gap = prev && next ? next.time - prev.time : Infinity;
  const cap = capOf(p, gap);
  const target = next ? Math.min(heightOf(next, p), cap) : p.rest;
  // a downstroke: a loud note going to a soft one is stopped low on the rebound, not let fly
  // (with nothing coming, a rebound is let come up no higher than the stroke came from)
  const own = prev && free && !next ? heightOf(prev, p) : Infinity;
  const loose = prev ? Math.min(free?.height ?? heightOf(prev, p) * p.rebound, cap, own) : target;
  const bounce = next ? Math.min(loose, target + p.stop) : loose;

  let fall = next ? p.fall + p.fallPerUnit * target : 0;
  // a stick that bounces comes up as fast as its rebound carries it, and the hand with it
  let rise = !prev
    ? 0
    : free
      ? Math.max(RISE_MIN, FOLLOW * flightTime(free.speed, bounce))
      : p.rise + p.risePerUnit * bounce;
  if (Number.isFinite(gap) && rise + fall > gap) {
    const k = gap / (rise + fall);
    rise *= k;
    fall *= k;
  }
  // with no time to wait, the rebound goes straight to the next stroke's height
  const peak = Number.isFinite(gap) && gap - rise - fall < 0.03 ? target : bounce;
  const idle = next && free && gap > LONG_GAP[0] ? planOf(prev, undefined, p, free) : undefined;
  return { prev, next, gap, target, bounce, peak, rise, fall, follows: free !== undefined, idle };
}

/** Where the plan has the tip at `now`. */
function liftOf(plan: Plan, now: number, p: StrokeProfile): number {
  const { prev, next, gap, target, peak, rise, fall } = plan;
  const since = prev ? now - prev.time : Infinity;
  // a long gap is waited out as if nothing were coming — the rebound and all — then the
  // stick wakes for the next note
  if (plan.idle && next && now <= next.time - fall) {
    const long = smoothstep(LONG_GAP[0], LONG_GAP[1], gap);
    const near = long < 1 ? liftOf({ ...plan, idle: undefined }, now, p) : 0;
    const far = liftOf(plan.idle, now, p);
    const hi = next.time - fall;
    const woken = far + (target - far) * smoothstep(hi - WAKE, hi, now);
    return near + (woken - near) * long;
  }
  let lift: number;
  if (prev && since < rise) {
    const u = since / rise;
    // (a hand following a stick up eases into it; a drawn rebound leaves the head at speed)
    lift = peak * (plan.follows ? smoothstep(0, 1, u) : 1 - (1 - u) * (1 - u));
  } else if (next && now > next.time - fall) {
    const v = clamp01((now - (next.time - fall)) / fall);
    lift = target * (1 - v * v);
  } else if (prev && next) {
    const lo = prev.time + rise;
    const hi = next.time - fall;
    let wait: number;
    if (p.prep === undefined) {
      wait = peak + (target - peak) * smoothstep(lo, hi, now);
    } else {
      // wait no higher than the next stroke wants, then lift for it just before the throw
      const up = Math.min(hi - lo, p.prep + (p.prepPerUnit ?? 0) * target);
      // (with little time to settle to it first, the lift starts from nearer the top of the
      // rebound; with plenty, the rebound makes its own loop and falls back before the hand
      // prepares the next stroke — Dahl's slow strokes)
      const room = hi - up - lo;
      const settle = Math.min(peak, target) * (1 - LOOP * smoothstep(...LOOP_ROOM, room));
      const hold = peak + (settle - peak) * smoothstep(0, SETTLE, room);
      wait =
        now < hi - up
          ? peak + (hold - peak) * smoothstep(lo, hi - up, now)
          : hold + (target - hold) * smoothstep(hi - up, hi, now);
    }
    // a long gap is waited out at rest, as if nothing were coming, then the stick wakes
    const long = smoothstep(LONG_GAP[0], LONG_GAP[1], gap);
    const idle = settled(p, peak, since - rise);
    const woken = idle + (target - idle) * smoothstep(hi - WAKE, hi, now);
    lift = wait + (woken - wait) * long;
  } else if (prev) {
    // nothing coming: settle from the rebound to where the stick waits
    lift = settled(p, peak, since - rise);
  } else if (next) {
    // nothing played yet (or long enough ago to be forgotten): up from rest for the first
    lift = p.rest + (target - p.rest) * smoothstep(next.time - fall - WAKE, next.time - fall, now);
  } else lift = p.rest;
  return Math.max(0, lift);
}

/**
 * How much of a stroke is the fingers', 0–1. A ghost note is played from an
 * inch, and that inch is the back fingers flicking the stick down onto the
 * head while the hand stays where it is; a backbeat is the wrist's. On the
 * ride the fingers do more of every stroke, and some grips more than others
 * (`base`).
 */
export function fingerShare(h: Hit | undefined, base = 0): number {
  if (!h || h.piece === 'sticks') return 0;
  return Math.max(LOOSE_FINGERS * ghostShare(h), base, h.piece === 'ride' ? LOOSE_RIDE : 0);
}

/**
 * How much of a ghost a note is, 0–1: all of it at a ghost's strength, none
 * at a backbeat's. Its stroke is the fingers' (`fingerShare`), and so is the
 * back fingers' flick through it (`pose.ts`).
 */
export function ghostShare(h: Hit | undefined): number {
  if (!h || h.piece === 'sticks') return 0;
  return 1 - smoothstep(FINGERS_ALL, FINGERS_NONE, h.strength);
}

/** A stroke this soft or softer is the fingers' alone, and one this hard or harder none of it. */
const FINGERS_ALL = 0.15;
const FINGERS_NONE = 0.4;
/** How much of a finger stroke is the stick turning in the fingers: the hand all but still. */
const LOOSE_FINGERS = 0.9;
/** On the ride, where the fingers do more. */
const LOOSE_RIDE = 0.35;

/**
 * How much of a stroke the fingers play for notes `gap` seconds apart: none
 * of it with time to spare, and nearly half for fast sixteenths, where the
 * wrist's turn shrinks to a few degrees and the fingers open and close on the
 * stick (`grip-research.md` §2.2).
 */
function quickFingers(gap: number): number {
  return QUICK_FINGERS * (1 - smoothstep(...QUICK_GAP, gap));
}
const QUICK_FINGERS = 0.45;
const QUICK_GAP = [0.1, 0.3] as const;

/**
 * How hard the grip closes on a rebound, 0–1, from how high the stroke just
 * played came from (`own`) against how high the next note wants the stick
 * (`wanted`): not at all for a stroke to one as high — a free stroke, the
 * stick let come back up — and fully for a loud one going to a soft one — a
 * downstroke, the stick stopped low.
 */
function tightness(own: number, wanted: number): number {
  return own > 0 ? 1 - smoothstep(0.35, 0.8, wanted / own) : 0;
}

/**
 * How much longer than the stick's flight the hand takes to come up after it:
 * the blow does not reach the hand (see `rebound.ts`), so the stick leaps
 * first and the hand follows it up.
 */
const FOLLOW = 1.4;
/** The quickest a rebound's rise is planned, seconds: a hand cannot turn about faster. */
const RISE_MIN = 0.03;

const SEGMENTS = new WeakMap<StrokeProfile, WeakMap<Hit, Map<string, Rebound>>>();

/** The rebound off `hits[i]`, simulated once and kept while the note is. */
function reboundOf(hits: readonly Hit[], i: number, j: number, p: StrokeProfile): Rebound {
  const prev = hits[i];
  const next: Hit | undefined = hits[j];
  const before: Hit | undefined = hits[strokeBefore(hits, i)];
  // a buzz's repeats: the stick bouncing off the press, between this note and the next
  const bounces = prev.press ? hits.slice(i + 1, j) : [];
  let byHit = SEGMENTS.get(p);
  if (!byHit) SEGMENTS.set(p, (byHit = new WeakMap()));
  let byKey = byHit.get(prev);
  if (!byKey) byHit.set(prev, (byKey = new Map<string, Rebound>()));
  const key = next
    ? `${next.time}|${next.step}|${next.strength}|${next.piece}|${next.contact}|${before?.time ?? '-'}`
    : `-|${before?.time ?? '-'}`;
  const pressKey = bounces.length ? `|${bounces.length}|${bounces[0].time}` : '';
  const kept = byKey.get(key + pressKey);
  if (kept) return kept;
  if (byKey.size > 8) byKey.clear();
  const r = simulated(prev, next, before, bounces, p);
  byKey.set(key + pressKey, r);
  return r;
}

/** Simulate the rebound off `prev`, `before` the stroke played before it. */
function simulated(
  prev: Hit,
  next: Hit | undefined,
  before: Hit | undefined,
  bounces: readonly Hit[],
  p: StrokeProfile
): Rebound {
  const base = p.fingers ?? 0;

  // how the note just played was thrown: from the height it was planned from
  const thrown = planOf(before, prev, p);
  const v0 = impactSpeed(thrown.target);
  const e = restitution(prev, v0);
  const free = { height: flight(e * v0), speed: e * v0 };
  if (bounces.length) return pressed(prev, next, bounces, v0, e, p);
  const plan = planOf(prev, next, p, free);
  // the closer the notes, the more of each is the fingers'
  const f0 = Math.max(fingerShare(prev, base), quickFingers(thrown.gap));
  const f1 = next ? Math.max(fingerShare(next, base), quickFingers(plan.gap)) : base;
  // how far the next note is past a long gap, and when the stick wakes for it
  const long = smoothstep(LONG_GAP[0], LONG_GAP[1], plan.gap);
  const wake = next ? next.time - plan.fall : Infinity;
  return simulate({
    t0: prev.time,
    v0,
    f0,
    e,
    plan: (t) => liftOf(plan, t, p),
    fingers: (t) => {
      // waiting out a long gap, the hand holds the stick as it would with nothing coming,
      // and takes it as the next note wants only as it wakes for it
      const wait = f1 + (base - f1) * long * (1 - smoothstep(wake - WAKE, wake, t));
      return f0 + (wait - f0) * smoothstep(prev.time, prev.time + plan.rise, t);
    },
    caught: prev.time + plan.rise,
    // (a downstroke is stopped for the note close behind it; one far off, the stick settles)
    tight: next ? tightness(thrown.target, plan.target + p.stop) * (1 - long) : 0,
    next: next && {
      t1: next.time,
      fall: plan.fall,
      v1: impactSpeed(plan.target),
      f1,
    },
  });
}

/**
 * A buzz: the stick thrown into the head and held pressed there, so it bounces
 * — three or four times, each lower — off the head and back down onto it under
 * the fingers' press, as the repeats sound. Pressed harder, the bounces come
 * quicker; the press is set so they come as often as the repeats do. Then it is
 * let go, and comes up for the next note from the head.
 */
function pressed(
  prev: Hit,
  next: Hit | undefined,
  bounces: readonly Hit[],
  v0: number,
  e: number,
  p: StrokeProfile
): Rebound {
  const period = bounces[0].time - prev.time;
  const until = bounces[bounces.length - 1].time + period / 2;
  // from where the press lets go: the stick on the head, nothing left of the blow
  const from: Hit = { ...prev, time: until, press: false };
  const plan = planOf(from, next, p, { height: 0, speed: 0 });
  const base = p.fingers ?? 0;
  const f1 = next ? Math.max(fingerShare(next, base), quickFingers(plan.gap)) : base;
  return simulate({
    t0: prev.time,
    v0,
    f0: PRESS_FINGERS,
    e,
    plan: (t) => (t < until ? 0 : liftOf(plan, t, p)),
    fingers: (t) => PRESS_FINGERS + (f1 - PRESS_FINGERS) * smoothstep(until, until + plan.rise, t),
    caught: until + plan.rise,
    tight: 0,
    press: { at: bounces.map((b) => b.time), until },
    next: next && { t1: next.time, fall: plan.fall, v1: impactSpeed(plan.target), f1 },
  });
}

/** How much of a buzz is the fingers': they press it; the hand stays down. */
const PRESS_FINGERS = 0.7;

/** The stroke played before `hits[i]`, past any buzz's repeats: its index, or -1. */
function strokeBefore(hits: readonly Hit[], i: number): number {
  let k = i - 1;
  while (k >= 0 && hits[k].bounce) k--;
  return k;
}

/**
 * Where one limb is at `now`, given its strokes in time order.
 *
 * Pure: it holds no state between frames, so a dropped frame or a seek lands
 * on the right pose rather than catching up to it. A profile with a stick
 * (`physics`) has its rebounds simulated (`rebound.ts`), each once, from the
 * note before; the rest follow the plan.
 */
export function strokeAt(hits: readonly Hit[], now: number, p: StrokeProfile): StrokeState {
  // a buzz's repeats are the stick bouncing, not strokes: the hand plays past them
  let i = lastAtOrBefore(hits, now);
  if (i >= 0 && hits[i].bounce) i = strokeBefore(hits, i);
  let j = i + 1;
  while (j < hits.length && hits[j].bounce) j++;
  const prev = i >= 0 ? hits[i] : undefined;
  const next: Hit | undefined = hits[j];

  if (!prev && !next) {
    return { prev, next, lift: p.rest, hand: p.rest, grip: 0, travel: 0, since: Infinity };
  }

  const since = prev ? now - prev.time : Infinity;
  let lift: number;
  let hand: number;
  let grip = 0;
  let fall: number;
  // (counting in, the sticks are clicked together held fixed: nothing bounces)
  if (p.physics && prev && prev.piece !== 'sticks' && next?.piece !== 'sticks') {
    const r = reboundOf(hits, i, j, p);
    ({ lift, hand, grip } = reboundAt(r, now));
    fall = r.spec.next?.fall ?? 0;
  } else {
    const plan = planOf(prev, next, p);
    lift = liftOf(plan, now, p);
    hand = lift * (1 - (p.physics ? fingerShare(next ?? prev, p.fingers) : 0));
    fall = plan.fall;
    // a stick clicked on the other rings in the fingers a moment: the arm does not
    if (p.physics && prev?.piece === 'sticks') {
      const speed = impactSpeed(planOf(hits[strokeBefore(hits, i)], prev, p).target);
      lift = Math.max(0, lift + clickFlick(speed, restitution(prev, speed), since));
    }
  }

  let travel = 1;
  if (prev && next) {
    const gap = next.time - prev.time;
    const end = next.time - fall * 0.5;
    const start = Math.max(prev.time + Math.min(0.02, gap * 0.1), end - 0.3);
    travel = smoothstep(start, end, now);
  } else if (prev) travel = 0;

  return { prev, next, lift, hand, grip, travel, since };
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
