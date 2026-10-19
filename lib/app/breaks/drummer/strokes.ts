import { clamp01, smoothstep } from '@/lib/app/breaks/drummer/ease';
import {
  type Rebound,
  clickFlick,
  fadeOf,
  flight,
  flightTime,
  impactSpeed,
  reboundAt,
  restitution,
  simulate,
  wristLead,
} from '@/lib/app/breaks/drummer/rebound';
import type { Hit, Level } from '@/lib/app/breaks/drummer/timeline';
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
   * And in a style hit as heavily as it gets (a note's `weight` of 1): the
   * stroke between is the two mixed by the weight. Without it, the weight
   * changes nothing.
   */
  heavy?: (strength: number) => number;
  /** How much faster than `speed` the heaviest style's strokes climb, as a share. */
  heavySpeed?: number;
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
  /**
   * With `physics`, how much of the rebound between strokes the fingers keep at
   * least (the grip's): the stick left up in them rather than the hand turned.
   * They let it go for the throw, which is always the wrist's (`THROWN`).
   */
  fingers?: number;
  /**
   * With `physics`, how much of the rebound the fingers keep by where the note
   * coming falls in the beat (its `level`): none before the beat, which the
   * wrist lifts for, more before an off-beat, most before a sixteenth — a tap
   * off the rebound. A matched grip's; traditional's stroke is the forearm's
   * turn wherever it falls.
   */
  offbeat?: Readonly<Record<Level, number>>;
  /** How much taller a stroke is played for where it falls in the beat, as a share (`pulseOf`). */
  pulse?: Readonly<Record<Level, number>>;
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
  // a metal drummer plays a plain backbeat from about where a light player plays an accent,
  // and an accent from near forty centimetres, the forearm brought up behind it
  heavy: (s) => 0.015 + 0.38 * s,
  heavySpeed: 0.8,
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
  offbeat: { 0: 0, 1: 0.3, 2: 0.5 },
  pulse: { 0: 0.3, 1: -0.1, 2: -0.2 },
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
  const light = p.height(h.strength);
  const w = h.weight ?? 0;
  const height = p.heavy && w > 0 ? light + (p.heavy(h.strength) - light) * w : light;
  return height * (p.reach?.(h) ?? 1) * pulseOf(h, p);
}

/**
 * How much taller a stroke is for where it falls in the beat: a drummer keeping
 * time plays the beat as a downstroke from up high, the wrist and forearm
 * throwing it, and the notes between as taps off its rebound (the Moeller
 * motion on the hats: Chad Smith's "the arm going down with each quarter
 * note, playing the 'an' on the upstroke"). Never a ghost's inch, which
 * stays an inch wherever it falls, nor an accent, already played tall.
 */
function pulseOf(h: Hit, p: StrokeProfile): number {
  if (h.level === undefined || !p.pulse) return 1;
  return 1 + p.pulse[h.level] * (1 - ghostShare(h)) * (1 - smoothstep(...PULSE_TO, h.strength));
}
/** The strokes the pulse shapes: none past an accent's strength, which is already played tall. */
const PULSE_TO = [0.65, 0.9] as const;

