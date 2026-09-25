import { z } from 'zod';

import { breakPayload, decodeBreak, type StyleLookup } from '@/lib/app/breaks/share';
import type { SharePayload } from '@/lib/app/breaks/schema';

/**
 * The browser favourites (`bb.favs`) the Studio kept before patterns lived in
 * an account, read for their one-time import (task 4.10).
 *
 * The key is external data — written by older builds, editable by anyone with
 * devtools — so each entry is checked on its own, and one that does not read
 * costs only itself, not the import.
 */

/** Where the favourites were kept. Nothing writes it any more. */
export const FAVS_KEY = 'bb.favs';

/** An entry as older builds wrote it. Only the name and the code matter now. */
const favSchema = z.object({ name: z.string(), code: z.string() });

export interface FavsImport {
  /**
   * What the bulk create can be sent, in the order the favourites were listed,
   * each beside the entry it came from.
   */
  breaks: Array<{ entry: unknown; input: { title: string; doc: SharePayload } }>;
  /** Entries that did not read, as they were — kept, never sent. */
  unreadable: unknown[];
}

/**
 * Split what is in `bb.favs` into what can be sent and what cannot.
 *
 * Each code is decoded and re-encoded, not forwarded: that is what opening a
 * favourite and saving it did, so an older code arrives as a current document,
 * with the style snapshot the catalogue gives it rather than none.
 */
export function readFavs(raw: unknown, styles: StyleLookup): FavsImport {
  const out: FavsImport = { breaks: [], unreadable: [] };
  if (!Array.isArray(raw)) return out;
  for (const entry of raw) {
    const fav = favSchema.safeParse(entry);
    if (!fav.success) {
      out.unreadable.push(entry);
      continue;
    }
    try {
      const doc = breakPayload(decodeBreak(fav.data.code, styles));
      const title = fav.data.name.trim().slice(0, 120) || 'Untitled pattern';
      out.breaks.push({ entry, input: { title, doc } });
    } catch {
      out.unreadable.push(entry);
    }
  }
  return out;
}
