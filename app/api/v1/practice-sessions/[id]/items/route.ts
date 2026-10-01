/**
 * Practice sessions — the patterns in one of yours (Phase 7D)
 *
 * PUT /api/v1/practice-sessions/:id/items — `{ items: [...] }`, the whole
 *     list in order, up to twelve. An item already in the session is named by
 *     `id` and keeps its pattern; a new one names a `breakId` or a
 *     `libraryEntryId`; one left out is removed. Reorder, edit, add and remove
 *     are all this one call. The minutes are split again on the server (D31):
 *     pinned items keep theirs, the rest share what is left. A new pattern you
 *     cannot see is a 404; an id not in this session, or more patterns than
 *     minutes, is a 400. Answers with the session as `GET …/:id` reads it.
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
import { replaceItems } from '@/lib/app/breaks/saved/sessions';
import { cuidSchema } from '@/lib/validations/common';
import { replaceItemsSchema } from '@/lib/validations/practice-sessions';

export const PUT = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const id = cuidSchema.safeParse((await params).id);
    if (!id.success) {
      throw new ValidationError('Invalid session id', { id: ['Must be a valid CUID'] });
    }
    const { items } = await validateRequestBody(request, replaceItemsSchema);
    const updated = await replaceItems(session.user.id, id.data, items);
    if (!updated) throw new NotFoundError(`Practice session ${id.data} not found`);
    log.info('Practice session items replaced', { sessionId: id.data, items: items.length });
    return successResponse(updated);
  },
  {
    ownership: {
      decidedBy: 'self',
      because:
        "Writes only where the session's `userId` is `session.user.id`; each new pattern is checked visible to the caller.",
    },
  }
);
