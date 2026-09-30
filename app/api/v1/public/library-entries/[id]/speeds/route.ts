/**
 * A famous break's speed table (Phase 7C)
 *
 * GET /api/v1/public/library-entries/:id/speeds — the same table as a
 *     published pattern's (`/api/v1/public/patterns/:slug/speeds`), for an
 *     entry in a library everyone can see. `:id` is the entry's id as the
 *     catalogue gives it. Only records on the entry's current notes are
 *     listed: when an admin corrects a famous break, records on the old notes
 *     drop off.
 *
 * No session needed (D2). An id that is not such an entry is a 404.
 *
 * Rate limiting: the `public` tier, keyed on IP, applied by `proxy.ts`.
 * Cacheable: ETag and `304`.
 */

import { publicResponse } from '@/app/api/v1/public/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/responses';
import { entryTableTarget, readSpeedTable } from '@/lib/app/breaks/community/speed-tables';
import { cuidSchema } from '@/lib/validations/common';
import { nonEmptyParams } from '@/lib/validations/public-patterns';
import { speedTableQuerySchema } from '@/lib/validations/speeds';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const log = await getRouteLogger(request);
  const query = speedTableQuerySchema.safeParse(nonEmptyParams(new URL(request.url).searchParams));
  if (!query.success) {
    return errorResponse(query.error.issues.map((i) => i.message).join('; '), {
      code: ErrorCodes.VALIDATION_ERROR,
      status: 400,
    });
  }
  const id = cuidSchema.safeParse((await params).id);
  const target = id.success ? await entryTableTarget(id.data) : null;
  if (!target) {
    return errorResponse('No such library entry', { code: ErrorCodes.NOT_FOUND, status: 404 });
  }
  const table = await readSpeedTable(target, query.data);
  log.info('Speed table read', { level: query.data.level, rows: table.rows.length });
  return publicResponse(request, table.rows, {
    total: table.total,
    nextCursor: table.nextCursor,
  });
}
