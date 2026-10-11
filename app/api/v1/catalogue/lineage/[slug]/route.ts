/**
 * One node of the lineage map: a drummer's profile.
 *
 * GET /api/v1/catalogue/lineage/[slug] — the node, the model's record for it,
 * every edge touching it with the node at the other end, and the recordings it
 * plays on. A stub (someone the records name but nobody has modelled) answers
 * with `record: null`.
 *
 * Authentication: none — see the map route. Rate limiting is already done.
 */

import { z } from 'zod';

import { catalogueResponse } from '@/app/api/v1/catalogue/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/responses';
import { getLineageProfile } from '@/lib/app/lineage/data';

const slugParam = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const log = await getRouteLogger(request);
  const { slug } = await params;

  const parsed = slugParam.safeParse(slug);
  const profile = parsed.success ? await getLineageProfile(parsed.data) : null;
  if (!profile) {
    return errorResponse('No such drummer', { code: ErrorCodes.NOT_FOUND, status: 404 });
  }

  log.info('Lineage profile read', { slug: profile.node.slug, edges: profile.edges.length });
  return catalogueResponse(request, profile);
}
