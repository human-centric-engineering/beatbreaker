import { z } from 'zod';

/**
 * Who can open a saved pattern (Phase 6, task 6.1).
 *
 * - `private` — you.
 * - `link` — anyone with its `/p/<slug>` address, signed in or not (D2). Never
 *   listed anywhere.
 * - `published` — in the community library, under your username (D3).
 *
 * Client-safe: the Studio reads these too. Minting a slug is `slug.ts`, which
 * is server-side only.
 */
export const VISIBILITIES = ['private', 'link', 'published'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

/** What a stored value reads as. Anything unrecognised is the safe answer. */
export function readVisibility(value: unknown): Visibility {
  return VISIBILITIES.find((v) => v === value) ?? 'private';
}

/**
 * The rows someone other than the owner may open: every visibility but
 * `private`. One filter, so the Studio, the API, the pins and the history
 * cannot disagree about what "shared" means.
 */
export const OPENABLE = { visibility: { in: ['link', 'published'] } };

/** A row the caller may open: theirs, or shared with anyone. */
export function openableBy(userId: string): {
  OR: [{ userId: string }, typeof OPENABLE];
} {
  return { OR: [{ userId }, OPENABLE] };
}

/**
 * A slug as it arrives in a URL. Loose enough for the hex slugs the migration
 * gave rows that were `shared` before Phase 6, strict enough that nothing but
 * lower-case letters and digits reaches a query.
 */
export const slugSchema = z.string().regex(/^[0-9a-z]{6,16}$/, 'Invalid pattern address');

/** A pattern's public address, as a path. The page is `app/(public)/p/[slug]`. */
export function publicPath(slug: string): string {
  return `/p/${slug}`;
}
