/**
 * Share a practice session with a link (Phase 7D, D32)
 *
 * POST   /api/v1/practice-sessions/:id/share — share it. 200 with
 *        `{ visibility: 'link', slug }`; the page is `/s/<slug>`. Refused with
 *        a 409 `ITEMS_NOT_SHARED` when a pattern in it is one someone without
 *        your account could not open — `details.items` names each, so you know
 *        what to share first. A session with no patterns is a 400.
 * DELETE /api/v1/practice-sessions/:id/share — stop sharing it. 200 with
 *        `{ visibility: 'private', slug: null }`. Its address stops working,
 *        and works again if you share it again.
 *
 * Someone else's session is a 404, the same as one that does not exist.
 *
 * Authentication: any authenticated user. Rate limiting is applied by
 * `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { withAuth } from '@/lib/auth/guards';
import { shareSession, unshareSession } from '@/lib/app/breaks/saved/session-sharing';
import { cuidSchema } from '@/lib/validations/common';

async function sessionId(params: Promise<{ id: string }>): Promise<string> {
  const id = cuidSchema.safeParse((await params).id);
  if (!id.success) {
    throw new ValidationError('Invalid session id', { id: ['Must be a valid CUID'] });
  }
  return id.data;
}

const OWNED = {
  ownership: {
    decidedBy: 'self',
    because: 'Writes only the session whose `userId` is `session.user.id`; a miss is a 404.',
  },
} as const;

export const POST = withAuth<{ id: string }>(async (request, session, { params }) => {
  const log = await getRouteLogger(request);
  const id = await sessionId(params);
  const shared = await shareSession(session.user.id, id);
  if (!shared) throw new NotFoundError(`Practice session ${id} not found`);
  log.info('Practice session shared', { sessionId: id });
  return successResponse(shared);
}, OWNED);

export const DELETE = withAuth<{ id: string }>(async (request, session, { params }) => {
  const log = await getRouteLogger(request);
  const id = await sessionId(params);
  if (!(await unshareSession(session.user.id, id))) {
    throw new NotFoundError(`Practice session ${id} not found`);
  }
  log.info('Practice session unshared', { sessionId: id });
  return successResponse({ visibility: 'private', slug: null });
}, OWNED);
