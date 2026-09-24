import { readStoredLinks, type StoredLink } from '@/lib/app/breaks/links';
import { type SharePayload, storedPayloadSchema } from '@/lib/app/breaks/schema';
import { prisma } from '@/lib/db/client';

/**
 * Opening a saved pattern — the one read both `GET /api/v1/breaks/:id` and the
 * Studio's `/studio/[id]` page go through.
 *
 * **Server-side only**, for the reason given in `catalogue/data.ts`: the
 * Studio gets what this returns as a prop, never by importing it.
 *
 * Two rules live here so that the route and the page cannot disagree on them:
 *
 * - **Readable if it is yours or it is shared, in one query.** A private
 *   pattern of someone else's and an id that was never saved are the same
 *   `null`, so neither caller can confirm that an id exists (the 404-not-403
 *   rule in the route's header).
 * - **Opening your own pattern marks it opened; opening someone else's does
 *   not.** "Recent" is the owner's record of what they worked on. The touch is
 *   raw SQL, scoped to the owner in the statement itself, because a Prisma
 *   `update` stamps `@updatedAt` — and then merely opening a pattern would move
 *   it to the top of "last edited", and the two sorts would be one.
 */

export interface OpenedBreak {
  row: NonNullable<Awaited<ReturnType<typeof findOpenable>>>;
  /** The stored document, repaired where rows under older rules need it. */
  payload: SharePayload;
  links: StoredLink[];
  mine: boolean;
  /** Now, for the owner; the stored value for anyone else. */
  lastOpenedAt: Date | null;
}

function findOpenable(id: string, userId: string) {
  return prisma.break.findFirst({
    where: { id, OR: [{ userId }, { shared: true }] },
    include: {
      takes: {
        where: { userId },
        select: { id: true, bpm: true, layer: true, duration: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function openSavedBreak(id: string, userId: string): Promise<OpenedBreak | null> {
  const row = await findOpenable(id, userId);
  if (!row) return null;

  /* Repaired rather than refused: a row saved before the share-code schema was
     tightened must still open (see storedPayloadSchema). */
  const payload = storedPayloadSchema.parse(row.doc);

  const mine = row.userId === userId;
  const lastOpenedAt = mine ? new Date() : row.lastOpenedAt;
  if (mine) {
    await prisma.$executeRaw`UPDATE "break" SET "lastOpenedAt" = ${lastOpenedAt} WHERE "id" = ${id} AND "userId" = ${userId}`;
  }

  return { row, payload, links: readStoredLinks(row.links), mine, lastOpenedAt };
}
