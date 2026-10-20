'use client';

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { unreachedAt } from '@/lib/app/breaks/drummer/sticking';
import { barHands } from '@/lib/app/breaks/hands';
import { LANE_DEFS, LANE_VALUES, activeLanes, laneName } from '@/lib/app/breaks/lanes';
import { countLabelsOf, groupAt, groupsOf, isGroupStart } from '@/lib/app/breaks/meter';
import { type WrittenHand, meterOfPat, stickingAt } from '@/lib/app/breaks/pattern';
import type { SectionLetter } from '@/lib/app/breaks/audio/transport';
import { ownedBy, tupletChoices, tupletsIn, twoAStep } from '@/lib/app/breaks/tuplets';
import type { LaneKey, Pattern, TupletSpan } from '@/lib/app/breaks/types';
import type { HandEdit, TupletEdit } from '@/components/app/breaks/use-break-console';
import { Segmented } from '@/components/app/studio/segmented';
import { cn } from '@/lib/utils';

/**
 * The step grid.
 *
 * **It draws the layer you are on**, not the stored break. That distinction was
 * a real bug: the grid used to draw the full pattern while the chart and the
 * playback drew the reduced one, so at L2 you could see a note nothing was
 * playing, toggling layers changed the notation and left the grid alone, and an
 * open hat added down there vanished the moment it was derived. Three
 * complaints, one cause.
 *
 * A note placed here is pinned to the layer it was placed at — marked with a
 * dot — so the reduction stops taking it back out.
 *
 * **One lane is one row, however many bars there are.** A drummer reads a lane
 * straight across; cutting the grid into a stack of per-bar blocks put a lane's
 * name in front of you five times and broke the line you were following. The
 * bars are separated by a gap in the same row instead, and the count runs along
 * the top once.
 *
 * **Setting a cell** (task 5.15, E2). A tap sets the lane's brush — its usual
 * hit, unless another is lit in the rack under the grid — or clears a cell
 * that has a note. A long press ({@link LONG_PRESS_MS}) or a
 * right-click opens a picker of every value the lane has, so a cross-stick is
 * one choice rather than four clicks round. With a mouse or a pen a drag
 * along a lane paints the value its first cell took, and is one undo step;
 * under a finger a swipe scrolls the grid, which is wider than a phone's
 * screen, and painting is the mouse's. Shift-click still steps
 * back through the values, for mouse users who learnt it. From the keyboard,
 * Enter is the tap and the context-menu key (or Shift+F10) opens the picker.
 *
 * **The cells' size** is CSS (`--cell`: 24px with a fine pointer, 32px with a
 * coarse one) times the grid zoom (`bb.gridSize`, task 5.14).
 *
 * **A tuplet (12-d) is merged cells cut into its notes**: the beat it covers
 * on a lane is one block, numbered, split into `n` even cells. Tap one to set
 * or clear it; hold it or right-click it for its values and to give the beat
 * back to the grid. The picker on a grid cell offers to cut its beat into a
 * tuplet, where the layer shows tuplets.
 *
 * **The Sticking row (Phase 14)** is the sticking written under the notes, a
 * step at a time. A tap goes R, L, then back to the drummer's choice; held or
 * right-clicked, its picker also offers a flam's or drag's graces on the same
 * stick, the bar hand to hand from that step, and the bar cleared. A step no
 * hand plays is not one a hand can be written on. A hand the drummer cannot
 * play the step with (an L on the ride) is struck through, and says so.
 */

/** How long a press is held before it opens the value picker. */
export const LONG_PRESS_MS = 500;

/** The value a tap sets: the lane's plain "hit" where it has one, else its first value. */
export function defaultHit(lane: LaneKey): number {
  const at = LANE_VALUES[lane].indexOf('hit');
  return at >= 0 ? at + 1 : 1;
}

type CellAt = { bar: number; lane: LaneKey; step: number };

function cellOf(el: Element | null): (CellAt & { el: HTMLElement }) | null {
  const cell = el?.closest<HTMLElement>('.cell');
  if (!cell) return null;
  const { bar, lane, slot } = cell.dataset;
  const isLane = (k: string | undefined): k is LaneKey => !!k && k in LANE_VALUES;
  if (bar === undefined || slot === undefined || !isLane(lane)) return null;
  return { bar: Number(bar), lane, step: Number(slot), el: cell };
}

/** How long a scroll of your own keeps the grid from following the playhead. */
const OWN_SCROLL_MS = 3000;
/**
 * Where the playhead rides, as a share of the cells in view: a third in, so
 * the bar ahead is what you see most of. Short of it, the grid stays still
 * and the playhead walks in; past it, the grid moves and the playhead holds.
 */
