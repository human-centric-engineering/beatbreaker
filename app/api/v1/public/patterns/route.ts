/**
 * The community library (Phase 6, task 6.5)
 *
 * GET /api/v1/public/patterns — published patterns, newest first or most
 *     saved. Filters: `style`, `meter`, `tempo` (`slow` < 90, `medium`
 *     90–120, `fast` > 120), `difficulty` (1–3). `limit` ≤ 48; `cursor` is
 *     opaque and comes back as `meta.nextCursor`.
 *
 * No session needed (D2): the library is public, and a native client (D14)
 * reads it before anyone signs in. Only `published` patterns are listed — a
 * pattern shared by link never is. A card carries the username it is
 * credited to and nothing else about a person: no user id, no account name,
 * no email.
 *
 * Rate limiting: the `public` tier, keyed on IP (`lib/app/rate-limit.ts`),
 * applied by `proxy.ts`. Cacheable: ETag and `304`.
 */

import { publicResponse } from '@/app/api/v1/public/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/responses';
import { listPublished } from '@/lib/app/breaks/community/public';
import { publicListQuerySchema } from '@/lib/validations/public-patterns';

export async function GET(request: Request): Promise<Response> {
  const log = await getRouteLogger(request);
  const parsed = publicListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid query', {
      code: ErrorCodes.VALIDATION_ERROR,
      status: 400,
    });
  }
  const { patterns, nextCursor } = await listPublished(parsed.data);
  log.info('Community library listed', { count: patterns.length, sort: parsed.data.sort });
  return publicResponse(request, patterns, { nextCursor });
}
