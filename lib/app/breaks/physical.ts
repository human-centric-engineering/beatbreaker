import { HAND_REST, LANE_PIECE, PIECES, type PieceId } from '@/lib/app/breaks/drummer/kit-layout';
import { FOOT_LANE, gracesOf, handLanes } from '@/lib/app/breaks/lanes';
import { stepSeconds } from '@/lib/app/breaks/meter';
import { meterOfPat, stickingAt } from '@/lib/app/breaks/pattern';
import { sectionBpm } from '@/lib/app/breaks/sections';
import { tupletLanes, tupletPos, tupletsIn } from '@/lib/app/breaks/tuplets';
import type { LaneKey, Pattern } from '@/lib/app/breaks/types';

/**
 * Whether two hands and two feet can play a pattern at a tempo: the body's
 * question, not the ear's.
 *
 * A song's bars are what a drummer played, so the only things that can rule
 * one out are a body's limits. Every note goes to a limb, and every way of
 * sharing the notes out is tried (a search over the whole pattern, looped, so
 * the last bar leads into the first), for one in which each limb can make
 * every stroke it is given in the time it has:
 *
 * - **a hand** strikes the same drum again after {@link HAND_DOUBLE} (a
 *   rebounded double), but keeps up no more than {@link HAND_RATE} strokes a
 *   second over three in a row; going to another piece costs
 *   {@link HAND_LIFT} plus the distance at {@link HAND_SPEED}. The ride and
 *   anything else out past {@link FAR} is played by the hand on its side
 *   only, and with both hands down at once, the arms cross only as far as a
 *   drummer's do (the other hand no further right than {@link CROSS_REACH});
 * - **a foot** plays a heel-toe double or triple at {@link FOOT_DOUBLE} and
 *   keeps up {@link FOOT_RATE} strokes a second over four, faster for a drummer
 *   who plays runs heel and toe; on a double pedal the hat foot takes kicks
 *   too, with {@link FOOT_SWITCH} to move between its pedals;
 * - **a flam or a drag** takes both hands, the grace a moment before.
 *
 * The figures are a working drummer's, not a record holder's: a pattern this
 * passes can be played by a good player at the tempo; one it fails cannot be
 * played as written by anyone with two hands and two feet.
 */

/** A hand on one drum, twice: a rebounded double, 32nds at 214. */
export const HAND_DOUBLE = 0.035;
/** One hand's strokes a second, held over three: sixteenths at 210 in one hand. */
export const HAND_RATE = 14;
/** What leaving one piece for another costs a hand before the travel, seconds. */
export const HAND_LIFT = 0.015;
/**
 * How fast a hand travels between pieces, metres a second: a fast arm, not a
 * flailing one. Set by the records: Carl Palmer's Tank ends a fill on the floor
 * tom and lands on the snare with the crash a sextuplet later, at 172.
 */
export const HAND_SPEED = 14;
/** Past this far out from the middle (metres), a piece is its own side's hand's alone. */
export const FAR = 0.55;
/** With both hands down, how far right of centre the crossed-under hand reaches. */
export const CROSS_REACH = 0.25;

/** A foot's heel-toe or slide double, or triple. */
export const FOOT_DOUBLE = 0.05;
/**
 * One foot's strokes a second, held over four (a triple is a burst): sixteenths
 * at 187. Set by the records: Bill Ward's four-note bursts on one pedal in
 * Symptom of the Universe, at 180.
 */
export const FOOT_RATE = 12.5;
/** The same, for a drummer who plays runs heel and toe on one pedal (`heelToe`, `singlePedalRuns`). */
export const FOOT_RATE_RUNS = 15;
/** The hat foot moving between the hat pedal and the double pedal's. */
export const FOOT_SWITCH = 0.12;

export interface LimbProblem {
  /** Bar index, 0-based. */
  bar: number;
  /** Grid step, or the step a tuplet note falls in. */
  step: number;
  limbs: 'hands' | 'feet';
  why: string;
}

type Side = 'lead' | 'other';

/** One stroke: when (seconds from the pattern's start), on what, and what it asks. */
interface Note {
  t: number;
  bar: number;
  step: number;
  lane: LaneKey;
  piece: PieceId;
  /** A flam or a drag: the other hand plays the grace. */
  grace: boolean;
  /** The hand written for it (D44), if any. */
  written?: Side;
}

/** The strokes at one instant. */
interface Slot {
  t: number;
  bar: number;
  step: number;
  notes: Note[];
}

/** A limb's last strokes: what it played last, and when it played the last three. */
interface Limb {
  piece: PieceId | null;
  t1: number;
  t2: number;
  t3: number;
}

