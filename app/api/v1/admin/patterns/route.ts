/**
 * The moderation queue (Phase 6, task 6.11)
 *
 * GET /api/v1/admin/patterns — every pattern with an open report, with its
 *     reports, oldest first: title, slug, visibility, the owner's username and
 *     email, how many reference links it has. Never who reported it.
 *
 * Authentication: admin (`withAdminAuth`). Rate limiting: the admin section
 * cap from `proxy.ts`.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { withAdminAuth } from '@/lib/auth/guards';
import { moderationQueue } from '@/lib/app/breaks/community/reports';

export const GET = withAdminAuth(async (request) => {
  const log = await getRouteLogger(request);
  const queue = await moderationQueue();
  log.info('Moderation queue read', { patterns: queue.length });
  return successResponse(queue);
});
