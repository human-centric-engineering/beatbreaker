import { gracesOf } from '@/lib/app/breaks/lanes';
import {
  HAND_REST,
  type Hand,
  type Limb,
  LANE_PIECE,
  type PieceId,
  PIECES,
} from '@/lib/app/breaks/drummer/kit-layout';
import type { Bar, LaneKey } from '@/lib/app/breaks/types';

/**
 * Which limb plays each note of a bar, for the 3D drummer.
 *
 * The chart's sticking row says "cymbals right, drums left", which is the
 * groove and is what the ear needs. A body needs more: a run of sixteenths on
 * the snare is not played with one hand, a crash after a ride pattern is
 * nearer the left hand than the right, and a flam needs the other hand for
 * its grace.
 *
 * Which notes the hands play comes first: cymbals before drums (crash, then
 * ride, then hat), then the snare, then the other drums left to right; two
 * hands play at most two of them. Which hand takes which is then the cheapest
 * of the ways to share them out, counting:
 *
 * - **travel** — how far each hand has to go from the piece it last played:
 *   dear for a hand that played on the step before, cheap for one that has
 *   been free long enough to get back where it wants to be;
 * - **side** — each hand keeps to its own side of the kit; the other hand
 *   working out past the middle of the lead side (under the lead arm) costs
 *   more again. The lead hand crosses over for the hats and the crash;
 * - **crossing** — the lead hand left of the other one. A little is how a
 *   right-handed player keeps time (the lead hand over on the hats, the other
 *   on the snare); more than that tangles the arms, and is all but ruled out;
 * - **habit** — the lead hand keeps time on cymbals, and the other hand lives
 *   on the snare;
 * - **alternation** — through a fill, a lone drum goes to the hand that did
 *   not play the drum on the step before.
 *
 * Two things a drummer drops rather than contort for: percussion on a step
 * where the lead hand is keeping time on the hats or ride (the hand stays on
 * its cymbal), and the hats under a tom fill on the lead side (the fill lifts
 * the lead hand off them; a lone tom under the hats splits the hands instead). Both still sound; they are just not mimed.
 *
 * A piece out at the edge (the block beside the hats) is only ever its own
 * side's: the other hand cannot reach it. A grace note is the hand that is not
 * playing the note it decorates, when that hand is free.
 *
 * It reads a bar from where the bar before it left the hands (or from rest),
 * so the same pair of bars always comes out the same — which is what lets the
 * planner forecast a bar it has not heard yet and agree with itself when it
 * does.
 */

export type StepHands = Partial<Record<LaneKey, Limb>> & {
  /** The hand a flam's or drag's grace is played with, when the step has one. */
  grace?: Hand;
};

/** The piece each hand last played. */
export type HandsAt = Record<Hand, PieceId>;

const CYMBALS: LaneKey[] = ['c', 'r', 'h'];
const DRUMS: LaneKey[] = ['s', 't1', 't2', 't3', 'p1', 'p2'];
const PERCUSSION: LaneKey[] = ['p1', 'p2'];
const TOMS: LaneKey[] = ['t1', 't2', 't3'];

/** Past this far out (metres), a piece is played by the hand on its side, whatever else says. */
const FAR = 0.55;
/** How far right of centre the other hand goes before it is reaching under the lead arm. */
const OTHER_REACH = 0.25;
/** How far the lead hand sits left of the other before the arms tangle, metres. */
const CROSS_OK = 0.4;
/** What a metre of travel costs a hand free for 0, 1, and 2 or more steps. */
const TRAVEL = [1.5, 0.8, 0.35];

/** How much the lead hand wants the hats and ride, and the other hand the snare. */
const HABIT_TIME = 0.6;
const HABIT_SNARE = 0.4;
/** How many steps without a time-keeping cymbal before the hands are in a fill. */
const FILL_AFTER = 2;

/** How much a lone drum leans to the hand that did not just play a drum. */
const ALTERNATE = 0.85;

function other(hand: Hand): Hand {
  return hand === 'lead' ? 'other' : 'lead';
}

function centreOf(piece: PieceId): readonly number[] {
  return PIECES[piece].centre;
}

function xOf(lane: LaneKey): number {
  return centreOf(LANE_PIECE[lane])[0];
}

function apart(a: PieceId, b: PieceId): number {
  const [ax, ay, az] = centreOf(a);
  const [bx, by, bz] = centreOf(b);
  return Math.hypot(ax - bx, ay - by, az - bz);
}

