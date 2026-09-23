import {
  BASE_LANES,
  DEFAULT_PERC,
  FOOT_LANE,
  PERC_DEFAULT_SPEC,
  PERC_LANES,
  TOM_LANES,
  laneRoster,
  percRoster,
} from '@/lib/app/breaks/lanes';
import { DEFAULT_METER, STEPS, isGroupStart, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import type { Rng } from '@/lib/app/breaks/rng';
import type {
  Bar,
  LaneKey,
  Meter,
  Pattern,
  PercLaneKey,
  Pins,
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

export function clonePattern(p: Pattern): Pattern {
  return {
    name: p.name,
    style: p.style,
    styleVersionId: p.styleVersionId ?? null,
    /* Shallow on purpose: the snapshot is immutable — nothing in the app edits
       a pattern's `attrs`, it replaces them when the style changes. Cloning the
       feel table on every undo step would be copying a constant. */
    attrs: p.attrs ?? {},
    voice: p.voice,
    seed: p.seed,
    meter: p.meter || DEFAULT_METER,
    lanes: (p.lanes ?? BASE_LANES).slice(),
    perc: { ...p.perc },
    bbLane: p.bbLane || 's',
    hasRide: !!p.hasRide,
    hasHat: !!p.hasHat,
    pins: clonePins(p.pins),
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

      for (const i of hits) {
        if (i < 0 || i >= n) continue;
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
  /** `g` ghost · `s` hit · `S` accent · `c` cross-stick */
  s?: string;
  /** `x` closed · `X` accent · `o` open */
  h?: string;
  /** `r` ride · `b` bell */
  r?: string;
  /** `C` crash */
  c?: string;
  t1?: string;
  t2?: string;
  t3?: string;
  /** `f` chick */
  hf?: string;
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

  const put = (lane: LaneKey, str: string | undefined, map: Record<string, number>): void => {
    if (!str) return;
    for (let i = 0; i < len && i < str.length; i++) {
      const v = map[str[i]];
      if (v) b[lane][i] = v;
    }
  };

  put('k', spec.k, { X: 1, A: 2 });
  put('s', spec.s, { g: 1, s: 2, S: 3, c: 4 });
  put('h', spec.h, { x: 1, X: 2, o: 3 });
  put('r', spec.r, { r: 1, b: 2 });
  put('c', spec.c, { C: 1 });
  put('t1', spec.t1, { X: 1, A: 2 });
  put('t2', spec.t2, { X: 1, A: 2 });
  put('t3', spec.t3, { X: 1, A: 2 });
  put('hf', spec.hf, { f: 1 });
  return b;
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
  return out;
}
