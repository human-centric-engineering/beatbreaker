/**
 * Pins — one pin
 *
 * PATCH  /api/v1/pins/:id — `{ shelf?, after? }`: move it to the other shelf,
 *        reorder it (`after` another pin on the destination shelf; `null` is
 *        the top), or both. Moving shelves without `after` lands at the top.
 * DELETE /api/v1/pins/:id — unpin
 *
 * Another user's pin answers 404, the same as one that does not exist — and so
 * does a pin on a pattern its owner has since unshared: it is not in the list,
 * and a PATCH must not hand back what the list hides.
 *
 * Authentication: any authenticated user. Rate limiting is applied by
 * `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { movePin, unpin } from '@/lib/app/breaks/saved/pins';
import { cuidSchema } from '@/lib/validations/common';
import { updatePinSchema } from '@/lib/validations/pins';

function pinId(raw: string): string {
  const parsed = cuidSchema.safeParse(raw);
  if (!parsed.success)
    throw new ValidationError('Invalid pin id', { id: ['Must be a valid CUID'] });
  return parsed.data;
}

export const PATCH = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const id = pinId((await params).id);
    const move = await validateRequestBody(request, updatePinSchema);

    const pin = await movePin(session.user.id, id, move);
    if (!pin) throw new NotFoundError(`Pin ${id} not found`);

    log.info('Pin moved', { pinId: id, shelf: pin.shelf, position: pin.position });
    return successResponse(pin);
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Reads and writes only pins whose `userId` is `session.user.id`; a miss is a 404.',
    },
  }
);

export const DELETE = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const id = pinId((await params).id);

    if (!(await unpin(session.user.id, id))) throw new NotFoundError(`Pin ${id} not found`);

    log.info('Unpinned', { pinId: id });
    return successResponse({ id, deleted: true });
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Deletes only where `userId` is `session.user.id`; a miss is a 404.',
    },
  }
);
