/**
 * Your Studio settings (D19)
 *
 * GET   /api/v1/studio-settings — every setting, the default where you have
 *       never set one. A stored value that no longer parses, or names a kit or
 *       style the catalogue no longer has, reads as its default.
 * PATCH /api/v1/studio-settings — any subset of the fields; each one given
 *       replaces the stored value, and the rest are left alone. Tuning
 *       (`sound`) merges by kit: each kit given replaces that kit. 200 with the
 *       settings as they now stand. An unknown field, a value out of range, or
 *       a kit or style key the catalogue does not have is a 400 naming it, and
 *       nothing is written.
 *
 * What belongs to a pattern — its tempo, swing, layer, arrangement, style and
 * meter — is in its document, not here. The starting values for a new
 * pattern are (D21).
 *
 * Authentication: any authenticated user. Scoped to the caller by
 * construction — `userId` comes from the session, never the body.
 *
 * Rate limiting is applied by `proxy.ts` before this handler runs. The Studio
 * writes back debounced, as it autosaves a pattern — well under the section
 * cap.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { readStudioSettings, updateStudioSettings } from '@/lib/app/breaks/saved/settings';
import { studioSettingsPatchSchema } from '@/lib/validations/studio-settings';

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const settings = await readStudioSettings(session.user.id);
    log.info('Studio settings read');
    return successResponse(settings);
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Reads the one row keyed by `session.user.id`; the query names no other subject.',
    },
  }
);

export const PATCH = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const patch = await validateRequestBody(request, studioSettingsPatchSchema);
    const settings = await updateStudioSettings(session.user.id, patch);
    log.info('Studio settings updated', { fields: Object.keys(patch) });
    return successResponse(settings);
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Writes the one row keyed by `session.user.id`; the body names no subject.',
    },
  }
);
