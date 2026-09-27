import { mintSlug } from '@/lib/app/breaks/community/slug';
import type { Visibility } from '@/lib/app/breaks/community/visibility';
import { prisma } from '@/lib/db/client';

/**
 * Sharing a saved pattern by link, and crediting the one a copy came from
 * (tasks 6.1 and 6.3). **Server-side only.**
 */

/** What an owner may set directly. Publishing has its own route and checks (6.9). */
export type DirectVisibility = Exclude<Visibility, 'published'>;

/**
 * The columns to write to move a row to `next`. The slug is minted the first
 * time a row leaves `private` and kept after — so a link that stopped working
 * because its pattern was made private works again when it is shared again,
 * and a published pattern that goes back to a link share keeps its address.
 */
export function visibilityData(
  current: { slug: string | null },
  next: DirectVisibility
): { visibility: DirectVisibility; slug?: string } {
  if (next === 'private' || current.slug) return { visibility: next };
  return { visibility: next, slug: mintSlug() };
}

/**
 * A unique-constraint clash on `slug`. Read by shape rather than by
 * `instanceof`: `lib/app/**` does not import Prisma, and the shape (`code`
 * P2002, the columns in `meta.target`) is what Prisma documents.
 */
export function isUniqueClash(error: unknown, column: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, meta } = error as { code?: unknown; meta?: { target?: unknown } };
  if (code !== 'P2002') return false;
  const target = meta?.target;
  return Array.isArray(target) ? target.includes(column) : String(target).includes(column);
}

/**
 * Run a write that may mint a slug, again if the slug it minted was taken.
 * At 50 bits a clash will not happen; if it ever does, the writer should not
 * be the one to find out.
 */
export async function withFreshSlug<T>(write: () => Promise<T>, tries = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await write();
    } catch (error) {
      if (attempt >= tries || !isUniqueClash(error, 'slug')) throw error;
    }
  }
}

/** The credit line on a copy: "Based on _title_ by @_username_". */
export interface BasedOn {
  title: string;
  username: string;
  slug: string;
}

/**
 * Who a copy is credited to — while the pattern it came from is still
 * **published**, and only then. A link-shared parent is not credited: the
 * credit links to it, and a copy shared onward would hand its private address
 * to strangers. A parent that was deleted, made private or whose owner was
 * erased (so `parentId` is null) has no credit at all.
 */
export async function lineageOf(parentId: string | null): Promise<BasedOn | null> {
  if (!parentId) return null;
  const parent = await prisma.break.findFirst({
    where: { id: parentId, visibility: 'published' },
    select: { title: true, slug: true, userId: true },
  });
  if (!parent?.slug) return null;
  const profile = await prisma.drummerProfile.findUnique({
    where: { userId: parent.userId },
    select: { username: true },
  });
  if (!profile) return null;
  return { title: parent.title, username: profile.username, slug: parent.slug };
}
