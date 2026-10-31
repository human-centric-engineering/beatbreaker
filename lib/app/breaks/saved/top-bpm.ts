import { maxBpm, maxBpmOf } from '@/lib/app/breaks/audio/transport';
import { storedPayloadSchema } from '@/lib/app/breaks/schema';
import { patternsOf } from '@/lib/app/breaks/sections';
import { breakDocFromPayload } from '@/lib/app/breaks/share';

/**
 * The top tempo of a saved break, as the Studio plays it: the lowest of its
 * sections' ceilings, every section counted (11-e-ii), each over its tempo
 * ratio (11-e-ii-g): a B at ×2 holds the break to half the top. A document
 * that does not read falls back to the column's meter, as the column is all
 * there is to go on.
 */
export function breakTopBpm(meter: string, doc: unknown): number {
  const parsed = storedPayloadSchema.safeParse(doc);
  if (!parsed.success) return maxBpm(meter);
  return maxBpmOf(patternsOf(breakDocFromPayload(parsed.data)));
}
