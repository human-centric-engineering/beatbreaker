import { LANES, TOM_LANES, bbValue } from '@/lib/app/breaks/lanes';
import { isGroupStart, stepsOf, stepsPerQuarter } from '@/lib/app/breaks/meter';
import { cloneBar, clonePolySpan, markFill } from '@/lib/app/breaks/pattern';
import { makeRng, wpick } from '@/lib/app/breaks/rng';
import type {
  Bar,
  Figure,
  LaneKey,
  Meter,
  Pattern,
  PolyFill,
  PolySpan,
  Style,
  TupletSpan,
} from '@/lib/app/breaks/types';

/**
 * Polyrhythmic fills (Phase 12, 12-c, plan §6).
 *
 * A drummer known for a device plays it at the end of a phrase: threes of
 * 16ths running over the bar line, a 3/4 laid over the last bars of a 4/4,
 * dotted quarters against the pulse. Each is one cell repeated and counted
 * back from the bar line, so the cycle comes round on the next 1, which is
 * how a drummer places one: it is the landing that makes it a figure rather
 * than a drummer who has lost the one.
 *
 * Only a style that has {@link Style.polyFills} draws for one, on a stream of
 * its own, so every other style writes the bytes it always did. What is
 * written is recorded on the pattern as a {@link PolySpan}: the critic judges
 * the span as a fill, the layers play it whole or not at all, and `fitHands`
 * keeps its accents.
 */

/* Salts the poly-fill draw off the seed, as `articulate` and the song draw
   are salted: the generator's own stream never sees it. */
const POLY_SALT = 0x3c6ef372;

/**
 * A seed with its bits stirred (murmur3's finaliser). xorshift's first draw
 * barely moves between neighbouring seeds, and this stream's first draw is
 * the whole decision, so seeds 1, 2, 3 would all decide alike without it.
 */
