/**
 * A drummer's public profile (Phase 7B, task 7B.4)
 *
 * GET /api/v1/public/drummers/:username — `{ username, bio }` and each of
 *     `purposes`, `styles`, `ability` and `channels` that the drummer has
 *     switched on; `styleAbility` only when both styles and ability are. A
 *     field that is switched off is absent, not empty.
 *
 * No session needed (D2). An unknown username and a malformed one are the
 * same 404. Never a user id, account name or email.
 *
 * Rate limiting: the `public` tier, keyed on IP, applied by `proxy.ts`.
 * Cacheable: ETag and `304`.
 */

import { publicResponse } from '@/app/api/v1/public/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/responses';
import { getPublicDrummer } from '@/lib/app/breaks/community/public';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
): Promise<Response> {
  const log = await getRouteLogger(request);
  const drummer = await getPublicDrummer((await params).username);
  if (!drummer) {
    return errorResponse('No such drummer', { code: ErrorCodes.NOT_FOUND, status: 404 });
  }
  log.info('Public drummer read');
  return publicResponse(request, drummer);
}
