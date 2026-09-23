// @vitest-environment happy-dom

/**
 * ToolDrawer tests
 *
 * The Studio's tool container: a Radix `Dialog` in non-modal mode that renders
 * either the wide right-hand `DrawerBody` or the hand-rolled two-snap
 * `SheetBody`. Non-modal is the whole point (`.context/app/shell.md`): the
 * chart stays live, so a click outside must not close it, and closing must
 * hand focus back to whatever opened the drawer rather than wherever Radix's
 * default autofocus would put it.
 *
 * What's pinned here is the behaviour Spike A actually found bugs in
 * (`.context/app/spike-drawers.md`):
 *
 * - non-modal `onInteractOutside` is prevented (finding: drawer stays open
 *   when the chart is clicked)
 * - `onCloseAutoFocus` is prevented and `onReturnFocus` fires instead (finding:
 *   focus returns to the rail button that opened it)
 * - the sheet's pointer capture only engages after 4px of movement (finding 3:
 *   capturing on pointerdown swallowed taps on the handle and the close button)
 * - the sheet's snap/drag/flick logic, which is the ~100 lines of real logic
 *   this file carries instead of pulling in `vaul`
 *
 * Pointer events are dispatched as raw `PointerEvent`s with an overridden
 * `timeStamp` (fireEvent's `timeStamp` init option is silently ignored by
 * happy-dom — verified empirically, not assumed) so velocity is computable
 * deterministically. `Element.prototype.setPointerCapture` is spied so the
 * "only after 4px" claim can be asserted directly.
 *
 * Every `timeStamp` used below is non-zero. React's `SyntheticEvent` reads
 * the native timestamp as `event.timeStamp || Date.now()` — a `0` is falsy,
 * so a literal `timeStamp: 0` silently becomes the real wall clock instead,
 * which broke the velocity math the first time this file was written (`dt`
 * went negative against a huge `Date.now()` baseline, `d.v` never updated
 * off its `0` initial value, and every flick test quietly exercised the
 * nearest-snap branch instead of the flick branch it meant to test).
 *
 * @see components/app/shell/tool-drawer.tsx
 * @see .context/app/shell.md
 * @see .context/app/spike-drawers.md
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToolDrawer } from '@/components/app/shell/tool-drawer';
import type { Tool } from '@/components/app/shell/tool-rail';

/** Sheet snap points, mirrored from the source — not exported. */
const LOWER_SNAP = 0.55;
const HIGHER_SNAP = 0.92;

/** The tool -> title map, mirrored from the source's `TITLES` (not exported). */
const TITLES: Record<Tool, string> = {
  gen: 'Generate',
  doctor: 'Break doctor',
  lib: 'Library',
  kit: 'Kit',
  practice: 'Practice',
  export: 'Export',
};

/**
 * A raw `PointerEvent` with a caller-controlled `timeStamp`.
 *
 * `fireEvent.pointerDown(el, { timeStamp: N })` looks like it should work —
 * `PointerEventInit` even has no such field, so nothing type-errors — but the
 * constructed event ignores it and stamps the real clock instead (verified:
 * a scratch test asserting `e.timeStamp` from `fireEvent.pointerDown(..., {
 * timeStamp: 456 })` received the real high-res time, not 456). `timeStamp`
 * is a read-only-by-convention property, not part of any Init dict, so the
 * only way to control it is to build the event and override the property
 * directly before dispatch.
 */
function pointerEvent(
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: PointerEventInit & { timeStamp: number }
) {
  const { timeStamp, ...rest } = init;
  const event = new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, ...rest });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp, configurable: true });
  return event;
}

function renderDrawer({ tool = 'gen', wide = true }: { tool?: Tool | null; wide?: boolean } = {}) {
  const onClose = vi.fn();
  const onReturnFocus = vi.fn();
  render(
    <ToolDrawer
      tool={tool}
      wide={wide}
      onClose={onClose}
      onReturnFocus={onReturnFocus}
      container={null}
    >
      <button type="button">Panel action</button>
    </ToolDrawer>
  );
  return { onClose, onReturnFocus };
}

/** The frame plus an outside control, so "outside" is a real sibling in the
 * portalled DOM rather than `document.body` itself. */
function renderWithOutsideControl(tool: Tool | null = 'gen') {
  const onClose = vi.fn();
  const onReturnFocus = vi.fn();
  render(
    <>
      <button type="button">Outside chart control</button>
      <ToolDrawer tool={tool} wide onClose={onClose} onReturnFocus={onReturnFocus} container={null}>
        <button type="button">Panel action</button>
      </ToolDrawer>
    </>
  );
  return { onClose, onReturnFocus };
}

/** A drawer with a real opener button, wired the way `studio-frame.tsx` wires
 * it: `onReturnFocus` puts focus back on whatever opened it. */
