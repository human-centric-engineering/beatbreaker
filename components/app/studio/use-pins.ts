'use client';

import { useCallback, useMemo, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { logger } from '@/lib/logging';
import {
  type PinTarget,
  practiceShelvesSchema,
  type PracticeShelvesView,
  type Shelf,
} from '@/lib/validations/pins';

/**
 * The practice shelves as the Studio holds them (D17, task 4.6).
 *
 * Loaded server-side with the page, so a ★ is right on first paint and no row
 * fetches anything. After a change the shelves are read back whole from
 * `GET /api/v1/pins` rather than patched locally: placement renumbers a shelf
 * on the server, and one small list request is cheaper than a second copy of
 * that rule in the browser.
 */

export interface PracticeShelvesState {
  shelves: PracticeShelvesView;
  /** Which shelf this target is on, or null. */
  shelfOf: (target: PinTarget) => Shelf | null;
  /** Pin to a shelf, move to it, or (null) unpin. False when it did not happen. */
  setPin: (target: PinTarget, shelf: Shelf | null) => Promise<boolean>;
}

const EMPTY: PracticeShelvesView = { practising: [], later: [] };

function keyOf(target: PinTarget): string {
  return 'breakId' in target ? `break:${target.breakId}` : `entry:${target.libraryEntryId}`;
}

export function usePins(
  initial: PracticeShelvesView | undefined,
  say: (message: string) => void
): PracticeShelvesState {
  const [shelves, setShelves] = useState<PracticeShelvesView>(initial ?? EMPTY);

  /* target → pin, so a list of forty-seven library rows asks a map, not a scan */
  const index = useMemo(() => {
    const map = new Map<string, { id: string; shelf: Shelf }>();
    for (const pin of [...shelves.practising, ...shelves.later]) {
      const key = pin.target.kind === 'break' ? `break:${pin.target.id}` : `entry:${pin.target.id}`;
      map.set(key, { id: pin.id, shelf: pin.shelf });
    }
    return map;
  }, [shelves]);

  const shelfOf = useCallback(
    (target: PinTarget) => index.get(keyOf(target))?.shelf ?? null,
    [index]
  );

  const setPin = useCallback(
    async (target: PinTarget, shelf: Shelf | null) => {
      const existing = index.get(keyOf(target));
      let ok = true;
      try {
        if (shelf === null) {
          if (existing) await apiClient.delete(`/api/v1/pins/${existing.id}`);
        } else {
          await apiClient.post('/api/v1/pins', { body: { shelf, ...target } });
        }
      } catch (err) {
        ok = false;
        logger.warn('Pin change failed', { error: err instanceof Error ? err.message : err });
        say(shelf ? 'Could not pin that — try again' : 'Could not unpin that — try again');
      }
      /* Read back either way: after a failure the shelves may still have moved
         (another tab, a pin that had already gone), and what is shown should be
         what the server has. */
      try {
        setShelves(practiceShelvesSchema.parse(await apiClient.get('/api/v1/pins')));
      } catch (err) {
        logger.warn('Pins could not be read back', {
          error: err instanceof Error ? err.message : err,
        });
      }
      return ok;
    },
    [index, say]
  );

  return { shelves, shelfOf, setPin };
}
