/**
 * Is this username free? (Phase 6, task 6.2)
 *
 * GET /api/v1/drummer-profile/available?username= — `{ available: true }`, or
 *     `{ available: false, reason, message }` where `reason` is `shape`,
 *     `unavailable` (reserved, a look-alike or a blocked word — one answer, so
 *     the list is not taught) or `taken` (someone has it, or gave it up in the
 *     last 30 days). Your own current username is available to you.
 *
 * Usernames are public — they are on every published pattern — so answering
 * "taken" reveals nothing a visitor to `/explore` could not see.
 *
 * Authentication: any authenticated user. Rate limiting is applied by
 * `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { validateQueryParams } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { usernameAvailability } from '@/lib/app/breaks/community/profile';
import { usernameQuerySchema } from '@/lib/validations/drummer-profile';

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const { username } = validateQueryParams(
      new URL(request.url).searchParams,
      usernameQuerySchema
    );
    const answer = await usernameAvailability(username, session.user.id);
    log.info('Username checked', { available: answer.available });
    return successResponse(answer);
  },
  {
    ownership: {
      decidedBy: 'self',
      because:
        'Answers for the caller (their own name counts as free to them); reveals only whether a public name is in use.',
    },
  }
);
