/**
 * Breaks — one break
 *
 * GET    /api/v1/breaks/:id — the break, whole, with its critic report and,
 *        for a copy, `basedOn` — the credit line, while the pattern it came
 *        from is published
 * PATCH  /api/v1/breaks/:id — rename, replace the document, share by link or
 *        make private (`visibility`), describe, set its reference links.
 *        Making a published pattern `link` or `private` unpublishes it;
 *        publishing is `POST /api/v1/breaks/:id/publish`. A pattern that has
 *        ever been published has fixed notes (D26): a `doc` is refused with
 *        `409 PUBLISHED_FIXED`, and a change is saved as a variation through
 *        `POST /api/v1/breaks/:id/copy`. Its name, description and links
 *        stay editable.
 * DELETE /api/v1/breaks/:id
 *
 * A break the caller does not own answers **404, not 403**, and a break that
 * is not private is readable by anyone signed in. Those two rules interact:
 * the read is scoped to `{ id, OR: [own, not private] }` in one query, so a
 * private break belonging to someone else is indistinguishable from one that
 * was never saved. Answering 403 would confirm it exists, which is a slow
 * enumeration of every id.
 *
 * No response carries the owner's `userId` (H8): `mine` says whether it is
 * yours, and that is all a reader needs.
 *
 * Authentication: any authenticated user.
 *
 * Rate limiting is applied by `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { APIError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { critique, playability } from '@/lib/app/breaks/critic';
import { columnsFromDoc } from '@/lib/app/breaks/columns';
import { assertPublishable } from '@/lib/app/breaks/community/publish';
import { lineageOf, visibilityData, withFreshSlug } from '@/lib/app/breaks/community/sharing';
import { readStoredLinks } from '@/lib/app/breaks/links';
import { openSavedBreak } from '@/lib/app/breaks/saved/data';
import { storedPayloadSchema } from '@/lib/app/breaks/schema';
import { breakDocFromPayload } from '@/lib/app/breaks/share';
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

    const opened = await openSavedBreak(id, session.user.id);
    if (!opened) throw new NotFoundError(`Break ${id} not found`);
    /* The owner's id, the parent's id and the grid hash stay in the house
       (H8): `mine` and `basedOn` are what a reader is owed. */
    const {
      row: { userId: _owner, parentId, ownParentId, gridHash: _hash, ...row },
      payload,
      links,
      mine,
    } = opened;

    /* The repaired payload is what goes back, so the client reads what was
       scored. The report is derived, not stored. Storing it would mean a row
       whose score was computed by a version of the critic nobody can identify,
       and the critic is cheap and pure — so it runs on the way out. */
    const doc = breakDocFromPayload(payload);
    const checks = playability(doc.A, doc.bpm);
    const report = critique(doc.A, doc.bpm);

    log.info('Break fetched', { breakId: id, mine });
    return successResponse({
      ...row,
      links,
      doc: payload,
      // BigInt does not survive JSON.stringify
      seed: row.seed.toString(),
      mine,
      basedOn: await lineageOf(parentId ?? ownParentId),
      critique: { ...report, checks: checks.checks, playable: checks.hard },
    });
  },
  {
    // Ownership: the row is fetched by `{ id, OR: [own, not private] }` in
    // `openSavedBreak` (lib/app/breaks/saved/data.ts), so the query
    // itself is the authorisation — see RouteOwnership in lib/auth/guards.ts.
    // Not 'resource': that claims a `resource` resolver asked the policy about
    // the row, and there is none — a resolver would refuse every shared read,
    // since the policy narrows a user to their own rows. Not 'self' either: a
    // shared row is someone else's. The policy is deliberately not consulted.
    ownership: {
      decidedBy: 'nothing',
      because:
        'The handler decides in the query openSavedBreak runs: readable if the caller owns the row or the row is not private; a miss is a 404 either way.',
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
      select: {
        id: true,
        slug: true,
        visibility: true,
        title: true,
        description: true,
        doc: true,
        frozenAt: true,
      },
    });
    if (!existing) throw new NotFoundError(`Break ${id} not found`);

    /* Fixed notes (D26): once published, always — unpublishing does not undo
       it, or the notes could be changed while private and published again.
       Refused before anything is written, so nothing else in the patch lands
       either. */
    if (existing.frozenAt && patch.doc !== undefined) {
      throw new APIError(
        'This pattern has been published, so its notes are fixed. Save your changes as a variation.',
        'PUBLISHED_FIXED',
        409
      );
    }

    /* A published pattern stays held to what publishing checked. An edit that
       keeps it published and changes what the library shows — the title, the
       description — goes through the same word and duplicate checks, and is
       refused with the same codes; otherwise publishing once and renaming
       after would put in the library what publishing refuses. (The notes of
       a published pattern cannot change at all: refused above.)
       An edit that unpublishes it (`visibility` given) needs no check. */
    const staysPublished = existing.visibility === 'published' && patch.visibility === undefined;
    const showsChange =
      patch.title !== undefined || patch.description !== undefined || patch.doc !== undefined;
    let derived: Awaited<ReturnType<typeof columnsFromDoc>>['columns'] | null = null;
    if (staysPublished && showsChange) {
      const checked = await assertPublishable(session.user.id, {
        title: patch.title ?? existing.title,
        description:
          patch.description === undefined ? existing.description : patch.description || null,
        payload: patch.doc ?? storedPayloadSchema.parse(existing.doc),
      });
      if (patch.doc) derived = checked.columns;
    } else if (patch.doc) {
      derived = (await columnsFromDoc(patch.doc)).columns;
    }

    const saved = await withFreshSlug(() =>
      prisma.break.update({
        where: { id },
        data: {
          ...(patch.title === undefined ? {} : { title: patch.title }),
          ...(patch.visibility === undefined ? {} : visibilityData(existing, patch.visibility)),
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
          visibility: true,
          slug: true,
          publishedAt: true,
          frozenAt: true,
          difficulty: true,
          level: true,
          description: true,
          links: true,
          updatedAt: true,
        },
      })
    );

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
