/**
 * Pins — the practice shelves (D17)
 *
 * GET  /api/v1/pins — both shelves, `{ practising: [...], later: [...] }`, each
 *      pin carrying what a row needs to show its target. One request fills
 *      both shelves; there is no per-pin fetch.
 * POST /api/v1/pins — `{ shelf, breakId }` or `{ shelf, libraryEntryId }`:
 *      pin it to the top of that shelf. 201 when new; 200 when it was already
 *      pinned, with it moved to the shelf asked for.
 *
 * A pin's target is one of the caller's own patterns, someone else's shared
 * pattern, or a library entry the catalogue shows. A target the caller cannot
 * see answers 404, whether or not it exists.
 *
 * Authentication: any authenticated user. Scoped to the caller by
 * construction — `userId` comes from the session, never the body.
 *
 * Rate limiting is applied by `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { listPins, pinTarget } from '@/lib/app/breaks/saved/pins';
import { createPinSchema } from '@/lib/validations/pins';

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const shelves = await listPins(session.user.id);
    log.info('Pins listed', {
      practising: shelves.practising.length,
      later: shelves.later.length,
    });
    return successResponse(shelves);
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Lists pins filtered by `session.user.id`; the query names no other subject.',
    },
  }
);

export const POST = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const { shelf, target } = await validateRequestBody(request, createPinSchema);

    const result = await pinTarget(session.user.id, shelf, target);
    if (!result) throw new NotFoundError('Nothing to pin with that id');

    log.info('Pinned', { pinId: result.pin.id, shelf, kind: result.pin.target.kind });
    return successResponse(result.pin, undefined, { status: result.created ? 201 : 200 });
  },
  {
    // Ownership: the pin row is the caller's by construction. Its target is
    // checked in `pinTarget` by the same "yours, shared, or in the catalogue"
    // query the list uses, so pinning cannot reach what reading cannot.
    ownership: {
      decidedBy: 'self',
      because:
        'Writes a pin owned by `session.user.id`; the target is checked visible to the caller in the same query rule the list applies.',
    },
  }
);
