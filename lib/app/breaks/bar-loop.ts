import type { StepAnchor } from '@/lib/app/breaks/engrave';
import type { MaybeSections, SectionLetter } from '@/lib/app/breaks/sections';

/**
 * A loop over a range of bars (16-b-vi): one arrangement slot's bars `from`
 * to `to`, counted from 0 and both played, round and round — so a drummer can
 * drill two bars of a 32-bar verse rather than the whole break.
 *
 * **It is a slot's, not a section's.** A section the arrangement calls twice
 * is looped where you asked for it, so the chapters and the readout say
 * where you are. The bars are the section as it plays, a repeat's bars
 * played out (16-b-i), so bar 9 of a theme of two bars ×8 is bar 9.
 *
 * Nothing saves it: it is where you are practising, as a cue is, and goes
 * with the break it was set on.
 */
export interface BarLoop {
  slot: number;
  from: number;
  to: number;
}

/** A loop as the Studio keeps it: with the section it was set on, so a slot that has since become another is no loop. */
export interface HeldLoop extends BarLoop {
  letter: SectionLetter;
}

/**
 * The loop that holds, where it still does: its slot still plays its section,
 * the section is not one another section's solo leaves out, and its bars are
 * held to the bars the section has. Null where it no longer holds.
 */
export function loopIn(
  loop: HeldLoop | null,
  arrangement: readonly SectionLetter[],
  patterns: MaybeSections,
  solo: SectionLetter | null
): BarLoop | null {
  if (!loop || arrangement[loop.slot] !== loop.letter) return null;
  if (solo && solo !== loop.letter) return null;
  const bars = patterns[loop.letter]?.bars.length ?? 0;
  if (!bars) return null;
  const to = Math.max(0, Math.min(loop.to, bars - 1));
  const from = Math.max(0, Math.min(loop.from, to));
  return { slot: loop.slot, from, to };
}

/** Two bars, in either order, as a loop of the slot: the first of them to the last. */
export function loopOver(slot: number, a: number, b: number): BarLoop {
  return { slot, from: Math.min(a, b), to: Math.max(a, b) };
}

/**
 * Where a loop set now starts: the bar the playhead is in or a Pause left it
 * (`at`), else the top of the slot a skip cued, else the top of the first
 * slot that plays. Null where nothing plays, or the section playing is one
 * the arrangement never calls, which has no slot to loop.
 */
export function loopSpot(
  at: { slot: number; barIdx: number } | null,
  cue: number | null,
  slots: readonly number[]
): { slot: number; barIdx: number } | null {
  if (at) return at.slot >= 0 ? at : null;
  if (cue !== null) return { slot: cue, barIdx: 0 };
  return slots.length ? { slot: slots[0], barIdx: 0 } : null;
}

/** What a loop says on the player: `Bar 5` or `Bars 5–6`. */
export function loopWords(loop: BarLoop): string {
  return loop.from === loop.to ? `Bar ${loop.from + 1}` : `Bars ${loop.from + 1}–${loop.to + 1}`;
}

/** The box round each bar of an engraved section, from its steps' anchors; null where a bar has none. */
export function barBoxes(
  map: readonly (StepAnchor | undefined)[],
  steps: number,
  bars: number
): (StepAnchor | null)[] {
  return Array.from({ length: bars }, (_, b) => {
    let box: { x0: number; y0: number; x1: number; y1: number } | null = null;
    for (let i = b * steps; i < (b + 1) * steps; i++) {
      const a = map[i];
      if (!a) continue;
      box = box
        ? {
            x0: Math.min(box.x0, a.x),
            y0: Math.min(box.y0, a.y),
            x1: Math.max(box.x1, a.x + a.w),
            y1: Math.max(box.y1, a.y + a.h),
          }
        : { x0: a.x, y0: a.y, x1: a.x + a.w, y1: a.y + a.h };
    }
    return box ? { x: box.x0, y: box.y0, w: box.x1 - box.x0, h: box.y1 - box.y0 } : null;
  });
}

/** The bar a point on the chart is over, by the boxes {@link barBoxes} gives; -1 where it is over none. */
export function barAt(boxes: readonly (StepAnchor | null)[], x: number, y: number): number {
  return boxes.findIndex((b) => !!b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
}
