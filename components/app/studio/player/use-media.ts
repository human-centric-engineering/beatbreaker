'use client';

import { useSyncExternalStore } from 'react';

/**
 * From where the player's bar takes over from the phone's footer transport,
 * and the Sound and Practise drawers hand the kit and the mixer to it.
 */
export const PLAYER_WIDE = '(min-width: 640px)';

/** From where the drummer stays on screen in the chart view, small, in the top corner. */
export const PIP_WIDE = '(min-width: 768px)';

/**
 * Whether a media query matches, kept up to date as the window changes.
 *
 * False on the server and wherever there is no `matchMedia` (the tests): the
 * narrow layout is the one every width can fall back to. Which component is
 * mounted is decided here rather than hidden by the stylesheet because the
 * two layouts hold the same controls, and a control hidden by CSS is still
 * one more of the same name to a screen reader's list and to a test.
 */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (change) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', change);
      return () => list.removeEventListener('change', change);
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false
  );
}
