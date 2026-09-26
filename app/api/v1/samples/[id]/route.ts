/**
 * Your samples — one sample (D20)
 *
 * DELETE /api/v1/samples/:id — empties the slots of your kits that hold it,
 *        removes the row, then the file. 200 with `{ id, deleted, usage }`.
 *
 * Someone else's sample answers 404, the same as one that does not exist:
 * anything else confirms that an id exists.
 *
 * Authentication: any authenticated user. Rate limiting is applied by
 * `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { withAuth } from '@/lib/auth/guards';
import { deleteSample, sampleStorage } from '@/lib/app/breaks/samples/data';
import { cuidSchema } from '@/lib/validations/common';

function sampleId(raw: string): string {
  const parsed = cuidSchema.safeParse(raw);
  if (!parsed.success)
    throw new ValidationError('Invalid sample id', { id: ['Must be a valid CUID'] });
  return parsed.data;
}

export const DELETE = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const id = sampleId((await params).id);

    const usage = await deleteSample(session.user.id, sampleStorage(), id);
    if (!usage) throw new NotFoundError(`Sample ${id} not found`);

    log.info('Sample deleted', { sampleId: id });
    return successResponse({ id, deleted: true, usage });
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Deletes only where `userId` is `session.user.id`; a miss is a 404.',
    },
  }
);
