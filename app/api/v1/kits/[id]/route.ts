/**
 * Your kits — one kit (D20)
 *
 * GET    /api/v1/kits/:id — the kit, each filled slot with its sample.
 * PATCH  /api/v1/kits/:id — `{ label?, slots? }`: rename it, and set any slot
 *        to one of your samples by id, or `null` to empty it. Slots not named
 *        are left alone. A sample that is not yours is a 400 naming the slot.
 * DELETE /api/v1/kits/:id — the kit goes; the samples in it stay.
 *
 * Someone else's kit, and a system kit, answer 404 — the same as a kit that
 * does not exist.
 *
 * Authentication: any authenticated user. Rate limiting is applied by
 * `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { deleteYourKit, getYourKit, updateYourKit } from '@/lib/app/breaks/samples/kits';
import { cuidSchema } from '@/lib/validations/common';
import { updateYourKitSchema } from '@/lib/validations/samples';

function kitId(raw: string): string {
  const parsed = cuidSchema.safeParse(raw);
  if (!parsed.success)
    throw new ValidationError('Invalid kit id', { id: ['Must be a valid CUID'] });
  return parsed.data;
}

const OWNERSHIP = {
  decidedBy: 'self',
  because: 'Reads and writes only kits whose `ownerId` is `session.user.id`; a miss is a 404.',
} as const;

export const GET = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const id = kitId((await params).id);
    const kit = await getYourKit(session.user.id, id);
    if (!kit) throw new NotFoundError(`Kit ${id} not found`);
    log.info('Kit fetched', { kitId: id });
    return successResponse(kit);
  },
  { ownership: OWNERSHIP }
);

export const PATCH = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const id = kitId((await params).id);
    const patch = await validateRequestBody(request, updateYourKitSchema);
    const kit = await updateYourKit(session.user.id, id, patch);
    if (!kit) throw new NotFoundError(`Kit ${id} not found`);
    log.info('Kit updated', { kitId: id, slots: Object.keys(patch.slots ?? {}) });
    return successResponse(kit);
  },
  { ownership: OWNERSHIP }
);

export const DELETE = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const id = kitId((await params).id);
    if (!(await deleteYourKit(session.user.id, id))) throw new NotFoundError(`Kit ${id} not found`);
    log.info('Kit deleted', { kitId: id });
    return successResponse({ id, deleted: true });
  },
  { ownership: OWNERSHIP }
);
