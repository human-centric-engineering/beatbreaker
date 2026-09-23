/**
 * Score a break.
 *
 * POST /api/v1/breaks/critique — a pattern in; the hard playability filter and
 * the 0–100 opinion out.
 *
 * **No style argument, and that is the point of wire v4.** The critic reads the
 * snapshot the pattern carries, so a break scores the same for the person who
 * made it and for anyone they send it to — including someone whose catalogue
 * has never held its style.
 *
 * This is also the gate for anything a model writes (Phase 7): a generated
 * pattern goes through `sharePayloadSchema` and then through here before a user
 * sees it.
 *
 * Authentication: any authenticated user. Stateless. Rate limiting is already
 * done by `proxy.ts`.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { critique, playability } from '@/lib/app/breaks/critic';
import { patternFromPacked } from '@/lib/app/breaks/share';
import { critiqueBreakSchema } from '@/lib/validations/break-operations';

export const POST = withAuth(
  async (request) => {
    const log = await getRouteLogger(request);
    const { doc, bpm } = await validateRequestBody(request, critiqueBreakSchema);

    const pattern = patternFromPacked(doc);
    const score = critique(pattern, bpm);
    const checks = playability(pattern, bpm);

    log.info('Break critiqued', { score: score.score, playable: checks.hard, bpm });
    return successResponse({ critique: score, playability: checks });
  },
  {
    ownership: {
      decidedBy: 'nothing',
      because:
        'Stateless: scores a document in the request body. No row is read or written, so there is no subject to scope to.',
    },
  }
);
