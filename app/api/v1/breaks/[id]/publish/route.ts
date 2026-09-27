/**
 * Publish a pattern to the community library (Phase 6, task 6.9)
 *
 * POST /api/v1/breaks/:id/publish — `{ confirm: true }`, the "I wrote this, or
 *      I built it from a pattern whose author is credited on it" tick. 200 with
 *      `{ id, visibility: 'published', slug, publishedAt }`.
 *
 * The checks and their codes are `lib/app/breaks/community/publish.ts`:
 * publishing paused (403), not yours (404), no username (409
 * `USERNAME_REQUIRED`), a blocked word (422 `NOT_ALLOWED`), the same notes as
 * someone else's published pattern or a famous break (409 `DUPLICATE`), and
 * the daily cap (429 `PUBLISH_LIMIT`). Unpublishing is
 * `PATCH /api/v1/breaks/:id` with `visibility: 'link'` or `'private'`.
 *
 * Authentication: any authenticated user. Rate limiting: the section cap from
 * `proxy.ts`, and the per-person daily cap above.
 */

import { z } from 'zod';

import { getRouteLogger } from '@/lib/api/context';
import { ValidationError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { publishBreak } from '@/lib/app/breaks/community/publish';
import { cuidSchema } from '@/lib/validations/common';

const publishSchema = z.object({
  confirm: z.literal(true, {
    error: 'Tick the box to say you wrote this, or built it from a pattern that is credited.',
  }),
});

export const POST = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const parsed = cuidSchema.safeParse((await params).id);
    if (!parsed.success) {
      throw new ValidationError('Invalid break id', { id: ['Must be a valid CUID'] });
    }
    await validateRequestBody(request, publishSchema);
    const published = await publishBreak(session.user.id, parsed.data);
    log.info('Break published', { breakId: published.id });
    return successResponse(published);
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'publishBreak reads and writes only the row whose `userId` is `session.user.id`.',
    },
  }
);
