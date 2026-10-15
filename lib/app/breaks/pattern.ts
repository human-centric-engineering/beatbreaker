import {
  BASE_LANES,
  DEFAULT_PERC,
  FOOT_LANE,
  PERC_DEFAULT_SPEC,
  PERC_LANES,
  TOM_LANES,
  laneRoster,
  percInst,
  percRoster,
} from '@/lib/app/breaks/lanes';
import { DEFAULT_METER, STEPS, isGroupStart, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import type { Rng } from '@/lib/app/breaks/rng';
import { cloneTuplet } from '@/lib/app/breaks/tuplets';
import type {
  Bar,
  LaneKey,
  Meter,
  Pattern,
  PercLaneKey,
  Pins,
  Poly,
  PolySpan,
  Sticking,
  Style,
  StyleAttrs,
} from '@/lib/app/breaks/types';

/**
 * Bars, patterns and the pins that keep a hand-placed note from being derived
 * away. Everything here is pure — no DOM, no state, no audio.
 */

function zeros(len: number): number[] {
  return new Array<number>(len).fill(0);
}

/**
 * A bar with every lane present and empty, so turning a lane on never has to
 * reshape it.
 *
 * Written out lane by lane rather than looped so that adding a lane to
 * {@link LaneKey} is a type error here until it is handled, instead of a bar
 * that is silently missing an array.
 */
export function emptyBar(n?: number): Bar {
  const len = n ?? STEPS;
  return {
    k: zeros(len),
    s: zeros(len),
    h: zeros(len),
    r: zeros(len),
    c: zeros(len),
    t1: zeros(len),
    t2: zeros(len),
    t3: zeros(len),
    hf: zeros(len),
    p1: zeros(len),
    p2: zeros(len),
  };
}

export function cloneBar(b: Bar): Bar {
  return {
    k: b.k.slice(),
    s: b.s.slice(),
    h: b.h.slice(),
    r: b.r.slice(),
    c: b.c.slice(),
    t1: b.t1.slice(),
    t2: b.t2.slice(),
    t3: b.t3.slice(),
    hf: b.hf.slice(),
    p1: b.p1.slice(),
    p2: b.p2.slice(),
  };
}

/** A copy of a pattern's streams: nothing edits one in place, but the lane lists are arrays. */
export function clonePoly(poly: Poly): Poly {
  return {
    ...poly,
    pulse: poly.pulse.slice(),
    cross: poly.cross.slice(),
    ...(poly.hands ? { hands: { ...poly.hands } } : {}),
  };
}

/** A copy of a poly fill's span (12-c): its plain rows are arrays. */
export function clonePolySpan(s: PolySpan): PolySpan {
  return {
    ...s,
    plain: Object.fromEntries(Object.entries(s.plain).map(([L, row]) => [L, row?.slice()])),
  };
}

export function clonePattern(p: Pattern): Pattern {
  return {
    name: p.name,
    style: p.style,
    styleVersionId: p.styleVersionId ?? null,
    /* Shallow on purpose: the snapshot is immutable — nothing in the app edits
       a pattern's `attrs`, it replaces them when the style changes. Cloning the
       feel table on every undo step would be copying a constant. */
    attrs: p.attrs ?? {},
    ...(p.song ? { song: p.song } : {}),
    voice: p.voice,
    seed: p.seed,
    meter: p.meter || DEFAULT_METER,
    ...(p.tempoRatio ? { tempoRatio: p.tempoRatio } : {}),
    lanes: (p.lanes ?? BASE_LANES).slice(),
    perc: { ...p.perc },
    bbLane: p.bbLane || 's',
    hasRide: !!p.hasRide,
    hasHat: !!p.hasHat,
    pins: clonePins(p.pins),
    ...(p.sticking ? { sticking: p.sticking.slice() } : {}),
    ...(p.fixed ? { fixed: true } : {}),
    ...(p.poly ? { poly: clonePoly(p.poly) } : {}),
    ...(p.polySpans?.length ? { polySpans: p.polySpans.map(clonePolySpan) } : {}),
    ...(p.tuplets?.length ? { tuplets: p.tuplets.map(cloneTuplet) } : {}),
    backbeats: p.backbeats.slice(),
    bars: p.bars.map(cloneBar),
  };
}

export function meterOfPat(p: Pattern | null | undefined): Meter {
  return meterOf(p?.meter ?? DEFAULT_METER);
}

export function patSteps(p: Pattern | null | undefined): number {
  if (p?.bars?.[0]) return p.bars[0].k.length;
  return stepsOf(meterOfPat(p));
}

/* ---- pins ----------------------------------------------------------
   Layers are a derived view: the break is stored full and each layer is
   re-derived from it, which is what lets you drop to L2 and back without
   losing anything. The catch was that a note added while looking at L2 got
   derived straight back out again — you drew a ghost note and heard nothing,
   because ghosts do not exist below L4. A pin records the layer a note was
   placed at, and the reduction leaves it alone from that layer up. So a ghost
   added at L2 is a ghost the L2 view keeps.
   -------------------------------------------------------------------- */

export function pinArray(pat: Pattern, bi: number, lane: LaneKey, make: true): number[];
export function pinArray(pat: Pattern, bi: number, lane: LaneKey, make?: false): number[] | null;
export function pinArray(pat: Pattern, bi: number, lane: LaneKey, make?: boolean): number[] | null {
  if (!pat.pins) {
    if (!make) return null;
    pat.pins = [];
  }
  let b = pat.pins[bi];
  if (!b) {
    if (!make) return null;
    b = pat.pins[bi] = {};
  }
  let a = b[lane];
  if (!a) {
    if (!make) return null;
    a = b[lane] = zeros(patSteps(pat));
  }
  return a;
}

export function setPin(pat: Pattern, bi: number, lane: LaneKey, i: number, level: number): void {
  pinArray(pat, bi, lane, true)[i] = level;
}

export function clonePins(pins: Pins | null): Pins | null {
  if (!pins) return null;
  return pins.map((b) => {
    if (!b) return b;
    const o: Partial<Record<LaneKey, number[]>> = {};
    for (const k of Object.keys(b) as LaneKey[]) {
      const arr = b[k];
      if (arr) o[k] = arr.slice();
    }
    return o;
  });
}

/* ---- sticking ------------------------------------------------------
   The hands written under the notes (D44). A bar's row is a string, so a
   copy of the array is a copy of the sticking: nothing edits a row in place.
   -------------------------------------------------------------------- */

/** A written hand: `R` lead, `L` other; lower case keeps the graces on that hand. */
export type WrittenHand = 'R' | 'L' | 'r' | 'l';

/** The hand written at a step of a bar, or null where nothing is. */
export function stickingAt(
  sticking: Sticking | null | undefined,
  bi: number,
  i: number
): WrittenHand | null {
  const ch = sticking?.[bi]?.[i];
  return ch === 'R' || ch === 'L' || ch === 'r' || ch === 'l' ? ch : null;
}

/**
 * A sticking row as a bar of `n` steps reads it: cut or padded with `.`, and
 * anything that is not a hand read as no hand. Null when it writes none.
 */
export function stickingRow(row: string | null | undefined, n: number): string | null {
  if (!row) return null;
  const out = row
    .slice(0, n)
    .replace(/[^RLrl]/g, '.')
    .padEnd(n, '.');
  return /[RLrl]/.test(out) ? out : null;
}

/**
 * The sticking `before` wrote that still belongs to `after`'s bars: a bar's
 * row where that bar's notes are unchanged, none where they moved. Whatever
 * rewrites bars from a pattern (building B, a doctor's move) keeps the hands
 * only where the notes they were written for are still there.
 */
export function keptSticking(before: Pattern, after: Pattern): Sticking | null {
  if (!before.sticking) return null;
  const same = (a: Bar | undefined, b: Bar | undefined): boolean =>
    !!a && !!b && (Object.keys(a) as LaneKey[]).every((L) => a[L].join() === b[L]?.join());
  return tidySticking(
    after.bars.map((bar, bi) =>
      same(before.bars[bi], bar) ? (before.sticking?.[bi] ?? null) : null
    )
  );
}

/**
 * Take the written hands off one bar of `p`, in place: its notes were edited,
 * and the hands were written for the old ones. `p` must be a clone.
 */
export function dropBarSticking(p: Pattern, bi: number): void {
  if (!p.sticking?.[bi]) return;
  p.sticking[bi] = null;
  const kept = tidySticking(p.sticking);
  if (kept) p.sticking = kept;
  else delete p.sticking;
}

/** Sticking with no bar left that writes anything is no sticking at all. */
export function tidySticking(sticking: Sticking | null | undefined): Sticking | null {
  return sticking?.some(Boolean) ? sticking : null;
}

/* ---- roster --------------------------------------------------------- */

/** Which lanes the user has turned on by hand, when they are not following the style. */
export interface CustomLanes {
  toms?: boolean;
  p1?: string;
  p2?: string;
}

/**
 * The lanes this pattern should have: the style's own set, or yours.
 *
 * The foot follows the style even when the rest of the kit does not — without
 * it a jazz groove loses the only thing marking 2 and 4.
 */
export function resolveLanes(
  st: Style | undefined,
  custom: CustomLanes | null
): { lanes: LaneKey[]; perc: Partial<Record<PercLaneKey, string>> } {
  if (!custom) return { lanes: laneRoster(st), perc: percRoster(st) };

  const lanes = BASE_LANES.slice();
  if (custom.toms) lanes.push(...TOM_LANES);
  if (st?.foot || st?.backbeatLane === FOOT_LANE) lanes.push(FOOT_LANE);
  const perc = percRoster(st);
  PERC_LANES.forEach((L) => {
    const inst = custom[L];
    if (inst) {
      lanes.push(L);
      perc[L] = inst;
    }
  });
  return { lanes, perc };
}

/* ---- percussion ----------------------------------------------------- */

/**
 * Writes the percussion parts.
 *
 * A spec is one of: explicit `steps`, an ostinato `every` n steps, or `follow`
 * — the clave the cross-stick is already playing, or every snare accent, which
 * is how a clap gets layered onto a backbeat.
 */
const FILL_FROM = new WeakMap<Bar, number>();

/**
 * Where a written fill starts in a bar. Percussion mounted on the kit (a
 * cowbell, a block) is played by a hand the fill needs, so {@link writePerc}
 * leaves it out from there, the way the fill lifts that hand off the hats.
 */
export function markFill(bar: Bar, from: number): void {
  const was = FILL_FROM.get(bar);
  FILL_FROM.set(bar, was === undefined ? from : Math.min(was, from));
}

/** A copy of a bar that keeps where its written fill starts, if it has one. */
export function cloneBarKeepingFill(bar: Bar): Bar {
  const copy = cloneBar(bar);
  const from = FILL_FROM.get(bar);
  if (from !== undefined) FILL_FROM.set(copy, from);
  return copy;
}

export function writePerc(pat: Pattern, style: Style, rng?: Rng): void {
  const m = meterOfPat(pat);
  const n = stepsOf(m);
  const specs = style.perc ?? [];

  PERC_LANES.forEach((L, li) => {
    if (!pat.lanes.includes(L)) return;
    const inst = pat.perc?.[L] ?? DEFAULT_PERC[li];
    const spec = specs[li] ?? PERC_DEFAULT_SPEC[inst] ?? { every: 2, accentPulse: true };

    for (const b of pat.bars) {
      let hits: number[] = [];
      if (spec.steps) hits = spec.steps.slice();
      else if (spec.every) {
        for (let i = spec.from ?? 0; i < n; i += spec.every) hits.push(i);
      } else if (spec.follow === 'backbeats') hits = pat.backbeats.slice();
      else if (spec.follow === 'snare') {
        for (let i = 0; i < n; i++) if (b.s[i] >= 2) hits.push(i);
      }

      // a hand on the kit's percussion is wanted for the fill
      const until = percInst(inst).kit ? (FILL_FROM.get(b) ?? n) : n;
      for (const i of hits) {
        if (i < 0 || i >= until) continue;
        if (spec.drop && rng && rng() < spec.drop) continue;
        b[L][i] = 1;
      }

      // accents: named steps, or the top of every pulse
      if (spec.accents) {
        for (const i of spec.accents) if (i < n && b[L][i]) b[L][i] = 2;
      } else if (spec.accentPulse) {
        for (let i = 0; i < n; i++) if (b[L][i] && isGroupStart(m, i)) b[L][i] = 2;
      }
    }
  });
}

/* ---- the library's string notation ----------------------------------- */

/** One bar written as strings — how the famous-break library is transcribed. */
export interface BarSpec {
  /** `X` hit · `A` accent */
  k?: string;
  /** `g` ghost · `s` hit · `S` accent · `c` cross-stick · `r` rimshot · `f` flam · `d` drag · `z` buzz */
  s?: string;
  /** `x` closed · `X` accent · `o` open · `h` half-open */
  h?: string;
  /** `r` ride · `b` bell */
  r?: string;
  /** `C` crash · `2` crash 2 · `N` china · `S` splash */
  c?: string;
  /** `X` hit · `A` accent · `F` flam, on each tom */
  t1?: string;
  t2?: string;
  t3?: string;
  /** `f` chick */
  hf?: string;
  /** `X` hit · `O` open or high stroke, in the percussion slots (a bell timeline) */
  p1?: string;
  p2?: string;
  /**
   * Not a lane: the sticking written under the bar, `R`/`L` (or `r`/`l`, the
   * graces on the same hand) a step and `.` for none (D44). `parseBar` leaves
   * it to {@link patternFromLibrary}.
   */
  hands?: string;
}

/**
 * Parse a transcribed bar. `.` is empty, and any character the lane's map does
 * not name is ignored, so a spec can be padded out for readability.
 *
 * Toms and the hi-hat foot are written rather than generated: a transcription
 * needs them (*By the Way* is on the floor tom, *Seven Nation Army* has no hat
 * in the hands at all) and the generator has no opinion about where they go. A
 * spec that leaves them out keeps the five-lane kit.
 */
export function parseBar(spec: BarSpec, n?: number): Bar {
  const len = n ?? STEPS;
  const b = emptyBar(len);
  for (const lane of Object.keys(SPEC_CHARS) as LaneKey[]) {
    const str = spec[lane];
    if (str)
      parseRow(lane, str)
        .slice(0, len)
        .forEach((v, i) => (b[lane][i] = v));
  }
  return b;
}

/** Each lane's characters in a {@link BarSpec}, and the values they stand for. */
const SPEC_CHARS: Record<LaneKey, Record<string, number>> = {
  k: { X: 1, A: 2 },
  s: { g: 1, s: 2, S: 3, c: 4, r: 5, f: 6, d: 7, z: 8 },
  h: { x: 1, X: 2, o: 3, h: 4 },
  r: { r: 1, b: 2 },
  c: { C: 1, '2': 2, N: 3, S: 4 },
  t1: { X: 1, A: 2, F: 3 },
  t2: { X: 1, A: 2, F: 3 },
  t3: { X: 1, A: 2, F: 3 },
  hf: { f: 1 },
  p1: { X: 1, O: 2 },
  p2: { X: 1, O: 2 },
};

/**
 * One lane's row in the library's characters, as values: what a bar's lane
 * is read as, and a tuplet's notes (12-d). A character the lane does not
 * name is a rest.
 */
export function parseRow(lane: LaneKey, str: string): number[] {
  return [...str].map((ch) => SPEC_CHARS[lane][ch] ?? 0);
}

/**
 * The snapshot a pattern carries, taken off a style.
 *
 * Explicit field-by-field rather than a spread, so that adding a field to
 * {@link Style} does not silently widen what every share code carries — the
 * wire format is a compatibility surface and growing it should be a decision.
 */
export function styleAttrs(style: StyleAttrs | undefined): StyleAttrs {
  if (!style) return {};
  const out: StyleAttrs = {};
  if (style.feel) out.feel = style.feel;
  if (style.swingUnit != null) out.swingUnit = style.swingUnit;
  if (style.kickFeather != null) out.kickFeather = style.kickFeather;
  if (style.targetDensity != null) out.targetDensity = style.targetDensity;
  if (style.hatDepth != null) out.hatDepth = style.hatDepth;
  if (style.doubleKick) out.doubleKick = true;
  if (style.oneHandHats) out.oneHandHats = true;
  if (style.heelToe) out.heelToe = true;
  if (style.echo) out.echo = style.echo;
  return out;
}
