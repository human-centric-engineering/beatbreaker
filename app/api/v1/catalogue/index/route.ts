/**
 * The index of drummers, bands and songs (Phase 15-c).
 *
 * GET /api/v1/catalogue/index?q=how+soon+is+now — the built and candidate
 * drummers whose name matches, the bands that match with every drummer who
 * played in them, and the songs that match with who drums on them and whether
 * the catalogue plays them yet (D75: an unscored song is still found, marked
 * not scored).
 *
 * Authentication: none — see the map route. Rate limiting is already done:
 * `proxy.ts` applies the `catalogue` tier to `/api/v1/catalogue/`.
 */

import { z } from 'zod';

import { catalogueResponse } from '@/app/api/v1/catalogue/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/responses';
import { getCatalogueIndex } from '@/lib/app/lineage/data';
import { searchIndex } from '@/lib/app/lineage/search';

const querySchema = z.object({ q: z.string().trim().min(1).max(100) });

export async function GET(request: Request): Promise<Response> {
  const log = await getRouteLogger(request);
  const parsed = querySchema.safeParse({
    q: new URL(request.url).searchParams.get('q') ?? undefined,
  });
  if (!parsed.success) {
    return errorResponse('Say what to search for, in 1 to 100 characters', {
      code: ErrorCodes.VALIDATION_ERROR,
      status: 400,
    });
  }

  const result = searchIndex(await getCatalogueIndex(), parsed.data.q);
  log.info('Index searched', {
    drummers: result.drummers.length,
    bands: result.bands.length,
    songs: result.songs.length,
  });
  return catalogueResponse(request, result);
}
