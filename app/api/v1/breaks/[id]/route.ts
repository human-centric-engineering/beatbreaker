/**
 * Breaks — one break
 *
 * GET    /api/v1/breaks/:id — the break, whole, with its critic report
 * PATCH  /api/v1/breaks/:id — rename, replace the document, share or unshare
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
import { breakDocFromPayload } from '@/lib/app/breaks/share';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';
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

    /* The report is derived, not stored. Storing it would mean a row whose
       score was computed by a version of the critic nobody can identify, and
       the critic is cheap and pure — so it runs on the way out. */
    const doc = breakDocFromPayload(sharePayloadSchema.parse(row.doc));
    const checks = playability(doc.A, doc.bpm);
    const report = critique(doc.A, doc.bpm);

    log.info('Break fetched', { breakId: id, mine: row.userId === session.user.id });
    return successResponse({
      ...row,
      // BigInt does not survive JSON.stringify
      seed: row.seed.toString(),
      mine: row.userId === session.user.id,
      critique: { ...report, checks: checks.checks, playable: checks.hard },
    });
  },
  {
    // Ownership: the row is fetched by `{ id, OR: [own, shared] }`, so the query
    // itself is the authorisation — see RouteOwnership in lib/auth/guards.ts.
    ownership: {
      decidedBy: 'resource',
      because:
        'Readable if the caller owns the row or the row is marked shared; both are conditions of the single fetch, and a miss is a 404 either way.',
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

    const derived = patch.doc ? breakDocFromPayload(patch.doc) : null;

    const saved = await prisma.break.update({
      where: { id },
      data: {
        ...(patch.title === undefined ? {} : { title: patch.title }),
        ...(patch.shared === undefined ? {} : { shared: patch.shared }),
        ...(derived && patch.doc
          ? {
              doc: patch.doc,
              style: derived.A.style,
              meter: derived.A.meter,
              bpm: Math.round(derived.bpm),
              swing: Math.round(derived.swing),
              seed: BigInt(derived.A.seed),
              bars: derived.A.bars.length,
            }
          : {}),
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
        updatedAt: true,
      },
    });

    log.info('Break updated', { breakId: id, fields: Object.keys(patch) });
    return successResponse(saved);
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
