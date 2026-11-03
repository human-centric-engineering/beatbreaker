import type { StepAnchor } from '@/lib/app/breaks/engrave';
import type { MaybeSections, SectionLetter } from '@/lib/app/breaks/sections';
import { ordinal } from '@/lib/app/ordinal';

/**
 * A loop over a range of bars (16-b-vi): from bar `from` of arrangement slot
 * `slot` to bar `to` of slot `toSlot` — the same slot where it is absent —
 * counted from 0 and both played, round and round. So a drummer can drill
 * two bars of a 32-bar verse, or the bridge into the chorus, rather than the
 * whole break. The slots between play whole.
 *
 * **It is the arrangement's, not a section's.** A section the arrangement
 * calls twice is looped where you asked for it, so the chapters and the
 * readout say where you are. The bars are the section as it plays, a
 * repeat's bars played out (16-b-i), so bar 9 of a theme of two bars ×8 is
 * bar 9.
 *
 * Nothing saves it: it is where you are practising, as a cue is, and goes
 * with the break it was set on.
 */
export interface BarLoop {
  slot: number;
  from: number;
  to: number;
  /** The slot it ends in, after `slot`; absent, it ends in `slot`. */
  toSlot?: number;
}

/** A loop as the Studio keeps it: with the sections its slots played when it was set, so slots that have since become others are no loop. */
export interface HeldLoop extends BarLoop {
  letters: SectionLetter[];
}

/** The slot a loop ends in. */
export function lastSlot(loop: BarLoop): number {
  return loop.toSlot ?? loop.slot;
}

/** Whether a loop plays any of an arrangement slot. */
export function loopHas(loop: BarLoop | null, slot: number): boolean {
  return !!loop && slot >= loop.slot && slot <= lastSlot(loop);
}

/** One bar a loop plays: the slot, its section and the bar of it. */
export interface LoopBar {
  slot: number;
  letter: SectionLetter;
  barIdx: number;
}

/**
 * The bars a loop plays, in order: from its first bar to the end of its
 * first slot, the slots between whole, and its last slot to its last bar.
 * Bars past a section's end are held to it, and a slot with no bars is
 * passed over. The transport plays exactly these.
 */
export function loopBars(
  loop: BarLoop,
  arrangement: readonly SectionLetter[],
  patterns: MaybeSections
): LoopBar[] {
  const out: LoopBar[] = [];
  const end = lastSlot(loop);
  for (let slot = Math.max(0, loop.slot); slot <= end && slot < arrangement.length; slot++) {
    const letter = arrangement[slot];
    const n = patterns[letter]?.bars.length ?? 0;
    if (!n) continue;
    const last = slot === end ? Math.max(0, Math.min(loop.to, n - 1)) : n - 1;
    let first = slot === loop.slot ? Math.max(0, Math.min(loop.from, n - 1)) : 0;
    if (slot === loop.slot && slot === end) first = Math.min(first, last);
    for (let barIdx = first; barIdx <= last; barIdx++) out.push({ slot, letter, barIdx });
  }
  return out;
}

/**
 * The loop that holds, where it still does: its slots still play the
 * sections they did, none of them one a solo leaves out, and it has bars to
 * play. It is the bars {@link loopBars} plays, first to last, so an empty
 * section at either end is passed over rather than costing the loop, and
 * bars an edit took away are held to the bars there are. Null where it no
 * longer holds.
 */
export function loopIn(
  loop: HeldLoop | null,
  arrangement: readonly SectionLetter[],
  patterns: MaybeSections,
  solo: SectionLetter | null
): BarLoop | null {
  if (!loop) return null;
  const end = lastSlot(loop);
  const now = arrangement.slice(loop.slot, end + 1);
  if (loop.slot < 0 || end < loop.slot || now.length !== loop.letters.length) return null;
  if (now.some((letter, i) => letter !== loop.letters[i])) return null;
  if (solo && now.some((letter) => letter !== solo)) return null;
  const bars = loopBars(loop, arrangement, patterns);
  if (!bars.length) return null;
  return loopSpan(bars[0], bars[bars.length - 1]);
}

/** Two bars, in either order, as a loop of the slot: the first of them to the last. */
export function loopOver(slot: number, a: number, b: number): BarLoop {
  return { slot, from: Math.min(a, b), to: Math.max(a, b) };
}

