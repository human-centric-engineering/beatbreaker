import type { SectionLetter } from '@/lib/app/breaks/audio/transport';
import type { StepAnchor } from '@/lib/app/breaks/engrave';
import { mixLanes } from '@/lib/app/breaks/lanes';
import type { Pattern } from '@/lib/app/breaks/types';

/**
 * The geometry of the chart in the corner of the drummer view: which section
 * comes next, the strip it is drawn on, and when the strip moves on. Kept
 * apart from the component so each can be tested without a DOM.
 */

/** How many bars of the next section are drawn after the end of this one. */
export const PREVIEW_BARS = 2;
/**
 * How big the chart is drawn, against the stage's 1. Fixed: a wider window
 * shows more of the line rather than bigger notes.
 */
export const CHART_SCALE = 0.72;
/** How far across the window the playhead goes before the line moves on. */
export const TURN_AT = 0.72;
/** Where across the window the playhead is put when the line moves on. */
export const LEAD = 0.1;

/**
 * The section the transport plays after the one at `secIdx`, as it builds its
 * running order: the arrangement in order, round to the start, skipping what a
 * one-section view leaves out. A section played on its own (`secIdx` -1, or
 * an arrangement with nothing else to play) is followed by itself.
 */
export function nextSection(
  arrangement: readonly SectionLetter[],
  viewMode: SectionLetter | 'both',
  secIdx: number | undefined,
  letter: SectionLetter,
  has: (letter: SectionLetter) => boolean
): SectionLetter {
  if (secIdx == null || secIdx < 0) return letter;
  const n = arrangement.length;
  for (let k = 1; k <= n; k++) {
    const next = arrangement[(secIdx + k) % n];
    if ((viewMode === 'both' || next === viewMode) && has(next)) return next;
  }
  return letter;
}

/**
 * The first section the transport plays: what the count-in leads into, and
 * what the stopped chart shows.
 */
export function firstSection(
  arrangement: readonly SectionLetter[],
  viewMode: SectionLetter | 'both',
  has: (letter: SectionLetter) => boolean
): SectionLetter {
  const first = arrangement.find((l) => (viewMode === 'both' || l === viewMode) && has(l));
  return first ?? (viewMode === 'B' ? 'B' : 'A');
}

/**
 * The section and, after it, the first bars of the one that follows, as one
 * pattern to engrave on one line. Every lane either plays is drawn. A next
 * section in another meter is left off: one line of music cannot change time
 * signature mid-way without saying so.
 */
export function withPreview(pat: Pattern, next: Pattern | null): Pattern {
  if (!next || next.meter !== pat.meter) return pat;
  return {
    ...pat,
    lanes: mixLanes(pat.lanes, next.lanes),
    bars: [...pat.bars, ...next.bars.slice(0, PREVIEW_BARS)],
  };
}

/** The middle of a step's anchor, px along the strip. */
export function centreOf(a: StepAnchor): number {
  return a.x + a.w / 2;
}

/**
 * Where the strip should sit, px, for the playhead at `x` along it, with the
 * strip at `shift` now: where it is while the playhead is in view and short
 * of the turn point; moved on, the playhead put back near the left, once it
 * passes it — or has gone off the left. The line moves only when it has to,
 * like a page turned rather than a scroll. Never past the start of the line:
 * a section that has just come in slides back to its clef, with no gap left
 * before it.
 */
export function pageShift(room: number, x: number, shift: number): number {
  const from = Math.min(0, shift);
  const seen = x + from;
  if (seen >= 0 && seen <= room * TURN_AT) return from;
  return Math.min(0, room * LEAD - x);
}
