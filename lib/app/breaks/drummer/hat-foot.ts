import { type FootStance, seedOf } from '@/lib/app/breaks/drummer/kick-foot';
import { lastAtOrBefore, smoothstep } from '@/lib/app/breaks/drummer/strokes';
import type { Hit } from '@/lib/app/breaks/drummer/timeline';
import { makeRng } from '@/lib/app/breaks/rng';

/**
 * The hi-hat foot (experiment: the drummer view).
 *
 * The hat foot spends most of its time doing nothing you can hear: holding the
 * pedal down so the stick plays closed hats. How a drummer does the rest:
 *
 * - **holding closed** — the forefoot keeps the pedal pressed. With the groove
 *   going, the heel rocks to the pulse: up between beats, tapping down on
 *   each, the toe never letting the hats apart.
 * - **a foot chick** — the toe comes up only just before the note (a tenth
 *   of a second or so) and snaps down on it, usually heel-down from the ankle.
 *   A loud chick with room around it is often stomped instead: the leg lifts,
 *   heel up, and drops through the ball of the foot.
 * - **opening** — the toe eases off, heel on the plate, just before the open
 *   note (that part is `hatOpenAt`, in `strokes.ts`).
 *
 * Pure: a function of the chicks, the time and the pulse.
 */

/** The longest the toe is up before a chick, seconds. */
const CHICK_WINDOW = 0.13;
/** A chick wants this much room either side of it to be stomped. */
const STOMP_ROOM = 0.35;

/** Heel on the plate, ball on the pedal: a foot's length up the board. */
export const HAT_HEEL_DOWN: FootStance = { slide: 0.62, pitch: 0.02, swivel: 0, drive: 0 };
/** A stomp: heel up, the leg lifting into it. */
const HAT_STOMP: FootStance = { slide: 0.68, pitch: 0.26, swivel: 0.05, drive: 0.45 };
/** How high the heel rocks between beats, radians of foot pitch. */
const ROCK = 0.16;

/** Whether a chick is stomped: loud, with room either side, and a seeded roll. */
export function isStomp(chicks: readonly Hit[], i: number): boolean {
  const h = chicks[i];
  const before = i > 0 ? h.time - chicks[i - 1].time : Infinity;
  const after = i < chicks.length - 1 ? chicks[i + 1].time - h.time : Infinity;
  if (h.strength < 0.45 || before < STOMP_ROOM || after < STOMP_ROOM) return false;
  return makeRng(seedOf(h) ^ 0x27d4eb2f)() < 0.45;
}

function windowBefore(chicks: readonly Hit[], i: number): number {
  const gap = i > 0 ? chicks[i].time - chicks[i - 1].time : Infinity;
  return Math.min(CHICK_WINDOW * (isStomp(chicks, i) ? 1.6 : 1), gap * 0.6);
}

export interface HatFoot {
  /** How far the pedal is up for a chick, 0 pressed to 1 the toe right up. */
  lift: number;
  stance: FootStance;
}

/**
 * The hat foot at `now`, given its chicks in time order, the beat's phase
 * (0 on the pulse), how much the body grooves, and how open the stick notes
 * want the hats (0–1).
 */
export function hatFootAt(
  chicks: readonly Hit[],
  now: number,
  phase: number,
  groove: number,
  open: number
): HatFoot {
  const i = lastAtOrBefore(chicks, now);
  const prev = i >= 0 ? chicks[i] : undefined;
  const next = chicks[i + 1];

  let lift = 0;
  // 0–1: how much this moment belongs to a chick rather than to holding closed
  let busy = 0;
  let stomp = false;
  if (next) {
    const w = windowBefore(chicks, i + 1);
    const start = next.time - w;
    if (now > start) {
      const u = (now - start) / w;
      const height = 0.45 + 0.45 * next.strength;
      // up quickly, then down accelerating so it is moving fastest as the hats meet
      lift = u < 0.45 ? height * smoothstep(0, 0.45, u) : height * (1 - ((u - 0.45) / 0.55) ** 2);
    }
    busy = smoothstep(start - 0.08, start, now);
    stomp = isStomp(chicks, i + 1) && now > start - 0.12;
  }
  if (prev) {
    const since = now - prev.time;
    // the pedal kicks back up a little off the chick and settles
    lift = Math.max(lift, 0.12 * prev.strength * Math.sin(Math.min(1, since / 0.07) * Math.PI));
    busy = Math.max(busy, 1 - smoothstep(0.05, 0.2, since));
    if (isStomp(chicks, i) && since < 0.3) stomp = true;
  }

  // holding closed: the heel rocks with the pulse, down on the beat
  const rock = ROCK * groove * (0.5 - 0.5 * Math.cos(2 * Math.PI * phase));
  const free = (1 - busy) * (1 - Math.min(1, open * 3));
  const base = stomp ? HAT_STOMP : HAT_HEEL_DOWN;
  return {
    lift,
    stance: {
      ...base,
      pitch: base.pitch + base.drive * lift + rock * free,
    },
  };
}
