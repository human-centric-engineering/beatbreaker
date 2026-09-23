/**
 * The styles, as the picker needs them.
 *
 * GET /api/v1/catalogue/styles — every visible style at its current version,
 * with the group headings and their order.
 *
 * Authentication: none. The catalogue is public (D2) — a signed-out visitor
 * opening a shared pattern needs it, and so does a native client before anyone
 * has signed in (D14). Nothing here is about a person.
 *
 * Rate limiting is already done: `proxy.ts` applies the `catalogue` tier
 * (240/min, keyed on IP) registered in `lib/app/rate-limit.ts`.
 */

import { catalogueResponse } from '@/app/api/v1/catalogue/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { styleGroupsOf } from '@/lib/app/breaks/catalogue/rows';

export async function GET(request: Request): Promise<Response> {
  const log = await getRouteLogger(request);
  const styles = await listStyles();

  /* Groups come back beside the styles rather than as a second call: the
     picker cannot render without both, and two endpoints would be two round
     trips for one list. The order is the rows' own, so nothing here decides it. */
  const data = {
    styles: styles.map((s) => ({
      key: s.key,
      group: s.group,
      version: s.version,
      versionId: s.versionId,
      label: s.params.label,
      hint: s.params.hint,
      meter: s.params.meter ?? '4/4',
      bpm: s.params.bpm,
      params: s.params,
    })),
    groups: styleGroupsOf(styles),
  };

  log.info('Catalogue styles listed', { count: styles.length });
  return catalogueResponse(request, data);
}
