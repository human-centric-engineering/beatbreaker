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
import { type KitSampleSlot, slotLayers, slotTrim } from '@/lib/app/breaks/kit';

/** Where the recorded kits are served from. */
const BASE = '/kits';

/**
 * A slot as a client reads it. `layers` is every velocity layer with all its
 * round-robins (Phase 9). `velocities` and `urls` are the shape this route
 * served before round-robins — one file per layer, the first of each — kept
 * so a client written against it still plays. `trim` is the slot's level, a
 * gain to multiply in beside the kit's own `trim` (1 where a slot has none).
 */
interface SlotOut {
  velocities: number[] | null;
  urls: string[];
  layers: Array<{ velocity: number; urls: string[] }>;
  trim: number;
}

function withUrls(
  pack: string | undefined,
  slots: Record<string, KitSampleSlot> | undefined
): Record<string, SlotOut> | undefined {
  if (!pack || !slots) return undefined;
  const url = (file: string) => `${BASE}/${pack}/${file}`;
  return Object.fromEntries(
    Object.entries(slots).map(([slot, spec]): [string, SlotOut] => {
      const layers = slotLayers(spec);
      return [
        slot,
        {
          velocities: 'layers' in spec ? layers.map((l) => l.v) : spec.v,
          urls: layers.map((l) => url(l.files[0])),
          layers: layers.map((l) => ({ velocity: l.v, urls: l.files.map(url) })),
          trim: slotTrim(spec),
        },
      ];
    })
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
