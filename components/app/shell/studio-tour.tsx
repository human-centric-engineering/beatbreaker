'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useWide } from '@/components/app/shell/use-wide';
import { useStudio } from '@/components/app/studio/studio-provider';
import { markTourSeen, tourSeen } from '@/lib/app/breaks/tour-seen';

/**
 * The first-run tour (task 8.6): three steps — Play, the layers, the tools —
 * shown once per browser, the first time the Studio has a break on it.
 *
 * The app's own, with no library: a card beside each control in turn and a
 * ring round the control. Each step finds its control by the selector below,
 * one for each width, because the transport and the tools are drawn in a
 * different place on a phone. If a control is not there, the tour does not
 * open, rather than pointing at nothing.
 *
 * The card is a modal dialog: focus is held in it and the Studio's keys are
 * off while it is up (the frame's key handler skips `[data-studio-tour]`).
 * Escape is Skip. Either way out marks it seen, and focus goes back to where
 * it was. `/help` has _Show the tour again_.
 *
 * Mounted by the Studio's pages beside the frame, not inside it, so the
 * frame's own tests start from a browser that has never seen the app without
 * a tour in the way.
 */

interface TourStep {
  title: string;
  /** The control it points at: one selector, or one per width. */
  anchor: string | { wide: string; narrow: string };
  body: string | { wide: string; narrow: string };
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Play',
    anchor: { wide: '.studio-transport .play', narrow: '.studio-play-lg' },
    body: {
      wide: 'Starts and stops the break. Space does the same from anywhere in the Studio.',
      narrow: 'Starts and stops the break. The tempo is beside it: tap − or +, or type a number.',
    },
  },
  {
    title: 'Layers',
    anchor: '[role="radiogroup"][aria-label="Difficulty layer"]',
    body: 'The same break five ways, from Skeleton to Full break. Start low and add notes as it comes. Keys 1 to 5 pick one.',
  },
  {
    title: 'Tools',
    anchor: { wide: '.studio-rail', narrow: '.studio-tools-button' },
    body: {
      wide: 'Each tool opens a drawer over the chart, so the chart never moves. Press ? for every shortcut.',
      narrow:
        'Every tool is in this menu. Each one opens over the chart, so the chart never moves.',
    },
  },
];

const forWidth = (v: string | { wide: string; narrow: string }, wide: boolean) =>
  typeof v === 'string' ? v : wide ? v.wide : v.narrow;

/** The control a step points at, at this width, if it is on the page. */
export function tourAnchor(step: TourStep, wide: boolean): HTMLElement | null {
  return document.querySelector<HTMLElement>(forWidth(step.anchor, wide));
}

const GAP = 12;
const MARGIN = 16;
const WIDTH = 300;

interface Box {
  top: number;
  left: number;
  width: number;
}

/**
 * Where the card goes: under the control if it fits, else over it, else to its
 * left (the rail is the full height of the window), always inside the window.
 */
function placeCard(rect: DOMRect, height: number, vw: number, vh: number): Box {
  const width = Math.min(WIDTH, vw - 2 * MARGIN);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
  const centredLeft = clamp(rect.left + rect.width / 2 - width / 2, MARGIN, vw - width - MARGIN);

  if (rect.bottom + GAP + height <= vh - MARGIN) {
    return { top: rect.bottom + GAP, left: centredLeft, width };
  }
  if (rect.top - GAP - height >= MARGIN) {
    return { top: rect.top - GAP - height, left: centredLeft, width };
  }
  return {
    top: clamp(rect.top + rect.height / 2 - height / 2, MARGIN, vh - height - MARGIN),
    left: clamp(rect.left - GAP - width, MARGIN, vw - width - MARGIN),
    width,
  };
}

export function StudioTour() {
  const c = useStudio();
  const { wide, measured } = useWide();
  const [step, setStep] = useState<number | null>(null);
  const decided = useRef(false);
  const returnTo = useRef<HTMLElement | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const [ring, setRing] = useState<DOMRect | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const titleId = useId();
  const bodyId = useId();

  const drawn = c.ready && !!c.view.A;

  /* Once, when there is a break on the stage and the width is known — the
     anchors are not there before that, and on a phone they are different
     ones. */
  useEffect(() => {
    if (decided.current || !drawn || !measured) return;
    decided.current = true;
    if (tourSeen()) return;
    if (!TOUR_STEPS.every((s) => tourAnchor(s, wide))) return;
    returnTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setStep(0);
  }, [drawn, measured, wide]);

  const current = step === null ? null : TOUR_STEPS[step];

  /* Measure the control and put the card beside it, again whenever the window
     moves under it. */
  useLayoutEffect(() => {
    if (!current) return;
    const place = () => {
      const target = tourAnchor(current, wide);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setRing(rect);
      setBox(
        placeCard(rect, card.current?.offsetHeight ?? 160, window.innerWidth, window.innerHeight)
      );
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [current, wide]);

  /* In a layout effect, inside the commit that shows the step: a focus made
     from a passive effect can land inside the Studio's next commit, and React
     puts focus back where that commit found it. The card is see-through, not
     hidden, until it is placed, so it can take focus from the first frame. */
  useLayoutEffect(() => {
    if (step !== null) primary.current?.focus();
  }, [step]);

  const close = useCallback(() => {
    markTourSeen();
    setStep(null);
    const back = returnTo.current;
    if (back?.isConnected) back.focus();
  }, []);

  /* Escape is Skip, and focus stays in the card: Tab from the last control
     comes round to the first, and Shift+Tab the other way. On the window, in
     the capture phase, so the tour has Escape before anything else: a drawer
     open under it (a `?drawer=` link) listens on the document, and would
     close as well. */
  const open = step !== null;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== 'Tab' || !card.current) return;
      const stops = Array.from(card.current.querySelectorAll<HTMLElement>('button, a[href]'));
      if (stops.length === 0) return;
      const first = stops[0];
      const end = stops[stops.length - 1];
      const inside = card.current.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === end)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, close]);

  if (step === null || !current) return null;
  const last = step === TOUR_STEPS.length - 1;

  return createPortal(
    <div data-studio-tour="">
      {ring ? (
        <div
          aria-hidden="true"
          className="ring-primary pointer-events-none fixed z-[60] rounded-md ring-2 ring-offset-2"
          style={{ top: ring.top, left: ring.left, width: ring.width, height: ring.height }}
        />
      ) : null}
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="bg-popover text-popover-foreground fixed z-[61] rounded-lg border p-4 shadow-lg"
        style={box ? { top: box.top, left: box.left, width: box.width } : { opacity: 0 }}
      >
        <p className="text-muted-foreground text-xs">
          {step + 1} of {TOUR_STEPS.length}
        </p>
        <h2 id={titleId} className="mt-1 text-base font-semibold">
          {current.title}
        </h2>
        <p id={bodyId} className="text-muted-foreground mt-1 text-sm">
          {forWidth(current.body, wide)}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={close}
            className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1.5 text-sm"
          >
            Skip
          </button>
          {last ? (
            <Link
              href="/help"
              target="_blank"
              className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1.5 text-sm underline-offset-4 hover:underline"
            >
              More in Help
            </Link>
          ) : null}
          <span className="flex-1" />
          <button
            ref={primary}
            type="button"
            onClick={() => (last ? close() : setStep(step + 1))}
            className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
          >
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
