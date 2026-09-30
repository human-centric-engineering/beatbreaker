/**
 * Moderate a reported speed (Phase 7C)
 *
 * POST /api/v1/admin/speeds/:id — `{ action }`, where `:id` is the record's id
 *      as the queue gives it:
 *      - `unlist` — off every table (`listed = false`), kept in the
 *        drummer's history; open reports closed as actioned; the drummer is
 *        emailed;
 *      - `dismiss` — open reports closed as dismissed.
 *      200 with `{ recordId, action, reportsClosed }`. An unknown record is a
 *      404. Takes effect on the next public read.
 *
 * Authentication: admin (`withAdminAuth`). Every action is logged with the
 * admin's id through the admin audit log.
 */

import { z } from 'zod';

import { getRouteLogger } from '@/lib/api/context';
import { ValidationError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAdminAuth } from '@/lib/auth/guards';
import { moderateSpeed, SPEED_MODERATION_ACTIONS } from '@/lib/app/breaks/community/moderation';
import { logAdminAction } from '@/lib/orchestration/audit/admin-audit-logger';
import { getClientIP } from '@/lib/security/ip';
import { cuidSchema } from '@/lib/validations/common';

const moderateSchema = z.object({ action: z.enum(SPEED_MODERATION_ACTIONS) });

export const POST = withAdminAuth<{ id: string }>(async (request, session, { params }) => {
  const log = await getRouteLogger(request);
  const id = cuidSchema.safeParse((await params).id);
  if (!id.success) {
    throw new ValidationError('Invalid record id', { id: ['Must be a valid CUID'] });
  }
  const { action } = await validateRequestBody(request, moderateSchema);
  const result = await moderateSpeed(id.data, action, session.user.id);
  log.info('Speed moderated', { recordId: id.data, action, reportsClosed: result.reportsClosed });
  logAdminAction({
    userId: session.user.id,
    action: `speed.${action}`,
    entityType: 'speed_record',
    entityId: id.data,
    metadata: { reportsClosed: result.reportsClosed },
    clientIp: getClientIP(request),
  });
  return successResponse(result);
});
