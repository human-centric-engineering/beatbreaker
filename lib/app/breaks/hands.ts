import { stickingFromHands, handsPlayAt } from '@/lib/app/breaks/drummer/sticking';
import { FOOT_LANE, LANES, gracesOf, handLanes } from '@/lib/app/breaks/lanes';
import {
  dropBarSticking,
  stickingAt,
  stickingRow,
  type WrittenHand,
} from '@/lib/app/breaks/pattern';
import { tupletsIn, twoAStep } from '@/lib/app/breaks/tuplets';
import type { LaneHand, LaneKey, Pattern, TupletSpan } from '@/lib/app/breaks/types';

/**
 * The hands a drummer writes under their notes (Phase 14), one step at a
 * time, and what an edit to the notes does to them (D64).
 *
 * A hand is written on a step a hand plays: a grid note on a lane a stick
 * plays, or a double there (13-a), whose two strokes are the written hand's.
 * A step with only the feet, or only a tuplet's notes (which go hand to hand
 * by their own rule), takes none. Every function here writes in place, on a
 * clone.
 */

/** A bar read for its hands: where one can be written, and where it can keep its graces. */
export interface BarHands {
  writable: boolean[];
  graces: boolean[];
}

/** The lanes a hand plays in `p`: the sticks, and the percussion on the kit. */
function stickLanes(p: Pattern): LaneKey[] {
  return handLanes(p.perc).filter((L) => L !== FOOT_LANE);
}

/** A double's two strokes on step `i`, by lane, where it covers the step. */
function strokesAt(d: TupletSpan, i: number, lane: LaneKey): [number, number] {
  const j = 2 * (i - d.start);
  return [d.notes[lane]?.[j] ?? 0, d.notes[lane]?.[j + 1] ?? 0];
}

/**
 * Bar `bi` read for its hands, a step at a time, with its doubles looked up
 * once: what the Sticking row draws and what each write checks.
 */
export function barHands(p: Pattern, bi: number): BarHands {
  const bar = p.bars[bi];
  if (!bar) return { writable: [], graces: [] };
  const hands = stickLanes(p);
  const doubles = tupletsIn(p, bi).filter(
    (t) => twoAStep(t) && hands.some((L) => t.notes[L]?.some(Boolean))
  );
  const over = (i: number) => doubles.find((t) => i >= t.start && i < t.start + t.span);
  const steps = bar.k.length;
  const writable: boolean[] = [];
  const graces: boolean[] = [];
  for (let i = 0; i < steps; i++) {
    const d = over(i);
    // a double's part of the step counts only where a hand plays it, not the feet
    const doubled = !!d && hands.some((L) => strokesAt(d, i, L).some(Boolean));
    writable.push(handsPlayAt(bar, i) || doubled);
    graces.push(
      LANES.some((L) => gracesOf(L, bar[L][i]) > 0) ||
        (!!d && hands.some((L) => gracesOf(L, strokesAt(d, i, L)[0]) > 0))
    );
  }
  return { writable, graces };
}

/** Whether a hand may be written on step `i` of bar `bi`. */
export function writableAt(p: Pattern, bi: number, i: number): boolean {
  return !!barHands(p, bi).writable[i];
}

/**
 * Whether a step's notes carry grace notes (a flam, a drag), so its hand can
 * be written lower case: the graces on the same stick. A double's are its
 * first stroke's.
 */
export function gracesAt(p: Pattern, bi: number, i: number): boolean {
  return !!barHands(p, bi).graces[i];
}

/** The steps of bar `bi` a double a hand plays covers: their hands are the double's. */
function doubledSteps(p: Pattern, bi: number): Set<number> {
  const hands = stickLanes(p);
  const out = new Set<number>();
  for (const t of tupletsIn(p, bi))
    if (twoAStep(t) && hands.some((L) => t.notes[L]?.some(Boolean)))
      for (let i = t.start; i < t.start + t.span; i++) out.add(i);
  return out;
}

/** Set bar `bi`'s row, or take it off where it writes nothing. */
function setRow(p: Pattern, bi: number, row: string): void {
  const steps = p.bars[bi].k.length;
  const kept = stickingRow(row, steps);
  if (!kept) {
    dropBarSticking(p, bi);
    return;
  }
  const sticking = p.sticking ?? p.bars.map(() => null);
  sticking[bi] = kept;
  p.sticking = sticking;
}

