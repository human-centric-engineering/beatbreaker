/**
 * Practice sessions — yours (Phase 7D)
 *
 * GET  /api/v1/practice-sessions — your sessions, most recently changed first,
 *      each with what its card shows: the pattern titles, the total, whether
 *      it is shared, and when you last ran it. One request for the whole list.
 * POST /api/v1/practice-sessions — `{ name, totalMinutes, description?,
 *      startPct?, climbPct?, climbShape?, climbSteps?, countIn?, items? }`.
 *      201 with the session. Each item is `{ breakId | libraryEntryId, level,
 *      goalBpm?, minutes?, minutesPinned?, …overrides }`; the minutes are
 *      split on the server (D31), and a target with no goal is your best at
 *      its layer, else the pattern's tempo. A pattern you cannot see is a 404;
 *      more patterns than minutes is a 400; past 100 sessions is a 429.
 *
 * Authentication: any authenticated user. Scoped to the caller by
 * construction — `userId` comes from the session, never the body.
 *
 * Rate limiting: the `/api/v1` section cap from `proxy.ts`, and the session
 * cap above.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { createSession, listSessions } from '@/lib/app/breaks/saved/sessions';
import { createSessionSchema } from '@/lib/validations/practice-sessions';

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const sessions = await listSessions(session.user.id);
    log.info('Practice sessions listed', { count: sessions.length });
    return successResponse(sessions);
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Lists only sessions whose `userId` is `session.user.id`.',
    },
  }
);

export const POST = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const input = await validateRequestBody(request, createSessionSchema);
    const created = await createSession(session.user.id, input);
    log.info('Practice session created', {
      sessionId: created.id,
      items: created.items.length,
      totalMinutes: created.totalMinutes,
    });
    return successResponse(created, undefined, { status: 201 });
  },
  {
    ownership: {
      decidedBy: 'self',
      because:
        "Creates a session owned by `session.user.id`; each item's pattern is checked visible to the caller by the rule opening it applies.",
    },
  }
);
