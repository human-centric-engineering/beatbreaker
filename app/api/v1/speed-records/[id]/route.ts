/**
 * Speed records — one of yours (Phase 7C)
 *
 * DELETE /api/v1/speed-records/:id — delete it. It leaves every table on the
 *        next read. Someone else's record is a 404, the same as one that does
 *        not exist.
 *
 * Authentication: any authenticated user. Rate limiting is applied by
 * `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { withAuth } from '@/lib/auth/guards';
import { deleteSpeed } from '@/lib/app/breaks/saved/speeds';
import { cuidSchema } from '@/lib/validations/common';

export const DELETE = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const id = cuidSchema.safeParse((await params).id);
    if (!id.success) {
      throw new ValidationError('Invalid record id', { id: ['Must be a valid CUID'] });
    }
    if (!(await deleteSpeed(session.user.id, id.data))) {
      throw new NotFoundError(`Speed record ${id.data} not found`);
    }
    log.info('Speed deleted', { recordId: id.data });
    return successResponse({ id: id.data, deleted: true });
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Deletes only where `userId` is `session.user.id`; a miss is a 404.',
    },
  }
);