/** What it costs `hand` to play `lane` from where it is. */
function costOf(
  hand: Hand,
  lane: LaneKey,
  at: HandsAt,
  lastDrumHand: Hand | undefined,
  idle: Readonly<Record<Hand, number>>
): number {
  const x = xOf(lane);
  if (Math.abs(x) > FAR && x > 0 !== (hand === 'lead')) return Infinity;
  const cymbal = CYMBALS.includes(lane);
  // a hand still coming off the step before has no time to go far; one that has
  // been free a while has had time to get back where it wants to be
  let cost = TRAVEL[Math.min(idle[hand], TRAVEL.length - 1)] * apart(at[hand], LANE_PIECE[lane]);
  // each hand keeps to its own side: the lead hand crosses over for the hats and the
  // crash, the other hand reaches the floor tom in a fill but not the ride
  if (hand === 'other') {
    cost += cymbal
      ? 1.2 * Math.max(0, x) + 2 * Math.max(0, x - OTHER_REACH)
      : 0.7 * Math.max(0, x) + 0.8 * Math.max(0, x - 0.3);
  } else if (!cymbal) cost += 0.6 * Math.max(0, -0.1 - x);
  else cost += 2 * Math.max(0, -0.45 - x);
  // the roles: on a right-handed kit the lead hand keeps time on the hats or the
  // ride and the other hand plays the snare. Strong enough that a hand which has
  // wandered goes back to its job rather than the two staying swapped
  if (hand === 'lead' && (lane === 'h' || lane === 'r')) cost -= HABIT_TIME;
  else if (hand === 'lead' && cymbal) cost -= 0.15;
  if (hand === 'other' && lane === 's') cost -= HABIT_SNARE;
  if (lastDrumHand && DRUMS.includes(lane) && hand !== lastDrumHand) cost -= ALTERNATE;
  return cost;
}

/** What it costs to have the lead hand at `leadX` and the other at `otherX` at once. */
function crossing(leadX: number, otherX: number): number {
  const cross = otherX - leadX;
  if (cross <= 0) return 0;
  return 0.5 * cross + (cross > CROSS_OK ? 3 : 0);
}

export function assignStep(
  bar: Bar,
  i: number,
  prev: StepHands | null,
  at: HandsAt = HAND_REST,
  keeping = false,
  idle: Readonly<Record<Hand, number>> = idleAfter(prev)
): StepHands {
  const out: StepHands = {};
  if (bar.k[i]) out.k = 'kickFoot';
  if (bar.hf[i]) out.hf = 'hatFoot';

  let cymbals = CYMBALS.filter((lane) => !!bar[lane][i]);
  const keepsTime = cymbals.includes('h') || cymbals.includes('r');
  const drums = DRUMS.filter((lane) => !!bar[lane][i])
    // percussion on the kit is played when it does not take the time-keeping hand off its cymbal
    .filter((lane) => !keepsTime || !PERCUSSION.includes(lane))
    .sort((a, b) => (a === 's' ? -1 : b === 's' ? 1 : xOf(a) - xOf(b)));
  // a fill onto the toms on the lead side lifts the lead hand off the hats, rather
  // than handing the hats to the other hand across the body
  const tomAt = (j: number) => TOMS.some((l) => !!bar[l][j]);
  const inFill = tomAt(i - 1) || tomAt(i + 1);
  const lead = drums[0];
  if (
    inFill &&
    cymbals.length === 1 &&
    cymbals[0] === 'h' &&
    lead &&
    TOMS.includes(lead) &&
    xOf(lead) > 0.1
  ) {
    cymbals = [];
  }
  const notes = [...cymbals, ...drums].slice(0, 2);
  // a lone drum alternates only in a fill: in a groove the lead hand is keeping
  // time, and the other hand plays the snare's doubles and ghosts itself
  const lastDrumHand = prev && !keeping ? lastDrum(prev) : undefined;
  const cost = (hand: Hand, lane: LaneKey, alternate: boolean) =>
    costOf(hand, lane, at, alternate ? lastDrumHand : undefined, idle);

  if (notes.length === 1) {
    const [lane] = notes;
    // alternation only counts here: a lone drum with both hands free is a fill
    const lead = cost('lead', lane, true);
    const oth = cost('other', lane, true);
    out[lane] = lead <= oth ? 'lead' : 'other';
  } else if (notes.length === 2) {
    const [a, b] = notes;
    const straight = cost('lead', a, false) + cost('other', b, false) + crossing(xOf(a), xOf(b));
    const swapped = cost('other', a, false) + cost('lead', b, false) + crossing(xOf(b), xOf(a));
    out[a] = straight <= swapped ? 'lead' : 'other';
    out[b] = other(out[a]);
  }

  const busy = new Set(notes.map((lane) => out[lane]));
  for (const lane of DRUMS) {
    const hand = out[lane];
    if (hand !== 'lead' && hand !== 'other') continue;
    if (gracesOf(lane, bar[lane][i]) && !busy.has(other(hand))) out.grace = other(hand);
  }
  return out;
}

