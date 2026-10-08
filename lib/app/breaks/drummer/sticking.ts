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
 * way through the whole bar — not step by step, so a step can cost a little
 * more to save more later — counting:
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
 * - **sticking** — through a fill, a lone drum goes to the hand that did not
 *   play the drum on the step before, unless a double (a paradiddle's RLRR)
 *   keeps the arms from crossing; three in a row, hardly ever;
 * - **tangle** — through a fill, the hands left crossed on two drums: the
 *   hand going the way the fill goes leads it, right going right and left
 *   coming back.
 *
 * A run of sixteenth hats goes hand to hand, R L R L on the steps, and
 * whatever else lands on a step — the backbeat, a ghost, the crash — is played
 * by the hand whose go it is, the hats left out there: R L R L, R on the
 * snare, L R L. At every tempo: slowing a pattern down to learn it should not
 * change how it is played.
 *
 * Two things a drummer drops rather than contort for: percussion on a step
 * where the lead hand is keeping time on the hats or ride (the hand stays on
 * its cymbal), and the hats under a tom fill on the lead side (the fill lifts
 * the lead hand off them; a lone tom under the hats splits the hands
 * instead). Both still sound; they are just not mimed.
 *
 * A piece out at the edge (the block beside the hats) is only ever its own
 * side's: the other hand cannot reach it. A cross-stick is always the other
 * hand's, never the lead's: it is played with that hand resting on the snare,
 * which the lead hand, over on the hats or the ride, cannot do — and it always
 * gets that hand, a cymbal dropped from the step rather than the cross-stick.
 * Through a bar with cross-sticks in it the other hand stays down on the
 * snare: the lead hand keeps the hats to itself however fast they are, and
 * takes the toms, the other hand coming off the snare for one only to break
 * up a long run or when two land at once. A grace note is the hand that is not
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

/**
 * Through a fill, what a lone drum costs on the hand that played the drum
 * before it: a double is a little dearer than alternating, three in a row a
 * lot dearer. Cheap enough that a double — a paradiddle's — wins when
 * alternating would leave the arms crossed.
 */
const DOUBLE = 0.85;
const TRIPLE = 2.5;
/** What a metre of the lead hand left of the other costs, both on drums, through a fill. */
const TANGLE = 4;
/**
 * Through a bar with cross-sticks in it, what it costs the other hand to come
 * off the snare for anything else: dearer than the lead hand playing a drum
 * twice running, cheaper than it playing one three times running.
 */
const STAY_ON_SNARE = 2;

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

/** Whether `hand` can get to `lane` at all: a piece out at the edge is only its own side's. */
function reaches(hand: Hand, lane: LaneKey): boolean {
  const x = xOf(lane);
  return Math.abs(x) <= FAR || x > 0 === (hand === 'lead');
}

/** What it costs `hand` to play `lane` from where it is. */
function costOf(
  hand: Hand,
  lane: LaneKey,
  at: HandsAt,
  idle: Readonly<Record<Hand, number>>,
  stay = false
): number {
  if (!reaches(hand, lane)) return Infinity;
  // set down on the snare for the cross-sticks, the other hand stays there
  const off = stay && hand === 'other' && lane !== 's' ? STAY_ON_SNARE : 0;
  const x = xOf(lane);
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
  return cost + off;
}

/** What it costs to have the lead hand at `leadX` and the other at `otherX` at once. */
function crossing(leadX: number, otherX: number): number {
  const cross = otherX - leadX;
  if (cross <= 0) return 0;
  return 0.5 * cross + (cross > CROSS_OK ? 3 : 0);
}

const DRUM_PIECES = new Set(DRUMS.map((lane) => LANE_PIECE[lane]));

/**
 * Through a fill, what it costs to leave the hands crossed on the drums: the
 * lead hand on a drum left of the one the other hand is on, both of them
 * there now or a step ago. Crossed on a cymbal and a drum is how time is kept
 * (the stick on the hats rides above the one on the snare); crossed on two
 * drums the arms are at one height and in each other's way.
 */
function tangle(at: HandsAt, idle: Readonly<Record<Hand, number>>): number {
  if (idle.lead > 1 || idle.other > 1) return 0;
  if (!DRUM_PIECES.has(at.lead) || !DRUM_PIECES.has(at.other)) return 0;
  return TANGLE * Math.max(0, centreOf(at.other)[0] - centreOf(at.lead)[0]);
}

/** The hand that played a run of lone drums in a row, and how many. */
interface Run {
  hand: Hand;
  length: number;
}

/** Where the hands are going into a step, and what they have just been doing. */
interface HandsState {
  at: HandsAt;
  /** Steps each hand has been free. */
  idle: Record<Hand, number>;
  /** Steps since a time-keeping cymbal: past FILL_AFTER, the hands are in a fill. */
  since: number;
  run?: Run;
  /** A bar with cross-sticks in it: the other hand stays down on the snare. */
  stay?: boolean;
}

/**
 * The notes of a step the hands play, in the order they are handed out:
 * cymbals before drums, the snare first of those, then left to right — and
 * at most two.
 */
function handNotes(bar: Bar, i: number): LaneKey[] {
  let cymbals = CYMBALS.filter((lane) => !!bar[lane][i]);
  // a cross-stick always gets a hand, the other one: with it, whichever other note comes
  // first that the lead hand can reach — one out at the other hand's edge is dropped
  if (bar.s[i] === CROSS_STICK) {
    const rest = DRUMS.filter((lane) => lane !== 's' && !!bar[lane][i]).sort(
      (a, b) => xOf(a) - xOf(b)
    );
    const lead = [...cymbals, ...rest].find((lane) => reaches('lead', lane));
    return lead ? [lead, 's'] : ['s'];
  }
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
  return [...cymbals, ...drums].slice(0, 2);
}

/**
 * Hand to hand, one hand plays the step: whatever is not the hats if there is
 * anything — the backbeat, a ghost, the crash — and the hats otherwise.
 */
function turnNote(bar: Bar, i: number): LaneKey | undefined {
  const cymbals = CYMBALS.filter((lane) => lane !== 'h' && !!bar[lane][i]);
  const drums = DRUMS.filter((lane) => !!bar[lane][i]).sort((a, b) =>
    a === 's' ? -1 : b === 's' ? 1 : xOf(a) - xOf(b)
  );
  return [...cymbals, ...drums, ...(bar.h[i] ? (['h'] as const) : [])][0];
}

/** The feet, and the grace hand for whatever the hands were given. */
function finish(bar: Bar, i: number, hands: StepHands): StepHands {
  const out: StepHands = {};
  if (bar.k[i]) out.k = 'kickFoot';
  if (bar.hf[i]) out.hf = 'hatFoot';
  Object.assign(out, hands);
  const busy = new Set(Object.values(hands));
  for (const lane of DRUMS) {
    const hand = out[lane];
    if (hand !== 'lead' && hand !== 'other') continue;
    if (gracesOf(lane, bar[lane][i]) && !busy.has(other(hand))) out.grace = other(hand);
  }
  return out;
}

/** The snare's cross-stick value. */
const CROSS_STICK = 4;

/** Whether a bar has cross-sticks in it. */
function crossBar(bar: Bar): boolean {
  return bar.s.some((v) => v === CROSS_STICK);
}

/** The ways a step's notes can be shared between the hands; `turn` says hand to hand, and whose go it is. */
function choices(bar: Bar, i: number, turn?: Hand): StepHands[] {
  const lane = turn && turnNote(bar, i);
  // (a piece out at the edge stays its own side's, whoever's go it is; so does a cross-stick)
  const cross = bar.s[i] === CROSS_STICK;
  if (turn && (!lane || (reaches(turn, lane) && !(cross && lane === 's' && turn === 'lead'))))
    return [finish(bar, i, lane ? { [lane]: turn } : {})];
  const notes = handNotes(bar, i);
  const ways: StepHands[] = [];
  if (notes.length === 1) {
    const [lane] = notes;
    ways.push({ [lane]: 'lead' }, { [lane]: 'other' });
  } else if (notes.length === 2) {
    const [a, b] = notes;
    ways.push({ [a]: 'lead', [b]: 'other' }, { [a]: 'other', [b]: 'lead' });
  } else ways.push({});
  // never the lead hand's, whatever else that costs
  const allowed = cross ? ways.filter((w) => w.s !== 'lead') : ways;
  return allowed.map((w) => finish(bar, i, w));
}

/** The lanes the hands play in a step, and with which hand. */
function handed(step: StepHands): [LaneKey, Hand][] {
  return [...CYMBALS, ...DRUMS].flatMap((lane) => {
    const hand = step[lane];
    return hand === 'lead' || hand === 'other' ? [[lane, hand] as [LaneKey, Hand]] : [];
  });
}

/**
 * What a way of playing a step costs from where the hands are: each note's
 * own cost, two notes at once crossing the arms, and — through a fill — a
 * lone drum on the hand that just played one, and the hands left crossed on
 * the drums.
 */
function stepCost(step: StepHands, state: HandsState): number {
  const notes = handed(step);
  let cost = 0;
  for (const [lane, hand] of notes) cost += costOf(hand, lane, state.at, state.idle, state.stay);
  if (notes.length === 2) {
    const leadLane = notes.find(([, hand]) => hand === 'lead')![0];
    const otherLane = notes.find(([, hand]) => hand === 'other')![0];
    cost += crossing(xOf(leadLane), xOf(otherLane));
  }
  // in a groove the lead hand is keeping time, and the other hand plays the snare's
  // doubles and ghosts itself: the sticking only counts through a fill
  if (state.since < FILL_AFTER) return cost;
  if (notes.length === 1 && DRUMS.includes(notes[0][0]) && state.run?.hand === notes[0][1])
    cost += state.run.length >= 2 ? TRIPLE : DOUBLE;
  const next = advance(step, state);
  return cost + tangle(next.at, next.idle);
}

/** Where the hands are after a step: on what they just played, or where they were. */
function after(step: StepHands, at: HandsAt): HandsAt {
  const next = { ...at };
  for (const [lane, hand] of handed(step)) next[hand] = LANE_PIECE[lane];
  return next;
}

/** Whether the lead hand kept time on a step: a hat or ride under it. */
function keptTime(step: StepHands | null): boolean {
  return !!step && (!!step.h || !!step.r);
}

/** The state the hands are in once a step has been played. */
function advance(step: StepHands, state: HandsState): HandsState {
  const played = new Set(Object.values(step));
  const idle = { ...state.idle };
  for (const hand of ['lead', 'other'] as const) idle[hand] = played.has(hand) ? 0 : idle[hand] + 1;
  const drum = lastDrum(step);
  const run = !drum
    ? undefined
    : state.run?.hand === drum
      ? { hand: drum, length: state.run.length + 1 }
      : { hand: drum, length: 1 };
  return {
    at: after(step, state.at),
    idle,
    since: keptTime(step) ? 0 : state.since + 1,
    run,
    stay: state.stay,
  };
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

/**
 * One step on its own: the cheapest way to play it from where the hands are,
 * knowing only the step before — no looking ahead. `assignBar` weighs a whole
 * bar at once, so a step there can cost a little more to save more later.
 */
export function assignStep(
  bar: Bar,
  i: number,
  prev: StepHands | null,
  at: HandsAt = HAND_REST,
  keeping = false,
  idle: Readonly<Record<Hand, number>> = idleAfter(prev)
): StepHands {
  const drum = prev ? lastDrum(prev) : undefined;
  const state: HandsState = {
    at,
    idle: { ...idle },
    since: keeping ? 0 : FILL_AFTER,
    run: drum ? { hand: drum, length: 1 } : undefined,
    stay: crossBar(bar),
  };
  let best: StepHands = {};
  let least = Infinity;
  for (const step of choices(bar, i)) {
    const cost = stepCost(step, state);
    if (cost < least) [best, least] = [step, cost];
  }
  return best;
}

/** The fewest hat steps in a row that go hand to hand. */
const HAND_TO_HAND_RUN = 4;

/**
 * Whose go it is on each step a run of hats goes hand to hand: the lead hand
 * on the even steps, the other on the odd, whatever lands there. A step with
 * no hats between two with them (the backbeat written without its hat) stays
 * in the run when the hats either side are sixteenths — eighth hats with
 * ghosts between them are a groove, the lead hand on the hats.
 */
function handToHand(bar: Bar, together: boolean): (Hand | undefined)[] {
  const n = bar.k.length;
  const turns: (Hand | undefined)[] = Array<Hand | undefined>(n).fill(undefined);
  if (!together) return turns;
  const hat = (i: number) => i >= 0 && i < n && !!bar.h[i];
  const inRun = (i: number) =>
    hat(i) || (hat(i - 1) && hat(i + 1) && (hat(i - 2) || hat(i + 2)) && !!turnNote(bar, i));
  for (let i = 0; i < n;) {
    if (!inRun(i)) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && inRun(j)) j++;
    if (j - i >= HAND_TO_HAND_RUN)
      for (let k = i; k < j; k++) turns[k] = k % 2 === 0 ? 'lead' : 'other';
    i = j;
  }
  return turns;
}

function stateKey(s: HandsState): string {
  const run = s.run ? `${s.run.hand}${Math.min(s.run.length, 2)}` : '-';
  return [
    s.at.lead,
    s.at.other,
    Math.min(s.idle.lead, TRAVEL.length),
    Math.min(s.idle.other, TRAVEL.length),
    Math.min(s.since, FILL_AFTER),
    run,
  ].join('|');
}

/**
 * The cheapest way through a whole bar: every way of sharing out each step,
 * kept per state the hands could be in after it, and the best of them at the
 * end. Weighing the bar at once is what lets a fill play a double — or a
 * paradiddle — to keep the arms from crossing a step or two later.
 */
function assign(bar: Bar, prev: StepHands | null, from: HandsAt, kept: number): StepHands[] {
  // the other hand set down on the snare for the cross-sticks does not come up for the hats
  const stay = crossBar(bar);
  const turns = handToHand(bar, !stay);
  const drum = prev ? lastDrum(prev) : undefined;
  let paths = new Map<string, { state: HandsState; cost: number; steps: StepHands[] }>();
  const start: HandsState = {
    at: from,
    idle: idleAfter(prev),
    since: kept,
    run: drum ? { hand: drum, length: 1 } : undefined,
    stay,
  };
  paths.set(stateKey(start), { state: start, cost: 0, steps: [] });
  for (let i = 0; i < bar.k.length; i++) {
    const options = choices(bar, i, turns[i]);
    const next = new Map<string, { state: HandsState; cost: number; steps: StepHands[] }>();
    for (const { state, cost, steps } of paths.values()) {
      for (const step of options) {
        const total = cost + stepCost(step, state);
        if (total === Infinity) continue;
        const then = advance(step, state);
        const key = stateKey(then);
        const seen = next.get(key);
        if (!seen || total < seen.cost)
          next.set(key, { state: then, cost: total, steps: [...steps, step] });
      }
    }
    paths = next;
  }
  let best: StepHands[] = [];
  let least = Infinity;
  for (const { cost, steps } of paths.values()) if (cost < least) [best, least] = [steps, cost];
  return best;
}

/** Steps since the last time-keeping cymbal at the end of a bar. */
function keptAtEnd(steps: StepHands[]): number {
  for (let k = 0; k < steps.length; k++) if (keptTime(steps[steps.length - 1 - k])) return k;
  return steps.length;
}

const cache = new WeakMap<Bar, StepHands[]>();
const following = new WeakMap<Bar, WeakMap<Bar, StepHands[]>>();

/**
 * Every step of a bar, assigned once and remembered for as long as the bar
 * objects live.
 *
 * With `before` (the bar played just before it), the bar starts with the hands
 * where that bar left them — so a fill that ends on the lead hand leaves the
 * other one to take the crash. `before` itself is read from rest, which keeps
 * it to one bar of memory: the forecast of the next bar and the bar itself,
 * when it comes, see the same pair and agree. The tempo has no say: a
 * pattern slowed down to be learned is played the way it is at speed.
 */
export function assignBar(bar: Bar, before?: Bar | null): StepHands[] {
  if (before) {
    let byBefore = following.get(bar);
    if (!byBefore) following.set(bar, (byBefore = new WeakMap()));
    const hit = byBefore.get(before);
    if (hit) return hit;
    const lead = assignBar(before, null);
    let at: HandsAt = HAND_REST;
    for (const step of lead) at = after(step, at);
    const out = assign(bar, lead[lead.length - 1] ?? null, at, keptAtEnd(lead));
    byBefore.set(before, out);
    return out;
  }
  const hit = cache.get(bar);
  if (hit) return hit;
  const out = assign(bar, null, HAND_REST, FILL_AFTER);
  cache.set(bar, out);
  return out;
}
