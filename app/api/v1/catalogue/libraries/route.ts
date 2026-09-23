/**
 * The pattern libraries.
 *
 * GET /api/v1/catalogue/libraries — every visible library, with how many
 * patterns each holds. The patterns themselves come from `…/libraries/[key]`,
 * because a list of libraries is a menu and a library is 47 documents.
 *
 * Authentication: none — see `…/styles`. Rate limiting is already done.
 */

import { catalogueResponse } from '@/app/api/v1/catalogue/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { listLibraries } from '@/lib/app/breaks/catalogue/data';

export async function GET(request: Request): Promise<Response> {
  const log = await getRouteLogger(request);
  const libraries = await listLibraries();

  const data = libraries.map((l) => ({
    key: l.key,
    title: l.title,
    description: l.description,
    entryCount: l.entries.length,
    /* The headings, in order, so a menu can say what is inside without
       fetching it. Derived from the entries rather than stored: the order is
       already in the rows. */
    groups: [...new Set(l.entries.map((e) => e.group))],
  }));

  log.info('Catalogue libraries listed', { count: libraries.length });
  return catalogueResponse(request, data);
}
