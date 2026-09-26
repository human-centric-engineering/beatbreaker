import { z } from 'zod';

import { PATTERNS_TABS } from '@/components/app/shell/studio-address';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';

/**
 * Everything the Studio keeps in this browser, each key with the schema it is
 * read back through (D19).
 *
 * What stays here depends on the screen in front of you, or only has to last a
 * few minutes; how you play lives in your account (`StudioSettings`) and a
 * pattern's values in its document. `localStorage` is written by this app, but
 * also by every earlier version of it and by anyone with devtools, so nothing
 * is trusted by its type: a value that fails its schema is the default.
 *
 * A key the app writes that is not listed here fails
 * `tests/unit/lib/app/breaks/browser-keys.test.ts`. Light/dark is Sunrise's own
 * `theme` key and is not the Studio's to list.
 */

/** One browser setting: where it is kept, what it must look like, and what it is otherwise. */
export interface StoredSetting<T> {
  key: string;
  schema: z.ZodType<T>;
  fallback: T;
}

/** Which layers the chart shows: A alone, B alone, or both. */
export const VIEW_MODES = ['A', 'B', 'both'] as const;

/** The chart's zoom, within what the size slider allows. */
export const SIZE_MIN = 0.7;
export const SIZE_MAX = 1.7;

export const SIZE: StoredSetting<number> = {
  key: 'bb.size',
  schema: z.number().min(SIZE_MIN).max(SIZE_MAX),
  fallback: 1,
};

export const VIEW: StoredSetting<(typeof VIEW_MODES)[number]> = {
  key: 'bb.view',
  schema: z.enum(VIEW_MODES),
  fallback: 'both',
};

/** The Patterns drawer's last tab; `null` lets the drawer pick from what you have. */
export const PATTERNS_TAB: StoredSetting<(typeof PATTERNS_TABS)[number] | null> = {
  key: 'bb.patternsTab',
  schema: z.enum(PATTERNS_TABS).nullable(),
  fallback: null,
};

/**
 * The two short-lived hand-offs. Each is read once, by its own module
 * (`scratch.ts`, `pending-link.ts`), not through the hook; they are listed here
 * so the whole of what the browser holds is in one place.
 */

/** The pattern on the stage that has never been saved. */
export const SCRATCH = {
  key: 'bb.scratch',
  schema: z.object({ payload: sharePayloadSchema, at: z.number() }),
} as const;

/** A shared link held across sign-in (H5). */
export const PENDING_LINK = {
  key: 'bb.pendingLink',
  schema: z.object({ hash: z.string().startsWith('#b='), at: z.number() }),
} as const;

/** Every key above — what the grep test holds the app's `bb.` literals to. */
export const BROWSER_KEYS = [
  SIZE.key,
  VIEW.key,
  PATTERNS_TAB.key,
  SCRATCH.key,
  PENDING_LINK.key,
] as const;
