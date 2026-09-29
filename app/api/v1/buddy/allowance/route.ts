/**
 * BeatBuddy's daily allowance (D4), for the drawer's meter.
 *
 * GET /api/v1/buddy/allowance — `{ limit, used, remaining, resetsAt }` for the
 * caller, today (UTC). The stream route refuses a turn when `remaining` is 0.
 *
 * Authentication: any authenticated user. Scoped to the caller by
 * construction. Rate limiting is applied by `proxy.ts`.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { readAllowance } from '@/lib/app/breaks/buddy/allowance';
import { withAuth } from '@/lib/auth/guards';

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const allowance = await readAllowance(session.user.id);
    log.info('BeatBuddy allowance read', { used: allowance.used });
    return successResponse(allowance);
  },
  {
    ownership: {
      decidedBy: 'self',
      because: "Counts the caller's own BeatBuddy messages; takes no id from the request.",
    },
  }
);
