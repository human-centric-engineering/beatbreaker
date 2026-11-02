import { DEFAULT_METER, meterOf, stepSeconds } from '@/lib/app/breaks/meter';
import {
  MAX_BREAK_BARS,
  MAX_RATIO_SPREAD,
  MAX_TEMPO_RATIO,
  MIN_TEMPO_RATIO,
  ratioOf,
} from '@/lib/app/breaks/sections';
import type { MaybeSections } from '@/lib/app/breaks/sections';
import type { Meter, Pattern } from '@/lib/app/breaks/types';

/**
 * A section's tempo map (16-b-ii, D82): the record's own changes of speed
 * inside a part of it, a bar that steps up, a run of bars that speeds up or
 * slows down.
 *
 * **Relative, as a section's ratio is.** A point's ratio is to the section's
 * own tempo (the break's, times the section's `tempoRatio`), so the slider,
 * the trainer's ramp and a speed record still move one number and the whole
 * song follows: Limelight's ritardando at 131 is the same ritardando at 100.
 *
 * **A point holds, or ramps.** From the first step of its bar the section
 * plays at the point's `ratio`, to the next point or the section's end. With
 * `to` it does not hold: it moves evenly, a step at a time, from `ratio` on
 * its first step to `to` on its last. So a ritardando and then _a tempo_ is
 * two points, `{ bar: 8, ratio: 1, to: 0.8 }` and `{ bar: 12, ratio: 1 }`,
 * and a ritardando to the end is one. Before the first point the section
 * plays at ×1.
 *
 * Each step plays at the tempo it starts at, so a ramp is a staircase a step
 * tall: the transport, the critic's limbs and the MIDI file all hear the same
 * steps at the same lengths.
 */
export interface TempoPoint {
  /** The bar it starts at. */
  bar: number;
  /** The section's tempo from here, as a ratio of its own: ×1 is the section's tempo. */
  ratio: number;
  /** Where a ramp gets to, on the last step before the next point or the section's end. */
  to?: number;
}

/** A section's tempo map, its points in bar order. */
export type TempoMap = TempoPoint[];

/** At most a point a bar. */
export const MAX_TEMPO_POINTS = MAX_BREAK_BARS;

type Mapped = Pick<Pattern, 'tempoRatio' | 'tempo' | 'bars'>;

/** Whether a number is a ratio a point may hold: ×¼ to ×4, ×1 included (back to the section's tempo). */
export function isPointRatio(r: unknown): r is number {
  return (
    typeof r === 'number' && Number.isFinite(r) && r >= MIN_TEMPO_RATIO && r <= MAX_TEMPO_RATIO
  );
}

/**
 * What is wrong with a tempo map for a section of `bars` bars, or null when
 * nothing is: every way in (the catalogue, the wire, BeatBuddy) asks this.
 */
export function tempoMapProblem(map: readonly TempoPoint[], bars: number): string | null {
  if (map.length > MAX_TEMPO_POINTS) return `a tempo map has ${MAX_TEMPO_POINTS} points at most`;
  for (let i = 0; i < map.length; i++) {
    const p = map[i];
    if (!Number.isInteger(p.bar) || p.bar < 0 || p.bar >= bars)
      return `a tempo point is at one of the section's ${bars} bars, counted from 0`;
    if (!isPointRatio(p.ratio) || (p.to !== undefined && !isPointRatio(p.to)))
      return 'a tempo point is from ×¼ to ×4 of the section';
    if (i > 0 && p.bar <= map[i - 1].bar) return 'tempo points go in bar order, one to a bar';
  }
  return null;
}

/** Steps in bars `from` to `to` (not counting `to`). */
function stepsIn(bars: Mapped['bars'], from: number, to: number): number {
  let n = 0;
  for (let b = from; b < to; b++) n += bars[b]?.k.length ?? 0;
  return n;
}

/**
 * The ratio, of the section's tempo, that step `step` of bar `bar` starts at:
 * the point in force there, and along a ramp, how far through its steps it
 * is.
 */