function mixSeed(seed: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** The lanes a fill's hands take over: whatever they were playing stops. */
const FILL_HANDS: LaneKey[] = ['s', 'h', 'r', 'c', ...TOM_LANES];
/** The lanes the hands leave for a figure laid over the time: the cymbal keeps going. */
const COMP_HANDS: LaneKey[] = ['s', ...TOM_LANES];

/**
 * A snare value as the tom it is moved to: an accent an accent, anything else
 * a plain hit. A tom has no ghost, and its value 3 is a flam, two hands.
 */
function onTom(v: number): number {
  return v === 3 ? 2 : v ? 1 : 0;
}

/** A tom value as the snare it is moved to: an accent an accent, a hit a hit. */
function offTom(v: number): number {
  return v === 2 ? 3 : v ? 2 : 0;
}

/** Steps from one cell to the next: the cell's longest row. */
export function cellLength(cell: Figure): number {
  return Math.max(0, ...Object.values(cell).map((row) => row?.length ?? 0));
}

/** Steps from one cell of a poly fill to the next: its row's length, or a tuplet's steps (12-d). */
export function cellSteps(pf: Pick<PolyFill, 'cell' | 'tupletSteps'>): number {
  return pf.tupletSteps ?? cellLength(pf.cell);
}

/** How many steps a poly fill covers. */
export function polyFillSpan(pf: Pick<PolyFill, 'cell' | 'cells' | 'tupletSteps'>): number {
  return cellSteps(pf) * pf.cells;
}

/**
 * Whether a cell of `every` steps is the meter's own pulse rather than set
 * against it: its accents fall on the meter's pulses in every bar. A 3/4
 * cycle in a 3/4 song is the bar, and dotted quarters in 12/8 are its beat.
 */
function isTheMeter(every: number, m: Meter): boolean {
  const n = stepsOf(m);
  if (n % every !== 0) return false;
  for (let i = 0; i < n; i += every) if (!isGroupStart(m, i)) return false;
  return true;
}

/**
 * Whether a poly fill can be written at the end of a phrase of `bars` bars in
 * `m`: it reaches back over one bar line at most, never into the first bar,
 * whose 1 starts the break, and it is set against the meter rather than
 * being its pulse.
 */
export function polyFillFits(pf: PolyFill, m: Meter, bars: number): boolean {
  const n = stepsOf(m);
  const span = polyFillSpan(pf);
  /* A tuplet's cells are spans, which stay inside their bars (12-d): counted
     back from the bar line, they never straddle one only where they divide it. */
  const placed = pf.tupletSteps ? n % pf.tupletSteps === 0 : !isTheMeter(cellLength(pf.cell), m);
  return span > 0 && span <= 2 * n && span <= (bars - 1) * n && placed;
}

/** The steps a span's accents fall on, from its start: one a cell. */
export function spanAccents(s: Pick<PolySpan, 'span' | 'every'>): number[] {
  const out: number[] = [];
  for (let t = 0; t < s.span; t += s.every) out.push(t);
  return out;
}

/** A step of a span, from its start, as the bar and step it falls on. */
function cellOf(s: Pick<PolySpan, 'bar' | 'at'>, t: number, n: number): [number, number] {
  const abs = s.bar * n + s.at + t;
  return [Math.floor(abs / n), abs % n];
}

/**
 * Whether a span sits inside a pattern of `bars` bars of `n` steps and ends
 * on a bar line. A span that does not is ignored, not trusted: it is how a
 * mark that no longer fits its notes, or arrived from outside, is read.
 */
export function spanFits(s: PolySpan, n: number, bars: number): boolean {
  return (
    s.every > 0 &&
    s.span % s.every === 0 &&
    s.at < n &&
    s.bar * n + s.at + s.span <= bars * n &&
    (s.at + s.span) % n === 0
  );
}

/** Whether two spans share a step, in a pattern of bars `n` steps long. */
export function overlaps(a: PolySpan, b: PolySpan, n: number): boolean {
  const from = (s: PolySpan) => s.bar * n + s.at;
  return from(a) < from(b) + b.span && from(b) < from(a) + a.span;
}

/** A lane's notes over a span's steps, as the bars have them. */
export function spanRow(pat: Pick<Pattern, 'bars'>, s: PolySpan, lane: LaneKey): number[] {
  const n = pat.bars[0]?.k.length ?? 0;
  return Array.from({ length: s.span }, (_, t) => {
    const [b, i] = cellOf(s, t, n);
    return pat.bars[b]?.[lane][i] ?? 0;
  });
}

/** The spans of a pattern that fit it. */
export function spansOf(pat: Pick<Pattern, 'polySpans' | 'bars'>): PolySpan[] {
  const n = pat.bars[0]?.k.length ?? 0;
  return (pat.polySpans ?? []).filter((s) => spanFits(s, n, pat.bars.length));
}

/** The steps of bar `bi` a pattern's poly fills cover. */
export function spanStepsIn(pat: Pick<Pattern, 'polySpans' | 'bars'>, bi: number): Set<number> {
  const n = pat.bars[0]?.k.length ?? 0;
  const out = new Set<number>();
  for (const s of spansOf(pat)) {
    for (let t = 0; t < s.span; t++) {
      const [b, i] = cellOf(s, t, n);
      if (b === bi) out.add(i);
    }
  }
  return out;
}

/**
 * The lanes a pattern's poly fills wrote on their accents in bar `bi`, by
 * step: those that play something else than the span's plain rows. A lane
 * the figure left as it was — the groove's crash, a clave — is not the figure.
 */
export function accentLanesIn(
  pat: Pick<Pattern, 'polySpans' | 'bars'>,
  bi: number
): Map<number, Set<LaneKey>> {
  const n = pat.bars[0]?.k.length ?? 0;
  const out = new Map<number, Set<LaneKey>>();
  for (const s of spansOf(pat)) {
    for (const t of spanAccents(s)) {
      const [b, i] = cellOf(s, t, n);
      if (b !== bi) continue;
      for (const [lane, row] of Object.entries(s.plain) as Array<[LaneKey, number[] | undefined]>) {
        if (!row || !pat.bars[b][lane][i] || row[t] === pat.bars[b][lane][i]) continue;
        const at = out.get(i) ?? new Set<LaneKey>();
        at.add(lane);
        out.set(i, at);
      }
    }
  }
  return out;
}

/**
 * Where bar `bar`'s step `step` falls in a span that has a plain row for
 * `lane`: what layers below 4 play there instead of the stored note.
 */
function plainCells(
  pat: Pattern,
  bar: number,
  lane: LaneKey,
  step: number
): Array<[number[], number]> {
  const n = pat.bars[0]?.k.length ?? 0;
  const out: Array<[number[], number]> = [];
  for (const s of spansOf(pat)) {
    const t = bar * n + step - (s.bar * n + s.at);
    const row = s.plain[lane];
    if (t >= 0 && t < s.span && row?.length === s.span) out.push([row, t]);
  }
  return out;
}

/** The note layers below 4 play at a cell of a span's plain rows, or 0 outside one. */
export function plainAt(pat: Pattern, bar: number, lane: LaneKey, step: number): number {
  return plainCells(pat, bar, lane, step).reduce((v, [row, t]) => v || row[t], 0);
}

/**
 * Clear a cell of the spans' plain rows, in place: a note you take out at a
 * layer below 4 is one that layer stops playing, though it is not stored on
 * the bars.
 */
export function clearPlainAt(pat: Pattern, bar: number, lane: LaneKey, step: number): void {
  for (const [row, t] of plainCells(pat, bar, lane, step)) row[t] = 0;
}

export interface PolyFillContext {
  meter: Meter;
  /** The lanes the pattern carries: a tom it has not got is played on the snare. */
  lanes: LaneKey[];
  /** The style's backbeats, which on a clave style are the clave's strokes. */
  backbeats: number[];
  /** A clave style: the clave's strokes are the groove, and the fill leaves them be. */
  clave?: boolean;
  /** The value a clave stroke has on the snare. */
  claveValue?: number;
  /** A double pedal: a run of kicks is two feet's, and stays. */
  doubleKick?: boolean;
}

/** The context a style writes its poly fills in. */
export function polyFillContext(
  style: Style,
  meter: Meter,
  lanes: LaneKey[],
  backbeats: number[]
): PolyFillContext {
  return {
    meter,
    lanes,
    backbeats,
    clave: style.clave,
    claveValue: bbValue('s', style),
    doubleKick: style.doubleKick,
  };
}

/**
 * Write a poly fill to end on the bar line after bar `end`, in place, and
 * land it on the next 1: a crash, and the kick under it. Returns the span it
 * wrote, or null where it does not fit.
 *
 * On a clave style the clave's strokes in the span are written back after it,
 * as a plain fill's are (`cellPhrase`): the clave is the identity of the
 * groove, and a figure laid across it does not get to move it.
 */
export function writePolyFill(
  bars: Bar[],
  end: number,
  pf: PolyFill,
  ctx: PolyFillContext,
  tuplets?: TupletSpan[]
): PolySpan | null {
  const n = bars[0]?.k.length ?? 0;
  const every = cellSteps(pf);
  const span = every * pf.cells;
  if (!every || end < 1 || end >= bars.length || span > 2 * n || span > end * n) return null;
  /* A tuplet fill (12-d) writes spans, and needs somewhere to put them; it
     never goes on a clave style, whose strokes would sit under a span that
     owns the snare. */
  const tuplet = pf.tupletSteps !== undefined;
  if (tuplet && (!tuplets || ctx.clave || n % every !== 0)) return null;
  const start = (end + 1) * n - span;
  const where = { bar: Math.floor(start / n), at: start % n };
  const cell = (t: number) => cellOf(where, t, n);
  const before = bars.map(cloneBar);

  // a tom the pattern has not got is played on the snare, or it would be there and not drawn
  const onKit = (L: LaneKey): LaneKey =>
    TOM_LANES.includes(L) && !ctx.lanes.includes(L) ? 's' : L;
  const toms = (pf.orchestrate ?? []).map(onKit);
  const cleared = pf.time ? COMP_HANDS : FILL_HANDS;
  const ownKick = !!pf.cell.k || pf.kick === 'pulse';
  for (let t = 0; t < span; t++) {
    const [b, i] = cell(t);
    for (const L of cleared) bars[b][L][i] = 0;
    if (ownKick) bars[b].k[i] = 0;
  }
  for (let c = 0; c < pf.cells; c++) {
    const notes: Partial<Record<LaneKey, number[]>> = {};
    for (const [lane, row] of Object.entries(pf.cell) as Array<[LaneKey, string | undefined]>) {
      if (!row) continue;
      const to = lane === 's' && toms.length ? toms[c % toms.length] : onKit(lane);
      [...row].forEach((ch, j) => {
        if (ch === '.') return;
        const v = Number(ch);
        const value = to === lane ? v : lane === 's' ? onTom(v) : offTom(v);
        if (tuplet) {
          const r = notes[to] ?? Array<number>(row.length).fill(0);
          r[j] = value;
          notes[to] = r;
          return;
        }
        const [b, i] = cell(c * every + j);
        bars[b][to][i] = value;
      });
    }
    if (tuplet && Object.keys(notes).length) {
      const [b, i] = cell(c * every);
      tuplets?.push({ bar: b, start: i, span: every, n: cellLength(pf.cell), notes });
    }
  }
  if (pf.kick === 'pulse' && !(tuplet && pf.cell.k)) {
    for (let t = 0; t < span; t++) {
      const [b, i] = cell(t);
      if (isGroupStart(ctx.meter, i)) bars[b].k[i] = bars[b].k[i] || 1;
    }
  }
  /* The figure's first kicks are the figure's: a groove kick just before
     them that would make three 16ths in a row on one foot goes. */
  if (ownKick && !ctx.doubleKick) {
    const k = (t: number) => {
      const [b, i] = cell(t);
      return bars[b]?.k[i] ?? 0;
    };
    for (const t of [-1, -2]) {
      if (start + t >= 0 && k(t) && k(t + 1) && k(t + 2)) {
        const [b, i] = cell(t);
        bars[b].k[i] = 0;
      }
    }
  }
  /* Comping over the time: where the plain fill this took the place of had
     lifted the hand off the cymbal, the time comes back, as the nearest bar
     before the span that still keeps it played it. */
  const keepsTime = (b: Bar) => b.h.filter(Boolean).length + b.r.filter(Boolean).length >= 2;
  if (pf.time) {
    const src = bars.slice(0, where.bar).reverse().find(keepsTime) ?? bars[0];
    for (let t = 0; t < span; t++) {
      const [b, i] = cell(t);
      if (bars[b].h[i] || bars[b].r[i] || bars[b].c[i]) continue;
      bars[b].h[i] = src.h[i];
      bars[b].r[i] = src.r[i];
    }
  }
  if (ctx.clave) {
    for (let t = 0; t < span; t++) {
      const [b, i] = cell(t);
      if (ctx.backbeats.includes(i)) bars[b].s[i] = ctx.claveValue ?? 2;
    }
  }
  // the kit's percussion leaves off where the hands go to the fill
  markFill(bars[where.bar], where.at);
  if (where.bar < end) markFill(bars[end], 0);

  // landing: the next 1 — the phrase's first bar, where the loop comes round
  const next = bars[(end + 1) % bars.length];
  next.c[0] = 1;
  next.k[0] = next.k[0] || 1;
  next.h[0] = 0;
  next.r[0] = 0;

  const plain: Partial<Record<LaneKey, number[]>> = {};
  for (const L of LANES) {
    const row: number[] = [];
    let changed = false;
    for (let t = 0; t < span; t++) {
      const [b, i] = cell(t);
      row.push(before[b][L][i]);
      if (before[b][L][i] !== bars[b][L][i]) changed = true;
    }
    if (changed) plain[L] = row;
  }
  return {
    ...where,
    span,
    device: pf.device,
    ...(pf.ratio ? { ratio: pf.ratio } : {}),
    every,
    plain,
  };
}

/**
 * Draw for a poly fill at the end of the phrase, and write it (12-c).
 *
 * The draw is on a stream salted off the seed, and a style without
 * {@link Style.polyFill} draws nothing at all, so the generator's own stream
 * and every other style's output are untouched. It takes the place of
 * whatever the phrase ended on: a plain fill, comping, or nothing.
 */
export function addPolyFill(
  bars: Bar[],
  style: Style,
  seed: number,
  ctx: PolyFillContext,
  tuplets?: TupletSpan[]
): PolySpan[] {
  const p = style.polyFill ?? 0;
  const table = style.polyFills ?? [];
  if (!p || !table.length || bars.length < 2) return [];
  const rng = makeRng(mixSeed(seed ^ POLY_SALT));
  if (rng() >= p) return [];
  const fits = table.filter(([pf]) => polyFillFits(pf, ctx.meter, bars.length));
  if (!fits.length) return [];
  const span = writePolyFill(bars, bars.length - 1, wpick(rng, fits), ctx, tuplets);
  return span ? [span] : [];
}

/**
 * A style's poly fills carried into another meter, by the quarter note: the
 * figure keeps its note values. A cell whose notes no longer fall on the grid
 * — threes of 16ths in a bar of eighths — is dropped, not rounded into some
 * other figure.
 */
export function polyFillsIn(
  list: Array<[PolyFill, number]>,
  from: Meter,
  to: Meter
): Array<[PolyFill, number]> {
  const r = stepsPerQuarter(to) / stepsPerQuarter(from);
  if (r === 1) return list;
  const out: Array<[PolyFill, number]> = [];
  for (const [pf, w] of list) {
    // a tuplet's notes are spread over its steps, so only the steps move (12-d)
    if (pf.tupletSteps !== undefined) {
      const steps = pf.tupletSteps * r;
      if (Number.isInteger(steps) && steps >= 1 && steps % cellLength(pf.cell) !== 0)
        out.push([{ ...pf, tupletSteps: steps }, w]);
      continue;
    }
    const len = cellLength(pf.cell) * r;
    if (!Number.isInteger(len) || len < 1) continue;
    let ok = true;
    const cell: Figure = {};
    for (const [lane, row] of Object.entries(pf.cell) as Array<[LaneKey, string | undefined]>) {
      if (!row) continue;
      const steps = Array<string>(len).fill('.');
      [...row].forEach((ch, j) => {
        if (ch === '.') return;
        if (!Number.isInteger(j * r)) ok = false;
        else steps[j * r] = ch;
      });
      cell[lane] = steps.join('');
    }
    if (ok) out.push([{ ...pf, cell }, w]);
  }
  return out;
}

/**
 * The bars of a pattern with each poly fill's span playing what it played
 * before, the plain fill or the groove: what the layers below 4 build on. A
 * note you pinned at or below `level` keeps what you put there.
 */
export function withPlainSpans(pat: Pattern, level: number): Bar[] {
  const bars = pat.bars.map(cloneBar);
  const n = bars[0]?.k.length ?? 0;
  for (const s of spansOf(pat)) {
    for (const [lane, row] of Object.entries(s.plain) as Array<[LaneKey, number[] | undefined]>) {
      if (!row || row.length !== s.span) continue;
      row.forEach((v, t) => {
        const [b, i] = cellOf(s, t, n);
        const pin = pat.pins?.[b]?.[lane]?.[i];
        if (!(pin && level >= pin)) bars[b][lane][i] = v;
      });
    }
  }
  return bars;
}

/** The hand lanes and the kick, whose notes on a span's accents are the figure. */
const FIGURE_LANES: LaneKey[] = ['k', 's', 'c', ...TOM_LANES];

/**
 * The spans of `before` that `after` still plays: those whose accents are the
 * same notes. A span whose accents were edited away is not the figure any
 * more, and the critic judges those steps as the groove again.
 */
export function keptPolySpans(before: Pattern, after: Pattern): PolySpan[] | null {
  const n = before.bars[0]?.k.length ?? 0;
  if ((after.bars[0]?.k.length ?? 0) !== n) return null;
  // bars added or taken away elsewhere leave a span whose own bars are still there
  const kept = spansOf(before).filter((s) =>
    spanAccents(s).every((t) => {
      const [b, i] = cellOf(s, t, n);
      return (
        b < after.bars.length &&
        FIGURE_LANES.every((L) => before.bars[b][L][i] === after.bars[b][L][i])
      );
    })
  );
  return kept.length ? kept.map(clonePolySpan) : null;
}

/** Keep on `after`, in place, the spans of `before` it still plays. */
export function keepPolySpans(before: Pattern, after: Pattern): void {
  const spans = keptPolySpans(before, after);
  if (spans) after.polySpans = spans;
  else delete after.polySpans;
}