const FREE: Limb = { piece: null, t1: -Infinity, t2: -Infinity, t3: -Infinity };

interface Problems {
  slot: Slot;
  why: string;
  prev: Problems | null;
}

interface State<K extends string> {
  limbs: Record<K, Limb>;
  cost: number;
  problems: Problems | null;
  count: number;
}

/** How many ways through the pattern are kept at each instant. */
const BEAM = 48;
/** The first, narrow look: most patterns have an easy way through, and one found is proof enough. */
const QUICK_BEAM = 4;

const distances = new Map<string, number>();

function distance(a: PieceId, b: PieceId): number {
  const key = `${a}|${b}`;
  let d = distances.get(key);
  if (d === undefined) {
    const [ax, ay, az] = PIECES[a].centre;
    const [bx, by, bz] = PIECES[b].centre;
    d = Math.hypot(ax - bx, ay - by, az - bz);
    distances.set(key, d);
  }
  return d;
}

/** Where a hand is reckoned to start: at rest, as the 3D drummer's do. */
function restingHands(): Record<Side, Limb> {
  return {
    lead: { ...FREE, piece: HAND_REST.lead },
    other: { ...FREE, piece: HAND_REST.other },
  };
}

/** The lead hand is the right-hand side's: the ride's. */
function reaches(side: Side, piece: PieceId): boolean {
  const x = PIECES[piece].centre[0];
  if (x > FAR) return side === 'lead';
  if (x < -FAR) return side === 'other';
  return true;
}

/** Why a limb cannot make a stroke on `piece` at `t`, or null. */
function handTooSlow(limb: Limb, piece: PieceId, t: number): string | null {
  if (limb.piece === null) return null;
  const gap = t - limb.t1;
  if (piece === limb.piece) {
    if (gap < HAND_DOUBLE) return 'one hand twice on a drum faster than a double';
  } else if (gap < HAND_LIFT + distance(limb.piece, piece) / HAND_SPEED) {
    return `no time for a hand to get from the ${limb.piece} to the ${piece}`;
  }
  if (t - limb.t2 < 2 / HAND_RATE) return 'one hand playing faster than a hand can';
  return null;
}

function struck(limb: Limb, piece: PieceId, t: number): Limb {
  return { piece, t1: t, t2: limb.t1, t3: limb.t2 };
}

/** Every stroke in a pattern, played twice through so the seam between its last bar and its first is heard. */
function notesOf(pat: Pattern, bpm0: number, lanes: readonly LaneKey[]): Note[] {
  const m = meterOfPat(pat);
  const step = stepSeconds(m, sectionBpm(bpm0, pat));
  const n = pat.bars[0]?.k.length ?? 0;
  const barLen = n * step;
  const out: Note[] = [];
  for (let pass = 0; pass < 2; pass++) {
    pat.bars.forEach((bar, bi) => {
      const t0 = (pass * pat.bars.length + bi) * barLen;
      const tuplets = tupletsIn(pat, bi);
      const push = (pos: number, lane: LaneKey, v: number) => {
        if (!v || !lanes.includes(lane)) return;
        const at = Math.floor(pos);
        const w = stickingAt(pat.sticking, bi, at);
        const note: Note = {
          t: t0 + pos * step,
          // the first pass is the lead-in: its notes are not the pattern's to report
          bar: pass ? bi : -1,
          step: at,
          lane,
          piece: LANE_PIECE[lane],
          grace: !!gracesOf(lane, v),
        };
        if (w) note.written = w.toUpperCase() === 'R' ? 'lead' : 'other';
        out.push(note);
      };
      for (const lane of lanes) {
        const row = bar[lane];
        if (!row) continue;
        for (let i = 0; i < n; i++) {
          // a tuplet owns its lanes' cells
          if (tuplets.some((s) => !!s.notes[lane] && i >= s.start && i < s.start + s.span))
            continue;
          push(i, lane, row[i] ?? 0);
        }
      }
      for (const s of tuplets)
        for (const lane of tupletLanes(s))
          s.notes[lane]?.forEach((v, j) => push(tupletPos(s, j), lane, v));
    });
  }
  return out.sort((a, b) => a.t - b.t);
}

function slotsOf(notes: Note[]): Slot[] {
  const slots: Slot[] = [];
  for (const note of notes) {
    const last = slots[slots.length - 1];
    if (last && Math.abs(last.t - note.t) < 1e-6) last.notes.push(note);
    else slots.push({ t: note.t, bar: note.bar, step: note.step, notes: [note] });
  }
  return slots;
}