export function mapRatioAt(pat: Mapped, bar: number, step: number): number {
  const map = pat.tempo;
  if (!map?.length) return 1;
  let i = -1;
  while (i + 1 < map.length && map[i + 1].bar <= bar) i++;
  if (i < 0) return 1;
  const p = map[i];
  if (p.to === undefined) return p.ratio;
  const end = map[i + 1]?.bar ?? pat.bars.length;
  const total = stepsIn(pat.bars, p.bar, end);
  if (total <= 1) return p.ratio;
  const k = stepsIn(pat.bars, p.bar, bar) + step;
  return p.ratio + ((p.to - p.ratio) * Math.min(k, total - 1)) / (total - 1);
}

/**
 * The tempo a step plays at: the break's, times the section's ratio, times
 * its map where the step starts. Every clock asks this, not `sectionBpm`,
 * wherever it knows the bar and the step.
 */
export function tempoAt(
  bpm: number,
  pat: Mapped | null | undefined,
  bar: number,
  step: number
): number {
  const ratio = bpm * ratioOf(pat);
  if (!pat?.tempo?.length) return ratio;
  return ratio * mapRatioAt(pat, bar, step);
}

/**
 * The slowest and fastest a section plays against the break's tempo, its
 * ratio and its map's points together: what the slider's floor and top,
 * and the ratios' spread, are held to.
 */
export function paceRange(
  pat: Pick<Pattern, 'tempoRatio' | 'tempo'> | null | undefined
): [number, number] {
  const r = ratioOf(pat);
  const map = pat?.tempo ?? [];
  const ratios = map.flatMap((p) => (p.to === undefined ? [p.ratio] : [p.ratio, p.to]));
  // before the first point the section plays at ×1
  if (!map.length || map[0].bar > 0) ratios.push(1);
  return [r * Math.min(...ratios), r * Math.max(...ratios)];
}

/**
 * Whether sections that play across these ranges ({@link paceRange}) leave
 * the break a tempo: the fastest over the slowest, the break's own ×1
 * counted in, within `MAX_RATIO_SPREAD`, as `ratiosFit` holds sections
 * without maps.
 */
export function rangesFit(ranges: readonly (readonly [number, number] | undefined)[]): boolean {
  const lo = Math.min(1, ...ranges.map((r) => r?.[0] ?? 1));
  const hi = Math.max(1, ...ranges.map((r) => r?.[1] ?? 1));
  return hi / lo <= MAX_RATIO_SPREAD;
}

/**
 * How far `offset` steps from the start of a step is, in seconds: across a
 * ramp each step is as long as its own tempo, so a note past its step (a
 * tape echo's repeat) is timed a step at a time, running on into the next
 * bar. An offset before the step (a note pushed early) is at the step's own
 * length.
 */
export function offsetSeconds(
  m: Meter,
  bpm: number,
  pat: Mapped,
  bar: number,
  step: number,
  offset: number
): number {
  const here = stepSeconds(m, tempoAt(bpm, pat, bar, step));
  if (offset <= 0 || !pat.tempo?.length) return here * offset;
  let secs = 0;
  let [b, i] = [bar, step];
  for (let left = offset; left > 0; left -= 1) {
    secs += Math.min(1, left) * stepSeconds(m, tempoAt(bpm, pat, b, i));
    i++;
    if (i >= (pat.bars[b]?.k.length ?? 0) && b + 1 < pat.bars.length) [b, i] = [b + 1, 0];
  }
  return secs;
}

/**
 * When each step of a section starts, in seconds from its first, a row a bar,
 * and how long the whole section lasts, under the break's `bpm`: each step as
 * long as the tempo it starts at. What the critic's limbs and a section's
 * density time notes by.
 */
export function stepClock(
  bpm: number,
  pat: Pick<Pattern, 'tempoRatio' | 'tempo' | 'bars' | 'meter'>
): { at: number[][]; length: number } {
  const m = meterOf(pat.meter || DEFAULT_METER);
  let t = 0;
  const at = pat.bars.map((bar, bi) =>
    bar.k.map((_, i) => {
      const start = t;
      t += stepSeconds(m, tempoAt(bpm, pat, bi, i));
      return start;
    })
  );
  return { at, length: t };
}

