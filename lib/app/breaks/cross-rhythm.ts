import { stickingFromHands } from '@/lib/app/breaks/drummer/sticking';
import { LANES, handLanes } from '@/lib/app/breaks/lanes';
import { groupsOf, stepsOf } from '@/lib/app/breaks/meter';
import {
  cloneBar,
  clonePattern,
  emptyBar,
  meterOfPat,
  stickingRow,
  tidySticking,
} from '@/lib/app/breaks/pattern';
import { overlaps, spansOf } from '@/lib/app/breaks/poly-fill';
import { POLYRHYTHM_STYLE } from '@/lib/app/breaks/style-keys';
import {
  MAX_TUPLET,
  MAX_TUPLETS,
  MIN_TUPLET,
  cloneTuplet,
  tupletLanes,
  tupletsOf,
} from '@/lib/app/breaks/tuplets';
import type {
  Bar,
  LaneHand,
  LaneKey,
  Meter,
  Pattern,
  Poly,
  PolySpan,
  TupletSpan,
} from '@/lib/app/breaks/types';

/**
 * "Make this a 3:2" (Phase 13-b): one cross-rhythm written from its ratio,
 * its two lanes and how long one cycle of it is — the figure a polyrhythm
 * entry spells out by hand, built from what a drummer would say.
 *
 * `cross` even notes against `pulse` even notes, both from the cycle's first
 * step and landing together on the next. The pulse is always on the grid (it
 * is what you count); the cross-rhythm is on the grid where the cycle holds
 * it, and a tuplet span (12-d) where it does not — a 3:2 over a half bar of
 * plain 4/4 is three in the time of eight sixteenths.
 *
 * Two ways to write it:
 *
 * - **A study**: the whole section becomes the exercise, every bar the
 *   figure and nothing else, with {@link Pattern.poly} set — so it is
 *   learnt as a library entry is, a stream a layer (D54), counted either
 *   way, both counts on the chart and the hands labelled (D60).
 * - **A fill**: the figure takes the last cycle of one bar of a groove, up to
 *   the bar line, recorded as a poly span (12-c) — so the layers play it
 *   whole at 4 and 5 and the groove below, and the critic reads it as the
 *   fill it is. The groove's other hand parts leave it, as in any fill.
 */
export interface CrossRhythmSpec {
  /** Notes of the cross-rhythm in a cycle: the 3 of a 3:2. */
  cross: number;
  /** Notes of the pulse in a cycle: the 2 of a 3:2. */
  pulse: number;
  crossLane: LaneKey;
  /** The lane the pulse is played on; absent in a fill, the groove keeps the time. */
  pulseLane?: LaneKey;
  /** Grid steps one cycle covers: a beat, a half bar, the bar. It divides the bar. */
  cycle: number;
  /** The hand each lane is played with (D60). */
  hands?: Partial<Record<LaneKey, LaneHand>>;
  /** A study of the whole section, or a fill at the end of bar `bar`. */
  as: 'study' | 'fill';
  /** The bar a fill goes in (0-based). */
  bar?: number;
}

export type CrossRhythmResult = { ok: true; pattern: Pattern } | { ok: false; reason: string };

/** A lane's accent, the first note of each stream's cycle: what is counted. */
const ACCENT: Partial<Record<LaneKey, number>> = {
  k: 2,
  s: 3,
  h: 2,
  t1: 2,
  t2: 2,
  t3: 2,
  p1: 2,
  p2: 2,
};
const accentOf = (L: LaneKey): number => ACCENT[L] ?? 1;
/** A lane's plain note: a snare hit, else the lane's first value. */
const hitOf = (L: LaneKey): number => (L === 's' ? 2 : 1);

/** The figure's lanes: the cross-rhythm's, and the pulse's where it has one. */
function figureLanes(spec: CrossRhythmSpec): LaneKey[] {
  return [spec.crossLane, ...(spec.pulseLane ? [spec.pulseLane] : [])];
}

/** One stream's notes over a cycle: the first accented, the rest plain. */
function streamRow(lane: LaneKey, count: number): number[] {
  return Array.from({ length: count }, (_, j) => (j ? hitOf(lane) : accentOf(lane)));
}

/**
 * Why a spec cannot be written into a pattern of `steps`-step bars, or null.
 * Said as a drummer would hear it, since the Studio and BeatBuddy both show it.
 */
