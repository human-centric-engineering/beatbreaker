'use client';

import {
  type ReactElement,
  type ReactNode,
  forwardRef,
  memo,
  useImperativeHandle,
  useRef,
} from 'react';

import type { Engraving, SvgNode } from '@/lib/app/breaks/engrave';
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

function renderNode(node: SvgNode, key: number): ReactElement {
  const { tag, attrs, text, children } = node;
  const props: Record<string, unknown> = { key, ...attrs };
  if (children?.length) {
    return renderTag(
      tag,
      props,
      children.map((c, i) => renderNode(c, i))
    );
  }
  return renderTag(tag, props, text);
}

/**
 * SVG attributes are passed through in their hyphenated spelling — React has
 * emitted unknown attributes verbatim since 16, and `stroke-width` reads the
 * same in the engraver, the DOM and a saved file.
 */
function renderTag(tag: string, props: Record<string, unknown>, children: ReactNode): ReactElement {
  const El = tag as 'g';
  return <El {...props}>{children}</El>;
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
          {/* first child, so it sits under the notes rather than over them */}
          <rect ref={head} className="playhead" x={0} y={0} width={0} height={0} rx={3} />
          {engraving.nodes.map(renderNode)}
        </svg>
      </div>
    );
  })
);
