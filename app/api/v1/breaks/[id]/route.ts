/**
 * Breaks — one break
 *
 * GET    /api/v1/breaks/:id — the break, whole, with its critic report. Opening
 *        your own break marks it opened ("Recent"); opening someone else's
 *        shared one does not.
 * PATCH  /api/v1/breaks/:id — rename, replace the document, share or unshare,
 *        pin, describe, set its reference links
 * DELETE /api/v1/breaks/:id
 *
 * A break the caller does not own answers **404, not 403**, and a shared break
 * is readable by anyone signed in. Those two rules interact: the read is scoped
 * to `{ id, OR: [own, shared] }` in one query, so a private break belonging to
 * someone else is indistinguishable from one that was never saved. Answering
 * 403 would confirm it exists, which is a slow enumeration of every id.
 *
 * Authentication: any authenticated user.
 *
 * Rate limiting is applied by `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { critique, playability } from '@/lib/app/breaks/critic';
import { columnsFromDoc } from '@/lib/app/breaks/columns';
import { readStoredLinks } from '@/lib/app/breaks/links';
import { breakDocFromPayload } from '@/lib/app/breaks/share';
import { storedPayloadSchema } from '@/lib/app/breaks/schema';
import { prisma } from '@/lib/db/client';
import { cuidSchema } from '@/lib/validations/common';
import { updateBreakSchema } from '@/lib/validations/breaks';

function breakId(raw: string): string {
  const parsed = cuidSchema.safeParse(raw);
  if (!parsed.success)
    throw new ValidationError('Invalid break id', { id: ['Must be a valid CUID'] });
  return parsed.data;
}

export const GET = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const id = breakId((await params).id);

    const row = await prisma.break.findFirst({
      where: { id, OR: [{ userId: session.user.id }, { shared: true }] },
      include: {
        takes: {
          where: { userId: session.user.id },
          select: { id: true, bpm: true, layer: true, duration: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!row) throw new NotFoundError(`Break ${id} not found`);

    /* The document is repaired rather than refused: a row saved before the
       share-code schema was tightened must still open (see storedPayloadSchema),
       and the repaired payload is what goes back, so the client reads what was
       scored. The report is derived, not stored. Storing it would mean a row
       whose score was computed by a version of the critic nobody can identify,
       and the critic is cheap and pure — so it runs on the way out. */
    const payload = storedPayloadSchema.parse(row.doc);
    const doc = breakDocFromPayload(payload);
    const checks = playability(doc.A, doc.bpm);
    const report = critique(doc.A, doc.bpm);

    const mine = row.userId === session.user.id;
    const openedAt = mine ? new Date() : row.lastOpenedAt;
    if (mine) {
      /* Raw, and scoped to the owner in the statement itself. Through the
         client this would be an `update`, and Prisma stamps `@updatedAt` on
         every update it issues — so merely opening a pattern would move it to
         the top of "sort by last edited", and the two sorts would be one. */
      await prisma.$executeRaw`UPDATE "break" SET "lastOpenedAt" = ${openedAt} WHERE "id" = ${id} AND "userId" = ${session.user.id}`;
    }

    log.info('Break fetched', { breakId: id, mine });
    return successResponse({
      ...row,
      lastOpenedAt: openedAt,
      links: readStoredLinks(row.links),
      doc: payload,
      // BigInt does not survive JSON.stringify
      seed: row.seed.toString(),
      mine,
      critique: { ...report, checks: checks.checks, playable: checks.hard },
    });
  },
  {
    // Ownership: the row is fetched by `{ id, OR: [own, shared] }`, so the query
    // itself is the authorisation — see RouteOwnership in lib/auth/guards.ts.
    // Not 'resource': that claims a `resource` resolver asked the policy about
    // the row, and there is none — a resolver would refuse every shared read,
    // since the policy narrows a user to their own rows. Not 'self' either: a
    // shared row is someone else's. The policy is deliberately not consulted.
    ownership: {
      decidedBy: 'nothing',
      because:
        'The handler decides in its own query: readable if the caller owns the row or the row is marked shared; a miss is a 404 either way.',
    },
  }
);

export const PATCH = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const id = breakId((await params).id);
    const patch = await validateRequestBody(request, updateBreakSchema);

    /* Scoped to the owner, and checked before the update rather than relying on
       `updateMany` returning 0: a caller editing someone else's shared break
       should get the same 404 as one editing a break that does not exist. */
    const existing = await prisma.break.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError(`Break ${id} not found`);

    const derived = patch.doc ? columnsFromDoc(patch.doc).columns : null;

    const saved = await prisma.break.update({
      where: { id },
      data: {
        ...(patch.title === undefined ? {} : { title: patch.title }),
        ...(patch.shared === undefined ? {} : { shared: patch.shared }),
        ...(patch.pinned === undefined ? {} : { pinned: patch.pinned }),
        // an empty description clears it rather than storing ''
        ...(patch.description === undefined ? {} : { description: patch.description || null }),
        ...(patch.links === undefined ? {} : { links: patch.links }),
        ...(derived && patch.doc ? { doc: patch.doc, ...derived } : {}),
      },
      select: {
        id: true,
        title: true,
        style: true,
        meter: true,
        bpm: true,
        swing: true,
        bars: true,
        shared: true,
        pinned: true,
        level: true,
        description: true,
        links: true,
        updatedAt: true,
      },
    });

    log.info('Break updated', { breakId: id, fields: Object.keys(patch) });
    return successResponse({ ...saved, links: readStoredLinks(saved.links) });
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Reads and writes only rows whose `userId` is `session.user.id`.',
    },
  }
);

export const DELETE = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const id = breakId((await params).id);

    /* `deleteMany` with the owner in the filter, so a break belonging to
       someone else is a no-op rather than a delete — and the count tells us
       which happened without a prior read. Takes go with it: the Take.breakId
       FK cascades. */
    const { count } = await prisma.break.deleteMany({
      where: { id, userId: session.user.id },
    });
    if (!count) throw new NotFoundError(`Break ${id} not found`);

    log.info('Break deleted', { breakId: id });
    return successResponse({ id, deleted: true });
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Deletes only where `userId` is `session.user.id`; a miss is a 404.',
    },
  }
);
