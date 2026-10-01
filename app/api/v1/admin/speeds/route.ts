/**
 * Reported speeds (Phase 7C)
 *
 * GET /api/v1/admin/speeds — every speed record with an open report, with the
 *     reports, oldest first: what it is on, the layer, tempo, date and video
 *     link, whether it is listed, and the drummer's username and email.
 *     Never who reported it.
 *
 * Authentication: admin (`withAdminAuth`). Rate limiting: the admin section
 * cap from `proxy.ts`.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { withAdminAuth } from '@/lib/auth/guards';
import { speedQueue } from '@/lib/app/breaks/community/reports';

export const GET = withAdminAuth(async (request) => {
  const log = await getRouteLogger(request);
  const queue = await speedQueue();
  log.info('Speed moderation queue read', { records: queue.length });
  return successResponse(queue);
});