export function crossRhythmProblem(
  spec: CrossRhythmSpec,
  steps: number,
  bars: number
): string | null {
  const { cross: n, pulse: m, cycle } = spec;
  const count = (x: number) => Number.isInteger(x) && x >= MIN_TUPLET && x <= MAX_TUPLET;
  if (!count(n) || !count(m))
    return `each side of the ratio is a count from ${MIN_TUPLET} to ${MAX_TUPLET}`;
  if (n === m) return `${n}:${m} is one rhythm, not two against each other`;
  if (!LANES.includes(spec.crossLane)) return 'the cross-rhythm needs a lane';
  if (spec.pulseLane && !LANES.includes(spec.pulseLane)) return 'the pulse needs a lane';
  if (spec.pulseLane === spec.crossLane) return 'the two rhythms need two lanes';
  if (spec.as === 'study' && !spec.pulseLane) return 'a study needs a lane for the pulse';
  if (!Number.isInteger(cycle) || cycle < 1 || steps % cycle !== 0)
    return `one cycle has to divide the bar of ${steps} steps`;
  if (cycle % m !== 0)
    return `${m} even notes do not fall on the grid over ${cycle} steps: try a longer cycle, or the pulse as the other side`;
  if (
    spec.as === 'fill' &&
    !(Number.isInteger(spec.bar) && (spec.bar ?? -1) >= 0 && (spec.bar ?? 0) < bars)
  )
    return `there is no bar ${(spec.bar ?? 0) + 1}`;
  return null;
}

/**
 * What a fill needs from the section's style that the pattern does not carry:
 * whether it is a clave style, and the value its clave strokes are written in
 * (`polyFillContext`'s two). A study needs nothing: it replaces the style.
 */
export interface CrossRhythmStyle {
  clave?: boolean;
  claveValue?: number;
}

/**
 * Write a cross-rhythm into a copy of `pat` (see {@link CrossRhythmSpec}).
 * The pattern given is not changed. A spec that cannot be written comes back
 * with the reason.
 */
export function crossRhythm(
  pat: Pattern,
  spec: CrossRhythmSpec,
  style: CrossRhythmStyle = {}
): CrossRhythmResult {
  const steps = stepsOf(meterOfPat(pat));
  const problem = crossRhythmProblem(spec, steps, pat.bars.length);
  if (problem) return { ok: false, reason: problem };
  return spec.as === 'study' ? study(pat, spec, steps) : fill(pat, spec, steps, style);
}

/** The pattern's lanes with the figure's added, in the kit's order. */
function withLanes(pat: Pattern, add: LaneKey[]): LaneKey[] {
  return LANES.filter((L) => pat.lanes.includes(L) || add.includes(L));
}

/**
 * One cycle written from `from` in bar `bi`: the pulse on the grid, the cross
 * on the grid where it fits and as a span where it does not. Returns the span
 * it wrote, if it wrote one.
 */
function writeCycle(bar: Bar, bi: number, from: number, spec: CrossRhythmSpec): TupletSpan | null {
  const { cross: n, pulse: m, cycle, crossLane, pulseLane } = spec;
  if (pulseLane) {
    streamRow(pulseLane, m).forEach((v, k) => (bar[pulseLane][from + (k * cycle) / m] = v));
  }
  const row = streamRow(crossLane, n);
  if (cycle % n === 0) {
    row.forEach((v, j) => (bar[crossLane][from + (j * cycle) / n] = v));
    return null;
  }
  // the cross lane's cells under the span are empty already: the span owns them
  return { bar: bi, start: from, span: cycle, n, notes: { [crossLane]: row } };
}

/** The streams the layers and the chart read the figure by (Phase 12). */
function polyOf(spec: CrossRhythmSpec): Poly {
  const { cross: n, pulse: m, cycle, crossLane, pulseLane } = spec;
  const onGrid = cycle % n === 0;
  return {
    device: 'cross-rhythm',
    ratio: `${n}:${m}`,
    pulse: pulseLane ? [pulseLane] : [],
    cross: [crossLane],
    beat: onGrid ? cycle / n : cycle,
    count: n,
    ...(onGrid ? {} : { tuplet: n }),
    ...(spec.hands && Object.keys(spec.hands).length ? { hands: { ...spec.hands } } : {}),
  };
}

