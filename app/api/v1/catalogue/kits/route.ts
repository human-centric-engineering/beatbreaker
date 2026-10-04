/**
 * The kits.
 *
 * GET /api/v1/catalogue/kits — every visible kit, with its knobs, its credit
 * and the URLs of its recordings.
 *
 * The sample URLs are built here rather than by each client (`slotsWithUrls`).
 * A recorded kit is a map of pieces (9-v), resolved before it gets here, so
 * each slot's URLs point into its piece's folder.
 *
 * Authentication: none — see `…/styles`. Rate limiting is already done.
 */

import { catalogueResponse, slotsWithUrls } from '@/app/api/v1/catalogue/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { listKits } from '@/lib/app/breaks/catalogue/data';

export async function GET(request: Request): Promise<Response> {
  const log = await getRouteLogger(request);
  const kits = await listKits();

  const data = kits.map((kit) => ({
    key: kit.key,
    label: kit.label,
    hint: kit.hint,
    group: kit.group,
    engine: kit.engine,
    credit: kit.credit ?? null,
    machine: kit.machine ?? null,
    pack: kit.pack ?? null,
    trim: kit.trim ?? null,
    master: kit.master,
    voices: { k: kit.k, s: kit.s, h: kit.h, r: kit.r, c: kit.c, t: kit.t, p: kit.p },
    samples: slotsWithUrls(kit.pack, kit.samples.slots) ?? null,
    /* Lane → pan, where the kit has its own (9-v). */
    pan: kit.samples.pan ?? null,
    /* The shared percussion set, on whichever kit ships it. Percussion is
       deliberately not per kit — a tambourine over the Studio '70s set should
       be a tambourine — so a client reads it off whichever kit has it. */
    percussion: slotsWithUrls(kit.pack, kit.samples.perc) ?? null,
  }));

  log.info('Catalogue kits listed', { count: kits.length });
  return catalogueResponse(request, data);
}
