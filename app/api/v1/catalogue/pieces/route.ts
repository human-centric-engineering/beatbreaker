/**
 * The pieces (Phase 9-v).
 *
 * GET /api/v1/catalogue/pieces — every piece a kit may be built from: one
 * instrument from one source, the slots it fills, and the URLs of its
 * recordings. A kit's slot names one by `key`.
 *
 * Authentication: none — see `…/styles`. Pieces are catalogue data, the same
 * for everyone, and served the way the kits are: memoised, with an ETag.
 * Rate limiting is already done.
 */

import { catalogueResponse, slotsWithUrls } from '@/app/api/v1/catalogue/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { listPieces } from '@/lib/app/breaks/catalogue/data';

export async function GET(request: Request): Promise<Response> {
  const log = await getRouteLogger(request);
  const pieces = await listPieces();

  const data = pieces.map((piece) => ({
    key: piece.key,
    label: piece.label,
    role: piece.role,
    source: piece.source,
    credit: piece.credit ?? null,
    slots: slotsWithUrls(piece.folder, piece.slots) ?? {},
  }));

  log.info('Catalogue pieces listed', { count: pieces.length });
  return catalogueResponse(request, data);
}