function study(pat: Pattern, spec: CrossRhythmSpec, steps: number): CrossRhythmResult {
  const tuplets: TupletSpan[] = [];
  const bars = pat.bars.map((_, bi) => {
    const bar = emptyBar(steps);
    for (let from = 0; from < steps; from += spec.cycle) {
      const t = writeCycle(bar, bi, from, spec);
      if (t) tuplets.push(t);
    }
    return bar;
  });
  if (tuplets.length > MAX_TUPLETS)
    return {
      ok: false,
      reason: `that is ${tuplets.length} tuplets, past the ${MAX_TUPLETS} a pattern holds: try a longer cycle or fewer bars`,
    };
  const hands = spec.hands;
  const sticking = hands
    ? tidySticking(bars.map((b) => stickingRow(stickingFromHands(b, hands), steps)))
    : null;
  const out: Pattern = {
    ...pat,
    style: POLYRHYTHM_STYLE,
    styleVersionId: null,
    attrs: {},
    lanes: withLanes(pat, figureLanes(spec)),
    backbeats: [],
    hasRide: false,
    hasHat: false,
    pins: null,
    bars,
    poly: polyOf(spec),
  };
  delete out.polySpans;
  delete out.fixed;
  // the notes are the exercise's now, not a song's
  delete out.song;
  if (sticking) out.sticking = sticking;
  else delete out.sticking;
  if (tuplets.length) out.tuplets = tuplets;
  else delete out.tuplets;
  return { ok: true, pattern: out };
}

function fill(
  pat: Pattern,
  spec: CrossRhythmSpec,
  steps: number,
  style: CrossRhythmStyle
): CrossRhythmResult {
  const no = (reason: string): CrossRhythmResult => ({ ok: false, reason });
  if (pat.poly) return no('this section is already a cross-rhythm study: write a study instead');
  if (pat.fixed) return no('a rudiment is played as written: write a study over it instead');
  const bi = spec.bar ?? 0;
  const from = steps - spec.cycle;
  const offGrid = spec.cycle % spec.cross !== 0;
  /* A clave style's strokes on the snare are its identity, and a fill laid
     over them does not move them (12-c): a span would own the snare. */
  if (style.clave && offGrid && spec.crossLane === 's')
    return no(
      'the snare carries this style’s clave, which a tuplet would take over: put the cross-rhythm on another drum'
    );

  /* The fill takes the place of whatever figure was on its steps, so one that
     reaches outside them is refused rather than cut in half. */
  const hands = handLanes(pat.perc);
  const cleared = [...new Set([...hands, ...figureLanes(spec)])];
  const inCycle = (start: number, span: number) => start < steps && start + span > from;
  const tuplets = tupletsOf(pat);
  const across = tuplets.find(
    (t) =>
      t.bar === bi &&
      inCycle(t.start, t.span) &&
      t.start < from &&
      tupletLanes(t).some((L) => cleared.includes(L))
  );
  if (across)
    return no(
      `bar ${bi + 1} has a tuplet that starts before the fill and runs into it: try a longer cycle`
    );
  const mark: PolySpan = {
    bar: bi,
    at: from,
    span: spec.cycle,
    device: offGrid ? 'tuplet' : 'cross-rhythm',
    ratio: `${spec.cross}:${spec.pulse}`,
    every: offGrid ? spec.cycle : spec.cycle / spec.cross,
    plain: {},
  };
  const replaced = spansOf(pat).filter((s) => overlaps(s, mark, steps));
  if (replaced.some((s) => s.bar !== bi || s.at < from))
    return no(`bar ${bi + 1} ends with a fill that starts before this one: try a longer cycle`);

  const out = clonePattern(pat);
  const bar = out.bars[bi];
  /* What the low layers play under the fill: what was there, or under a poly
     fill it takes the place of, what that one's low layers played. */
  const before = cloneBar(bar);
  for (const s of replaced) {
    for (const [L, row] of Object.entries(s.plain) as Array<[LaneKey, number[] | undefined]>)
      row?.forEach((v, k) => (before[L][s.at + k] = v));
  }
  for (const L of cleared) for (let i = from; i < steps; i++) bar[L][i] = 0;
  for (const L of cleared) {
    const pins = out.pins?.[bi]?.[L];
    if (pins) for (let i = from; i < steps; i++) pins[i] = 0;
  }

  // a tuplet inside the cycle loses the lanes the fill clears, and keeps the rest (a kick under it)
  const kept: TupletSpan[] = [];
  for (const t of tuplets) {
    if (!(t.bar === bi && inCycle(t.start, t.span))) {
      kept.push(cloneTuplet(t));
      continue;
    }
    const rest = cloneTuplet(t);
    for (const L of cleared) delete rest.notes[L];
    if (tupletLanes(rest).length) kept.push(rest);
  }
  const span = writeCycle(bar, bi, from, spec);
  if (span) kept.push(span);
  if (kept.length > MAX_TUPLETS)
    return no(`the pattern already holds the ${MAX_TUPLETS} tuplets it may`);
  if (kept.length) out.tuplets = kept;
  else delete out.tuplets;

  // a clave style's strokes come back over the fill, as they do over a poly fill (12-c)
  if (style.clave) {
    for (const i of pat.backbeats) if (i >= from && i < steps) bar.s[i] = style.claveValue ?? 2;
  }

  for (const L of LANES) {
    const row = before[L].slice(from);
    if (row.some((v, k) => v !== bar[L][from + k])) mark.plain[L] = row;
  }
  // the hands the figure is played with, which its span reads: a fill sets no poly (D60)
  if (spec.hands && Object.keys(spec.hands).length) mark.hands = { ...spec.hands };
  out.polySpans = [...(out.polySpans ?? []).filter((s) => !overlaps(s, mark, steps)), mark];
  out.lanes = withLanes(out, figureLanes(spec));

  // the hands written for the cycle's old notes are not the figure's; the rest of the bar keeps its own
  const old = out.sticking?.[bi] ?? '';
  const figure = spec.hands ? stickingFromHands(bar, spec.hands) : '';
  const row = stickingRow(
    Array.from({ length: steps }, (_, i) => (i < from ? (old[i] ?? '.') : (figure[i] ?? '.'))).join(
      ''
    ),
    steps
  );
  if (row || out.sticking) {
    const sticking = out.sticking ?? out.bars.map(() => null);
    sticking[bi] = row;
    out.sticking = tidySticking(sticking);
    if (!out.sticking) delete out.sticking;
  }
  return { ok: true, pattern: out };
}