function ControlledDrawer({ onReturnFocus }: { onReturnFocus: () => void }) {
  const [tool, setTool] = useState<Tool | null>('gen');
  const openerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" ref={openerRef}>
        Opener
      </button>
      <ToolDrawer
        tool={tool}
        wide
        onClose={() => setTool(null)}
        onReturnFocus={() => {
          onReturnFocus();
          openerRef.current?.focus();
        }}
        container={null}
      >
        <button type="button">Panel action</button>
      </ToolDrawer>
    </>
  );
}

const grip = () => document.querySelector('.studio-sheet-grip') as HTMLElement;
const sheetInner = () => document.querySelector('.studio-sheet-inner') as HTMLElement;
const scrollArea = () => document.querySelector('.studio-drawer-bd') as HTMLElement;
const handleButton = () => screen.getByRole('button', { name: /Make the sheet/ });

beforeEach(() => {
  // Deterministic snap-point math: rest = vh * (HIGHER_SNAP - snap).
  Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });
  // happy-dom implements setPointerCapture as a no-op already, but spy on it
  // so "only captured after 4px" is a direct assertion, not an inference.
  vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ToolDrawer', () => {
  describe('layout: drawer vs sheet', () => {
    it('renders the wide right-hand drawer when wide is true', () => {
      renderDrawer({ wide: true });

      expect(document.querySelector('.studio-drawer')).toBeInTheDocument();
      expect(document.querySelector('.studio-sheet')).not.toBeInTheDocument();
      expect(document.querySelector('.studio-sheet-inner')).not.toBeInTheDocument();
    });

    it('renders the two-snap bottom sheet when wide is false', () => {
      renderDrawer({ wide: false });

      expect(document.querySelector('.studio-sheet')).toBeInTheDocument();
      expect(document.querySelector('.studio-sheet-inner')).toBeInTheDocument();
      expect(document.querySelector('.studio-drawer')).not.toBeInTheDocument();
      // The sheet still carries the shared scroll body class, just nested
      // inside the sheet's own grip/inner structure.
      expect(document.querySelector('.studio-sheet .studio-drawer-bd')).toBeInTheDocument();
    });
  });

  describe('title and close', () => {
    it.each(Object.entries(TITLES) as Array<[Tool, string]>)(
      'shows "%s" -> "%s" as the drawer title',
      (tool, title) => {
        renderDrawer({ tool });
        expect(screen.getByText(title)).toBeInTheDocument();
      }
    );

    it('closes the wide drawer when the close button is clicked', async () => {
      const user = userEvent.setup();
      const { onClose } = renderDrawer({ wide: true });

      await user.click(screen.getByRole('button', { name: 'Close' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes the sheet when the close button is clicked — Spike A finding 3 is that a naive pointer-capture swallows this tap', async () => {
      const user = userEvent.setup();
      const { onClose } = renderDrawer({ wide: false });

      await user.click(screen.getByRole('button', { name: 'Close' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('non-modal behaviour', () => {
    it('does not close when a click lands outside the drawer — the chart must stay reachable while a tool is open', async () => {
      const { onClose } = renderWithOutsideControl('gen');
      // Radix's outside-pointerdown listener attaches via a 0ms timeout after mount.
      await new Promise((resolve) => setTimeout(resolve, 10));

      fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside chart control' }), {
        bubbles: true,
      });

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it("still closes on Escape — Radix's own dismiss path, which is the only way `onOpenChange` (and so `onClose`) fires other than the close button", async () => {
      const user = userEvent.setup();
      const { onClose } = renderDrawer({ wide: true });

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('prevents the default close-auto-focus and calls onReturnFocus instead, which restores focus to whatever opened it', async () => {
      const user = userEvent.setup();
      const onReturnFocus = vi.fn();
      render(<ControlledDrawer onReturnFocus={onReturnFocus} />);

      await user.click(screen.getByRole('button', { name: 'Close' }));

      await waitFor(() => expect(onReturnFocus).toHaveBeenCalledTimes(1));
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Opener' }));
    });
  });

  describe('sheet: snap, drag and flick', () => {
    it('starts at the lower snap', () => {
      renderDrawer({ wide: false });

      // full = false at the lower snap, so the handle offers to go full height.
      expect(handleButton()).toHaveAttribute('aria-label', 'Make the sheet full height');
    });

    it('the handle button toggles between the two snaps and its label follows', async () => {
      const user = userEvent.setup();
      renderDrawer({ wide: false });

      await user.click(handleButton());
      expect(handleButton()).toHaveAttribute('aria-label', 'Make the sheet half height');

      await user.click(handleButton());
      expect(handleButton()).toHaveAttribute('aria-label', 'Make the sheet full height');
    });

    it('a drag moves the sheet: the transform changes and the settle transition is suspended while dragging', () => {
      renderDrawer({ wide: false });
      const before = sheetInner().style.transform;

      fireEvent(grip(), pointerEvent('pointerdown', { clientY: 500, timeStamp: 1000 }));
      fireEvent(grip(), pointerEvent('pointermove', { clientY: 440, timeStamp: 1050 }));

      expect(sheetInner().style.transform).not.toBe(before);
      expect(sheetInner().style.transition).toBe('none');
    });

    it('pointer capture is only taken after 4px of movement, not on pointerdown', () => {
      renderDrawer({ wide: false });
      const captureSpy = vi.mocked(Element.prototype.setPointerCapture);

      fireEvent(grip(), pointerEvent('pointerdown', { clientY: 500, timeStamp: 1000 }));
      expect(captureSpy).not.toHaveBeenCalled();

      // 2px — below the 4px threshold — must not capture either.
      fireEvent(grip(), pointerEvent('pointermove', { clientY: 498, timeStamp: 1010 }));
      expect(captureSpy).not.toHaveBeenCalled();

      // Now past 4px — this is the first move that counts as a drag.
      fireEvent(grip(), pointerEvent('pointermove', { clientY: 490, timeStamp: 1020 }));
      expect(captureSpy).toHaveBeenCalledTimes(1);
    });

    it('a tap — pointerdown then pointerup with no movement — is not treated as a drag', () => {
      const { onClose } = renderDrawer({ wide: false });
      const before = sheetInner().style.transform;

      fireEvent(grip(), pointerEvent('pointerdown', { clientY: 500, timeStamp: 1000 }));
      fireEvent(grip(), pointerEvent('pointerup', { clientY: 500, timeStamp: 1030 }));

      // No settle() was reached at all: the snap is unchanged and the sheet
      // did not close — the buttons inside the grip handle taps instead.
      expect(sheetInner().style.transform).toBe(before);
      expect(handleButton()).toHaveAttribute('aria-label', 'Make the sheet full height');
      expect(onClose).not.toHaveBeenCalled();
    });

    it('a fast downward flick (velocity > 0.6) from the lower snap closes the sheet', () => {
      const { onClose } = renderDrawer({ wide: false });

      // Move down fast: +80px over 10ms => v = 8, well past the 0.6 threshold.
      fireEvent(grip(), pointerEvent('pointerdown', { clientY: 400, timeStamp: 1000 }));
      fireEvent(grip(), pointerEvent('pointermove', { clientY: 480, timeStamp: 1010 }));
      fireEvent(grip(), pointerEvent('pointerup', { clientY: 480, timeStamp: 1010 }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('a fast upward flick goes to the higher snap', async () => {
      renderDrawer({ wide: false });

      // Move up fast: -80px over 10ms => v = -8, well past the -0.6 threshold.
      fireEvent(grip(), pointerEvent('pointerdown', { clientY: 400, timeStamp: 1000 }));
      fireEvent(grip(), pointerEvent('pointermove', { clientY: 320, timeStamp: 1010 }));
      fireEvent(grip(), pointerEvent('pointerup', { clientY: 320, timeStamp: 1010 }));

      // full = true at the higher snap, so the handle now offers half height.
      await waitFor(() =>
        expect(handleButton()).toHaveAttribute('aria-label', 'Make the sheet half height')
      );
    });

    it('a slow drag settles to the nearest snap rather than closing or flicking', async () => {
      renderDrawer({ wide: false });
      const vh = window.innerHeight;
      const rest = vh * (HIGHER_SNAP - LOWER_SNAP); // off-screen amount at the lower snap

      // Drag up by exactly `rest`, slowly (1000ms) so |v| stays well under 0.6.
      // shown = HIGHER_SNAP - (rest + moved) / vh = HIGHER_SNAP - 0 = HIGHER_SNAP,
      // which is nearer HIGHER_SNAP than LOWER_SNAP.
      fireEvent(grip(), pointerEvent('pointerdown', { clientY: 600, timeStamp: 1000 }));
      fireEvent(grip(), pointerEvent('pointermove', { clientY: 600 - rest, timeStamp: 2000 }));
      fireEvent(grip(), pointerEvent('pointerup', { clientY: 600 - rest, timeStamp: 2000 }));

      await waitFor(() =>
        expect(handleButton()).toHaveAttribute('aria-label', 'Make the sheet half height')
      );
    });

    it('dragging down past 30% shown closes the sheet even at low velocity', () => {
      const { onClose } = renderDrawer({ wide: false });
      const vh = window.innerHeight;

      // Drag down by half the viewport, slowly, so this is the shown-threshold
      // close (shown < 0.3) rather than the velocity-flick close.
      fireEvent(grip(), pointerEvent('pointerdown', { clientY: 200, timeStamp: 1000 }));
      fireEvent(grip(), pointerEvent('pointermove', { clientY: 200 + vh * 0.5, timeStamp: 3000 }));
      fireEvent(grip(), pointerEvent('pointerup', { clientY: 200 + vh * 0.5, timeStamp: 3000 }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('scroll padding at the lower snap', () => {
    it('pads the scroll area by the off-screen remainder so the last control stays reachable', () => {
      renderDrawer({ wide: false });
      const vh = window.innerHeight;
      const rest = vh * (HIGHER_SNAP - LOWER_SNAP);

      expect(scrollArea().style.paddingBottom).toBe(`${rest + 24}px`);
    });
  });
});
