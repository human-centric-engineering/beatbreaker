/**
 * One shared practice session (Phase 7D, D32)
 *
 * GET /api/v1/public/practice-sessions/:slug — the session: its name, total
 *     and count-in, the owner's username (null when they have none), and each
 *     pattern with its minutes, layer, target and climb, and where it opens —
 *     its `/p/` page, or a famous break by id. A pattern made private since
 *     the session was shared comes back `available: false`, with no title.
 *
 * No session needed. An unshared session, a deleted one and a slug that was
 * never minted are the same 404. Never a user id, account name or email.
 *
 * Rate limiting: the `public` tier, keyed on IP, applied by `proxy.ts`.
 * Cacheable: ETag and `304`.
 */

import { publicResponse } from '@/app/api/v1/public/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/responses';
import { slugSchema } from '@/lib/app/breaks/community/visibility';
import { getPublicSession } from '@/lib/app/breaks/saved/session-sharing';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const log = await getRouteLogger(request);
  const parsed = slugSchema.safeParse((await params).slug);
  // a malformed address is the same 404 as a missing one
  const found = parsed.success ? await getPublicSession(parsed.data) : null;
  if (!found) {
    return errorResponse('No such practice session', { code: ErrorCodes.NOT_FOUND, status: 404 });
  }
  log.info('Public practice session read', { items: found.items.length });
  return publicResponse(request, found);
}
