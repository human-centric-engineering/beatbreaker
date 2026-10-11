import { smoothstep } from '@/lib/app/breaks/drummer/ease';
import { type KickNote, RUN_GAP, kickPlan } from '@/lib/app/breaks/drummer/kick-foot';
import { KICK_PEDAL } from '@/lib/app/breaks/drummer/kit-layout';
import { hermite, restitution } from '@/lib/app/breaks/drummer/rebound';
import {
  KICK,
  type StrokeState,
  fallOf,
  lastAtOrBefore,
  seedOf,
  strokeAt,
} from '@/lib/app/breaks/drummer/strokes';
import type { Hit } from '@/lib/app/breaks/drummer/timeline';
import { makeRng } from '@/lib/app/breaks/rng';

/**
 * The kick pedal bouncing under a foot (experiment: the drummer view).
 *
 * Board and beater are one sprung piece: the pedal's spring pushes the board
 * up and the beater back, the head throws the beater back at its restitution,
 * and the foot can only push down. So what the foot does after the note is
 * what the beater does:
 *
 * - **Buried.** The foot stays down on the board, and the beater stays on the
 *   head — a dead stroke, the everyday rock kick played heel up.
 * - **Let off.** The foot comes up and the beater bounces back off the head
 *   ahead of it, the spring carrying the board up under the foot — a soft
 *   heel-down note, or the first of a double, whose second is played off the
 *   rebound.
 *
 * Units are the planner's (`KICK` in `strokes.ts`): 0 the beater on the head,
 * 1 the board fully up. The foot's own motion is the planner's curve; the
 * pedal is simulated against it between notes, once each, and thrown onto the
 * next note on time. Pure, as the planner is: a function of the notes and the
 * time.
 */

/** The beater's reach, metres per unit: its shaft, swung 0.95 rad over the board's travel. */
const REACH = KICK_PEDAL.beater * 0.95;
/** Where the spring holds the board with no foot on it: fully up. */
const SPRUNG = 1;
/** The spring, rad/s: the board back up from the head in about a tenth of a second. */
const SPRING = 2 * Math.PI * 3;
const SPRING_DAMP = 0.15;
/** The foot on the board: stiff, and soft enough not to ring. */
const FOOT = 2 * Math.PI * 25;
const FOOT_DAMP = 0.7;
/** How long a buried beater is held on the head before the foot lets it up, seconds at most. */
const BURY_HOLD = 0.18;
/** How often a loud lone heel-up note is buried rather than let off. */
const BURY_ODDS = 0.65;
/** How loud a note is buried at all: below it, the beater is let off. */
const BURY_FROM = 0.6;

const STEP = 0.001;
const SUB = 2;
const DT = STEP / SUB;
/** With nothing coming, how long a rebound is simulated before the foot's curve alone is followed, seconds. */
const SIM_MAX = 1;
/** The last stretch of it over which it hands over to the foot's curve, seconds. */
const HANDOVER = 0.2;

/** Does the foot keep the beater on the head after this note? */
export function buries(hit: Hit, note: KickNote | undefined, next: Hit | undefined): boolean {
  // a run goes on: the rebound plays the next note
  if (next && next.step - hit.step <= RUN_GAP) return false;
  if (note?.technique !== 'heelUp' || hit.strength < BURY_FROM) return false;
  return makeRng(seedOf(hit) ^ 0x2545f491)() < BURY_ODDS;
}

interface Pedal {
  start: number;
  lift: Float32Array;
}

const PEDALS = new WeakMap<Hit, Map<string, Pedal>>();

/**
 * Where the kick pedal is at `now`, from the foot's notes in time order: the
 * planner's state, with `lift` the board and beater as they bounce, and `hand`
 * where the foot means them to be.
 */
export function beaterAt(
  hits: readonly Hit[],
  now: number,
  plan: readonly KickNote[] = kickPlan(hits)
): StrokeState {
  const st = strokeAt(hits, now, KICK);
  const i = lastAtOrBefore(hits, now);
  if (i < 0) return { ...st, hand: st.lift };
  const pedal = pedalOf(hits, i, plan);
  const foot = footAt(hits, i, plan, now);
  const x = (now - pedal.start) / STEP;
  const k = Math.floor(x);
  if (k >= pedal.lift.length - 1) return { ...st, lift: foot, hand: foot };
  const u = x - k;
  let lift = pedal.lift[k] + (pedal.lift[k + 1] - pedal.lift[k]) * u;
  // nothing coming: hand over to the foot as the simulated stretch ends
  if (!hits[i + 1])
    lift += (foot - lift) * smoothstep(SIM_MAX - HANDOVER, SIM_MAX, now - pedal.start);
  return { ...st, lift: Math.max(0, lift), hand: foot };
}

