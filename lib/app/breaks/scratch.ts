import { SCRATCH } from '@/lib/app/breaks/browser-keys';
import { type SharePayload } from '@/lib/app/breaks/schema';

/**
 * The scratch pattern — the one on the stage that has never been saved.
 *
 * Until Phase 4 a reload rolled a fresh pattern: the console kept its settings
 * in `localStorage` and the pattern itself nowhere. A pattern that is saved now
 * lives on the server and is reopened by its address; this is the other half,
 * so the one that is not saved survives a reload too.
 *
 * It is read back as untrusted input. `localStorage` is written by this app,
 * but also by every earlier version of it and by anyone with devtools, so the
 * payload goes through the same schema a pasted share code does, and anything
 * that fails it is treated as no scratch at all.
 */

const { key: KEY, schema: stored } = SCRATCH;

/** The slice of `Storage` this needs — injectable so it tests without a DOM. */
export type ScratchStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Keep the scratch pattern. False when storage refused (private mode, quota). */
export function writeScratch(
  store: ScratchStore,
  payload: SharePayload,
  now = Date.now()
): boolean {
  try {
    store.setItem(KEY, JSON.stringify({ payload, at: now }));
    return true;
  } catch {
    return false;
  }
}

/** The scratch pattern, or null when there is none that reads. */
export function readScratch(store: ScratchStore): SharePayload | null {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const parsed = stored.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.payload : null;
  } catch {
    // blocked storage, or not JSON — either way there is nothing to restore
    return null;
  }
}

/** Forget it — once it has been saved, the server's copy is the pattern. */
export function clearScratch(store: ScratchStore): void {
  try {
    store.removeItem(KEY);
  } catch {
    // nothing to clear, then
  }
}
