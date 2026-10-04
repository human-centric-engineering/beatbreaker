/**
 * Choosing velocity layers and round-robins from measured hits. Pure.
 *
 * The layers are spread evenly in dB across the recipe's range, and each takes
 * the hits nearest its target that no other layer took. A source with ten
 * velocity steps and four takes of each gives four steps' worth of takes; a
 * source with thirty single strokes gives its neighbouring strokes as takes,
 * which are as close as a drummer's own repeats.
 */

export interface Measured {
  /** The candidate's path in its source, which also orders ties. */
  id: string;
  /** Its loudness in dB (`dsp.ts`'s `loudness`). */
  db: number;
}

export interface ChosenLayer {
  /** The layer's loudness: the mean of its takes', in dB. */
  db: number;
  /** Its takes, by id. */
  ids: string[];
}

/**
 * Pick `layers` layers of `rr` takes from `hits`, softest layer first.
 *
 * `range` is in dB under the loudest candidate. Fewer candidates than asked
 * for give fewer layers or takes rather than repeats; a layer is never empty.
 */
export function chooseLayers(
  hits: Measured[],
  layers: number,
  rr: number,
  range: [number, number] = [0, 14]
): ChosenLayer[] {
  const finite = hits.filter((h) => Number.isFinite(h.db));
  if (!finite.length || layers < 1 || rr < 1) return [];
  const top = Math.max(...finite.map((h) => h.db));
  const [near, far] = range;
  const pool = finite
    .filter((h) => h.db <= top - near + 1e-9 && h.db >= top - far - 1e-9)
    .sort((a, b) => b.db - a.db || a.id.localeCompare(b.id));

  const count = Math.min(layers, pool.length);
  const loudest = pool[0].db;
  const softest = pool[pool.length - 1].db;
  // loudest first, so the top layer has the pick of the loudest takes
  const targets = Array.from({ length: count }, (_, i) =>
    count === 1 ? loudest : loudest - ((loudest - softest) * i) / (count - 1)
  );

  const used = new Set<string>();
  const out: ChosenLayer[] = [];
  for (const target of targets) {
    const take = pool
      .filter((h) => !used.has(h.id))
      .sort((a, b) => Math.abs(a.db - target) - Math.abs(b.db - target) || a.id.localeCompare(b.id))
      .slice(0, rr);
    if (!take.length) break;
    for (const h of take) used.add(h.id);
    out.push({
      db: take.reduce((s, h) => s + h.db, 0) / take.length,
      ids: take.map((h) => h.id).sort(),
    });
  }
  return out.sort((a, b) => a.db - b.db);
}

/**
 * A layer's velocity: its loudness against the slot's loudest layer, as an
 * amplitude, to two places. The sampler turns a note down by `vel / v` inside
 * a layer, which is an amplitude ratio, so `v` must be one too. The loudest
 * layer is exactly 1, and the rest are kept strictly rising.
 */
export function layerVelocities(chosen: ChosenLayer[]): number[] {
  if (!chosen.length) return [];
  const top = chosen[chosen.length - 1].db;
  const out = chosen.map((l) => Math.round(10 ** ((l.db - top) / 20) * 100) / 100);
  out[out.length - 1] = 1;
  for (let i = out.length - 2; i >= 0; i--) {
    out[i] = Math.max(0.01, Math.min(out[i], Math.round((out[i + 1] - 0.01) * 100) / 100));
  }
  return out;
}