const FOLLOW_AT = 0.3;
/** A step's length, until the music has played two to measure it by. */
const STEP_MS = 125;
/** The longest step there is — an eighth at 20 bpm. A gap past it is the music stopping. */
const STEP_MS_MAX = 1600;
/** How long the grid takes to sweep back to the start, or across more than a view. */
const SWEEP_MS = 320;

interface StepEditorProps {
  /** The pattern as it sounds at the current layer. */
  view: Pattern;
  /** The stored break, for reading pins. */
  stored: Pattern;
  onCycle: (bar: number, lane: LaneKey, step: number, back: boolean) => void;
  /**
   * The section the grid is editing. A drag or an open picker keeps the one
   * it began in, so a playhead crossing into the other section under Both
   * cannot carry the edit with it.
   */
  section: SectionLetter;
  /** Set a cell to a value; a drag's later cells are `continue`, so it is one undo step. */
  onSet: (
    section: SectionLetter,
    bar: number,
    lane: LaneKey,
    step: number,
    value: number,
    stroke: 'start' | 'continue'
  ) => void;
  /** The grid zoom, 1 at the reference size. */
  zoom?: number;
  /** Step under the playhead, as `barIdx * steps + slot`. */
  cursor: number | null;
  /** Cells to light, keyed `bar:lane:step` — what BeatBuddy just changed. */
  flash?: ReadonlySet<string>;
  /**
   * `Flash.seq`. Odd and even changes use twin keyframes, so the same cells
   * flash again without remounting the buttons (which would drop focus).
   */
  flashSeq?: number;
  /** Write a tuplet by hand (12-d). Absent, tuplets are drawn and not written. */
  onTuplet?: (bar: number, lane: LaneKey, step: number, edit: TupletEdit) => void;
  /** Whether the picker offers to cut a lane's beat into a tuplet: where the layer shows it. */
  canTuplet?: (lane: LaneKey) => boolean;
  /** Write the hands under the notes (Phase 14). Absent, the Sticking row is not drawn. */
  onHands?: (bar: number, step: number, edit: HandEdit) => void;
  /** Set in the key's header, opposite its title: the grid's help. */
  aside?: React.ReactNode;
}

/** What a tap on a Hands cell writes next: R, L, then the drummer's choice again. */
const NEXT_HAND: Record<WrittenHand | '.', WrittenHand | null> = {
  '.': 'R',
  R: 'L',
  r: 'L',
  L: null,
  l: null,
};

/** A written hand, as a label reads it. */
function handWords(hand: WrittenHand | null): string {
  if (!hand) return "the drummer's choice";
  const main = hand.toUpperCase();
  return hand === main ? main : `${main}, its graces on ${main} too`;
}

/** A picker open on a tuplet's note: which one. */
type TupletAt = { j: number; span: TupletSpan };

/**
 * A ghost note is the one value that reads as *quieter* rather than different,
 * so it is drawn as a wash of the lane's colour rather than the colour itself —
 * the same 40% the chart legend uses. Everything else is the lane, solid.
 */
function fill(lane: LaneKey, v: number): string {
  const color = LANE_DEFS[lane].color;
  return soft(lane, v) ? `color-mix(in srgb,${color} 40%, transparent)` : color;
}

function soft(lane: LaneKey, v: number): boolean {
  return lane === 's' && v === 1;
}

/* A custom property is not in React's style type, so it is spelled out here. */
function laneStyle(lane: LaneKey): React.CSSProperties & { '--lane': string } {
  return { '--lane': LANE_DEFS[lane].color };
}

/** A value drawn as the grid draws it: the lane's colour and the value's glyph. */
function Swatch({ lane, v, className }: { lane: LaneKey; v: number; className?: string }) {
  return (
    <i
      className={cn('swatch', className)}
      aria-hidden="true"
      style={{ background: fill(lane, v), color: soft(lane, v) ? 'var(--ink)' : '#fff' }}
    >
      {LANE_DEFS[lane].glyph[v] ?? ''}
    </i>
  );
}

