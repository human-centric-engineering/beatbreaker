import { checkConditional, computeETag } from '@/lib/api/etag';
import { successResponse } from '@/lib/api/responses';
import { type KitSampleSlot, slotLayers, slotTrim } from '@/lib/app/breaks/kit';

/**
 * What every catalogue read has in common.
 *
 * The catalogue is public (D2: a signed-out visitor opens a shared pattern, and
 * the player needs the style snapshot's neighbours to render the picker), it
 * changes a few times a year, and it is read on every page load. So every one
 * of these endpoints answers the same way: an ETag, a `304` when the caller
 * already has it, and a `Cache-Control` that says it is shareable.
 *
 * Rate limiting is already done. `proxy.ts` applies the `catalogue` tier
 * (240/min, keyed on IP) registered in `lib/app/rate-limit.ts` before any of
 * these handlers runs — do not call a limiter here.
 */

/**
 * `public` rather than `private`, which is the platform default.
 *
 * Nothing here is about a person: the same 37 styles go to everyone signed in
 * or out, so a CDN or a company proxy holding one copy for everybody is the
 * right outcome rather than a leak. `must-revalidate` with `max-age=0` keeps
 * the ETag in charge — a cache may store it, but it asks before serving it, so
 * an admin's edit is visible on the next request rather than after a TTL.
 */
const CATALOGUE_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

/**
 * One catalogue payload, as a conditional, cacheable response.
 *
 * @returns a `304` when the caller's `If-None-Match` matches, otherwise `200`.
 */
export function catalogueResponse<T>(request: Request, data: T): Response {
  const etag = computeETag(data);
  const notModified = checkConditional(request, etag);
  if (notModified) {
    /* `checkConditional` sends the platform's private default with its 304,
       which would contradict the 200's `public`. Rebuilding the 304 here keeps
       the pair consistent: a shared cache that stored the 200 must be allowed
       to revalidate it. */
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': CATALOGUE_CACHE_CONTROL },
    });
  }
  return successResponse(data, undefined, {
    headers: { ETag: etag, 'Cache-Control': CATALOGUE_CACHE_CONTROL },
  });
}

/** Where the recorded kits are served from. */
const BASE = '/kits';

/**
 * A slot as a client reads it. `layers` is every velocity layer with all its
 * round-robins (Phase 9). `velocities` and `urls` are the shape the kits route
 * served before round-robins — one file per layer, the first of each — kept
 * so a client written against it still plays. `trim` is the slot's level, a
 * gain to multiply in beside the kit's own `trim` (1 where a slot has none).
 * `level`, `tune` and `decay` are a kit's own settings for it (9-v), where it
 * has any.
 */
export interface SlotOut {
  velocities: number[] | null;
  urls: string[];
  layers: Array<{ velocity: number; urls: string[] }>;
  trim: number;
  level?: number;
  tune?: number;
  decay?: number;
}

/**
 * Slots with their recordings' URLs. The files live under
 * `/kits/<folder>/<file>`, and only the server decides what that path is, so
 * a client gets URLs it can fetch and nothing to assemble. A slot resolved
 * from a piece names its own folder (9-v); any other is in `folder`, the
 * kit's pack. A slot with neither is left out: it has no files to point at.
 */
export function slotsWithUrls(
  folder: string | undefined,
  slots: Record<string, KitSampleSlot> | undefined
): Record<string, SlotOut> | undefined {
  if (!slots) return undefined;
  const out: Record<string, SlotOut> = {};
  for (const [slot, spec] of Object.entries(slots)) {
    const dir = spec.folder ?? folder;
    if (!dir) continue;
    const url = (file: string) => `${BASE}/${dir}/${file}`;
    const layers = slotLayers(spec);
    out[slot] = {
      velocities: 'layers' in spec ? layers.map((l) => l.v) : spec.v,
      urls: layers.map((l) => url(l.files[0])),
      layers: layers.map((l) => ({ velocity: l.v, urls: l.files.map(url) })),
      trim: slotTrim(spec),
      ...(spec.level !== undefined ? { level: spec.level } : {}),
      ...(spec.tune !== undefined ? { tune: spec.tune } : {}),
      ...(spec.decay !== undefined ? { decay: spec.decay } : {}),
    };
  }
  return Object.keys(out).length ? out : undefined;
}
