/**
 * About you (Phase 7B, task 7B.3)
 *
 * GET /api/v1/drummer-about — `{ purposes, styles, ability, styleAbility,
 *     channels, public, askedAt }`, every field present, empty where you have
 *     said nothing.
 * PUT /api/v1/drummer-about — any of `{ purposes, styles, ability,
 *     styleAbility, channels, public, asked }`. A field left out is left
 *     alone; an empty list or `ability: null` clears one. 200 with the whole
 *     of it. A channel link off its platform's allowlist, a style the
 *     catalogue does not have, or an ability for a style you did not choose
 *     is a 400, and nothing is saved.
 *
 * Channel links are stored as the canonical URL the server rebuilds, never
 * the string sent. Which fields are public is yours to switch; only those
 * leave through `GET /api/v1/public/drummers/[username]`.
 *
 * Authentication: any authenticated user. Scoped to the caller by
 * construction — `userId` comes from the session, never the body.
 *
 * Rate limiting is applied by `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { getAbout, saveAbout } from '@/lib/app/breaks/community/about';
import { aboutSaved } from '@/lib/app/breaks/community/about-saved';
import { drummerAboutSchema } from '@/lib/validations/drummer-about';

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const about = await getAbout(session.user.id);
    log.info('About you read');
    return successResponse(about);
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
    const input = await validateRequestBody(request, drummerAboutSchema);
    const { about, abilityChanged } = await saveAbout(session.user.id, input);
    await aboutSaved(session.user.id, about, { abilityChanged });
    log.info('About you saved', { fields: Object.keys(input), abilityChanged });
    return successResponse(about);
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Writes the one row keyed by `session.user.id`; the body names no subject.',
    },
  }
);
