import { stickingFromHands } from '@/lib/app/breaks/drummer/sticking';
import { LANES } from '@/lib/app/breaks/lanes';
import { groupsOf, stepsOf } from '@/lib/app/breaks/meter';
import {
  cloneBar,
  clonePattern,
  dropBarSticking,
  emptyBar,
  meterOfPat,
  stickingRow,
  tidySticking,
} from '@/lib/app/breaks/pattern';
import { overlaps } from '@/lib/app/breaks/poly-fill';
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

/** The lanes the hands leave in a fill, as they do for any fill: the cymbals, the snare and toms, the percussion. */
const HAND_LANES: LaneKey[] = ['s', 'h', 'r', 'c', 't1', 't2', 't3', 'p1', 'p2'];

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
 * Write a cross-rhythm into a copy of `pat` (see {@link CrossRhythmSpec}).
 * The pattern given is not changed. A spec that cannot be written comes back
 * with the reason.
 */
export function crossRhythm(pat: Pattern, spec: CrossRhythmSpec): CrossRhythmResult {
  const steps = stepsOf(meterOfPat(pat));
  const problem = crossRhythmProblem(spec, steps, pat.bars.length);
  if (problem) return { ok: false, reason: problem };
  return spec.as === 'study' ? study(pat, spec, steps) : fill(pat, spec, steps);
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
  for (let i = from; i < from + cycle; i++) bar[crossLane][i] = 0;
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
    lanes: withLanes(pat, [spec.crossLane, ...(spec.pulseLane ? [spec.pulseLane] : [])]),
    backbeats: [],
    hasRide: false,
    hasHat: false,
    pins: null,
    bars,
    poly: polyOf(spec),
  };
  delete out.polySpans;
  delete out.fixed;
  if (sticking) out.sticking = sticking;
  else delete out.sticking;
  if (tuplets.length) out.tuplets = tuplets;
  else delete out.tuplets;
  return { ok: true, pattern: out };
}

function fill(pat: Pattern, spec: CrossRhythmSpec, steps: number): CrossRhythmResult {
  if (pat.poly)
    return {
      ok: false,
      reason: 'this section is already a cross-rhythm study: write a study instead',
    };
  if (pat.fixed)
    return { ok: false, reason: 'a rudiment is played as written: write a study over it instead' };
  const bi = spec.bar ?? 0;
  const from = steps - spec.cycle;
  const out = clonePattern(pat);
  const bar = out.bars[bi];
  const before = cloneBar(bar);
  // the hands leave the cycle to the figure, as they leave any fill; the pulse's lane is the figure's
  const cleared = [...HAND_LANES, spec.crossLane, ...(spec.pulseLane ? [spec.pulseLane] : [])];
  for (const L of cleared) for (let i = from; i < steps; i++) bar[L][i] = 0;
  for (const L of cleared) {
    const pins = out.pins?.[bi]?.[L];
    if (pins) for (let i = from; i < steps; i++) pins[i] = 0;
  }

  // what was a figure on those steps goes: a tuplet on a lane cleared, a poly fill's span
  const inCycle = (start: number, span: number) => start < steps && start + span > from;
  const kept = tupletsOf(out).filter(
    (t) =>
      !(t.bar === bi && inCycle(t.start, t.span) && tupletLanes(t).some((L) => cleared.includes(L)))
  );
  const span = writeCycle(bar, bi, from, spec);
  if (span) kept.push(span);
  if (kept.length > MAX_TUPLETS)
    return { ok: false, reason: `the pattern already holds the ${MAX_TUPLETS} tuplets it may` };
  if (kept.length) out.tuplets = kept.map(cloneTuplet);
  else delete out.tuplets;

  const plain: Partial<Record<LaneKey, number[]>> = {};
  for (const L of LANES) {
    const row = before[L].slice(from);
    if (row.some((v, k) => v !== bar[L][from + k])) plain[L] = row;
  }
  const mark: PolySpan = {
    bar: bi,
    at: from,
    span: spec.cycle,
    device: span ? 'tuplet' : 'cross-rhythm',
    ratio: `${spec.cross}:${spec.pulse}`,
    every: span ? spec.cycle : spec.cycle / spec.cross,
    plain,
  };
  const others = (out.polySpans ?? []).filter((s) => !overlaps(s, mark, steps));
  out.polySpans = [...others, mark];

  out.lanes = withLanes(out, [spec.crossLane, ...(spec.pulseLane ? [spec.pulseLane] : [])]);
  // the hands written for the bar's old notes are not the figure's
  dropBarSticking(out, bi);
  if (spec.hands) {
    const row = stickingFromHands(bar, spec.hands)
      .split('')
      .map((c, i) => (i >= from ? c : '.'))
      .join('');
    const written = stickingRow(row, steps);
    if (written) {
      const sticking = out.sticking ?? out.bars.map(() => null);
      sticking[bi] = written;
      out.sticking = sticking;
    }
  }
  return { ok: true, pattern: out };
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