/** Two places in the arrangement, in either order, as a loop from the first to the last. */
export function loopSpan(
  a: { slot: number; barIdx: number },
  b: { slot: number; barIdx: number }
): BarLoop {
  const [p, q] = a.slot < b.slot || (a.slot === b.slot && a.barIdx <= b.barIdx) ? [a, b] : [b, a];
  if (p.slot === q.slot) return { slot: p.slot, from: p.barIdx, to: q.barIdx };
  return { slot: p.slot, from: p.barIdx, to: q.barIdx, toSlot: q.slot };
}

/**
 * How far from slot `from` toward slot `toward` a loop can run, one slot at
 * a time, while `plays` says each slot on the way plays: a loop is unbroken,
 * so under a solo it stops at the first slot the solo leaves out.
 */
export function loopReach(from: number, toward: number, plays: (slot: number) => boolean): number {
  const step = toward > from ? 1 : -1;
  let slot = from;
  while (slot !== toward && plays(slot + step)) slot += step;
  return slot;
}

/**
 * A loop stretched to take in a whole slot, as a Shift-click on its chapter
 * asks: past the loop's end, to that slot's last bar; before its start,
 * from that slot's first; inside it, brought in to end with that slot. Without
 * a loop, the slots from `anchor` to it, whole. It goes only as far as
 * `plays` lets it ({@link loopReach}). `lastBar` is a slot's last bar. The
 * loop itself, or null with none, where the click changes nothing: on the
 * loop's last slot, or on a slot it cannot reach.
 */
export function loopTo(
  loop: BarLoop | null,
  anchor: number,
  slot: number,
  lastBar: (slot: number) => number,
  plays: (slot: number) => boolean = () => true
): BarLoop | null {
  if (!loop) {
    if (!plays(anchor)) return null;
    const reach = loopReach(anchor, slot, plays);
    const [a, b] = anchor <= reach ? [anchor, reach] : [reach, anchor];
    return loopSpan({ slot: a, barIdx: 0 }, { slot: b, barIdx: lastBar(b) });
  }
  const end = lastSlot(loop);
  if (slot > end) {
    const reach = loopReach(end, slot, plays);
    if (reach === end) return loop;
    return loopSpan(
      { slot: loop.slot, barIdx: loop.from },
      { slot: reach, barIdx: lastBar(reach) }
    );
  }
  if (slot < loop.slot) {
    const reach = loopReach(loop.slot, slot, plays);
    if (reach === loop.slot) return loop;
    return loopSpan({ slot: reach, barIdx: 0 }, { slot: end, barIdx: loop.to });
  }
  if (slot === end) return loop;
  return loopSpan({ slot: loop.slot, barIdx: loop.from }, { slot, barIdx: lastBar(slot) });
}

/**
 * The bars of one section a loop plays, in order, for the chart to band: a
 * section looped in two slots bands the bars either plays, and only those.
 * Null where the loop plays none of it.
 */
export function loopedBarsOf(
  loop: BarLoop | null,
  arrangement: readonly SectionLetter[],
  patterns: MaybeSections,
  letter: SectionLetter
): number[] | null {
  if (!loop) return null;
  const mine = new Set(
    loopBars(loop, arrangement, patterns)
      .filter((b) => b.letter === letter)
      .map((b) => b.barIdx)
  );
  return mine.size ? [...mine].sort((a, b) => a - b) : null;
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

/**
 * A slot as the player names it: its section and its place in the song,
 * `B (3rd)`, since a section the song plays twice is in two places.
 */
export function slotName(arrangement: readonly SectionLetter[], slot: number): string {
  return `${arrangement[slot] ?? '?'} (${ordinal(slot + 1)})`;
}

/**
 * What a loop says on the player: `Bar 5`, `Bars 5–6`, or across slots
 * where it starts and ends, `B (3rd) bar 7 → C (4th) bar 1`.
 */
export function loopWords(loop: BarLoop, arrangement: readonly SectionLetter[]): string {
  const end = lastSlot(loop);
  if (end !== loop.slot) {
    return `${slotName(arrangement, loop.slot)} bar ${loop.from + 1} → ${slotName(arrangement, end)} bar ${loop.to + 1}`;
  }
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
