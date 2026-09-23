/**
 * The kits.
 *
 * GET /api/v1/catalogue/kits — every visible kit, with its knobs, its credit
 * and the URLs of its recordings.
 *
 * The sample URLs are built here rather than by each client: the files live
 * under `/kits/<pack>/<file>` and only the server should be deciding what that
 * path is. A client gets URLs it can fetch and nothing to assemble.
 *
 * Authentication: none — see `…/styles`. Rate limiting is already done.
 */

import { catalogueResponse } from '@/app/api/v1/catalogue/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { listKits } from '@/lib/app/breaks/catalogue/data';
import type { KitSampleSlot } from '@/lib/app/breaks/kit';

/** Where the recorded kits are served from. */
const BASE = '/kits';

function withUrls(
  pack: string | undefined,
  slots: Record<string, KitSampleSlot> | undefined
): Record<string, { velocities: number[] | null; urls: string[] }> | undefined {
  if (!pack || !slots) return undefined;
  return Object.fromEntries(
    Object.entries(slots).map(([slot, spec]) => [
      slot,
      { velocities: spec.v, urls: spec.files.map((file) => `${BASE}/${pack}/${file}`) },
    ])
  );
}

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
    samples: withUrls(kit.pack, kit.samples.slots) ?? null,
    /* The shared percussion set, on whichever kit ships it. Percussion is
       deliberately not per kit — a tambourine over the Studio '70s set should
       be a tambourine — so a client reads it off whichever kit has it. */
    percussion: withUrls(kit.pack, kit.samples.perc) ?? null,
  }));

  log.info('Catalogue kits listed', { count: kits.length });
  return catalogueResponse(request, data);
}
