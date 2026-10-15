import { FOOT_LANE, LANES, LANE_VALUES, handLanes } from '@/lib/app/breaks/lanes';
import type { Bar, LaneHand, LaneKey, Pattern, TupletSpan } from '@/lib/app/breaks/types';

/**
 * Tuplet spans (Phase 12-d, D53): five even notes in the time of four, a
 * septuplet in a beat, a quintuplet round the toms — the figures no grid
 * holds, laid over the grid rather than replacing it.
 *
 * A span is read through {@link tupletsOf}, which keeps only the spans that
 * fit the pattern as it is now. A span left behind by an edit that reshaped
 * its bar (a meter change, a bar taken away) is ignored rather than trusted,
 * as a poly fill's mark is.
 *
 * **The span owns its cells**: on a lane it has notes for, the grid's cells
 * under it are 0, and a reader that meets a note there anyway plays the span
 * and not the cell ({@link ownedBy}). That is what keeps a figure from being
 * played twice whatever wrote the bars.
 */

/** The fewest and most notes a span holds: two is a pair of 32nds in one step; nine a nonuplet. */
export const MIN_TUPLET = 2;
export const MAX_TUPLET = 9;

/**
 * The most spans a pattern holds: a quintuplet on every beat of eight bars of
 * 4/4, and the feet's under them. The schemas refuse more, so the writers
 * ({@link addTuplet}, the MIDI reader) stop here too.
 */
export const MAX_TUPLETS = 64;

/** Where note `j` of a span falls, in grid steps from the start of its bar. */
export function tupletPos(s: Pick<TupletSpan, 'start' | 'span' | 'n'>, j: number): number {
  return s.start + (j * s.span) / s.n;
}

/** A copy of a span: its rows are arrays. */
export function cloneTuplet(s: TupletSpan): TupletSpan {
  return {
    ...s,
    notes: Object.fromEntries(Object.entries(s.notes).map(([L, row]) => [L, row?.slice()])),
  };
}

/** The lanes a span has notes for, in `LANES` order. */
export function tupletLanes(s: Pick<TupletSpan, 'notes'>): LaneKey[] {
  return LANES.filter((L) => !!s.notes[L]);
}

/**
 * Whether a span fits a pattern of `bars` bars of `steps` steps: inside one
 * bar, between two and nine notes, each row as long as the span has notes and
 * each value one its lane has, and not a span the grid already holds (four
 * notes over four sixteenths is sixteenths).
 */
export function tupletFits(s: TupletSpan, steps: number, bars: number): boolean {
  const lanes = tupletLanes(s);
  return (
    Number.isInteger(s.bar) &&
    s.bar >= 0 &&
    s.bar < bars &&
    Number.isInteger(s.start) &&
    s.start >= 0 &&
    Number.isInteger(s.span) &&
    s.span >= 1 &&
    s.start + s.span <= steps &&
    Number.isInteger(s.n) &&
    s.n >= MIN_TUPLET &&
    s.n <= MAX_TUPLET &&
    !onTheGrid(s.n, s.span) &&
    lanes.length > 0 &&
    lanes.every((L) => {
      const row = s.notes[L];
      return (
        row?.length === s.n &&
        row.every((v) => Number.isInteger(v) && v >= 0 && v <= LANE_VALUES[L].length)
      );
    })
  );
}

/** Whether `n` notes over `span` steps fall on the grid anyway: four over four, two over four. */
function onTheGrid(n: number, span: number): boolean {
  return span % n === 0;
}

/** Whether two spans share a step of one bar. */
function overlap(a: TupletSpan, b: TupletSpan): boolean {
  return a.bar === b.bar && a.start < b.start + b.span && b.start < a.start + a.span;
}

/**
 * The spans of a pattern that fit it, in bar and step order. Two spans may
 * cover the same steps on different lanes — a five in the hands and a four in
 * the feet — but not on one lane: the later of two such is left out.
 */
export function tupletsOf(pat: Pick<Pattern, 'tuplets' | 'bars'>): TupletSpan[] {
  if (!pat.tuplets?.length) return [];
  const steps = pat.bars[0]?.k.length ?? 0;
  const bars = pat.bars.length;
  const memo = read.get(pat.tuplets);
  if (memo && memo.steps === steps && memo.bars === bars) return memo.spans.slice();
  const out: TupletSpan[] = [];
  for (const s of pat.tuplets) {
    if (!tupletFits(s, steps, bars)) continue;
    const lanes = tupletLanes(s);
    if (out.some((o) => overlap(o, s) && tupletLanes(o).some((L) => lanes.includes(L)))) continue;
    out.push(s);
  }
  out.sort((a, b) => a.bar - b.bar || a.start - b.start);
  read.set(pat.tuplets, { steps, bars, spans: out, strokes: new Map() });
  return out.slice();
}

/**
 * What {@link tupletsOf} and {@link tupletStrokes} read from a list of spans,
 * kept with the list: the scheduler asks on every step, and a list is
 * replaced, never changed, by every edit that writes one.
 */
