'use client';

import { Fragment, useEffect, useRef, useState } from 'react';

import { LANE_DEFS, LANE_VALUES, activeLanes, laneName } from '@/lib/app/breaks/lanes';
import { countLabelsOf, isGroupStart } from '@/lib/app/breaks/meter';
import { meterOfPat } from '@/lib/app/breaks/pattern';
import type { LaneKey, Pattern } from '@/lib/app/breaks/types';
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
 * **Setting a cell** (task 5.15, E2). A tap sets the lane's usual hit, or
 * clears a cell that has a note. A long press ({@link LONG_PRESS_MS}) or a
 * right-click opens a picker of every value the lane has, so a cross-stick is
 * one choice rather than four clicks round. A drag along a lane paints the
 * value its first cell took, and is one undo step. Shift-click still steps
 * back through the values, for mouse users who learnt it. From the keyboard,
 * Enter is the tap and the context-menu key (or Shift+F10) opens the picker.
 *
 * **The cells' size** is CSS (`--cell`: 24px with a fine pointer, 32px with a
 * coarse one) times the grid zoom (`bb.gridSize`, task 5.14).
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

interface StepEditorProps {
  /** The pattern as it sounds at the current layer. */
  view: Pattern;
  /** The stored break, for reading pins. */
  stored: Pattern;
  onCycle: (bar: number, lane: LaneKey, step: number, back: boolean) => void;
  /** Set a cell to a value; a drag's later cells are `continue`, so it is one undo step. */
  onSet: (
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
}

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

export function StepEditor({
  view,
  stored,
  onCycle,
  onSet,
  zoom = 1,
  cursor,
  flash,
  flashSeq,
}: StepEditorProps) {
  const m = meterOfPat(view);
  const [picker, setPicker] = useState<(CellAt & { x: number; y: number }) | null>(null);
  /** The press in progress: where it started, what it paints, and its long-press timer. */
  const press = useRef<{
    start: CellAt;
    paint: number;
    timer: ReturnType<typeof setTimeout>;
    dragged: boolean;
    last: string;
  } | null>(null);
  /** The click that ends a drag or a long press is not a tap. */
  const swallowClick = useRef(false);
  const opener = useRef<HTMLElement | null>(null);

  const valueAt = (c: CellAt) => view.bars[c.bar]?.[c.lane]?.[c.step] ?? 0;
  const tapValue = (c: CellAt) => (valueAt(c) ? 0 : defaultHit(c.lane));

  const openPicker = (c: CellAt, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    opener.current = el;
    setPicker({ ...c, x: r.left, y: r.bottom + 4 });
  };
  const closePicker = () => {
    setPicker(null);
    opener.current?.focus();
  };

  useEffect(() => () => clearTimeout(press.current?.timer), []);

  const endPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.shiftKey) return;
    const c = cellOf(e.target instanceof Element ? e.target : null);
    if (!c) return;
    endPress();
    const { el, ...at } = c;
    press.current = {
      start: at,
      paint: tapValue(at),
      dragged: false,
      last: `${at.bar}:${at.step}`,
      timer: setTimeout(() => {
        press.current = null;
        swallowClick.current = true;
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
      swallowClick.current = true;
      onSet(p.start.bar, p.start.lane, p.start.step, p.paint, 'start');
    }
    onSet(c.bar, c.lane, c.step, p.paint, 'continue');
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
    <div className="gridwrap" style={zoom !== 1 ? zoomStyle : undefined}>
      <div
        className="gridtable"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPress}
        onPointerCancel={endPress}
      >
        <div className="countrow" aria-hidden="true">
          {barIdx.map((b) => (
            <Fragment key={b}>
              {slotIdx.map((i) => (
                <span key={i} className={cn(isGroupStart(m, i) && 'beat')}>
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
              <div className="gridlabel">
                <i style={{ background: def.color }} />
                {name}
              </div>
              <div className="cells">
                {barIdx.map((b) => (
                  <Fragment key={b}>
                    {slotIdx.map((i) => {
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
                            if (swallowClick.current) {
                              swallowClick.current = false;
                              return;
                            }
                            // Shift still steps back through the values, as it did
                            if (e.shiftKey) onCycle(b, lane, i, true);
                            else onSet(b, lane, i, tapValue({ bar: b, lane, step: i }), 'start');
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
      </div>

      {picker ? (
        <CellPicker
          at={picker}
          name={laneName(picker.lane, view.perc)}
          current={valueAt(picker)}
          onChoose={(v) => {
            onSet(picker.bar, picker.lane, picker.step, v, 'start');
            closePicker();
          }}
          onClose={closePicker}
        />
      ) : null}

      {/* Every value each lane can hold, as the picker lists them. Without it
          nothing on the page says a snare cell can be a cross-stick at all. */}
      <div className="gridkey">
        {lanes.map((lane) => (
          <div className="keygroup" key={lane}>
            <b style={{ color: LANE_DEFS[lane].color }}>{laneName(lane, view.perc)}</b>
            {LANE_VALUES[lane].map((label, n) => {
              const v = n + 1;
              return (
                <span key={label}>
                  <i
                    style={{
                      background: fill(lane, v),
                      color: soft(lane, v) ? 'var(--ink)' : '#fff',
                    }}
                  >
                    {LANE_DEFS[lane].glyph[v] ?? ''}
                  </i>
                  {label}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
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
  onClose,
}: {
  at: CellAt & { x: number; y: number };
  name: string;
  current: number;
  onChoose: (value: number) => void;
  onClose: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const away = (e: PointerEvent) => {
      if (e.target instanceof Node && !menu.current?.contains(e.target)) onClose();
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [onClose]);

  const values = ['empty', ...LANE_VALUES[at.lane]];
  return (
    <div
      ref={menu}
      className="cellpick"
      role="menu"
      tabIndex={-1}
      aria-label={`${name}, bar ${at.bar + 1} step ${at.step + 1}`}
      style={{ left: at.x, top: at.y }}
      onKeyDown={(e) => {
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
      }}
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
    </div>
  );
}