type Options<K extends string> = (
  slot: Slot,
  limbs: Record<K, Limb>
) => Array<{ limbs: Record<K, Limb>; why: string | null; travel: number }>;

/** The cheapest way through, keeping `beam` of them at each instant. */
function search<K extends string>(
  slots: Slot[],
  start: Record<K, Limb>,
  options: Options<K>,
  beam: number
): Problems | null {
  let states: State<K>[] = [{ limbs: start, cost: 0, problems: null, count: 0 }];
  for (const slot of slots) {
    const next = new Map<string, State<K>>();
    for (const st of states) {
      for (const o of options(slot, st.limbs)) {
        // a problem in the lead-in costs nothing, so the pattern's own bars decide
        const counted = !!o.why && slot.bar >= 0;
        const cand: State<K> = {
          limbs: o.limbs,
          cost: st.cost + o.travel + (counted ? 1000 : 0),
          problems: counted ? { slot, why: o.why!, prev: st.problems } : st.problems,
          count: st.count + (counted ? 1 : 0),
        };
        let key = '';
        for (const l of Object.values<Limb>(o.limbs))
          key += `${l.piece}:${Math.round(l.t1 * 1e5)}:${Math.round(l.t2 * 1e5)}:${Math.round(l.t3 * 1e5)}|`;
        const seen = next.get(key);
        if (!seen || cand.cost < seen.cost) next.set(key, cand);
      }
    }
    states = [...next.values()].sort((a, b) => a.cost - b.cost).slice(0, beam);
  }
  return states[0]?.problems ?? null;
}

/** A narrow search first, and the wide one only where the narrow one found trouble. */
function searchWide<K extends string>(
  slots: Slot[],
  start: Record<K, Limb>,
  options: Options<K>
): Problems | null {
  if (!search(slots, start, options, QUICK_BEAM)) return null;
  return search(slots, start, options, BEAM);
}

/**
 * Whether every stroke is far enough from the one before (whatever limb took
 * it) that no limb can be hurried, and each instant can be shared out at all:
 * then there is nothing to search for. Most grooves at most tempos are.
 */
function roomy<K extends string>(
  slots: Slot[],
  gap: number,
  free: Record<K, Limb>,
  options: Options<K>
): boolean {
  for (let i = 1; i < slots.length; i++) if (slots[i].t - slots[i - 1].t < gap) return false;
  return slots.every((slot) => options(slot, free).some((o) => !o.why));
}

function listOf(p: Problems | null, limbs: LimbProblem['limbs']): LimbProblem[] {
  const out: LimbProblem[] = [];
  for (let q = p; q; q = q.prev)
    out.push({ bar: q.slot.bar, step: q.slot.step, limbs, why: q.why });
  return out.reverse();
}

/** Each way two hands can share a step's notes, and what each costs them. */
function handOptions(slot: Slot, hands: Record<Side, Limb>) {
  const notes = slot.notes;
  const out: Array<{ limbs: Record<Side, Limb>; why: string | null; travel: number }> = [];
  const graced = notes.find((n) => n.grace);
  /* Three things for two hands is the hands check's to name (and a flam with
     anything else, the grace check's): the search plays the first two, or the
     flam, and goes on past it. */
  const playing = graced ? [graced] : notes.slice(0, 2);
  const sides: Side[][] =
    playing.length === 1
      ? [['lead'], ['other']]
      : [
          ['lead', 'other'],
          ['other', 'lead'],
        ];
  for (const order of sides) {
    let why: string | null = null;
    let travel = 0;
    const limbs = { ...hands };
    playing.forEach((note, k) => {
      const side = order[k];
      if (!reaches(side, note.piece)) why ??= `the ${note.piece} is out of that hand's reach`;
      /* A step has one sticking letter: with both hands down it names one of
         them, and whichever it names, one hand is that hand. */
      if (note.written && note.written !== side && playing.length === 1)
        why ??= 'not the hand the sticking writes';
      why ??= handTooSlow(hands[side], note.piece, note.t);
      if (hands[side].piece) travel += distance(hands[side].piece, note.piece);
      limbs[side] = struck(hands[side], note.piece, note.t);
    });
    if (graced) {
      // the grace is the other hand's, on the same drum, a moment before
      const side: Side = order[0] === 'lead' ? 'other' : 'lead';
      why ??= handTooSlow(hands[side], graced.piece, graced.t);
      limbs[side] = struck(hands[side], graced.piece, graced.t);
    } else if (playing.length === 2) {
      const lead = playing[order.indexOf('lead')].piece;
      const oth = playing[order.indexOf('other')].piece;
      // crossed: the other hand right of the lead, reaching under it
      if (PIECES[oth].centre[0] > PIECES[lead].centre[0] && PIECES[oth].centre[0] > CROSS_REACH)
        why ??= 'the arms crossed further than they go';
    }
    out.push({ limbs, why, travel });
  }
  return out;
}