const read = new WeakMap<
  readonly TupletSpan[],
  {
    steps: number;
    bars: number;
    spans: TupletSpan[];
    strokes: Map<number, { perc: Pattern['perc']; poly: Pattern['poly']; out: TupletStroke[] }>;
  }
>();

/** The spans in bar `bi`. */
export function tupletsIn(pat: Pick<Pattern, 'tuplets' | 'bars'>, bi: number): TupletSpan[] {
  return tupletsOf(pat).filter((s) => s.bar === bi);
}

/** The span that owns a lane's cell, if one does. */
export function ownedBy(
  spans: readonly TupletSpan[],
  lane: LaneKey,
  step: number
): TupletSpan | undefined {
  return spans.find((s) => !!s.notes[lane] && step >= s.start && step < s.start + s.span);
}

/**
 * A bar with every cell a span owns emptied: the grid's part of it, which is
 * what the engraver, the critic's grid checks and the drummer's hand
 * assignment read. The bar itself is not changed.
 */
export function gridPart(bar: Bar, spans: readonly TupletSpan[]): Bar {
  if (!spans.length) return bar;
  const out = { ...bar };
  for (const s of spans) {
    for (const L of tupletLanes(s)) {
      out[L] = out[L].slice();
      for (let i = s.start; i < s.start + s.span; i++) out[L][i] = 0;
    }
  }
  return out;
}

/** Empty, in place, every cell a pattern's spans own, as a writer must. */
export function clearUnderTuplets(pat: Pattern): void {
  for (const s of tupletsOf(pat)) {
    const bar = pat.bars[s.bar];
    for (const L of tupletLanes(s)) for (let i = s.start; i < s.start + s.span; i++) bar[L][i] = 0;
  }
}

/**
 * The spans a pattern keeps, in place, after an edit: those that still fit,
 * and none at all once its bars are another length. Absent where none are
 * left, as on every pattern that never had one.
 */
export function keepTuplets(pat: Pattern): void {
  const kept = tupletsOf(pat);
  if (kept.length) pat.tuplets = kept.map(cloneTuplet);
  else delete pat.tuplets;
}

/** One note of a span: which, where, and what each lane plays on it. */
export interface TupletNote {
  span: TupletSpan;
  j: number;
  /** In grid steps from the start of the bar. */
  pos: number;
}

/**
 * The span notes that sound during step `i` of bar `bi` — from the step's
 * start to just before the next — in the order they play.
 */
export function tupletNotesAt(spans: readonly TupletSpan[], i: number): TupletNote[] {
  const out: TupletNote[] = [];
  for (const span of spans) {
    if (i < span.start || i >= span.start + span.span) continue;
    for (let j = 0; j < span.n; j++) {
      const pos = tupletPos(span, j);
      if (pos >= i && pos < i + 1) out.push({ span, j, pos });
    }
  }
  return out.sort((a, b) => a.pos - b.pos);
}

/**
 * How a span is written (12-d): the note value each of its notes is drawn
 * as, in grid steps, and whether it needs a bracket. The value is the
 * shortest whose `n` would fill the span or more — five in four sixteenths are
 * sixteenths, five over a bar of four quarters are quarters, three over two
 * steps are eighths' worth of triplet sixteenths — so the bracket says
 * "`n` in the time of fewer", as a drummer reads it. A span the value fills
 * exactly (two in one step: 32nds) needs no bracket.
 */
export function tupletValue(s: Pick<TupletSpan, 'span' | 'n'>): {
  steps: number;
  bracket: boolean;
} {
  let steps = 2 ** Math.ceil(Math.log2(s.span / s.n));
  if (steps * s.n < s.span) steps *= 2;
  return { steps, bracket: steps * s.n !== s.span };
}

/**
 * The hand each lane's note `j` of a span is played with (D60): the hand the
 * pattern names for the lane, else hand to hand through the span's notes,
 * lead hand first, as a quintuplet is stuck R L R L R. A foot lane has no
 * hand. Two hand lanes on one note are one hand each.
 */
export function tupletHands(
  pat: Pick<Pattern, 'perc' | 'poly'>,
  span: TupletSpan,
  j: number
): Partial<Record<LaneKey, LaneHand>> {
  const hands = handLanes(pat.perc);
  const named = pat.poly?.hands ?? {};
  const isHand = (L: LaneKey) => hands.includes(L) && L !== FOOT_LANE;
  const lanes = tupletLanes(span).filter(isHand);
  // which of the span's hand notes this is, counting from its first
  let nth = 0;
  for (let k = 0; k < j; k++) if (lanes.some((L) => span.notes[L]?.[k])) nth++;
  const out: Partial<Record<LaneKey, LaneHand>> = {};
  const free: LaneHand = nth % 2 === 0 ? 'R' : 'L';
  let next: LaneHand = free;
  for (const L of lanes) {
    if (!span.notes[L]?.[j]) continue;
    const hand = named[L] ?? next;
    out[L] = hand;
    next = hand === 'R' ? 'L' : 'R';
  }
  return out;
}