export function StepEditor({
  view,
  stored,
  onCycle,
  onSet,
  section,
  zoom = 1,
  cursor,
  flash,
  flashSeq,
  onTuplet,
  canTuplet,
  onHands,
  aside,
}: StepEditorProps) {
  const m = meterOfPat(view);
  const [handPicker, setHandPicker] = useState<{
    bar: number;
    step: number;
    x: number;
    y: number;
    current: WrittenHand | null;
    graces: boolean;
  } | null>(null);
  /** A Hands cell held: its long-press timer. What its click does after is `swallow`'s, as a lane's is. */
  const handPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * The Sticking row, worked out once a pattern rather than once a frame (the
   * grid re-renders with the playhead). Where a hand can be written and keep
   * its graces is read from the stored pattern, which is what a write checks
   * and saves; what the layer shows, and the hand the drummer cannot obey, from
   * the layer, which is what is playing.
   */
  const handsOn = !!onHands;
  const handRows = useMemo(
    () =>
      handsOn
        ? stored.bars.map((_, b) => {
            const { writable, graces } = barHands(stored, b);
            const shown = barHands(view, b).writable;
            return writable.map((open, i) => {
              const hand = stickingAt(stored.sticking, b, i);
              return {
                hand,
                open,
                shown: !!shown[i],
                graces: !!graces[i],
                missed: hand && view.bars[b] ? unreachedAt(view.bars[b], i, hand) : undefined,
              };
            });
          })
        : null,
    [stored, view, handsOn]
  );
  const [picker, setPicker] = useState<
    | (CellAt & {
        x: number;
        y: number;
        section: SectionLetter;
        current: number;
        tuplet?: TupletAt;
      })
    | null
  >(null);
  /** The press in progress: where it started, what it paints, and its long-press timer. */
  const press = useRef<{
    start: CellAt;
    section: SectionLetter;
    paint: number;
    timer: ReturnType<typeof setTimeout>;
    dragged: boolean;
    last: string;
  } | null>(null);
  /**
   * The click that ends a drag or a long press is not a tap. Held while the
   * press lasts and for a moment after it ends, then dropped: the click may
   * land on the row rather than a cell (a mouse let go on another cell), or
   * not come at all (a long press on Android), and a flag left set would eat
   * the next real tap. A click from the keyboard is never swallowed.
   */
  const swallow = useRef<'no' | 'held' | number>('no');

  /* The grid scrolls with the music. The playhead walks in from the left to
     a third of the way across, then holds there while the bars slide under
     it — a glide each step, as long as the step, so the grid moves at the
     tempo rather than in jumps. Going back (the loop, a section turning
     over), or further than a view, is one sweep, eased. Both are drawn a
     frame at a time here rather than left to the browser's smooth scroll,
     so the next step's glide takes over from wherever the last one got to
     instead of fighting it. A scroll of your own is left alone for a while,
     so you can look ahead while it plays. */
  const wrap = useRef<HTMLDivElement>(null);
  const ownScroll = useRef(0);
  const glide = useRef({ frame: 0, last: 0, step: STEP_MS });
  useEffect(() => {
    const el = wrap.current;
    if (!el || cursor === null) return;
    const g = glide.current;
    /* the step's length, measured off the playhead itself: the glide keeps
       the tempo. A gap past the slowest step there is (an eighth at 20 bpm)
       is the music stopping or starting, not a step. */
    const now = performance.now();
    const since = now - g.last;
    g.last = now;
    if (since > 30 && since < STEP_MS_MAX) g.step = since;
    if (Date.now() - ownScroll.current < OWN_SCROLL_MS) return;
    const cell = el.querySelector<HTMLElement>('.cursor');
    if (!cell) return;
    const view = el.getBoundingClientRect();
    const at = cell.getBoundingClientRect();
    // the lane names are pinned over the left of the view: the cells start after them
    const names = el.querySelector<HTMLElement>('.gridlabel')?.offsetWidth ?? 0;
    const shown = view.width - names;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const from = el.scrollLeft;
    const to = Math.min(max, Math.max(0, from + at.left - view.left - names - shown * FOLLOW_AT));
    cancelAnimationFrame(g.frame);
    if (Math.abs(to - from) < 1) return;
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      el.scrollLeft = to;
      return;
    }
    const sweep = to < from || to - from > shown;
    const length = sweep ? SWEEP_MS : g.step;
    const start = now;
    const tick = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - start) / length));
      // a sweep eases out; a glide is even, so the grid keeps the beat
      el.scrollLeft = from + (to - from) * (sweep ? 1 - (1 - k) ** 3 : k);
      if (k < 1) g.frame = requestAnimationFrame(tick);
    };
    g.frame = requestAnimationFrame(tick);
  }, [cursor]);
  useEffect(() => () => cancelAnimationFrame(glide.current.frame), []);
  const scrolledByHand = () => {
    ownScroll.current = Date.now();
    cancelAnimationFrame(glide.current.frame);
  };
  const swallowing = (e: React.MouseEvent) => {
    const s = swallow.current;
    if (e.detail === 0 || s === 'no') return false;
    swallow.current = 'no';
    // event times, not the clock: the press's end and this click share a timeline
    return s === 'held' || e.timeStamp < s;
  };
  const opener = useRef<HTMLElement | null>(null);

  /**
   * The brush: what a tap writes in each lane, picked in the key. A lane
   * left alone writes its usual hit, so the key changes nothing until it is
   * used — and then a row of cross-sticks is a row of taps.
   */
  const [brush, setBrush] = useState<Partial<Record<LaneKey, number>>>({});
  const brushOf = (lane: LaneKey) => brush[lane] ?? defaultHit(lane);
  const pickBrush = (lane: LaneKey, v: number) =>
    setBrush((was) => {
      const next = { ...was };
      if (v === defaultHit(lane)) delete next[lane];
      else next[lane] = v;
      return next;
    });

  const valueAt = (c: CellAt) => view.bars[c.bar]?.[c.lane]?.[c.step] ?? 0;
  const tapValue = (c: CellAt) => (valueAt(c) ? 0 : brushOf(c.lane));

  const openPicker = (c: CellAt, el: HTMLElement, tuplet?: TupletAt) => {
    const r = el.getBoundingClientRect();
    opener.current = el;
    const current = tuplet ? (tuplet.span.notes[c.lane]?.[tuplet.j] ?? 0) : valueAt(c);
    setPicker({
      ...c,
      x: r.left,
      y: r.bottom + 4,
      section,
      current,
      ...(tuplet ? { tuplet } : {}),
    });
  };
  /** The note counts the beat holding a grid cell may be cut into, where tuplets can be written. */
  const choicesAt = (c: CellAt): number[] => {
    if (!onTuplet || !canTuplet?.(c.lane)) return [];
    const g = groupsOf(m)[groupAt(m, c.step)];
    return g ? tupletChoices(g.size) : [];
  };
  const closePicker = () => {
    setPicker(null);
    opener.current?.focus();
  };

  useEffect(
    () => () => {
      clearTimeout(press.current?.timer);
      if (handPress.current) clearTimeout(handPress.current);
    },
    []
  );

  const openHandPicker = (bar: number, step: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    opener.current = el;
    setHandPicker({
      bar,
      step,
      x: r.left,
      y: r.bottom + 4,
      current: stickingAt(stored.sticking, bar, step),
      graces: !!handRows?.[bar]?.[step]?.graces,
    });
  };
  const closeHandPicker = () => {
    setHandPicker(null);
    opener.current?.focus();
  };
  const handEdit = (bar: number, step: number, edit: HandEdit) => {
    onHands?.(bar, step, edit);
    closeHandPicker();
  };

  /** The press is over — at `at`, the event's time, when a pointer let go. */
  const endPress = (at?: number) => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
    if (handPress.current) clearTimeout(handPress.current);
    handPress.current = null;
    if (swallow.current === 'held') swallow.current = at === undefined ? 'no' : at + 400;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.shiftKey) return;
    const c = cellOf(e.target instanceof Element ? e.target : null);
    if (!c) return;
    endPress();
    swallow.current = 'no';
    const { el, ...at } = c;
    press.current = {
      start: at,
      section,
      paint: tapValue(at),
      dragged: false,
      last: `${at.bar}:${at.step}`,
      timer: setTimeout(() => {
        press.current = null;
        swallow.current = 'held';
        openPicker(at, el);
      }, LONG_PRESS_MS),
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    /* By point, not by target: a touch stays captured by the cell it began
       on, so the cell under the finger has to be looked up. */
    const c = cellOf(document.elementFromPoint(e.clientX, e.clientY));
    if (!c || c.lane !== p.start.lane) return;
    const key = `${c.bar}:${c.step}`;
    if (key === p.last) return;
    p.last = key;
    if (!p.dragged) {
      p.dragged = true;
      clearTimeout(p.timer);
      swallow.current = 'held';
      onSet(p.section, p.start.bar, p.start.lane, p.start.step, p.paint, 'start');
    }
    /* A clearing drag leaves alone what this layer does not show: a ghost
       the layer hides is not one the drummer meant to erase. */
    if (!p.paint && !valueAt(c)) return;
    onSet(p.section, c.bar, c.lane, c.step, p.paint, 'continue');
  };
  const labels = countLabelsOf(m);
  const lanes = activeLanes(view.lanes);
  const steps = view.bars[0]?.k.length ?? 16;
  const bars = view.bars.length;

  const barIdx = Array.from({ length: bars }, (_, b) => b);
  const slotIdx = Array.from({ length: steps }, (_, i) => i);
  /* A custom property is not in React's style type, so it is spelled out here. */
  const zoomStyle: React.CSSProperties & { '--grid-zoom'?: number } = { '--grid-zoom': zoom };

  return (
    <div className="stepeditor">
      <div
        className="gridwrap"
        ref={wrap}
        style={zoom !== 1 ? zoomStyle : undefined}
        onWheel={scrolledByHand}
        onTouchMove={scrolledByHand}
      >
        <div
          className="gridtable"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endPress(e.timeStamp)}
          onPointerCancel={(e) => endPress(e.timeStamp)}
        >
          <div className="countrow" aria-hidden="true">
            {/* over the pinned names, so the count slides under it as the cells do */}
            <span className="countlead" />
            {barIdx.map((b) => (
              <Fragment key={b}>
                {slotIdx.map((i) => (
                  <span
                    key={i}
                    className={cn(isGroupStart(m, i) && 'beat', cursor === b * steps + i && 'now')}
                  >
                    {labels[i] ?? ''}
                  </span>
                ))}
                {b < bars - 1 ? <div className="gap" /> : null}
              </Fragment>
            ))}
          </div>

          {lanes.map((lane) => {
            const def = LANE_DEFS[lane];
            const name = laneName(lane, view.perc);
            return (
              <div className="gridrow" key={lane}>
                <div className="gridlabel" title={name}>
                  {/* the lane's tick, or the brush lit in it where that is not
                      its usual hit: in the tick's place, so a long name loses
                      as little as it can to it */}
                  {brushOf(lane) !== defaultHit(lane) ? (
                    <Swatch lane={lane} v={brushOf(lane)} className="brushmark" />
                  ) : (
                    <i style={{ background: def.color }} />
                  )}
                  <span>{name}</span>
                </div>
                <div className="cells">
                  {barIdx.map((b) => (
                    <Fragment key={b}>
                      {slotIdx.map((i) => {
                        const span = ownedBy(tupletsIn(view, b), lane, i);
                        const hidden = span ? undefined : ownedBy(tupletsIn(stored, b), lane, i);
                        if (hidden) {
                          // a tuplet this layer leaves out: its cells are its own, not the grid's
                          if (i !== hidden.start) return null;
                          return <HiddenTuplet key={i} span={hidden} name={name} bar={b} />;
                        }
                        if (span) {
                          if (i !== span.start) return null;
                          return (
                            <TupletCells
                              key={i}
                              span={span}
                              lane={lane}
                              name={name}
                              bar={b}
                              here={
                                cursor !== null &&
                                cursor >= b * steps + span.start &&
                                cursor < b * steps + span.start + span.span
                              }
                              onTap={(j, v) =>
                                onTuplet?.(b, lane, i, {
                                  kind: 'note',
                                  j,
                                  value: v ? 0 : brushOf(lane),
                                })
                              }
                              onPick={(j, el) =>
                                openPicker({ bar: b, lane, step: i }, el, { j, span })
                              }
                            />
                          );
                        }
                        const v = view.bars[b][lane][i];
                        const pinned = stored.pins?.[b]?.[lane]?.[i] ?? 0;
                        return (
                          <button
                            key={i}
                            type="button"
                            className={cn(
                              'cell',
                              isGroupStart(m, i) && 'beat',
                              pinned && 'pinned',
                              cursor === b * steps + i && 'cursor',
                              flash?.has(`${b}:${lane}:${i}`) && 'flash',
                              flash?.has(`${b}:${lane}:${i}`) &&
                                (flashSeq ?? 0) % 2 === 1 &&
                                'flash-odd'
                            )}
                            style={v ? { background: fill(lane, v) } : undefined}
                            data-bar={b}
                            data-lane={lane}
                            data-slot={i}
                            data-on={v}
                            onClick={(e) => {
                              if (swallowing(e)) return;
                              // Shift still steps back through the values, as it did
                              if (e.shiftKey) onCycle(b, lane, i, true);
                              else
                                onSet(
                                  section,
                                  b,
                                  lane,
                                  i,
                                  tapValue({ bar: b, lane, step: i }),
                                  'start'
                                );
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              endPress();
                              openPicker({ bar: b, lane, step: i }, e.currentTarget);
                            }}
                            aria-label={`${name}, bar ${b + 1} step ${i + 1}: ${
                              v ? (LANE_VALUES[lane][v - 1] ?? String(v)) : 'empty'
                            }${pinned ? `, pinned at layer ${pinned}` : ''}`}
                          >
                            {v ? (
                              <b style={soft(lane, v) ? { color: 'var(--ink)' } : undefined}>
                                {def.glyph[v] ?? ''}
                              </b>
                            ) : null}
                          </button>
                        );
                      })}
                      {b < bars - 1 ? <div className="gap" /> : null}
                    </Fragment>
                  ))}
                </div>
              </div>
            );
          })}

          {onHands && handRows ? (
            <div className="gridrow handsrow">
              <div className="gridlabel">
                <span>Sticking</span>
              </div>
              <div className="cells">
                {barIdx.map((b) => (
                  <Fragment key={b}>
                    {slotIdx.map((i) => {
                      const cell = handRows[b]?.[i];
                      if (!cell) return null;
                      const { hand, open, shown, missed } = cell;
                      const label = !open
                        ? 'no hand plays this step'
                        : `${handWords(hand)}${shown ? '' : ', for a note this layer leaves out'}${
                            missed
                              ? `; ${hand?.toUpperCase()} cannot reach the ${laneName(missed, view.perc).toLowerCase()} here, so the drummer plays this step as if nothing were written`
                              : ''
                          }`;
                      return (
                        <button
                          key={i}
                          type="button"
                          className={cn(
                            'hcell',
                            isGroupStart(m, i) && 'beat',
                            hand && 'written',
                            missed && 'unreached',
                            cursor === b * steps + i && 'cursor'
                          )}
                          disabled={!open}
                          title={missed ? label : undefined}
                          aria-label={`Sticking, bar ${b + 1} step ${i + 1}: ${label}`}
                          onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            /* the lanes' press: the row's pointer-up ends it (`endPress`),
                             and `swallow` keeps the click that ends a long press from
                             being a tap, wherever it lands */
                            endPress();
                            swallow.current = 'no';
                            const el = e.currentTarget;
                            handPress.current = setTimeout(() => {
                              handPress.current = null;
                              swallow.current = 'held';
                              openHandPicker(b, i, el);
                            }, LONG_PRESS_MS);
                          }}
                          onPointerLeave={() => {
                            if (handPress.current) clearTimeout(handPress.current);
                            handPress.current = null;
                          }}
                          onClick={(e) => {
                            if (swallowing(e)) return;
                            onHands(b, i, { kind: 'hand', hand: NEXT_HAND[hand ?? '.'] });
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            /* the picker a long press opened is already up (Android sends
                             both), and the click that ends the press is still to come */
                            if (handPicker?.bar === b && handPicker.step === i) return;
                            endPress();
                            openHandPicker(b, i, e.currentTarget);
                          }}
                        >
                          {hand ?? ''}
                        </button>
                      );
                    })}
                    {b < bars - 1 ? <div className="gap" /> : null}
                  </Fragment>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {handPicker ? (
          <HandPicker
            at={handPicker}
            onEdit={(edit) => handEdit(handPicker.bar, handPicker.step, edit)}
            onClose={closeHandPicker}
          />
        ) : null}

        {picker ? (
          <CellPicker
            at={picker}
            name={laneName(picker.lane, view.perc)}
            current={picker.current}
            onChoose={(v) => {
              const t = picker.tuplet;
              if (t)
                onTuplet?.(picker.bar, picker.lane, picker.step, {
                  kind: 'note',
                  j: t.j,
                  value: v,
                });
              else onSet(picker.section, picker.bar, picker.lane, picker.step, v, 'start');
              closePicker();
            }}
            tuplets={picker.tuplet ? [] : choicesAt(picker)}
            canDouble={!picker.tuplet && !!onTuplet && !!canTuplet?.(picker.lane)}
            inTuplet={picker.tuplet ? picker.tuplet.span.n : undefined}
            inDouble={!!picker.tuplet && twoAStep(picker.tuplet.span)}
            onTuplet={(edit) => {
              // a double gives back the step of the note the picker is on (13-a)
              const t = picker.tuplet;
              const which =
                edit.kind === 'unmake' && t && twoAStep(t.span) ? { ...edit, j: t.j } : edit;
              onTuplet?.(picker.bar, picker.lane, picker.step, which);
              closePicker();
            }}
            onClose={closePicker}
          />
        ) : null}
      </div>

      {/* The key is the brush rack: every value each lane can hold, as the
          picker lists them — without it nothing on the page says a snare
          cell can be a cross-stick at all — and each one is a brush. Pick
          one and a tap in that lane writes it. Outside the grid's scroll, so
          it wraps to the screen. */}
      <div className="brushrack">
        <div className="brushrack-hd">
          <span className="brushrack-title">
            Brushes <em>a tap writes the one that is lit</em>
          </span>
          {aside}
        </div>
        <div className="brushtiles">
          {lanes.map((lane) => {
            const name = laneName(lane, view.perc);
            return (
              <div className="brushtile" key={lane} style={laneStyle(lane)}>
                <b>{name}</b>
                {/* the Studio's one pick-one control (E19): a radio group, its arrows round the values */}
                <Segmented
                  plain
                  className="brushes"
                  label={`${name} brush`}
                  value={brushOf(lane)}
                  onChange={(v) => pickBrush(lane, v)}
                  options={LANE_VALUES[lane].map((text, n) => ({
                    value: n + 1,
                    className: 'brush',
                    label: `${name} brush: ${text}`,
                    face: (
                      <>
                        <Swatch lane={lane} v={n + 1} />
                        <span>{text}</span>
                      </>
                    ),
                  }))}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * A picker's menu behaviour: focus on its first item, Escape or a press
 * outside to close, the arrow keys round its items.
 */
function useMenu(onClose: () => void) {
  const menu = useRef<HTMLDivElement>(null);
  /* The latest close, read by the listener: the grid re-renders with the
     playhead, and an effect keyed on it would refocus the first item each
     frame, pulling the keyboard back from the value it was moving to. */
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const away = (e: PointerEvent) => {
      if (e.target instanceof Node && !menu.current?.contains(e.target)) close.current();
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
      const i = items.findIndex((b) => b === document.activeElement);
      const to = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[to]?.focus();
    }
  };
  return { menu, onKeyDown };
}

/**
 * The value picker (5.15): every value the lane has, and Empty. A menu of
 * plain items, the current one ticked; choosing sets the cell in one step.
 * Escape, or a press outside, closes it and puts focus back on the cell.
 */
function CellPicker({
  at,
  name,
  current,
  onChoose,
  tuplets = [],
  canDouble = false,
  inTuplet,
  inDouble = false,
  onTuplet,
  onClose,
}: {
  at: CellAt & { x: number; y: number };
  name: string;
  current: number;
  onChoose: (value: number) => void;
  /** The tuplets the cell's beat may be cut into (12-d). */
  tuplets?: number[];
  /** Whether the cell may be made a double: two 32nds in its step (13-a). */
  canDouble?: boolean;
  /** The note count of the tuplet the cell is in, if it is in one. */
  inTuplet?: number;
  /** Whether that tuplet is two to a step: doubles (13-a). */
  inDouble?: boolean;
  onTuplet?: (edit: TupletEdit) => void;
  onClose: () => void;
}) {
  const { menu, onKeyDown } = useMenu(onClose);
  const values = ['empty', ...LANE_VALUES[at.lane]];
  return (
    <div
      ref={menu}
      className="cellpick"
      role="menu"
      tabIndex={-1}
      aria-label={`${name}, bar ${at.bar + 1} step ${at.step + 1}`}
      style={{ left: at.x, top: at.y }}
      onKeyDown={onKeyDown}
    >
      {values.map((label, v) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          className={cn(v === current && 'on')}
          onClick={() => onChoose(v)}
        >
          <i
            aria-hidden="true"
            style={
              v
                ? {
                    background: fill(at.lane, v),
                    color: soft(at.lane, v) ? 'var(--ink)' : '#fff',
                  }
                : undefined
            }
          >
            {v ? (LANE_DEFS[at.lane].glyph[v] ?? '') : ''}
          </i>
          <span className="lbl">{label.charAt(0).toUpperCase() + label.slice(1)}</span>
          {v === current ? (
            <>
              <span className="tick" aria-hidden="true">
                ✓
              </span>
              <span className="sr-only"> (current)</span>
            </>
          ) : null}
        </button>
      ))}
      {tuplets.length ? (
        <div className="tupletpick" role="group" aria-label="Cut this beat into a tuplet">
          <span className="lbl">Tuplet</span>
          {tuplets.map((n) => (
            <button
              key={n}
              type="button"
              role="menuitem"
              title={`${n} even notes in this beat`}
              onClick={() => onTuplet?.({ kind: 'make', n })}
            >
              {n}
            </button>
          ))}
        </div>
      ) : null}
      {canDouble ? (
        <button
          type="button"
          role="menuitem"
          title="Two even notes in this step, the note it has played twice: a sixteenth into two 32nds"
          onClick={() => onTuplet?.({ kind: 'double' })}
        >
          <i aria-hidden="true" />
          <span className="lbl">Double (two in this step)</span>
        </button>
      ) : null}
      {inTuplet ? (
        <button type="button" role="menuitem" onClick={() => onTuplet?.({ kind: 'unmake' })}>
          <i aria-hidden="true" />
          <span className="lbl">
            {inDouble ? 'Back to single notes' : `Back to the grid (remove the ${inTuplet})`}
          </span>
        </button>
      ) : null}
    </div>
  );
}

/**
 * The Hands picker (Phase 14): R or L, each with its graces on the same
 * stick where the step has a flam or a drag, the drummer's choice, and the
 * bar at once (D69): hand to hand from this step, or cleared.
 */
function HandPicker({
  at,
  onEdit,
  onClose,
}: {
  at: {
    bar: number;
    step: number;
    x: number;
    y: number;
    current: WrittenHand | null;
    graces: boolean;
  };
  onEdit: (edit: HandEdit) => void;
  onClose: () => void;
}) {
  const { menu, onKeyDown } = useMenu(onClose);
  const hands: { hand: WrittenHand | null; label: string }[] = [
    { hand: 'R', label: 'R' },
    { hand: 'L', label: 'L' },
    ...(at.graces
      ? [
          { hand: 'r' as const, label: 'R, its graces on R too' },
          { hand: 'l' as const, label: 'L, its graces on L too' },
        ]
      : []),
    { hand: null, label: "Drummer's choice" },
  ];
  return (
    <div
      ref={menu}
      className="cellpick"
      role="menu"
      tabIndex={-1}
      aria-label={`Sticking, bar ${at.bar + 1} step ${at.step + 1}`}
      style={{ left: at.x, top: at.y }}
      onKeyDown={onKeyDown}
    >
      {hands.map(({ hand, label }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          className={cn(hand === at.current && 'on')}
          onClick={() => onEdit({ kind: 'hand', hand })}
        >
          <i aria-hidden="true">{hand ?? ''}</i>
          <span className="lbl">{label}</span>
          {hand === at.current ? (
            <>
              <span className="tick" aria-hidden="true">
                ✓
              </span>
              <span className="sr-only"> (current)</span>
            </>
          ) : null}
        </button>
      ))}
      <div className="handpick" role="group" aria-label="The whole bar">
        {(['R', 'L'] as const).map((hand) => (
          <button
            key={hand}
            type="button"
            role="menuitem"
            title="Hand to hand over the notes from this step to the end of the bar"
            onClick={() => onEdit({ kind: 'alternate', hand })}
          >
            <i aria-hidden="true">{hand === 'R' ? 'RL' : 'LR'}</i>
            <span className="lbl">Alternate from here, {hand} first</span>
          </button>
        ))}
        <button type="button" role="menuitem" onClick={() => onEdit({ kind: 'clear' })}>
          <i aria-hidden="true" />
          <span className="lbl">Clear this bar&apos;s hands</span>
        </button>
      </div>
    </div>
  );
}

/**
 * A tuplet the layer leaves out (12-d): its cells, merged and empty, and not
 * the grid's to write — a note there would sound under the figure at no layer.
 */
function HiddenTuplet({ span, name, bar }: { span: TupletSpan; name: string; bar: number }) {
  const width: React.CSSProperties & { '--span'?: number } = { '--span': span.span };
  return (
    <div
      className="tuplet hidden-layer"
      style={width}
      data-n={span.n}
      role="img"
      aria-label={`${name}, bar ${bar + 1}: ${span.n} in the beat, played at a higher layer`}
      title="A tuplet — it plays at a higher layer"
    />
  );
}

/**
 * One lane's part of a tuplet (12-d): the cells the span covers merged into
 * one block, numbered, and cut into its `n` notes. Not part of a drag: a
 * tuplet's notes are set one at a time.
 */
function TupletCells({
  span,
  lane,
  name,
  bar,
  here,
  onTap,
  onPick,
}: {
  span: TupletSpan;
  lane: LaneKey;
  name: string;
  bar: number;
  here: boolean;
  onTap: (j: number, value: number) => void;
  onPick: (j: number, el: HTMLElement) => void;
}) {
  const row = span.notes[lane] ?? [];
  const width: React.CSSProperties & { '--span'?: number } = { '--span': span.span };
  /* Held, a note opens its picker as a grid cell's does: a touch screen has
     no right click, and the picker is the way back to the grid. */
  const hold = useRef<{ timer?: ReturnType<typeof setTimeout>; held: boolean }>({ held: false });
  useEffect(() => () => clearTimeout(hold.current.timer), []);
  const release = () => clearTimeout(hold.current.timer);
  return (
    <div
      className={cn('tuplet', here && 'cursor')}
      style={width}
      data-n={span.n}
      data-double={twoAStep(span) || undefined}
    >
      {row.map((v, j) => (
        <button
          key={j}
          type="button"
          className="cell tcell"
          style={v ? { background: fill(lane, v) } : undefined}
          data-on={v}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            release();
            hold.current.held = false;
            const el = e.currentTarget;
            hold.current.timer = setTimeout(() => {
              hold.current.held = true;
              onPick(j, el);
            }, LONG_PRESS_MS);
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerLeave={release}
          onClick={() => {
            // the click that ends a hold is the hold's, not a tap
            if (hold.current.held) hold.current.held = false;
            else onTap(j, v);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            release();
            onPick(j, e.currentTarget);
          }}
          aria-label={`${name}, bar ${bar + 1}, ${
            twoAStep(span) ? 'doubled, two in each step' : `${span.n} in the beat`
          }, note ${j + 1}: ${v ? (LANE_VALUES[lane][v - 1] ?? String(v)) : 'empty'}`}
        >
          {v ? (
            <b style={soft(lane, v) ? { color: 'var(--ink)' } : undefined}>
              {LANE_DEFS[lane].glyph[v] ?? ''}
            </b>
          ) : null}
        </button>
      ))}
    </div>
  );
}