type FootSide = 'kickFoot' | 'hatFoot';

function footOptions(rate: number, doubleKick: boolean) {
  const tooSlow = (limb: Limb, piece: PieceId, t: number): string | null => {
    if (limb.piece === null) return null;
    const gap = t - limb.t1;
    const need = piece === limb.piece ? FOOT_DOUBLE : FOOT_SWITCH;
    if (gap < need) return 'a foot playing faster than a foot can';
    if (piece === limb.piece && t - limb.t3 < 3 / rate)
      return 'a foot playing faster than a foot can';
    return null;
  };
  return (slot: Slot, feet: Record<FootSide, Limb>) => {
    const kick = slot.notes.find((n) => n.lane === 'k');
    const chick = slot.notes.find((n) => n.lane === FOOT_LANE);
    const out: Array<{ limbs: Record<FootSide, Limb>; why: string | null; travel: number }> = [];
    // the hat pedal is its own piece for the hat foot, apart from the double pedal's board
    const HAT: PieceId = 'hat';
    const ways: Array<{ kick?: FootSide; chick?: FootSide }> = [];
    if (kick && chick) ways.push({ kick: 'kickFoot', chick: 'hatFoot' });
    else if (kick) {
      ways.push({ kick: 'kickFoot' });
      if (doubleKick) ways.push({ kick: 'hatFoot' });
    } else if (chick) ways.push({ chick: 'hatFoot' });
    for (const w of ways) {
      const limbs = { ...feet };
      let why: string | null = null;
      if (w.kick) {
        why ??= tooSlow(feet[w.kick], 'kick', kick!.t);
        limbs[w.kick] = struck(feet[w.kick], 'kick', kick!.t);
      }
      if (w.chick) {
        why ??= tooSlow(feet.hatFoot, HAT, chick!.t);
        limbs.hatFoot = struck(feet.hatFoot, HAT, chick!.t);
      }
      // the lead foot stays on the kick: the other one's kicks cost a little, so it takes them only when it must
      out.push({ limbs, why, travel: w.kick === 'hatFoot' ? 0.5 : 0 });
    }
    return out;
  };
}

/**
 * Where two hands and two feet cannot play `pat` at `bpm` (the break's tempo;
 * a section at a tempo ratio is played at its own), each place once. Empty
 * where they can.
 */
export function limbProblems(pat: Pattern, bpm: number): LimbProblem[] {
  if (!pat.bars.length) return [];
  const hands = handLanes(pat.perc);
  const handSlots = slotsOf(notesOf(pat, bpm, hands));
  const footSlots = slotsOf(notesOf(pat, bpm, ['k', FOOT_LANE]));
  const runs = !!(pat.attrs?.heelToe || pat.attrs?.singlePedalRuns);
  const doubleKick = !!pat.attrs?.doubleKick;
  const rate = runs ? FOOT_RATE_RUNS : FOOT_RATE;
  const feet = footOptions(rate, doubleKick);
  const pieces = [...new Set(handSlots.flatMap((s) => s.notes.map((n) => n.piece)))];
  const farthest = Math.max(0, ...pieces.flatMap((a) => pieces.map((b) => distance(a, b))));
  // a hand may strike at every instant, so two instants apart is its pair of strokes
  const handGap = Math.max(HAND_DOUBLE, 1 / HAND_RATE, HAND_LIFT + farthest / HAND_SPEED);
  const handTrouble = roomy<Side>(handSlots, handGap, { lead: FREE, other: FREE }, handOptions)
    ? null
    : searchWide<Side>(handSlots, restingHands(), handOptions);
  const footStart: Record<FootSide, Limb> = {
    kickFoot: { ...FREE, piece: 'kick' },
    hatFoot: { ...FREE, piece: 'hat' },
  };
  // each foot on its own pedal, a stroke every 1/rate, keeps up over any four
  const footTrouble = roomy<FootSide>(footSlots, Math.max(FOOT_DOUBLE, 1 / rate), footStart, feet)
    ? null
    : searchWide<FootSide>(footSlots, footStart, feet);
  return [...listOf(handTrouble, 'hands'), ...listOf(footTrouble, 'feet')];
}
