/**
 * Practice history (D18)
 *
 * GET    /api/v1/history — what you opened, newest first, each with the layer
 *        and tempo you left it at and what a row needs to show its target.
 *        One request fills the list; there is no per-row fetch.
 * POST   /api/v1/history — `{ breakId, level, bpm }` or
 *        `{ libraryEntryId, level, bpm }`: it is on the stage now, at this
 *        layer and tempo. 200 with the visit, moved to the top. Recording the
 *        same target again updates it rather than adding a row.
 * DELETE /api/v1/history — forget all of it.
 *
 * A target is one of the caller's own patterns, someone else's shared pattern,
 * or a library entry the catalogue shows. A target the caller cannot see
 * answers 404, whether or not it exists. The newest 200 are kept.
 *
 * Authentication: any authenticated user. Scoped to the caller by
 * construction — `userId` comes from the session, never the body.
 *
 * Rate limiting is applied by `proxy.ts` before this handler runs. The Studio
 * records on open and, debounced, when the layer or tempo moves — well under
 * the section cap.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { clearHistory, listHistory, recordVisit } from '@/lib/app/breaks/saved/history';
import { recordVisitSchema } from '@/lib/validations/history';

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const visits = await listHistory(session.user.id);
    log.info('History listed', { count: visits.length });
    return successResponse(visits);
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Lists visits filtered by `session.user.id`; the query names no other subject.',
    },
  }
);

export const POST = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const { target, at } = await validateRequestBody(request, recordVisitSchema);

    const visit = await recordVisit(session.user.id, target, at);
    if (!visit) throw new NotFoundError('Nothing to record with that id');

    log.info('Visit recorded', { visitId: visit.id, kind: visit.target.kind });
    return successResponse(visit);
  },
  {
    // Ownership: the visit row is the caller's by construction. Its target is
    // checked in `recordVisit` by the same "yours, shared, or in the catalogue"
    // rule the list uses, so recording cannot reach what reading cannot.
    ownership: {
      decidedBy: 'self',
      because:
        'Writes a visit owned by `session.user.id`; the target is checked visible to the caller by the rule the list applies.',
    },
  }
);

export const DELETE = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const cleared = await clearHistory(session.user.id);
    log.info('History cleared', { cleared });
    return successResponse({ cleared });
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Deletes only where `userId` is `session.user.id`.',
    },
  }
);