/** How many steps each hand has been free, knowing only the step before. */
function idleAfter(prev: StepHands | null): Record<Hand, number> {
  const played = new Set(prev ? Object.values(prev) : []);
  return { lead: played.has('lead') ? 0 : 1, other: played.has('other') ? 0 : 1 };
}

function lastDrum(step: StepHands): Hand | undefined {
  for (const lane of DRUMS) {
    const hand = step[lane];
    if (hand === 'lead' || hand === 'other') return hand;
  }
  return undefined;
}

/** Where the hands are after a step: on what they just played, or where they were. */
function after(step: StepHands, at: HandsAt): HandsAt {
  const next = { ...at };
  for (const lane of [...CYMBALS, ...DRUMS]) {
    const hand = step[lane];
    if (hand === 'lead' || hand === 'other') next[hand] = LANE_PIECE[lane];
  }
  return next;
}

/** Whether the lead hand kept time on a step: a hat or ride under it. */
function keptTime(step: StepHands | null): boolean {
  return !!step && (!!step.h || !!step.r);
}

function assign(
  bar: Bar,
  prev: StepHands | null,
  from: HandsAt,
  kept: number,
  fast: boolean
): StepHands[] {
  const out: StepHands[] = [];
  let at = from;
  // steps since a time-keeping cymbal: past FILL_AFTER, the hands are in a fill
  let since = kept;
  const idle = idleAfter(prev);
  for (let i = 0; i < bar.k.length; i++) {
    const before = i ? out[i - 1] : prev;
    const step = assignStep(bar, i, before, at, since < FILL_AFTER, { ...idle });
    // hats too fast for one hand go hand to hand, when the other hand is free for it
    if (
      fast &&
      step.h === 'lead' &&
      before?.h === 'lead' &&
      !Object.values(step).includes('other')
    ) {
      step.h = 'other';
    }
    out.push(step);
    at = after(step, at);
    since = keptTime(step) ? 0 : since + 1;
    const played = new Set(Object.values(step));
    for (const hand of ['lead', 'other'] as const)
      idle[hand] = played.has(hand) ? 0 : idle[hand] + 1;
  }
  return out;
}

/** Steps since the last time-keeping cymbal at the end of a bar. */
function keptAtEnd(steps: StepHands[]): number {
  for (let k = 0; k < steps.length; k++) if (keptTime(steps[steps.length - 1 - k])) return k;
  return steps.length;
}

const caches = [new WeakMap<Bar, StepHands[]>(), new WeakMap<Bar, StepHands[]>()];
const followings = [
  new WeakMap<Bar, WeakMap<Bar, StepHands[]>>(),
  new WeakMap<Bar, WeakMap<Bar, StepHands[]>>(),
];

/**
 * Every step of a bar, assigned once and remembered for as long as the bar
 * objects live.
 *
 * With `before` (the bar played just before it), the bar starts with the hands
 * where that bar left them — so a fill that ends on the lead hand leaves the
 * other one to take the crash. `before` itself is read from rest, which keeps
 * it to one bar of memory: the forecast of the next bar and the bar itself,
 * when it comes, see the same pair and agree.
 *
 * `fast` is the tempo's say: sixteenths quicker than one hand plays
 * comfortably (see `FAST_STEP`), where a run of hats goes hand to hand.
 */
export function assignBar(bar: Bar, before?: Bar | null, fast = false): StepHands[] {
  const k = fast ? 1 : 0;
  if (before) {
    let byBefore = followings[k].get(bar);
    if (!byBefore) followings[k].set(bar, (byBefore = new WeakMap()));
    const hit = byBefore.get(before);
    if (hit) return hit;
    const lead = assignBar(before, null, fast);
    let at: HandsAt = HAND_REST;
    for (const step of lead) at = after(step, at);
    const out = assign(bar, lead[lead.length - 1] ?? null, at, keptAtEnd(lead), fast);
    byBefore.set(before, out);
    return out;
  }
  const hit = caches[k].get(bar);
  if (hit) return hit;
  const out = assign(bar, null, HAND_REST, FILL_AFTER, fast);
  caches[k].set(bar, out);
  return out;
}

/** The longest a step can be, seconds, and still be too fast for one hand on the hats: 8.5 a second. */
export const FAST_STEP = 1 / 8.5;