/** Where the foot means the board to be at `now`, after `hits[i]`: down on a buried note a while. */
function footAt(hits: readonly Hit[], i: number, plan: readonly KickNote[], now: number): number {
  const prev = hits[i];
  const next: Hit | undefined = hits[i + 1];
  const curve = strokeAt(hits, now, KICK).lift;
  if (!buries(prev, plan[i], next)) return curve;
  // held down, then let up — and never past the time the next note needs to be prepared
  const hold = Math.min(BURY_HOLD, next ? (next.time - prev.time) * 0.4 : BURY_HOLD);
  return curve * smoothstep(prev.time + hold * 0.6, prev.time + hold, now);
}

/** The pedal after `hits[i]`, simulated once and kept while the note is. */
function pedalOf(hits: readonly Hit[], i: number, plan: readonly KickNote[]): Pedal {
  const prev = hits[i];
  const next: Hit | undefined = hits[i + 1];
  const before: Hit | undefined = hits[i - 1];
  let byKey = PEDALS.get(prev);
  if (!byKey) PEDALS.set(prev, (byKey = new Map<string, Pedal>()));
  const key = `${next?.time ?? '-'}|${next?.strength ?? '-'}|${before?.time ?? '-'}|${plan[i]?.technique}`;
  const kept = byKey.get(key);
  if (kept) return kept;
  if (byKey.size > 8) byKey.clear();
  const made = simulate(hits, i, plan);
  byKey.set(key, made);
  return made;
}

/** The speed the beater met the head at `hits[i]` with, units/s: the planner's throw. */
function speedInto(hits: readonly Hit[], i: number): number {
  const at = hits[i].time;
  const h = 0.002;
  return Math.max(
    0,
    (strokeAt(hits, at - h, KICK).lift - strokeAt(hits, at - 1e-6, KICK).lift) / h
  );
}

function simulate(hits: readonly Hit[], i: number, plan: readonly KickNote[]): Pedal {
  const prev = hits[i];
  const next: Hit | undefined = hits[i + 1];
  const t0 = prev.time;
  // (with a note coming, all the way to it, the throw and all)
  const end = next ? next.time : t0 + SIM_MAX;
  const count = Math.max(2, Math.ceil((end - t0) / STEP) + 1);
  const lift = new Float32Array(count);
  const v0 = speedInto(hits, i);
  const e = restitution(prev, v0 * REACH);
  const v1 = next ? speedInto(hits, i + 1) : 0;
  // the throw onto the next note: from when the foot starts down for it
  const tThrow = next ? Math.max(t0, next.time - fallOf(prev, next, KICK)) : Infinity;
  let x = 0;
  let v = e * v0;
  let from: { x: number; v: number } | undefined;
  for (let k = 0; k < count; k++) {
    lift[k] = x;
    for (let j = 0; j < SUB; j++) {
      const t = t0 + k * STEP + j * DT;
      if (next && t >= tThrow) {
        // the foot drives it in: from where it is to the head as the note sounds
        from ??= { x, v };
        const T = next.time - tThrow;
        const h = hermite(from.x, from.v, 0, -v1, T, Math.min(T, t + DT - tThrow));
        // (and never above the foot pushing it down)
        x = Math.min(h.x, footAt(hits, i, plan, t + DT));
        v = h.v;
        continue;
      }
      const foot = footAt(hits, i, plan, t);
      // the spring up; the foot, only ever down onto the board
      let a = SPRING * SPRING * (SPRUNG - x) - 2 * SPRING_DAMP * SPRING * v;
      if (x > foot) a += -FOOT * FOOT * (x - foot) - 2 * FOOT_DAMP * FOOT * v;
      v += a * DT;
      x += v * DT;
      // the head: a beater driven back onto it bounces again
      if (x < 0 && v < 0) {
        x = 0;
        v = -restitution(prev, -v * REACH) * v;
      }
    }
  }
  return { start: t0, lift };
}