/** The lanes a stream may be on: the kit's drums and cymbals and the feet, not the crash or the percussion slots. */
export const STREAM_LANES: readonly LaneKey[] = ['s', 't1', 't2', 't3', 'h', 'r', 'k', 'hf'];

/** Whether a hand plays a lane, so a handing can name it: not the kick or the hat foot. */
export function isHandLane(L: LaneKey): boolean {
  return L !== 'k' && L !== 'hf';
}

/**
 * A figure's hands from one hand named (D60), as the Studio card and
 * BeatBuddy both ask for it: the hand plays the cross-rhythm, and a pulse on a
 * hand lane gets the other. Where the cross-rhythm is on a foot, the hand is
 * the pulse's. Undefined where nothing a hand plays is in the figure, or no
 * hand is named.
 */
export function handsFor(
  crossLane: LaneKey,
  pulseLane: LaneKey | undefined,
  hand: LaneHand | undefined
): Partial<Record<LaneKey, LaneHand>> | undefined {
  if (!hand) return undefined;
  const other: LaneHand = hand === 'R' ? 'L' : 'R';
  if (isHandLane(crossLane))
    return {
      [crossLane]: hand,
      ...(pulseLane && isHandLane(pulseLane) ? { [pulseLane]: other } : {}),
    };
  return pulseLane && isHandLane(pulseLane) ? { [pulseLane]: hand } : undefined;
}

/** A cycle length the Studio offers: a bar, half a bar, a beat. */
export interface CycleChoice {
  key: 'bar' | 'half' | 'beat';
  label: string;
  steps: number;
}

/**
 * The cycles a meter's bar divides into, longest first: the bar; half of it,
 * where it halves; a beat, where every beat is the same length. One length is
 * offered once — in 6/8 half a bar is the beat.
 */
export function cycleChoices(m: Meter): CycleChoice[] {
  const steps = stepsOf(m);
  const groups = groupsOf(m);
  const out: CycleChoice[] = [{ key: 'bar', label: 'One bar', steps }];
  if (steps % 2 === 0) out.push({ key: 'half', label: 'Half a bar', steps: steps / 2 });
  const beat = groups[0]?.size ?? 0;
  if (beat && groups.every((g) => g.size === beat) && !out.some((c) => c.steps === beat))
    out.push({ key: 'beat', label: 'One beat', steps: beat });
  return out;
}
