import { maxBpm, maxBpmOf } from '@/lib/app/breaks/audio/transport';
import { storedPayloadSchema } from '@/lib/app/breaks/schema';
import { patternsOf } from '@/lib/app/breaks/sections';
import { breakDocFromPayload } from '@/lib/app/breaks/share';

/**
 * The top tempo of a saved break, as the Studio plays it: the lowest of its
 * sections' ceilings, every section counted (11-e-ii). `Break.meter` is A's, so a break with A in
 * 12/8 and B in 4/4 would read as 300 from the column alone, a tempo the
 * Studio holds to 190. A document that does not read falls back to the
 * column's meter, as the column is all there is to go on.
 */
export function breakTopBpm(meter: string, doc: unknown): number {
  const parsed = storedPayloadSchema.safeParse(doc);
  if (!parsed.success) return maxBpm(meter);
  return maxBpmOf(patternsOf(breakDocFromPayload(parsed.data)).map((p) => p.meter));
}