/** Bar `bi`'s row as letters, one a step, `.` where none is written. */
function rowOf(p: Pattern, bi: number): string[] {
  const steps = p.bars[bi].k.length;
  return Array.from({ length: steps }, (_, i) => stickingAt(p.sticking, bi, i) ?? '.');
}

/**
 * Write one step's hand, or unwrite it with null. False where a hand cannot
 * be written there, or a lower-case hand is asked for on a step with no
 * graces to keep on its stick.
 */
export function writeHand(p: Pattern, bi: number, i: number, hand: WrittenHand | null): boolean {
  const read = barHands(p, bi);
  if (!read.writable[i]) return false;
  if (hand && hand === hand.toLowerCase() && !read.graces[i]) return false;
  const row = rowOf(p, bi);
  if ((row[i] === '.' ? null : row[i]) === hand) return false;
  row[i] = hand ?? '.';
  setRow(p, bi, row.join(''));
  return true;
}

/**
 * Write the bar hand to hand from step `from` to its end (D69), leading with
 * `hand`, over the steps a hand can be written on; the steps before it keep
 * what they had. `shown` narrows it to the steps the layer you are on shows,
 * so the notes you can see alternate, and a ghost the layer hides keeps what
 * it had. A step already written lower case for the hand it gets keeps its
 * graces on that stick. False where nothing would change.
 */
export function alternateHands(
  p: Pattern,
  bi: number,
  from: number,
  hand: LaneHand,
  shown: (i: number) => boolean = () => true
): boolean {
  if (!p.bars[bi]) return false;
  const { writable } = barHands(p, bi);
  const row = rowOf(p, bi);
  const before = row.join('');
  let next: LaneHand = hand;
  for (let i = Math.max(0, from); i < row.length; i++) {
    if (!writable[i] || !shown(i)) continue;
    row[i] = row[i].toUpperCase() === next && row[i] !== next ? row[i] : next;
    next = next === 'R' ? 'L' : 'R';
  }
  if (row.join('') === before) return false;
  setRow(p, bi, row.join(''));
  return true;
}

/** Unwrite every hand in bar `bi` (D69). False where none was written. */
export function clearBarHands(p: Pattern, bi: number): boolean {
  if (!p.sticking?.[bi]) return false;
  dropBarSticking(p, bi);
  return true;
}

/**
 * Unwrite the hands on `span` steps of bar `bi` from `start`, in place: the
 * beat a tuplet was made over or given back to the grid. The hands written
 * there were for the notes that were there, not the tuplet's (which go hand
 * to hand), and a cymbal left on the step would take a hand meant for a drum.
 */
export function dropHandsIn(p: Pattern, bi: number, start: number, span: number): void {
  if (!p.sticking?.[bi]) return;
  const row = rowOf(p, bi);
  for (let i = Math.max(0, start); i < Math.min(row.length, start + span); i++) row[i] = '.';
  setRow(p, bi, row.join(''));
}

/**
 * What a change to bar `bi`'s notes does to its hands (D64), on the clone
 * that changed: each step keeps its hand while a hand still plays a note on
 * it, and a lower-case hand left with no graces becomes upper case. A study
 * whose lanes name their hands (D60) has them written for the steps nothing
 * is written on, so its new notes are played as it names them, and a hand
 * you wrote over them stays yours. A double's hand (13-a) is its own, or the
 * double would be played as two singles.
 */
export function keepHands(p: Pattern, bi: number): void {
  const bar = p.bars[bi];
  if (!bar) return;
  const { writable, graces } = barHands(p, bi);
  const doubled = doubledSteps(p, bi);
  const old = rowOf(p, bi);
  const named = p.poly?.hands ? stickingFromHands(bar, p.poly.hands) : '';
  const row = old.map((ch, i) => {
    if (ch !== '.' && doubled.has(i)) return ch;
    if (ch !== '.' && writable[i]) return graces[i] ? ch : ch.toUpperCase();
    const base = named[i];
    return base && base !== '.' ? base : '.';
  });
  setRow(p, bi, row.join(''));
}
