/**
 * Moderate a reported pattern (Phase 6, task 6.11)
 *
 * POST /api/v1/admin/patterns/:id — `{ action }`:
 *      - `unpublish` — back to private, open reports closed as actioned, the
 *        owner emailed;
 *      - `strip-links` — its reference links removed, still published, open
 *        `bad-link` reports closed;
 *      - `dismiss` — open reports closed as dismissed.
 *      200 with `{ breakId, action, reportsClosed }`. Takes effect on the next
 *      public read.
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
import { MODERATION_ACTIONS, moderate } from '@/lib/app/breaks/community/moderation';
import { logAdminAction } from '@/lib/orchestration/audit/admin-audit-logger';
import { getClientIP } from '@/lib/security/ip';
import { cuidSchema } from '@/lib/validations/common';

const moderateSchema = z.object({ action: z.enum(MODERATION_ACTIONS) });

export const POST = withAdminAuth<{ id: string }>(async (request, session, { params }) => {
  const log = await getRouteLogger(request);
  const id = cuidSchema.safeParse((await params).id);
  if (!id.success) throw new ValidationError('Invalid break id', { id: ['Must be a valid CUID'] });
  const { action } = await validateRequestBody(request, moderateSchema);
  const result = await moderate(id.data, action, session.user.id);
  log.info('Pattern moderated', { breakId: id.data, action, reportsClosed: result.reportsClosed });
  logAdminAction({
    userId: session.user.id,
    action: `pattern.${action}`,
    entityType: 'break',
    entityId: id.data,
    entityName: result.title,
    metadata: { reportsClosed: result.reportsClosed },
    clientIp: getClientIP(request),
  });
  return successResponse({
    breakId: result.breakId,
    action: result.action,
    reportsClosed: result.reportsClosed,
  });
});
