/**
 * Your kits (D20)
 *
 * GET  /api/v1/kits — your own kits, oldest first, each filled slot with the
 *      sample in it and its audio URL: `{ kits }`.
 * POST /api/v1/kits — `{ label? }`: a new, empty kit. 201 with the kit. Its
 *      key is minted here, under a prefix no system kit may use, and is what
 *      the `kit` setting stores when you pick it. 409 `KIT_LIMIT` at 20 kits.
 *
 * Not the catalogue. `/api/v1/catalogue/kits` is public, cached for everyone
 * and limited by IP; a kit of yours there would be served to the next caller.
 * These are owner-scoped and read per request.
 *
 * Authentication: any authenticated user. Scoped to the caller by
 * construction — the owner comes from the session, never the body.
 *
 * Rate limiting is applied by `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { createYourKit, listYourKits } from '@/lib/app/breaks/samples/kits';
import { createYourKitSchema } from '@/lib/validations/samples';

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const kits = await listYourKits(session.user.id);
    log.info('Your kits listed', { count: kits.length });
    return successResponse({ kits });
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Lists only kits whose `ownerId` is `session.user.id`.',
    },
  }
);

export const POST = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const { label } = await validateRequestBody(request, createYourKitSchema);
    const kit = await createYourKit(session.user.id, label);
    log.info('Kit created', { kitId: kit.id });
    return successResponse(kit, undefined, { status: 201 });
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Creates a kit owned by `session.user.id`; the body names no subject.',
    },
  }
);
