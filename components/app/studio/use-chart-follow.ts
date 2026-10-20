'use client';

import { useEffect, useRef, useState } from 'react';

/** How long a scroll of your own keeps the chart from following the playhead. */
const OWN_SCROLL_MS = 3000;
/** Where the line playing is held: its top this far down what is in view. */
const FOLLOW_AT = 0.2;
/** The keys that scroll the stage: a press of one is a scroll of your own. */
const SCROLL_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown']);

/**
 * The chart reads down the stage as it plays, like a page turned for you:
 * each new bar brings its line up to a fifth of the way down what is in
 * view, so the line playing and the ones after it are on screen. A bar on
 * the same line as the last moves nothing; nor does a chart that already
 * fits. The docked player's bar covers the foot of the stage, so the view
 * ends at its top.
 *
 * A scroll of your own — a wheel, a swipe, the scrollbar, the keys — or a
 * press anywhere on the stage but the player is left alone for a while, so
 * you can read ahead or back, or work the grid, while it plays. When the
 * while is up the chart comes back to the line playing, even where the bar
 * has not changed (a one-bar loop). Nor does it follow while the step grid
 * is what you are looking at: a page turned up to the chart would take the
 * grid away mid-edit.
 *
 * `bar` names the bar playing (section and bar), or is null when nothing is.
 */
export function useChartFollow(chart: HTMLElement | null, bar: string | null): void {
  const ownScroll = useRef(0);
  /* Bumped when a scroll of your own has stood its while: the follow looks again. */
  const [resumed, setResumed] = useState(0);

  useEffect(() => {
    const stage = chart?.closest<HTMLElement>('.studio-stage');
    if (!stage) return;
    let resume: ReturnType<typeof setTimeout> | undefined;
    const mine = () => {
      ownScroll.current = Date.now();
      clearTimeout(resume);
      resume = setTimeout(() => setResumed((n) => n + 1), OWN_SCROLL_MS);
    };
    // the scrollbar, a middle-click, a tap on the grid: anything but the player's controls
    const pressed = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('.player-bar')) return;
      mine();
    };
    const keyed = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) mine();
    };
    stage.addEventListener('wheel', mine, { passive: true });
    stage.addEventListener('touchmove', mine, { passive: true });
    stage.addEventListener('pointerdown', pressed);
    stage.addEventListener('keydown', keyed);
    return () => {
      clearTimeout(resume);
      stage.removeEventListener('wheel', mine);
      stage.removeEventListener('touchmove', mine);
      stage.removeEventListener('pointerdown', pressed);
      stage.removeEventListener('keydown', keyed);
    };
  }, [chart]);

  useEffect(() => {
    if (!chart || bar === null || Date.now() - ownScroll.current < OWN_SCROLL_MS) return;
    const stage = chart.closest<HTMLElement>('.studio-stage');
    // the playhead is drawn on one stave at a time; the others' are zero wide
    const head = Array.from(chart.querySelectorAll<SVGRectElement>('.playhead')).find(
      (r) => Number(r.getAttribute('width')) > 0
    );
    if (!stage || !head) return;
    const view = stage.getBoundingClientRect();
    const docked = stage.querySelector<HTMLElement>('.player-bar.docked');
    const bottom = docked ? docked.getBoundingClientRect().top : view.bottom;
    const held = (bottom - view.top) * FOLLOW_AT;
    // the grid up where the line playing would be held: you are at the grid, not the chart
    const grid = stage.querySelector<HTMLElement>('.stepeditor')?.getBoundingClientRect();
    if (grid && grid.height > 0 && grid.top < view.top + held) return;
    const line = head.getBoundingClientRect();
    const to = Math.max(
      0,
      Math.min(
        stage.scrollHeight - stage.clientHeight,
        stage.scrollTop + line.top - view.top - held
      )
    );
    if (Math.abs(to - stage.scrollTop) < 4) return;
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stage.scrollTo({ top: to, behavior: reduce ? 'auto' : 'smooth' });
  }, [chart, bar, resumed]);
}
