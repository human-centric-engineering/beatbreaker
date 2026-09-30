/**
 * Reported profiles (Phase 7B, task 7B.6)
 *
 * GET /api/v1/admin/drummers — every drummer with an open report on their
 *     profile, with the reports, oldest first: the username, email, bio and
 *     how many channel links the profile lists. Never who reported it.
 *
 * Authentication: admin (`withAdminAuth`). Rate limiting: the admin section
 * cap from `proxy.ts`.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { withAdminAuth } from '@/lib/auth/guards';
import { profileQueue } from '@/lib/app/breaks/community/reports';

export const GET = withAdminAuth(async (request) => {
  const log = await getRouteLogger(request);
  const queue = await profileQueue();
  log.info('Profile moderation queue read', { profiles: queue.length });
  return successResponse(queue);
});
