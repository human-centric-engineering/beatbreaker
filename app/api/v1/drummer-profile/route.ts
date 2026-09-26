/**
 * Your drummer profile (Phase 6, task 6.2)
 *
 * GET /api/v1/drummer-profile — `{ username, bio, nextChangeAt }`, or `null`
 *     if you have not chosen a username yet.
 * PUT /api/v1/drummer-profile — `{ username, bio? }`: choose a username,
 *     change it, or change what you wrote about yourself. 200 with the
 *     profile. A name that breaks the rules is a 400; one that is taken, held
 *     after someone else's change, or a change inside 30 days of the last is a
 *     409 with the words to show.
 *
 * The username is what everything you publish is credited to (D3). Your
 * account name and email are never public; this is the only name that is.
 *
 * Authentication: any authenticated user. Scoped to the caller by
 * construction — `userId` comes from the session, never the body.
 *
 * Rate limiting is applied by `proxy.ts` before this handler runs. Changing
 * the username is limited to once per 30 days by the handler, which is the
 * limit that matters.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { getDrummerProfile, saveDrummerProfile } from '@/lib/app/breaks/community/profile';
import { drummerProfileSchema } from '@/lib/validations/drummer-profile';

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const profile = await getDrummerProfile(session.user.id);
    log.info('Drummer profile read', { has: profile !== null });
    return successResponse(profile);
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Reads the one row keyed by `session.user.id`; the query names no other subject.',
    },
  }
);

export const PUT = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const input = await validateRequestBody(request, drummerProfileSchema);
    const profile = await saveDrummerProfile(session.user.id, input);
    log.info('Drummer profile saved');
    return successResponse(profile);
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Writes the one row keyed by `session.user.id`; the body names no subject.',
    },
  }
);
