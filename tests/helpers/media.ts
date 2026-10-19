import { vi } from 'vitest';

/**
 * A window this wide, as `matchMedia` sees it.
 *
 * happy-dom's window is 1024px and answers width queries against it, so a
 * component that mounts differently by width (`useMedia`) mounts its laptop
 * layout in every test unless told otherwise. This answers `min-width` and
 * `max-width` queries (joined with `and`) against the width given. Undo with
 * `vi.unstubAllGlobals()`.
 */
export function stubWidth(width: number): void {
  const matches = (query: string) =>
    query.split(/\s+and\s+/).every((part) => {
      const m = /\((min|max)-width:\s*(\d+)px\)/.exec(part);
      if (!m) return true;
      const n = Number(m[2]);
      return m[1] === 'min' ? width >= n : width <= n;
    });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

/** A phone: no player bar, so the transport, the kit and the mixer are where a phone has them. */
export const PHONE = 390;
/** A laptop: the player's bar, and the drummer kept in the chart view's corner. */
export const LAPTOP = 1280;
