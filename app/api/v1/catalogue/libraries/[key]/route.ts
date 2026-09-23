/**
 * One library, patterns included.
 *
 * GET /api/v1/catalogue/libraries/[key]
 *
 * **One enriched response, not a list plus a fetch per entry.** Each entry
 * carries its whole wire-v4 document, so a client renders, plays and exports a
 * famous break from this one call — and never needs the bar-string parser that
 * used to be the only way to read one.
 *
 * Authentication: none — see `…/styles`. Rate limiting is already done.
 */

import { catalogueResponse } from '@/app/api/v1/catalogue/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/responses';
import { getLibrary } from '@/lib/app/breaks/catalogue/data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
): Promise<Response> {
  const log = await getRouteLogger(request);
  const { key } = await params;

  const library = await getLibrary(key);
  if (!library) {
    return errorResponse('No such library', { code: ErrorCodes.NOT_FOUND, status: 404 });
  }

  log.info('Catalogue library read', { key, entries: library.entries.length });
  return catalogueResponse(request, library);
}
