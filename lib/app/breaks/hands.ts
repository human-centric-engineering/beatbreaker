import { stickingFromHands, handsPlayAt } from '@/lib/app/breaks/drummer/sticking';
import { FOOT_LANE, LANES, gracesOf, handLanes } from '@/lib/app/breaks/lanes';
import {
  dropBarSticking,
  stickingAt,
  stickingRow,
  type WrittenHand,
} from '@/lib/app/breaks/pattern';
import { tupletsIn, twoAStep } from '@/lib/app/breaks/tuplets';
import type { LaneHand, Pattern, TupletSpan } from '@/lib/app/breaks/types';

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

/** The doubles (13-a) on a lane a hand plays, in bar `bi`. */
function handDoubles(p: Pattern, bi: number): TupletSpan[] {
  const hands = handLanes(p.perc).filter((L) => L !== FOOT_LANE);
  return tupletsIn(p, bi).filter(
    (t) => twoAStep(t) && hands.some((L) => t.notes[L]?.some(Boolean))
  );
}

/** The double over step `i` of bar `bi`, if a hand plays one there. */
function doubleOver(p: Pattern, bi: number, i: number): TupletSpan | undefined {
  return handDoubles(p, bi).find((t) => i >= t.start && i < t.start + t.span);
}

/** Whether a hand may be written on step `i` of bar `bi`. */
export function writableAt(p: Pattern, bi: number, i: number): boolean {
  const bar = p.bars[bi];
  if (!bar || i < 0 || i >= bar.k.length) return false;
  if (handsPlayAt(bar, i)) return true;
  const d = doubleOver(p, bi, i);
  const j = d ? 2 * (i - d.start) : -1;
  return !!d && LANES.some((L) => !!d.notes[L]?.[j] || !!d.notes[L]?.[j + 1]);
}

/**
 * Whether a step's notes carry grace notes (a flam, a drag), so its hand can
 * be written lower case: the graces on the same stick. A double's are its
 * first stroke's.
 */
export function gracesAt(p: Pattern, bi: number, i: number): boolean {
  const bar = p.bars[bi];
  if (!bar) return false;
  if (LANES.some((L) => gracesOf(L, bar[L][i]) > 0)) return true;
  const d = doubleOver(p, bi, i);
  const j = d ? 2 * (i - d.start) : -1;
  return !!d && LANES.some((L) => gracesOf(L, d.notes[L]?.[j] ?? 0) > 0);
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
  if (!writableAt(p, bi, i)) return false;
  if (hand && hand === hand.toLowerCase() && !gracesAt(p, bi, i)) return false;
  const row = rowOf(p, bi);
  if ((row[i] === '.' ? null : row[i]) === hand) return false;
  row[i] = hand ?? '.';
  setRow(p, bi, row.join(''));
  return true;
}

/**
 * Write the bar hand to hand from step `from` to its end (D69), leading with
 * `hand`, over the steps a hand can be written on; the steps before it keep
 * what they had. False where nothing would change.
 */
export function alternateHands(p: Pattern, bi: number, from: number, hand: LaneHand): boolean {
  if (!p.bars[bi]) return false;
  const row = rowOf(p, bi);
  const before = row.join('');
  let next: LaneHand = hand;
  for (let i = Math.max(0, from); i < row.length; i++) {
    if (!writableAt(p, bi, i)) continue;
    row[i] = next;
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
 * What a change to bar `bi`'s notes does to its hands (D64), on the clone
 * that changed: each step keeps its hand while a hand still plays a note on
 * it, and a lower-case hand left with no graces becomes upper case. A study
 * whose lanes name their hands (D60) has them written again for the bar's new
 * notes, and they win over what was there; a double's hand (13-a) is its own
 * and wins over both, or the double would be played as two singles.
 */
export function keepHands(p: Pattern, bi: number): void {
  const bar = p.bars[bi];
  if (!bar) return;
  const old = rowOf(p, bi);
  const named = p.poly?.hands ? stickingFromHands(bar, p.poly.hands) : '';
  const row = old.map((ch, i) => {
    if (ch !== '.' && doubleOver(p, bi, i)) return ch;
    const base = named[i];
    if (base && base !== '.') return base;
    if (ch === '.' || !writableAt(p, bi, i)) return '.';
    return gracesAt(p, bi, i) ? ch : ch.toUpperCase();
  });
  setRow(p, bi, row.join(''));
}
