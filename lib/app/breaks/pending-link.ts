import { z } from 'zod';

/**
 * A shared link that has to survive a trip through sign-in (H5).
 *
 * A link carries its break in the `#b=` fragment, which the server never sees,
 * so a login redirect cannot pass it along and the login form's `callbackUrl`
 * comes back without it. The signed-out `/breaks` page stashes the fragment
 * here before sending the visitor to sign in, and the console takes it back on
 * the other side.
 *
 * `localStorage` rather than `sessionStorage`: someone opening a link they were
 * sent is often signing up, and the verification email opens a new tab, which
 * a session store does not reach. The expiry keeps a link abandoned at the login
 * page from resurfacing next week.
 *
 * Phase 5's public `/p/[slug]` replaces this; Phase 1's `/breaks` → `/studio`
 * redirect must keep it working until then.
 */

const KEY = 'bb.pendingLink';

const stashed = z.object({ hash: z.string().startsWith('#b='), at: z.number() });
/** How long a stashed link stays good. */
export const PENDING_LINK_TTL_MS = 60 * 60 * 1000;

/** The slice of `Storage` this needs — injectable so it tests without a DOM. */
export type LinkStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Stash a `#b=…` fragment. Anything else is ignored. */
export function stashPendingLink(store: LinkStore, hash: string, now = Date.now()): boolean {
  if (!hash.startsWith('#b=') || hash.length <= 3) return false;
  try {
    store.setItem(KEY, JSON.stringify({ hash, at: now }));
    return true;
  } catch {
    // private mode, quota, blocked storage — the visitor just lands on a fresh break
    return false;
  }
}

/**
 * Take the stashed fragment back, once. Returns `null` if there is none, it has
 * expired, or it is not a fragment this page wrote.
 */
export function takePendingLink(store: LinkStore, now = Date.now()): string | null {
  let raw: string | null;
  try {
    raw = store.getItem(KEY);
    if (raw !== null) store.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const entry = stashed.safeParse(parsed);
  if (!entry.success) return null;
  const { hash, at } = entry.data;
  if (now - at > PENDING_LINK_TTL_MS || now < at) return null;
  return hash;
}
