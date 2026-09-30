/**
 * Moderate a reported profile (Phase 7B, task 7B.6)
 *
 * POST /api/v1/admin/drummers/:id — `{ action }`, where `:id` is the
 *      profile owner's user id as the queue gives it:
 *      - `strip-links` — the channel links removed, open `bad-link` reports
 *        closed as actioned;
 *      - `dismiss` — open reports closed as dismissed.
 *      200 with `{ subjectId, action, reportsClosed }`. A profile with no
 *      reports is a 404. Takes effect on the next public read.
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
import { moderateProfile, PROFILE_MODERATION_ACTIONS } from '@/lib/app/breaks/community/moderation';
import { logAdminAction } from '@/lib/orchestration/audit/admin-audit-logger';
import { getClientIP } from '@/lib/security/ip';
import { cuidSchema } from '@/lib/validations/common';

const moderateSchema = z.object({ action: z.enum(PROFILE_MODERATION_ACTIONS) });

export const POST = withAdminAuth<{ id: string }>(async (request, session, { params }) => {
  const log = await getRouteLogger(request);
  const id = cuidSchema.safeParse((await params).id);
  if (!id.success) throw new ValidationError('Invalid user id', { id: ['Must be a valid CUID'] });
  const { action } = await validateRequestBody(request, moderateSchema);
  const result = await moderateProfile(id.data, action, session.user.id);
  log.info('Profile moderated', {
    subjectId: id.data,
    action,
    reportsClosed: result.reportsClosed,
  });
  logAdminAction({
    userId: session.user.id,
    action: `profile.${action}`,
    entityType: 'user',
    entityId: id.data,
    metadata: { reportsClosed: result.reportsClosed },
    clientIp: getClientIP(request),
  });
  return successResponse(result);
});
