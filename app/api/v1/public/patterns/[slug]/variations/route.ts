/**
 * The variations of a published pattern (Phase 7A)
 *
 * GET /api/v1/public/patterns/:slug/variations — its published variations,
 *     newest first or most saved. `limit` ≤ 48; `cursor` is opaque and comes
 *     back as `meta.nextCursor`. Only direct children: a variation of a
 *     variation is listed under its own parent.
 *
 * No session needed (D2). An address that is not a published pattern — a
 * link share, a private one, one never minted — is the same 404: a link
 * share's copies are plain copies, not variations. Cards carry usernames and
 * nothing else about a person.
 *
 * Rate limiting: the `public` tier, keyed on IP, applied by `proxy.ts`.
 * Cacheable: ETag and `304`.
 */

import { publicResponse } from '@/app/api/v1/public/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/responses';
import { listVariations } from '@/lib/app/breaks/community/public';
import { slugSchema } from '@/lib/app/breaks/community/visibility';
import { nonEmptyParams, variationsQuerySchema } from '@/lib/validations/public-patterns';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const log = await getRouteLogger(request);
  const query = variationsQuerySchema.safeParse(nonEmptyParams(new URL(request.url).searchParams));
  if (!query.success) {
    return errorResponse(query.error.issues.map((i) => i.message).join('; '), {
      code: ErrorCodes.VALIDATION_ERROR,
      status: 400,
    });
  }
  const slug = slugSchema.safeParse((await params).slug);
  const list = slug.success ? await listVariations(slug.data, query.data) : null;
  if (!list) {
    return errorResponse('No such pattern', { code: ErrorCodes.NOT_FOUND, status: 404 });
  }
  log.info('Variations listed', { count: list.patterns.length, sort: query.data.sort });
  return publicResponse(request, list.patterns, { nextCursor: list.nextCursor });
}
