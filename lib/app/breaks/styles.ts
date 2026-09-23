import { DEFAULT_METER, groupsOf, meterOf, remapList, remapWeights } from '@/lib/app/breaks/meter';
import type { PercSpec, Style } from '@/lib/app/breaks/types';

/**
 * Carrying a style into a meter it was not written for.
 *
 * **The style table itself is not in this file any more.** Styles are `Style` /
 * `StyleVersion` rows from Phase 2 (D13), seeded from
 * `prisma/seeds/app-beatbreaker/data/styles.ts`. What is left here is the one
 * piece of that module that was always an algorithm rather than content: every
 * style is written in 4/4 (bar the seven that name their own `meter`), and
 * something has to decide what "the backbeat" means in 3/4.
 */

/**
 * The style as it applies in a meter it was not written for.
 *
 * Positions travel as **(pulse, offset)** rather than by raw step index, so
 * "the top of the second pulse" stays the top of the second pulse. A 2-and-4
 * backbeat becomes one backbeat on 2 in 3/4, one on the second dotted quarter
 * in 6/8, and beats 2 and 4 of four dotted quarters in 12/8. Positions the new
 * bar has no room for are dropped — a five-stroke clave in 3/4 loses its fifth
 * stroke, because there is nowhere for it to go. The critic scores the result
 * honestly rather than pretending it worked.
 *
 * **Takes the style itself, not a key.** Styles are catalogue rows from Phase 2
 * and the caller has already resolved one; a key would mean this module owning
 * a table again. The remap memo is keyed on the style object's identity rather
 * than on a string, so two versions of `funk` cannot share a cache entry — the
 * bug a `${key}@${meter}` cache would have had the day an admin edited a style.
 */
const STYLE_CACHE = new WeakMap<Style, Map<string, Style>>();

export function styleIn(st: Style, meterKey: string): Style {
  const from = meterOf(st.meter ?? DEFAULT_METER);
  const to = meterOf(meterKey ?? DEFAULT_METER);
  if (from === to) return st;

  const byMeter = STYLE_CACHE.get(st);
  const cached = byMeter?.get(meterKey);
  if (cached) return cached;

  const out: Style = { ...st };
  const stepLists = [
    'backbeats',
    'forceKick',
    'noKick',
    'openSlots',
    'foot',
    'snareGhosts',
  ] as const;
  for (const f of stepLists) {
    const list = st[f];
    if (list) out[f] = remapList(list, from, to);
  }
  if (st.ride) {
    out.ride = {
      steps: remapList(st.ride.steps ?? [], from, to),
      bell: remapList(st.ride.bell ?? [], from, to),
    };
  }
  if (st.hat) {
    out.hat = {
      steps: remapList(st.hat.steps ?? [], from, to),
      accents: remapList(st.hat.accents ?? [], from, to),
      opens: remapList(st.hat.opens ?? [], from, to),
    };
  }
  if (st.ghostWeights) out.ghostWeights = remapWeights(st.ghostWeights, from, to);
  if (st.perc) {
    out.perc = st.perc.map((pc): PercSpec => {
      if (!pc.steps && !pc.accents) return pc;
      const o: PercSpec = { ...pc };
      if (pc.steps) o.steps = remapList(pc.steps, from, to);
      if (pc.accents) o.accents = remapList(pc.accents, from, to);
      return o;
    });
  }
  // a bar with no room for the style's backbeat still needs one to be a groove
  if (!out.backbeats?.length) {
    const g = groupsOf(to);
    out.backbeats = [g[Math.min(1, g.length - 1)].start];
  }

  if (byMeter) byMeter.set(meterKey, out);
  else STYLE_CACHE.set(st, new Map([[meterKey, out]]));
  return out;
}
