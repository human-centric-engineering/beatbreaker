'use client';

import { useEffect, useRef } from 'react';
import { z } from 'zod';

import { apiClient } from '@/lib/api/client';
import { FAVS_KEY, readFavs } from '@/lib/app/breaks/favs';
import type { StyleLookup } from '@/lib/app/breaks/share';
import { MAX_BULK_BREAKS } from '@/lib/validations/breaks';
import { logger } from '@/lib/logging';

/** The bulk create answers with the rows it wrote — only how many is read. */
const created = z.array(z.object({ id: z.string() }));

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The one-time import of the browser favourites (`bb.favs`) into the account
 * (task 4.10): once, when the Studio opens, every favourite that reads goes to
 * `POST /api/v1/breaks` in one bulk request, which saves all of them or none.
 *
 * **The key is changed only after the server has the rows.** A request that
 * fails — offline, a refusal, a server error — leaves it exactly as it was,
 * and the next Studio load tries again. On success what was sent is taken out;
 * an entry that did not read is left in, since nothing was done with it, and
 * with nothing readable left there is no request to make, so the import does
 * not repeat.
 */
export function useFavsImport(styles: StyleLookup, say: (message: string) => void): void {
  const started = useRef(false);
  /* The lookup and toast are read when the effect runs, not tracked by it:
     this happens once per load whatever they become. */
  const latest = useRef({ styles, say });
  useEffect(() => {
    latest.current = { styles, say };
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const store = storage();
    if (!store) return;

    let raw: unknown;
    try {
      const text = store.getItem(FAVS_KEY);
      if (text === null) return;
      raw = JSON.parse(text);
    } catch {
      return; // not JSON: nothing that can be read, and nothing to overwrite it with
    }

    const { breaks, unreadable } = readFavs(raw, latest.current.styles);
    if (!breaks.length) return;
    const sending = breaks.slice(0, MAX_BULK_BREAKS);
    const left = [...unreadable, ...breaks.slice(MAX_BULK_BREAKS).map((b) => b.entry)];

    void (async () => {
      try {
        const rows = created.parse(
          await apiClient.post('/api/v1/breaks', {
            body: { breaks: sending.map((b) => b.input) },
          })
        );
        if (left.length) store.setItem(FAVS_KEY, JSON.stringify(left));
        else store.removeItem(FAVS_KEY);
        const n = rows.length;
        latest.current.say(
          `${n === 1 ? 'Your browser favourite is' : `Your ${n} browser favourites are`} now in your account — under Patterns › All`
        );
      } catch (error) {
        logger.warn('BeatBreaker: favourites import failed; kept for next time', {
          error,
          count: sending.length,
        });
      }
    })();
  }, []);
}
