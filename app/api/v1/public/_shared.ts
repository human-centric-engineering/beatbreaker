import { checkConditional, computeETag } from '@/lib/api/etag';
import { successResponse } from '@/lib/api/responses';

/**
 * What every public read has in common (Phase 6, task 6.5): an ETag, a `304`
 * when the caller has it already, and a `Cache-Control` a shared cache may
 * store but must revalidate — so a pattern made private stops being served on
 * the next request, not after a TTL.
 *
 * Nothing in these responses is about the reader: the same page goes to
 * everyone, signed in or not, which is why `public` is right here.
 *
 * Rate limiting is already done: `proxy.ts` applies the `public` tier
 * registered in `lib/app/rate-limit.ts`, keyed on IP.
 */
const PUBLIC_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

export function publicResponse<T>(
  request: Request,
  data: T,
  meta?: Record<string, unknown>
): Response {
  const etag = computeETag({ data, meta });
  if (checkConditional(request, etag)) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': PUBLIC_CACHE_CONTROL },
    });
  }
  return successResponse(data, meta, {
    headers: { ETag: etag, 'Cache-Control': PUBLIC_CACHE_CONTROL },
  });
}
