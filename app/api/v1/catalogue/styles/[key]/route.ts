/**
 * One style's parameters.
 *
 * GET /api/v1/catalogue/styles/[key]           — the current version
 * GET /api/v1/catalogue/styles/[key]?version=2 — that version, for ever
 *
 * The `?version=` form is what makes a saved break reproducible: versions are
 * immutable, a pattern records the one it came from, and re-deriving it from
 * its seed reads that version rather than whatever the style says today.
 *
 * Authentication: none — see the list route. Rate limiting is already done.
 */

import { z } from 'zod';

import { catalogueResponse } from '@/app/api/v1/catalogue/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/responses';
import { getStyle } from '@/lib/app/breaks/catalogue/data';

const versionParam = z.coerce.number().int().min(1).max(100000);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
): Promise<Response> {
  const log = await getRouteLogger(request);
  const { key } = await params;

  const raw = new URL(request.url).searchParams.get('version');
  const wanted = raw === null ? undefined : versionParam.safeParse(raw);
  if (wanted && !wanted.success) {
    return errorResponse('version must be a positive whole number', {
      code: ErrorCodes.VALIDATION_ERROR,
      status: 400,
    });
  }

  const style = await getStyle(key, wanted?.data);
  if (!style) {
    /* One 404 for "no such style" and for "no such version of it". The
       difference is not a caller's business and telling them apart would be a
       way to enumerate which styles exist privately once D16 lands. */
    return errorResponse('No such style', { code: ErrorCodes.NOT_FOUND, status: 404 });
  }

  log.info('Catalogue style read', { key, version: style.version });
  return catalogueResponse(request, {
    key: style.key,
    group: style.group,
    version: style.version,
    versionId: style.versionId,
    params: style.params,
  });
}
