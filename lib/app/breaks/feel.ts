import { M44, groupAt, groupsOf } from '@/lib/app/breaks/meter';
import type { Feel, LaneKey, Meter, StyleAttrs } from '@/lib/app/breaks/types';

/**
 * Feel and dynamics — everything that decides a hit is not exactly on the grid,
 * and not exactly as loud as the one before it.
 *
 * None of this touches the pattern. The notes stay where they are written; what
 * changes is when the transport fires them and how hard. That separation is the
 * point: the metronome and the playhead stay on the grid, and the gap between
 * them and the kit is the thing you are learning to hear.
 */

/**
 * How far off the grid one hit sits, as a fraction of a 16th. Positive is late.
 *
 * **Dilla time** is a snare at +0.175 of a 16th, a kick at −0.055, and hats
 * leaning the other way from the beats. At 90 bpm that is a snare 26 ms behind
 * the click and a kick 8 ms in front of it.
 *
 * The wobble is a repeating shape rather than noise on purpose: a drummer who
 * leans is consistent about it, and randomness just sounds like a bad clock.
 */
export function feelOffset(
  feel: Feel | null | undefined,
  lane: LaneKey,
  step: number,
  ghost?: boolean
): number {
  if (!feel) return 0;
  let v: number | [number, number] | undefined =
    lane === 's' && ghost && feel.sGhost != null ? feel.sGhost : feel[lane];
  if (Array.isArray(v)) v = v[step % 2];
  if (v == null) v = 0;
  const wobble = (feel.jitter ?? 0) * Math.sin(step * 2.399 + lane.charCodeAt(0));
  return v + wobble;
}

/**
 * The feel table, if there is one.
 *
 * Takes a {@link StyleAttrs} rather than a whole `Style`, which is what lets
 * playback read it off `pattern.attrs` — the snapshot the pattern carries —
 * rather than off a style table that may since have moved or gone.
 */
export function feelOf(style: StyleAttrs | undefined): Feel | null {
  return style?.feel ?? null;
}

/**
 * Nobody plays sixteen identical hi-hats.
 *
 * The hand on the beat is the loud one, the "and" sits under it, and the "e"
 * and the "a" — the other hand, or the same hand on the way back up — are
 * quieter again. Beat 1 gets a shade more than the other three, because that is
 * where a player leans. These are the multipliers, before the pattern's own
 * accents and before the wobble.
 */
export const HAT_SHAPE = [
  1.0, 0.56, 0.78, 0.6, 0.93, 0.55, 0.76, 0.58, 0.96, 0.56, 0.78, 0.6, 0.93, 0.55, 0.76, 0.58,
];

/**
 * Outside 4/4 there is no sixteen-entry table to read, so the same shape is
 * derived from where the step sits in its pulse: the pulse itself loudest, the
 * halves under it, everything else quieter again.
 */
export function hatBase(step: number, m: Meter): number {
  if (m === M44 || (m.sub === 4 && m.num === 4)) return HAT_SHAPE[step] ?? 0.6;
  const gi = groupAt(m, step);
  const g = groupsOf(m)[gi];
  const off = step - g.start;
  if (off === 0) return gi === 0 ? 1.0 : 0.94;
  if (g.size % 2 === 0 && off === g.size / 2) return 0.78;
  return off % 2 === 0 ? 0.74 : 0.57;
}

/**
 * The gain multiplier for one hi-hat or ride note.
 *
 * A style can lean harder or softer on the shape — Dilla's hats are
 * deliberately flat, Afrobeat's are not — and `hatsPct` scales the lot, with 0
 * giving machine-even hats, accents and wobble included, for when you want the
 * grid rather than the groove.
 *
 * @param chip  the value written in the pattern: 2 is an accent, 3 an open hat
 * @param kind  `'r'` for the ride, which leans less than the hats do
 * @param hatsPct the Hi-hat dynamics slider, 0–150
 *
 * Not pure: the last few percent is deliberate wobble, because nobody is a
 * sequencer — until you ask for one, at which point `hatsPct` is 0 and the
 * wobble goes with it.
 */
export function hatShape(
  step: number,
  chip: number,
  kind: 'h' | 'r',
  m: Meter,
  style: StyleAttrs | undefined,
  hatsPct: number
): number {
  const depth = (hatsPct / 100) * (style?.hatDepth ?? 1) * (kind === 'r' ? 0.8 : 1);
  let w = 1 - (1 - hatBase(step, m)) * depth;
  if (chip === 2) w *= 1 + 0.09 * Math.min(1, depth); // an accent written into the pattern
  if (chip === 3) w = Math.max(w, 1 - 0.1 * depth); // an open hat is a struck note, not a tick
  const wobble = 0.03 * Math.min(1, depth); // nobody is a sequencer — until you ask for one
  return Math.min(1.15, w) * (1 - wobble + Math.random() * wobble * 2);
}

/** Which note value the swing slider moves for this style. */
export function swingUnitOf(style: StyleAttrs | undefined): number {
  return style?.swingUnit ?? 16;
}

/** Whether this step is one the swing slider pushes late. */
export function isSwung(step: number, m: Meter, style: StyleAttrs | undefined): boolean {
  if (swingUnitOf(style) === 8 && m.sub === 4) return step % 4 === 2;
  return step % 2 === 1;
}
