'use client';

import { useEffect, useState } from 'react';

/**
 * How the player's bar lays itself out, from its own width rather than the
 * window's: the stage beside the panels can be narrow on a wide screen.
 *
 * - `roomy`: one row, with the read-out of where the playhead is.
 * - `one-row`: one row, without the read-out (the footer carries it too).
 * - `two-rows`: the transport, the tempo and the tools; under them the
 *   section and the layer.
 * - `three-rows`: the transport and the tools; the tempo; the section and
 *   the layer.
 *
 * Measured, not a container query: `container-type` makes the bar the
 * containing block of its fixed descendants, and its panels are fixed. The
 * width picks the widest layout worth trying; each is then laid out in turn
 * until one is not crowded, so a longer label steps the bar down rather than
 * spilling past its edge or wrapping wherever the row runs out.
 */
export type BarFit = 'roomy' | 'one-row' | 'two-rows' | 'three-rows';

/** The narrowest each layout fits in, widest first. */
const FITS: [BarFit, number][] = [
  ['roomy', 1500],
  ['one-row', 1300],
  ['two-rows', 820],
];

const ORDER: BarFit[] = ['roomy', 'one-row', 'two-rows', 'three-rows'];

export function fitFor(width: number): BarFit {
  return FITS.find(([, min]) => width >= min)?.[0] ?? 'three-rows';
}

/**
 * Whether the bar's row, as it is laid out now, has run out of room: wider
 * than itself, or, meant as one row, gone onto a second line.
 */
export function crowded(row: HTMLElement, fit: BarFit): boolean {
  if (row.scrollWidth > row.clientWidth + 1) return true;
  if (fit !== 'roomy' && fit !== 'one-row') return false;
  const shown = [...row.children].filter(
    (k): k is HTMLElement => k instanceof HTMLElement && k.offsetParent !== null
  );
  const [first] = shown;
  return !!first && shown.some((k) => k.offsetTop >= first.offsetTop + first.offsetHeight);
}

/**
 * The widest layout the bar fits, from `fitFor` its width down: each is put
 * on the bar and looked at, and the bar is left as it was for React to set.
 */
export function fitOf(bar: HTMLElement): BarFit {
  let at = ORDER.indexOf(fitFor(bar.clientWidth));
  const row = bar.querySelector<HTMLElement>('.player-row');
  if (!row) return ORDER[at];
  const was = bar.dataset.fit;
  for (; at < ORDER.length - 1; at++) {
    bar.dataset.fit = ORDER[at];
    if (!crowded(row, ORDER[at])) break;
  }
  if (was === undefined) delete bar.dataset.fit;
  else bar.dataset.fit = was;
  return ORDER[at];
}

/**
 * The layout the element's width fits. `null` until it is measured, and
 * wherever there is no `ResizeObserver` (the server, the tests): the bar
 * falls back to one row, its read-out shown or hidden by the window's width.
 */
export function useBarFit(el: HTMLElement | null): BarFit | null {
  const [fit, setFit] = useState<BarFit | null>(null);
  useEffect(() => {
    if (!el || typeof ResizeObserver !== 'function') return;
    /* By width only: a new layout changes the bar's height, and that is no
       reason to measure again. */
    let width = -1;
    const measure = () => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      setFit(fitOf(el));
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [el]);
  return fit;
}
