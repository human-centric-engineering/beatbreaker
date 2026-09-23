import { checkConditional, computeETag } from '@/lib/api/etag';
import { successResponse } from '@/lib/api/responses';

/**
 * What every catalogue read has in common.
 *
 * The catalogue is public (D2: a signed-out visitor opens a shared pattern, and
 * the player needs the style snapshot's neighbours to render the picker), it
 * changes a few times a year, and it is read on every page load. So every one
 * of these endpoints answers the same way: an ETag, a `304` when the caller
 * already has it, and a `Cache-Control` that says it is shareable.
 *
 * Rate limiting is already done. `proxy.ts` applies the `catalogue` tier
 * (240/min, keyed on IP) registered in `lib/app/rate-limit.ts` before any of
 * these handlers runs — do not call a limiter here.
 */

/**
 * `public` rather than `private`, which is the platform default.
 *
 * Nothing here is about a person: the same 37 styles go to everyone signed in
 * or out, so a CDN or a company proxy holding one copy for everybody is the
 * right outcome rather than a leak. `must-revalidate` with `max-age=0` keeps
 * the ETag in charge — a cache may store it, but it asks before serving it, so
 * an admin's edit is visible on the next request rather than after a TTL.
 */
const CATALOGUE_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

/**
 * One catalogue payload, as a conditional, cacheable response.
 *
 * @returns a `304` when the caller's `If-None-Match` matches, otherwise `200`.
 */
export function catalogueResponse<T>(request: Request, data: T): Response {
  const etag = computeETag(data);
  const notModified = checkConditional(request, etag);
  if (notModified) {
    /* `checkConditional` sends the platform's private default with its 304,
       which would contradict the 200's `public`. Rebuilding the 304 here keeps
       the pair consistent: a shared cache that stored the 200 must be allowed
       to revalidate it. */
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': CATALOGUE_CACHE_CONTROL },
    });
  }
  return successResponse(data, undefined, {
    headers: { ETag: etag, 'Cache-Control': CATALOGUE_CACHE_CONTROL },
  });
}