/**
 * When each step of a section starts, and how long it lasts, in bars at the
 * break's tempo: a bar at ×1 is 1, at ×2 a half, and a bar slowing to ×½
 * longer than 1. How long a section is against the others, whatever the
 * tempo — what the player's arrangement strip sizes and fills its slots by.
 */
export function barClock(pat: Mapped): { at: number[][]; length: number } {
  let t = 0;
  const at = pat.bars.map((bar, bi) => {
    const n = bar.k.length || 1;
    return bar.k.map((_, i) => {
      const start = t;
      t += 1 / (n * tempoAt(1, pat, bi, i));
      return start;
    });
  });
  return { at, length: t };
}

/** Whether any section has a tempo map, which needs wire v10 (16-b-ii). */
export function hasTempoMaps(sections: MaybeSections): boolean {
  return Object.values(sections).some((p) => !!p?.tempo?.length);
}

/**
 * A map held to a section of `bars` bars: the points past it go, and a ramp
 * they cut short still gets where it was going, at the new end. What a
 * section written again at another length keeps of its map.
 */
export function fitTempoMap(map: readonly TempoPoint[] | undefined, bars: number): TempoMap {
  return (map ?? []).filter((p) => p.bar < bars).map((p) => ({ ...p }));
}

/** A copy of a map, for a cloned pattern. */
export function cloneTempoMap(map: readonly TempoPoint[]): TempoMap {
  return map.map((p) => ({ ...p }));
}

/** Whether a ramp speeds up or slows down: what the chart writes over it. */
export function rampWord(p: TempoPoint): 'accel.' | 'rit.' | null {
  if (p.to === undefined || p.to === p.ratio) return null;
  return p.to > p.ratio ? 'accel.' : 'rit.';
}

/* ---- reading one back ------------------------------------------------ */

/** Two tempos a file holds apart by less than this are one tempo: a MIDI tempo is whole microseconds a quarter. */
const SAME_BPM = 0.01;

/**
 * A ratio read off a file, as the fraction it is where it is one (×16/15,
 * ×4/5), else to four places: a tempo in whole microseconds is never exactly
 * the ratio it was written from.
 */
function cleanRatio(r: number): number {
  for (let q = 1; q <= 64; q++) {
    const p = Math.round(r * q);
    if (Math.abs(p / q - r) < 1e-4) return p / q;
  }
  return Math.round(r * 1e4) / 1e4;
}

/**
 * A section's tempo map read from the tempo each of its steps plays at, a row
 * a bar, against the break's `bpm` — the inverse of {@link tempoAt}, for a
 * MIDI file. A bar whose steps all play at one tempo holds it; one whose
 * steps change evenly ramps, and goes on ramping into the next bar while the
 * steps keep changing by as much; a bar whose tempo changes any other way is
 * read as a ramp from its first step's tempo to its last. Empty where every
 * step plays at `bpm`.
 */
export function tempoMapOf(series: readonly (readonly number[])[], bpm: number): TempoMap {
  const same = (a: number, b: number) => Math.abs(a - b) < SAME_BPM;
  const out: Array<{ bar: number; from: number; to?: number; step?: number }> = [];
  let prev: number | undefined;
  series.forEach((row, bar) => {
    if (!row.length) return;
    const first = row[0];
    const last = row[row.length - 1];
    const flat = row.every((v) => same(v, first));
    const step = row.length > 1 ? (last - first) / (row.length - 1) : 0;
    const cur = out[out.length - 1];
    if (flat) {
      if (!cur || cur.to !== undefined || !same(cur.from, first)) {
        if (cur || !same(first, bpm)) out.push({ bar, from: first });
      }
    } else if (
      cur?.to !== undefined &&
      cur.step !== undefined &&
      same(cur.step, step) &&
      prev !== undefined &&
      same(prev + step, first)
    ) {
      cur.to = last;
    } else {
      out.push({ bar, from: first, to: last, step });
    }
    prev = last;
  });
  // a first point at the break's own tempo, holding, says nothing
  if (out.length === 1 && out[0].to === undefined && same(out[0].from, bpm)) return [];
  return out.map((p) => ({
    bar: p.bar,
    ratio: cleanRatio(p.from / bpm),
    ...(p.to !== undefined ? { to: cleanRatio(p.to / bpm) } : {}),
  }));
}
