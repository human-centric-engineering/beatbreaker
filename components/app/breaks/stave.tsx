'use client';

import { forwardRef, memo, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { renderSvgNode } from '@/components/app/breaks/svg-nodes';
import { barAt, barBoxes } from '@/lib/app/breaks/bar-loop';
import type { Engraving } from '@/lib/app/breaks/engrave';
import { cn } from '@/lib/utils';

/**
 * The engraved chart.
 *
 * `engrave()` returns a plain node tree, so this component is a renderer and
 * nothing more — no geometry, no layout decisions, no measuring. That split is
 * what lets the engraver be tested without a DOM and eventually run on the
 * server for a PDF.
 *
 * **The playhead is moved imperatively, through a ref.** It advances sixteen
 * times a bar; putting it in React state would re-render the whole staff —
 * hundreds of nodes — on every step, to move one rectangle. The notes are
 * declarative, the playhead is not, and that is deliberate.
 *
 * **A loop over bars (16-b-vi)** is drawn as a band behind the bars it plays,
 * and set here with a mouse or a pen: a drag across bars loops them, a drag
 * inside one bar loops that bar. A click is not a drag, so reading the chart
 * with the pointer loops nothing; under a finger a swipe scrolls, and a phone
 * loops from the player's Loop.
 */

export interface StaveHandle {
  /** Put the playhead over a step, using an anchor from the engraving's map. */
  moveTo(anchor: { x: number; y: number; w: number; h: number } | undefined): void;
  /** Take it off — the section is not playing, or playback stopped. */
  clear(): void;
}

interface StaveProps {
  engraving: Engraving;
  /** Shown above the staff; the section letter, when both are on screen. */
  label?: string;
  playing?: boolean;
  /** Steps to light, as indices into `engraving.map` — what BeatBuddy just changed. */
  flash?: readonly number[];
  /** `Flash.seq`: a new value remounts the rects, so the same steps flash again. */
  flashSeq?: number;
  /** The bars of this section a loop plays, counted from 0. */
  loop?: readonly number[] | null;
  /** A drag across bars asks for them looped; absent, the chart takes no drag. */
  onLoop?: (from: number, to: number) => void;
}

/** How far a press moves before it is a drag and not a click, in px. */
const DRAG_PX = 6;

export const Stave = memo(
  forwardRef<StaveHandle, StaveProps>(function Stave(
    { engraving, label, playing, flash, flashSeq, loop, onLoop },
    ref
  ) {
    const head = useRef<SVGRectElement>(null);
    const sheet = useRef<SVGSVGElement>(null);
    const boxes = useMemo(
      () =>
        barBoxes(
          engraving.map,
          engraving.steps,
          Math.ceil(engraving.map.length / Math.max(1, engraving.steps))
        ),
      [engraving]
    );
    /* A drag under way: where the press was, the bar it began on and the bar
       it is over now. Kept here, not in the state that draws the band, so a
       release straight after a move reads the move and not the last render. */
    const press = useRef<{ x: number; y: number; bar: number; to: number; moved: boolean } | null>(
      null
    );
    const [dragged, setDragged] = useState<{ from: number; to: number } | null>(null);

    /** The bar under a pointer: the sheet as drawn, scaled back to the engraving's own units. */
    const barUnder = (e: React.PointerEvent): number => {
      const at = sheet.current?.getBoundingClientRect();
      if (!at?.width || !at.height) return -1;
      const x = ((e.clientX - at.left) * engraving.width) / at.width;
      const y = ((e.clientY - at.top) * engraving.height) / at.height;
      return barAt(boxes, x, y);
    };
    const drag = onLoop
      ? {
          onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => {
            if (e.pointerType === 'touch' || e.button !== 0) return;
            const bar = barUnder(e);
            press.current =
              bar >= 0 ? { x: e.clientX, y: e.clientY, bar, to: bar, moved: false } : null;
            // a drag over the chart is a loop, not a text selection
            if (bar >= 0) e.preventDefault();
          },
          onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => {
            const p = press.current;
            if (!p) return;
            if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_PX) return;
            if (!p.moved) e.currentTarget.setPointerCapture?.(e.pointerId);
            p.moved = true;
            const bar = barUnder(e);
            if (bar >= 0) p.to = bar;
            setDragged({ from: Math.min(p.bar, p.to), to: Math.max(p.bar, p.to) });
          },
          onPointerUp: () => {
            const p = press.current;
            press.current = null;
            if (p?.moved) onLoop(Math.min(p.bar, p.to), Math.max(p.bar, p.to));
            setDragged(null);
          },
          onPointerCancel: () => {
            press.current = null;
            setDragged(null);
          },
        }
      : null;
    const band = dragged
      ? Array.from({ length: dragged.to - dragged.from + 1 }, (_, i) => dragged.from + i)
      : (loop ?? null);

    useImperativeHandle(ref, () => ({
      moveTo(anchor) {
        const el = head.current;
        if (!el) return;
        if (!anchor) {
          el.setAttribute('width', '0');
          return;
        }
        el.setAttribute('x', String(anchor.x));
        el.setAttribute('y', String(anchor.y));
        el.setAttribute('width', String(anchor.w));
        el.setAttribute('height', String(anchor.h));
      },
      clear() {
        head.current?.setAttribute('width', '0');
      },
    }));

    return (
      <div className="stave">
        {label ? (
          <div className={cn('chart-section-label', playing && 'playing')}>{label}</div>
        ) : null}
        <svg
          ref={sheet}
          className={cn('sheet', dragged && 'looping')}
          width={engraving.width}
          height={engraving.height}
          viewBox={`0 0 ${engraving.width} ${engraving.height}`}
          role="img"
          aria-label={engraving.label}
          {...drag}
        >
          {/* First child, so it sits under the notes rather than over them.
              The band is painted with attributes rather than a stylesheet rule:
              an SVG with no `fill` is a black SVG, and this one is handed
              straight to a saved file or a print as well as to the screen. */}
          <rect
            ref={head}
            className="playhead"
            x={0}
            y={0}
            width={0}
            height={0}
            rx={3}
            fill="var(--brass)"
            opacity={0.17}
          />
          {/* The looped bars, under the notes. Never printed:
              a loop is where you are practising, not part of the part. */}
          {band
            ? band.map((bar) => {
                const b = boxes[bar];
                return b ? (
                  <rect
                    key={bar}
                    className="loop-band"
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                    fill="var(--brass)"
                    opacity={dragged ? 0.14 : 0.08}
                  />
                ) : null;
              })
            : null}
          {flash?.map((idx) => {
            const a = engraving.map[idx];
            return a ? (
              <rect
                key={`${flashSeq ?? 0}:${idx}`}
                className="flash"
                x={a.x}
                y={a.y}
                width={a.w}
                height={a.h}
                rx={3}
                fill="var(--brass)"
              />
            ) : null;
          })}
          {engraving.nodes.map(renderSvgNode)}
        </svg>
      </div>
    );
  })
);
