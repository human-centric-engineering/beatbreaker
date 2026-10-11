/**
 * The drummer lineage map (Phase 11, D48).
 *
 * GET /api/v1/catalogue/lineage — every node (drummers, the people and styles
 * around them) and every edge between them. Records are left out; a profile
 * is one more call.
 *
 * Authentication: none. Like the rest of the catalogue it is public content
 * about famous musicians, not about anyone's account. Rate limiting is already
 * done: `proxy.ts` applies the `catalogue` tier to `/api/v1/catalogue/`.
 */

import { catalogueResponse } from '@/app/api/v1/catalogue/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { getLineageGraph } from '@/lib/app/lineage/data';

export async function GET(request: Request): Promise<Response> {
  const log = await getRouteLogger(request);
  const graph = await getLineageGraph();
  log.info('Lineage read', { nodes: graph.nodes.length, edges: graph.edges.length });
  return catalogueResponse(request, graph);
}
