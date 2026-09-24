import { z } from 'zod';

import { oneTarget, targetFields } from '@/lib/validations/pins';

/**
 * Request schemas for `/api/v1/history` — the practice history (D18).
 *
 * A visit names its target by id, and says where it was left: the layer and
 * the tempo. Which pattern or entry it is, and whether the caller may see it,
 * is read from the database, never taken from the body.
 */

/** The layers the console has — the share-code schema's `lv`. */
export const visitLevelSchema = z.number().int().min(1).max(5);
/** The share-code schema's tempo range, as a whole number. */
export const visitBpmSchema = z.number().int().min(20).max(400);

/** `POST /api/v1/history` — record that a pattern or library entry was opened, or where it was left. */
export const recordVisitSchema = z
  .object({ ...targetFields, level: visitLevelSchema, bpm: visitBpmSchema })
  .transform(({ breakId, libraryEntryId, level, bpm }, ctx) => {
    const target = oneTarget(breakId, libraryEntryId);
    if (!target) {
      ctx.addIssue({
        code: 'custom',
        message: 'Record one thing: a breakId or a libraryEntryId, not both and not neither',
        path: ['breakId'],
      });
      return z.NEVER;
    }
    return { target, at: { level, bpm } };
  });

export type RecordVisitInput = z.infer<typeof recordVisitSchema>;

/**
 * What `GET /api/v1/history` answers, as a client reads it — checked, not
 * cast. Only what the Studio uses is held to a shape.
 */
const visitedTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('break'), id: z.string(), title: z.string(), mine: z.boolean() }),
  z.object({
    kind: z.literal('entry'),
    id: z.string(),
    title: z.string(),
    artist: z.string(),
  }),
]);

export const practiceVisitViewSchema = z.object({
  id: z.string(),
  level: visitLevelSchema,
  bpm: z.number().int(),
  target: visitedTargetSchema,
});

export const practiceHistorySchema = z.array(practiceVisitViewSchema);

export type HistoryItem = z.infer<typeof practiceVisitViewSchema>;
