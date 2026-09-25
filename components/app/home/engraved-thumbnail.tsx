import { renderSvgNode } from '@/components/app/breaks/svg-nodes';
import type { Engraving } from '@/lib/app/breaks/engrave';

/**
 * A small engraved chart, drawn on the server.
 *
 * The engraver colours with the Studio's `--ink` and `--faint` and sets type
 * in its `--f-*` faces, which are defined on the Studio's `.bb` wrapper and
 * nowhere else. Off the Studio they are mapped here onto the consumer
 * surface's own tokens, so the chart follows light and dark with the page.
 *
 * It scales to its card's width: the viewBox keeps the proportions, and the
 * engraving's own width is only a maximum.
 */
export function EngravedThumbnail({ engraving }: { engraving: Engraving }) {
  return (
    <svg
      className="block h-auto w-full [--f-body:inherit] [--f-mono:ui-monospace,monospace] [--faint:var(--color-muted-foreground)] [--ink:var(--color-foreground)]"
      style={{ maxWidth: engraving.width }}
      viewBox={`0 0 ${engraving.width} ${engraving.height}`}
      role="img"
      aria-label={engraving.label}
    >
      {engraving.nodes.map(renderSvgNode)}
    </svg>
  );
}
