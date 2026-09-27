/**
 * One shared or published pattern (Phase 6, task 6.5)
 *
 * GET /api/v1/public/patterns/:slug — the pattern, whole: the document, the
 *     username it is credited to (null for a link share by someone with no
 *     username), its reference links, the credit line if it is a copy, how
 *     many people saved a copy, and the critic's summary.
 *
 * No session needed (D2). A private pattern, a deleted one and a slug that
 * was never minted are the same 404, so the address space cannot be probed.
 * Never a user id, account name or email.
 *
 * Rate limiting: the `public` tier, keyed on IP, applied by `proxy.ts`.
 * Cacheable: ETag and `304`.
 */

import { publicResponse } from '@/app/api/v1/public/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/responses';
import { getPublicPattern } from '@/lib/app/breaks/community/public';
import { slugSchema } from '@/lib/app/breaks/community/visibility';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const log = await getRouteLogger(request);
  const parsed = slugSchema.safeParse((await params).slug);
  /* A malformed address is the same 404 as a missing one: there is nothing
     a caller learns from the difference but the slug alphabet. */
  const pattern = parsed.success ? await getPublicPattern(parsed.data) : null;
  if (!pattern) {
    return errorResponse('No such pattern', { code: ErrorCodes.NOT_FOUND, status: 404 });
  }
  log.info('Public pattern read', { visibility: pattern.visibility });
  return publicResponse(request, pattern);
}
