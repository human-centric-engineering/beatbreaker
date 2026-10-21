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
 * containing block of its fixed descendants, and its panels are fixed.
 */
export type BarFit = 'roomy' | 'one-row' | 'two-rows' | 'three-rows';

/** The narrowest each layout fits in, widest first. */
const FITS: [BarFit, number][] = [
  ['roomy', 1500],
  ['one-row', 1300],
  ['two-rows', 820],
];

export function fitFor(width: number): BarFit {
  return FITS.find(([, min]) => width >= min)?.[0] ?? 'three-rows';
}

/**
 * The layout the element's width fits. `null` until it is measured, and
 * wherever there is no `ResizeObserver` (the server, the tests): the bar
 * falls back to one row.
 */
export function useBarFit(el: HTMLElement | null): BarFit | null {
  const [fit, setFit] = useState<BarFit | null>(null);
  useEffect(() => {
    if (!el || typeof ResizeObserver !== 'function') return;
    const measure = () => setFit(fitFor(el.clientWidth));
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [el]);
  return fit;
}
