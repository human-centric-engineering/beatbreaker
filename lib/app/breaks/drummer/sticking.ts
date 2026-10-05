import { gracesOf } from '@/lib/app/breaks/lanes';
import { type Hand, type Limb, LANE_PIECE, PIECES } from '@/lib/app/breaks/drummer/kit-layout';
import type { Bar, LaneKey } from '@/lib/app/breaks/types';

/**
 * Which limb plays each note of a bar, for the 3D drummer.
 *
 * The chart's sticking row says "cymbals right, drums left", which is the
 * groove and is what the ear needs. A body needs more: a run of sixteenths on
 * the snare is not played with one hand, a crash on top of a backbeat moves
 * the lead hand off the hats, and a flam needs the other hand for its grace.
 * The rules, in order:
 *
 * 1. The lead hand takes the loudest cymbal on the step (crash, then ride,
 *    then hat). A second cymbal goes to the other hand.
 * 2. Drums go to whichever hands are left. Two drums on one step: the drum
 *    further left to the other hand.
 * 3. One drum, both hands free: alternate from the last drum a hand played on
 *    the step before (a fill), otherwise the drum's own side of the kit. A
 *    piece out at the edge (the block beside the hats) is always its own
 *    side's: the other hand cannot reach it.
 * 4. A grace note is the hand that is not playing the note it decorates.
 *
 * It reads one bar at a time and only ever looks one step back inside it, so
 * the same bar always comes out the same — which is what lets the planner
 * forecast a bar it has not heard yet and agree with itself when it does.
 */

export type StepHands = Partial<Record<LaneKey, Limb>> & {
  /** The hand a flam's or drag's grace is played with, when the step has one. */
  grace?: Hand;
};

const CYMBALS: LaneKey[] = ['c', 'r', 'h'];
const DRUMS: LaneKey[] = ['s', 't1', 't2', 't3', 'p1', 'p2'];

/** Past this far out (metres), a piece is played by the hand on its side, whatever the alternation says. */
const FAR = 0.55;

function other(hand: Hand): Hand {
  return hand === 'lead' ? 'other' : 'lead';
}

function xOf(lane: LaneKey): number {
  return PIECES[LANE_PIECE[lane]].centre[0];
}

/** The hand a drum leans toward when nothing else decides: the floor tom and the high-right tom are the lead side. */
function sideOf(lane: LaneKey): Hand {
  return xOf(lane) > 0.1 ? 'lead' : 'other';
}

export function assignStep(bar: Bar, i: number, prev: StepHands | null): StepHands {
  const out: StepHands = {};
  if (bar.k[i]) out.k = 'kickFoot';
  if (bar.hf[i]) out.hf = 'hatFoot';

  const free = new Set<Hand>(['lead', 'other']);
  for (const lane of CYMBALS) {
    if (!bar[lane][i]) continue;
    const hand: Hand | undefined = free.has('lead')
      ? 'lead'
      : free.has('other')
        ? 'other'
        : undefined;
    if (!hand) break;
    out[lane] = hand;
    free.delete(hand);
  }

  const drums = DRUMS.filter((lane) => !!bar[lane][i]).sort((a, b) => xOf(a) - xOf(b));
  if (drums.length === 1 && free.size === 2) {
    const lane = drums[0];
    const lastDrumHand = prev ? lastDrum(prev) : undefined;
    // alternate through a fill, except onto a piece only its own side can reach
    const far = Math.abs(xOf(lane)) > FAR;
    out[lane] = lastDrumHand && !far ? other(lastDrumHand) : sideOf(lane);
  } else if (drums.length) {
    // left to right across the hands still free, the other hand taking the leftmost
    const hands = (['other', 'lead'] as const).filter((h) => free.has(h));
    if (hands.length === 1) {
      // one hand for several drums: it plays the snare if the snare is one of them
      out[drums.includes('s') ? 's' : drums[0]] = hands[0];
    } else if (hands.length === 2) {
      drums.slice(0, 2).forEach((lane, n) => (out[lane] = n === 0 ? 'other' : 'lead'));
    }
  }

  for (const lane of DRUMS) {
    const hand = out[lane];
    if (hand && hand !== 'kickFoot' && hand !== 'hatFoot' && gracesOf(lane, bar[lane][i])) {
      out.grace = other(hand);
    }
  }
  return out;
}

function lastDrum(step: StepHands): Hand | undefined {
  for (const lane of DRUMS) {
    const hand = step[lane];
    if (hand === 'lead' || hand === 'other') return hand;
  }
  return undefined;
}

const cache = new WeakMap<Bar, StepHands[]>();

/** Every step of a bar, assigned once and remembered for as long as the bar object lives. */
export function assignBar(bar: Bar): StepHands[] {
  const hit = cache.get(bar);
  if (hit) return hit;
  const out: StepHands[] = [];
  const n = bar.k.length;
  for (let i = 0; i < n; i++) out.push(assignStep(bar, i, i ? out[i - 1] : null));
  cache.set(bar, out);
  return out;
}
