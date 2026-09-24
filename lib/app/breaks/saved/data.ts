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
 * **Readable if it is yours or it is shared, in one query.** A private pattern
 * of someone else's and an id that was never saved are the same `null`, so
 * neither caller can confirm that an id exists (the 404-not-403 rule in the
 * route's header). One function, so the route and the page cannot disagree.
 *
 * Opening a pattern will also record a practice visit (task 4.7, D18). That is
 * a row in its own table, not a column here, because a famous break from the
 * library is opened too and has no `Break` row to hold it.
 */

export interface OpenedBreak {
  row: NonNullable<Awaited<ReturnType<typeof findOpenable>>>;
  /** The stored document, repaired where rows under older rules need it. */
  payload: SharePayload;
  links: StoredLink[];
  mine: boolean;
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

  return { row, payload, links: readStoredLinks(row.links), mine: row.userId === userId };
}
