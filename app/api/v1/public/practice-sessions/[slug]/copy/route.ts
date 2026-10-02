/**
 * Save a shared practice session as yours (Phase 7D, D32)
 *
 * POST /api/v1/public/practice-sessions/:slug/copy — 201 with the copy, a
 *      private session of yours, credited to the one it came from ("From
 *      _username_'s session"). It keeps only the patterns you can open, and
 *      its targets are yours — your best at each layer, else the pattern's
 *      tempo; the owner's goals do not come with it. A session that is not
 *      shared is a 404; past 100 sessions, a 429.
 *
 * Signed-in only: reading a shared session needs no account, keeping one
 * does.
 *
 * Rate limiting: the `public` tier (per IP) from `proxy.ts`, and the session
 * cap above.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { withAuth } from '@/lib/auth/guards';
import { slugSchema } from '@/lib/app/breaks/community/visibility';
import { copySharedSession } from '@/lib/app/breaks/saved/session-sharing';

export const POST = withAuth<{ slug: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const slug = slugSchema.safeParse((await params).slug);
    if (!slug.success) throw new NotFoundError('Practice session not found');
    const copy = await copySharedSession(session.user.id, slug.data);
    log.info('Practice session copied', { sessionId: copy.id, items: copy.items.length });
    return successResponse(copy, undefined, { status: 201 });
  },
  {
    ownership: {
      decidedBy: 'nothing',
      because:
        'Reads any link-shared session, which is the point of sharing, and writes a copy owned by `session.user.id`; the body names no owner.',
    },
  }
);
