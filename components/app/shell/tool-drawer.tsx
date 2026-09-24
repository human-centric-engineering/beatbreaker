'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';

import { TOOLS, type Tool } from '@/components/app/shell/tool-rail';

/**
 * Where a tool opens: a drawer at the right-hand edge from 1024px up, a bottom
 * sheet below that.
 *
 * Both are non-modal by default, which is the whole point — the chart stays
 * live, playback keeps running and the transport stays reachable while you work
 * in a tool. Spike A measured that: 30 open/close cycles while playing produced
 * no scheduler stall, and the stage's bounding box did not move by a pixel at
 * any of the four widths.
 *
 * Which of the two mounts is decided here in JS, but the frame around it is laid
 * out in CSS (see studio.css) — the spike did both in JS and the frame jumped on
 * first load.
 */

/** Sheet snap points, as fractions of the viewport height. */
const SNAPS = [0.55, 0.92] as const;
const SHEET_MAX = SNAPS[SNAPS.length - 1];

const TITLES: Record<Tool, string> = {
  gen: 'Generate',
  doctor: 'Break doctor',
  patterns: 'Patterns',
  kit: 'Kit',
  practice: 'Practice',
  export: 'Export',
};

export function ToolDrawer({
  tool,
  wide,
  onClose,
  onReturnFocus,
  container,
  children,
}: {
  /** `null` closes it; the panel keeps its last identity through the exit. */
  tool: Tool | null;
  /** Which shape to mount. The CSS has already laid the frame out either way. */
  wide: boolean;
  onClose: () => void;
  /** Focus goes back to whatever opened it — a rail tab, or the header button. */
  onReturnFocus: () => void;
  container: HTMLElement | null;
  children: React.ReactNode;
}) {
  /* Radix keeps the content mounted for the exit animation, so a drawer closed
     by setting `tool` to null would render its last 180ms with no title and no
     children — the panel empties, then slides away. Echoing the last real tool
     keeps it whole until it is gone. */
  const [lastTool, setLastTool] = useState<Tool | null>(tool);
  if (tool !== null && tool !== lastTool) setLastTool(tool);
  const shown = tool ?? lastTool;

  return (
    <Dialog.Root open={tool !== null} onOpenChange={(open) => !open && onClose()} modal={false}>
      <Dialog.Portal container={container}>
        <Dialog.Content
          id="studio-drawer"
          className={wide ? 'studio-drawer' : 'studio-sheet'}
          aria-describedby={undefined}
          onInteractOutside={(e) => {
            /* Non-modal: clicking the chart, the transport or another tab must
               not dismiss what you are working in. */
            e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            onReturnFocus();
          }}
        >
          {wide ? (
            <DrawerBody tool={shown} onClose={onClose}>
              {children}
            </DrawerBody>
          ) : (
            <SheetBody tool={shown} onClose={onClose}>
              {children}
            </SheetBody>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Head({ tool, onClose }: { tool: Tool | null; onClose: () => void }) {
  return (
    <div className="studio-drawer-hd">
      <Dialog.Title className="studio-drawer-title">{tool ? TITLES[tool] : ''}</Dialog.Title>
      <button type="button" className="studio-close" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
}

function DrawerBody({
  tool,
  onClose,
  children,
}: {
  tool: Tool | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <Head tool={tool} onClose={onClose} />
      <div className="studio-drawer-bd">{children}</div>
    </>
  );
}

/**
 * A two-snap bottom sheet, by hand.
 *
 * `vaul` would do this, and Spike A's answer was that it is not worth the
 * dependency: two snaps, drag, flick and a handle came to about a hundred lines,
 * transform-only, so nothing outside the sheet is laid out again while it moves.
 * The enter/exit slide uses the individual `translate` property so it composes
 * with the snap `transform` rather than fighting it.
 */
function SheetBody({
  tool,
  onClose,
  children,
}: {
  tool: Tool | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [snap, setSnap] = useState<number>(SNAPS[0]);
  const [dragY, setDragY] = useState<number | null>(null);
  const [vh, setVh] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight));
  const drag = useRef<{ startY: number; lastY: number; lastT: number; v: number } | null>(null);

  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const rest = vh * (SHEET_MAX - snap);
  const offset = dragY === null ? rest : Math.max(0, rest + dragY);

  const settle = (s: number | null) => {
    setDragY(null);
    if (s === null) {
      onClose();
      return;
    }
    setSnap(s);
  };

  /* Capture only once the pointer has really moved: capturing on pointerdown
     retargets the click, and the handle button and ✕ inside the grip stop
     receiving taps (Spike A, finding 3 — the sort of thing `vaul` gets right
     for you). */
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    drag.current = { startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, v: 0 };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    if (dragY === null) {
      if (Math.abs(e.clientY - d.startY) < 4) return;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    setDragY(e.clientY - d.startY);
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || dragY === null) return; // a tap, not a drag — the buttons handle taps
    /* Velocity is only sampled while the pointer moves, so a drag that stopped
       and was held still would lift with the speed it had before the pause and
       read as a flick. Stale means stopped. */
    if (e.timeStamp - d.lastT > 100) d.v = 0;
    const moved = d.lastY - d.startY;
    const shown = SHEET_MAX - (rest + moved) / vh;
    const i = SNAPS.indexOf(snap as (typeof SNAPS)[number]);
    if (d.v > 0.6) settle(i > 0 ? SNAPS[i - 1] : null);
    else if (d.v < -0.6) settle(SNAPS[Math.min(i + 1, SNAPS.length - 1)]);
    else if (shown < 0.3) settle(null);
    else settle(SNAPS.reduce((a, b) => (Math.abs(b - shown) < Math.abs(a - shown) ? b : a)));
  };

  const full = snap === SHEET_MAX;

  return (
    <div
      className="studio-sheet-inner"
      style={{
        transform: `translate3d(0, ${offset}px, 0)`,
        transition: dragY === null ? 'transform 200ms cubic-bezier(.2,.8,.2,1)' : 'none',
      }}
    >
      <div
        className="studio-sheet-grip"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <button
          type="button"
          className="studio-handle"
          aria-label={full ? 'Make the sheet half height' : 'Make the sheet full height'}
          onClick={() => settle(full ? SNAPS[0] : SHEET_MAX)}
        />
        <Head tool={tool} onClose={onClose} />
      </div>
      {/* At the lower snap the bottom of the sheet is off-screen; pad the scroll
          area by that much so its last control can still be scrolled to. */}
      <div className="studio-drawer-bd" style={{ paddingBottom: rest + 24 }}>
        {children}
      </div>
    </div>
  );
}

export { TOOLS };
