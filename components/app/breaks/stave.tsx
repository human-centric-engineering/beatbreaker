'use client';

import { forwardRef, memo, useImperativeHandle, useRef } from 'react';

import { renderSvgNode } from '@/components/app/breaks/svg-nodes';
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
}

export const Stave = memo(
  forwardRef<StaveHandle, StaveProps>(function Stave({ engraving, label, playing }, ref) {
    const head = useRef<SVGRectElement>(null);

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
          className="sheet"
          width={engraving.width}
          height={engraving.height}
          viewBox={`0 0 ${engraving.width} ${engraving.height}`}
          role="img"
          aria-label={engraving.label}
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
          {engraving.nodes.map(renderSvgNode)}
        </svg>
      </div>
    );
  })
);