/** The highest a stick can get and back in a gap, on the way to `next`: a heavy hitter's arm is quicker. */
function capOf(p: StrokeProfile, gap: number, next?: Hit): number {
  const speed = p.speed * (1 + (p.heavySpeed ?? 0) * (next?.weight ?? 0));
  return Number.isFinite(gap) ? speed * gap * 0.5 : Infinity;
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
  const cap = capOf(p, gap, next ?? prev);
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

/** How long the plan's fall onto `next` from `prev` takes, seconds: the throw. */
export function fallOf(prev: Hit, next: Hit, p: StrokeProfile): number {
  return planOf(prev, next, p).fall;
}

/**
 * Where the plan has the tip at `now`. (`waitOnly`: a long gap's wait as if it
 * were a short one, unblended with the rest it is waited out at — the idle
 * plan blends it, once.)
 */
function liftOf(plan: Plan, now: number, p: StrokeProfile, waitOnly = false): number {
  const { prev, next, gap, target, peak, rise, fall } = plan;
  const since = prev ? now - prev.time : Infinity;
  // a long gap is waited out as if nothing were coming — the rebound and all — then the
  // stick wakes for the next note
  if (plan.idle && next && now <= next.time - fall) {
    const long = smoothstep(LONG_GAP[0], LONG_GAP[1], gap);
    const near = long < 1 ? liftOf({ ...plan, idle: undefined }, now, p, true) : 0;
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
    const long = waitOnly ? 0 : smoothstep(LONG_GAP[0], LONG_GAP[1], gap);
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
 * How much of the rebound on the way to `h` the fingers keep with a hand of
 * profile `p`, `gap` seconds after the stroke before it: a ghost's inch, the
 * grip's own share, the ride's, the share where it falls in the beat
 * (`p.offbeat`) or the share fast notes take, whichever is most. A heavy style
 * lifts all but the ghosts with the wrist and arm, the fingers only holding on.
 * Either way the throw onto it is the wrist's (`THROWN`).
 */
function fingersOf(h: Hit | undefined, p: StrokeProfile, gap: number): number {
  const base = p.fingers ?? 0;
  if (!h) return base;
  if (h.piece === 'sticks') return 0;
  const placed = h.level === undefined ? 0 : (p.offbeat?.[h.level] ?? 0);
  // (fast or not, the beat itself is the wrist's more than the notes between)
  const quick = quickFingers(gap) * (p.offbeat && h.level === 0 ? QUICK_ON_BEAT : 1);
  const own = Math.max(fingerShare(h, base), placed, quick);
  const ghost = LOOSE_FINGERS * ghostShare(h);
  return Math.max(ghost, own * (1 - HEAVY_FINGERS * (h.weight ?? 0)));
}
/** How much of the fast notes' finger share a note on the beat keeps, in a matched grip. */
const QUICK_ON_BEAT = 0.5;
/** How much less of a stroke the fingers play in the heaviest style. */
const HEAVY_FINGERS = 0.65;

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
    ? `${next.time}|${next.step}|${next.strength}|${next.piece}|${next.contact}|${next.level ?? 0}|${next.weight ?? 0}|${before?.time ?? '-'}`
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
  // how much of the rebound the fingers keep: the closer the notes, and the further from the
  // beat, the more of it. Never the throw, which is the wrist's (`letGo`)
  const kept = next ? fingersOf(next, p, plan.gap) : base;
  // how far the next note is past a long gap, and when the stick wakes for it
  const long = smoothstep(LONG_GAP[0], LONG_GAP[1], plan.gap);
  const wake = next ? next.time - plan.fall : Infinity;
  const gone = letGo(prev.time + plan.rise, next ? wake - wristLead(plan.gap) : Infinity);
  // (a note too close behind for the wrist to throw again is the fingers' pull on the rebound)
  const pull = pullOf(plan.gap);
  return simulate({
    t0: prev.time,
    v0,
    f0: fingersOf(prev, p, thrown.gap) * pullOf(thrown.gap),
    e,
    fade: fadeOf(prev),
    plan: (t) => liftOf(plan, t, p),
    fingers: (t) => {
      // waiting out a long gap, the hand holds the stick as it would with nothing coming,
      // and takes it as the next note wants only as it wakes for it
      const wait = kept + (base - kept) * long * (1 - smoothstep(wake - WAKE, wake, t));
      return wait * smoothstep(prev.time, prev.time + plan.rise, t) * (1 - gone(t) * (1 - pull));
    },
    caught: prev.time + plan.rise,
    // (a downstroke is stopped for the note close behind it; one far off, the stick settles)
    tight: next ? tightness(thrown.target, plan.target + p.stop) * (1 - long) : 0,
    next: next && {
      t1: next.time,
      fall: plan.fall,
      v1: impactSpeed(plan.target),
      f1: kept * pull,
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
  const kept = next ? fingersOf(next, p, plan.gap) : base;
  const wake = next ? next.time - plan.fall : Infinity;
  const gone = letGo(until + plan.rise, next ? wake - wristLead(plan.gap) : Infinity);
  return simulate({
    t0: prev.time,
    v0,
    f0: PRESS_FINGERS,
    e,
    plan: (t) => (t < until ? 0 : liftOf(plan, t, p)),
    fingers: (t) =>
      (PRESS_FINGERS + (kept - PRESS_FINGERS) * smoothstep(until, until + plan.rise, t)) *
      (1 - gone(t) * (1 - pullOf(plan.gap))),
    caught: until + plan.rise,
    tight: 0,
    press: { at: bounces.map((b) => b.time), until },
    next: next && {
      t1: next.time,
      fall: plan.fall,
      v1: impactSpeed(plan.target),
      f1: kept * pullOf(plan.gap),
    },
  });
}

/**
 * How much of the rebound the fingers keep through the throw onto a note
 * `gap` seconds after the last, 0–1. A stroke is started by the wrist (and,
 * for a big one, the forearm ahead of it), the stick lagging and then whipped
 * through (Dahl 2011: "the movement is initiated from the wrist"): the fingers
 * never throw a raised stick. What they do is keep the rebound — let the stick
 * fly up in them, catch it, and on fast notes hold it there so the wrist need
 * only turn a little — and they let go of it for the throw (`letGo`), the hand
 * coming up to meet the stick. Only a note too close behind for the wrist to
 * throw again is played on the rebound itself: the second of a fast double,
 * the fingers closing on a stick already on its way up (push-pull's pull).
 */
function pullOf(gap: number): number {
  return 1 - smoothstep(...PULL_GAP, gap);
}
const PULL_GAP = [0.12, 0.2] as const;

/**
 * How far the fingers have let go of the rebound they kept, 0–1, at `t`: all
 * of it a moment before `by` (the wrist starts the throw), so the hand has
 * come up to the stick and is still as it starts down — over `FINGERS_OUT`,
 * from once the hand has caught the stick up (`from`) if there is time for
 * it, and from before then if not.
 */
function letGo(from: number, by: number): (t: number) => number {
  if (!Number.isFinite(by)) return () => 0;
  const end = by - FINGERS_STILL;
  const start = Math.min(end - FINGERS_OUT, Math.max(from, end - 2 * FINGERS_OUT));
  return (t) => smoothstep(start, end, t);
}
const FINGERS_OUT = 0.08;
const FINGERS_STILL = 0.03;

/** How long a stroke takes to ease over to a note just scheduled from its forecast, seconds. */
const HEARD_BLEND = 0.06;

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
  const j = strokeAfter(hits, now);
  const next: Hit | undefined = hits[j];
  // the note coming was just scheduled, a little off its forecast: ease over from the stroke
  // that was being played toward it to the one it now wants
  if (next?.forecast && next.heard !== undefined && now < next.heard + HEARD_BLEND) {
    const u = smoothstep(next.heard, next.heard + HEARD_BLEND, now);
    const a = strokeOf(forecastIn(hits, j, next.forecast), now, p);
    const b = strokeOf(hits, now, p);
    const mix = (x: number, y: number) => x + (y - x) * u;
    return {
      ...b,
      lift: mix(a.lift, b.lift),
      hand: mix(a.hand, b.hand),
      grip: mix(a.grip, b.grip),
      travel: mix(a.travel, b.travel),
    };
  }
  return strokeOf(hits, now, p);
}

/** The index of the stroke after `now`, past any buzz's repeats. */
function strokeAfter(hits: readonly Hit[], now: number): number {
  let j = lastAtOrBefore(hits, now) + 1;
  while (j < hits.length && hits[j].bounce) j++;
  return j;
}

/**
 * The strokes with `hits[j]` put back as it was forecast (`was`), in time order: the
 * forecast is on the grid, and with swing or feel it can fall the other side
 * of a neighbour. Kept per note, so a frame does not copy the strokes again.
 */
function forecastIn(hits: readonly Hit[], j: number, was: Hit): readonly Hit[] {
  const h = hits[j];
  const kept = FORECAST_IN.get(h);
  if (kept?.from === hits) return kept.hits;
  const out = hits.filter((_, k) => k !== j);
  out.splice(lastAtOrBefore(out, was.time) + 1, 0, was);
  FORECAST_IN.set(h, { from: hits, hits: out });
  return out;
}
const FORECAST_IN = new WeakMap<Hit, { from: readonly Hit[]; hits: readonly Hit[] }>();

/** `strokeAt`, without easing over from a forecast. */
function strokeOf(hits: readonly Hit[], now: number, p: StrokeProfile): StrokeState {
  // a buzz's repeats are the stick bouncing, not strokes: the hand plays past them
  let i = lastAtOrBefore(hits, now);
  if (i >= 0 && hits[i].bounce) i = strokeBefore(hits, i);
  const j = strokeAfter(hits, now);
  const next: Hit | undefined = hits[j];
  const prev = i >= 0 ? hits[i] : undefined;

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
    // (the hand lifts the stick it throws: nothing has bounced into the fingers to keep)
    hand = lift;
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

/** How far apart a wash's hats are, 0 shut to 1 fully open: loosely shut, just touching. */
const WASH = 0.12;

/**
 * How open the hats are at `now`, 0 closed to 1 fully open, from the hat
 * strokes and the foot's chicks in time order.
 *
 * An open note leaves the foot up; the next closed note or chick shuts it.
 * The foot lifts a moment before the open note (so the stick meets a cymbal
 * already apart) and closes a moment before the closing one.
 *
 * A wash — open notes one after another, nothing shutting the hats between —
 * is not played with the foot off the pedal: it rests there, the hats loosely
 * shut and sloshing against each other (the skank beat, a rock chorus). Only
 * a lone open note, shut again by the next, opens them all the way.
 */
export function hatOpenAt(hatHits: readonly Hit[], now: number): number {
  const loose = (h: Hit | undefined) => h?.hat === 'open' || h?.hat === 'half';
  const amount = (k: number) => {
    const h = hatHits[k];
    if (!loose(h)) return 0;
    if (loose(hatHits[k - 1]) || loose(hatHits[k + 1])) return WASH;
    return h.hat === 'open' ? 1 : 0.4;
  };
  const i = lastAtOrBefore(hatHits, now);
  const next = hatHits[i + 1];
  const here = i >= 0 ? amount(i) : 0;
  if (!next) return here;
  const there = amount(i + 1);
  const lead = there > here ? 0.05 : 0.06;
  return here + (there - here) * smoothstep(next.time - lead, next.time - 0.005, now);
}