/** The note counts a beat of `size` steps can be cut into that its grid cannot hold. */
export function tupletChoices(size: number): number[] {
  const out: number[] = [];
  for (let n = MIN_TUPLET; n <= MAX_TUPLET; n++) if (!onTheGrid(n, size)) out.push(n);
  return out;
}

/**
 * Write a new span, in place: `n` notes over `span` steps from `start` on
 * `lane`, starting empty. Where a span already covers exactly those steps
 * with that many notes, the lane joins it — a quintuplet going round from
 * the snare to the toms is one figure. The lane's grid cells under it are
 * emptied. Returns false, changing nothing, where the lane is already in a
 * span there, the span would not fit, or the pattern holds as many as it may.
 */
export function addTuplet(
  pat: Pattern,
  bar: number,
  lane: LaneKey,
  start: number,
  span: number,
  n: number
): boolean {
  const steps = pat.bars[0]?.k.length ?? 0;
  const spans = tupletsOf(pat);
  const same = spans.find(
    (s) => s.bar === bar && s.start === start && s.span === span && s.n === n
  );
  const fresh: TupletSpan = { bar, start, span, n, notes: { [lane]: Array<number>(n).fill(0) } };
  if (!same && !tupletFits(fresh, steps, pat.bars.length)) return false;
  if (!same && spans.length >= MAX_TUPLETS) return false;
  for (const s of spans) {
    if (s.bar === bar && s.notes[lane] && overlap(s, fresh)) return false;
  }
  const next = spans.map(cloneTuplet);
  const into = same ? next[spans.indexOf(same)] : null;
  if (into) into.notes[lane] = Array<number>(n).fill(0);
  else next.push(fresh);
  pat.tuplets = next;
  for (let i = start; i < start + span; i++) pat.bars[bar][lane][i] = 0;
  return true;
}

/**
 * Take a lane out of the span that owns its cell at `step`, in place: the
 * cells go back to the grid, empty. A span left with no lane goes.
 */
export function removeTuplet(pat: Pattern, bar: number, lane: LaneKey, step: number): boolean {
  const spans = tupletsOf(pat);
  const owner = ownedBy(
    spans.filter((s) => s.bar === bar),
    lane,
    step
  );
  if (!owner) return false;
  const next = spans.map(cloneTuplet);
  const s = next[spans.indexOf(owner)];
  delete s.notes[lane];
  pat.tuplets = next.filter((t) => tupletLanes(t).length);
  if (!pat.tuplets.length) delete pat.tuplets;
  return true;
}

/** Set note `j` of a lane in the span that owns its cell at `step`, in place. */
export function setTupletNote(
  pat: Pattern,
  bar: number,
  lane: LaneKey,
  step: number,
  j: number,
  value: number
): boolean {
  const spans = tupletsOf(pat);
  const owner = ownedBy(
    spans.filter((s) => s.bar === bar),
    lane,
    step
  );
  const row = owner?.notes[lane];
  if (!owner || !row || j < 0 || j >= owner.n) return false;
  if (value < 0 || value > LANE_VALUES[lane].length) return false;
  const next = spans.map(cloneTuplet);
  const s = next[spans.indexOf(owner)];
  (s.notes[lane] as number[])[j] = value;
  pat.tuplets = next;
  return true;
}

/**
 * A span as text, for the hash and for BeatBuddy: `bar 1 · 5 over steps
 * 1–16 · snare 3..2.` with each lane's values as digits. Stable: lanes in
 * `LANES` order.
 */
export function tupletKey(s: TupletSpan): string {
  const rows = tupletLanes(s).map((L) => `${L}=${(s.notes[L] ?? []).join('')}`);
  return `${s.bar}@${s.start}+${s.span}/${s.n}:${rows.join(',')}`;
}

/** One lane's stroke on a span note, as the drummer reads it ahead (12-d). */
export interface TupletStroke {
  /** In grid steps from the start of the bar. */
  pos: number;
  lane: LaneKey;
  value: number;
  hand?: LaneHand;
}

/** Every stroke a bar's spans play, in time order: what the drummer reads ahead. */
export function tupletStrokes(pat: Pattern, bi: number): TupletStroke[] {
  if (!pat.tuplets?.length) return [];
  tupletsOf(pat);
  const memo = read.get(pat.tuplets)?.strokes;
  const hit = memo?.get(bi);
  if (hit && hit.perc === pat.perc && hit.poly === pat.poly) return hit.out;
  const out: TupletStroke[] = [];
  for (const span of tupletsIn(pat, bi)) {
    for (let j = 0; j < span.n; j++) {
      const hands = tupletHands(pat, span, j);
      for (const lane of tupletLanes(span)) {
        const value = span.notes[lane]?.[j] ?? 0;
        if (!value) continue;
        const hand = hands[lane];
        out.push({ pos: tupletPos(span, j), lane, value, ...(hand ? { hand } : {}) });
      }
    }
  }
  out.sort((a, b) => a.pos - b.pos);
  memo?.set(bi, { perc: pat.perc, poly: pat.poly, out });
  return out;
}
