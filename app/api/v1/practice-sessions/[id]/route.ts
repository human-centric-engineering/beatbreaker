/**
 * Practice sessions — one of yours (Phase 7D)
 *
 * GET    /api/v1/practice-sessions/:id — the session and its items, each with
 *        its target worked out: the goal, else your best at its layer, else
 *        the pattern's tempo; and where it starts. An item whose pattern was
 *        deleted or made private has `target: null` and keeps its title.
 * PATCH  /api/v1/practice-sessions/:id — the session's own fields. A new
 *        `totalMinutes` re-splits the items around their pins; fewer minutes
 *        than patterns is a 400.
 * DELETE /api/v1/practice-sessions/:id — delete it and its items. Its runs
 *        stay in your history.
 *
 * Someone else's session is a 404, the same as one that does not exist.
 *
 * Authentication: any authenticated user. Rate limiting is applied by
 * `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { deleteSession, readSession, updateSession } from '@/lib/app/breaks/saved/sessions';
import { cuidSchema } from '@/lib/validations/common';
import { updateSessionSchema } from '@/lib/validations/practice-sessions';

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
    because: 'Reads and writes only where `userId` is `session.user.id`; a miss is a 404.',
  },
} as const;

export const GET = withAuth<{ id: string }>(async (request, session, { params }) => {
  const log = await getRouteLogger(request);
  const id = await sessionId(params);
  const found = await readSession(session.user.id, id);
  if (!found) throw new NotFoundError(`Practice session ${id} not found`);
  log.info('Practice session read', { sessionId: id, items: found.items.length });
  return successResponse(found);
}, OWNED);

export const PATCH = withAuth<{ id: string }>(async (request, session, { params }) => {
  const log = await getRouteLogger(request);
  const id = await sessionId(params);
  const input = await validateRequestBody(request, updateSessionSchema);
  const updated = await updateSession(session.user.id, id, input);
  if (!updated) throw new NotFoundError(`Practice session ${id} not found`);
  log.info('Practice session updated', { sessionId: id, fields: Object.keys(input) });
  return successResponse(updated);
}, OWNED);

export const DELETE = withAuth<{ id: string }>(async (request, session, { params }) => {
  const log = await getRouteLogger(request);
  const id = await sessionId(params);
  if (!(await deleteSession(session.user.id, id))) {
    throw new NotFoundError(`Practice session ${id} not found`);
  }
  log.info('Practice session deleted', { sessionId: id });
  return successResponse({ id, deleted: true });
}, OWNED);
