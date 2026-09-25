/**
 * Home (task 4.9)
 *
 * GET /api/v1/home — `{ practising, recent, savedCount }`: the Practising
 *     shelf as cards, each with the layer and tempo it opens at, when it was
 *     last opened and a small engraved thumbnail (an SVG node tree, as
 *     `POST /api/v1/breaks/engrave` answers); the newest few history items;
 *     and how many patterns you have saved. One request fills Home; there is
 *     no per-card fetch.
 *
 * What a card links to is the client's business — the web page builds Studio
 * URLs from the target, a native client (D14) opens its own screen.
 *
 * Authentication: any authenticated user. Scoped to the caller by
 * construction — `userId` comes from the session.
 *
 * Rate limiting is applied by `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { withAuth } from '@/lib/auth/guards';
import { readHome } from '@/lib/app/breaks/saved/home';

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const home = await readHome(session.user.id);
    log.info('Home read', {
      practising: home.practising.length,
      recent: home.recent.length,
      savedCount: home.savedCount,
    });
    return successResponse(home);
  },
  {
    ownership: {
      decidedBy: 'self',
      because:
        'Reads pins, visits and a break count filtered by `session.user.id`; the queries name no other subject.',
    },
  }
);
