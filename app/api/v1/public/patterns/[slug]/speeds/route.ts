/**
 * A published pattern's speed table (Phase 7C)
 *
 * GET /api/v1/public/patterns/:slug/speeds — one row per drummer, their best
 *     at `level` (1–5, default 5), highest tempo first and, on a tie, whoever
 *     got there first. `video=1` keeps only video-backed records. `limit` ≤ 50;
 *     `cursor` is opaque and comes back as `meta.nextCursor`; `meta.total` is
 *     the table's length.
 *
 * No session needed (D2). An address that is not a published pattern — a
 * link share, a private one, one never minted — is the same 404: only
 * published patterns have tables. Rows carry usernames and nothing else about
 * a person; records are self-reported (D25).
 *
 * Rate limiting: the `public` tier, keyed on IP, applied by `proxy.ts`.
 * Cacheable: ETag and `304`.
 */

import { publicResponse } from '@/app/api/v1/public/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/responses';
import { patternTableTarget, readSpeedTable } from '@/lib/app/breaks/community/speed-tables';
import { slugSchema } from '@/lib/app/breaks/community/visibility';
import { nonEmptyParams } from '@/lib/validations/public-patterns';
import { speedTableQuerySchema } from '@/lib/validations/speeds';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const log = await getRouteLogger(request);
  const query = speedTableQuerySchema.safeParse(nonEmptyParams(new URL(request.url).searchParams));
  if (!query.success) {
    return errorResponse(query.error.issues.map((i) => i.message).join('; '), {
      code: ErrorCodes.VALIDATION_ERROR,
      status: 400,
    });
  }
  const slug = slugSchema.safeParse((await params).slug);
  const target = slug.success ? await patternTableTarget(slug.data) : null;
  if (!target) {
    return errorResponse('No such pattern', { code: ErrorCodes.NOT_FOUND, status: 404 });
  }
  const table = await readSpeedTable(target, query.data);
  log.info('Speed table read', { level: query.data.level, rows: table.rows.length });
  return publicResponse(request, table.rows, {
    total: table.total,
    nextCursor: table.nextCursor,
  });
}
