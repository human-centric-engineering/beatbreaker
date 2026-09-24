import { z } from 'zod';

import { cuidSchema } from '@/lib/validations/common';

/**
 * Request schemas for `/api/v1/pins` — the practice shelves (D17).
 *
 * A pin names its target by id and nothing else. Which pattern or entry it is,
 * and whether the caller may see it, is read from the database, never taken
 * from the body.
 */

/** The two shelves, in the order Home and the Patterns drawer show them. */
export const SHELVES = ['practising', 'later'] as const;
export type Shelf = (typeof SHELVES)[number];

export const shelfSchema = z.enum(SHELVES);

/** What a pin points at — exactly one of these. */
export type PinTarget = { breakId: string } | { libraryEntryId: string };

/** `POST /api/v1/pins` — pin one pattern or one library entry to a shelf. */
export const createPinSchema = z
  .object({
    shelf: shelfSchema,
    breakId: cuidSchema.optional(),
    libraryEntryId: cuidSchema.optional(),
  })
  .transform(({ shelf, breakId, libraryEntryId }, ctx) => {
    const target =
      breakId !== undefined && libraryEntryId === undefined
        ? { breakId }
        : libraryEntryId !== undefined && breakId === undefined
          ? { libraryEntryId }
          : null;
    if (!target) {
      ctx.addIssue({
        code: 'custom',
        message: 'Pin one thing: a breakId or a libraryEntryId, not both and not neither',
        path: ['breakId'],
      });
      return z.NEVER;
    }
    return { shelf, target };
  });

/**
 * `PATCH /api/v1/pins/:id` — move it to the other shelf, reorder it, or both.
 *
 * Placement is relative, `after` another pin, rather than an index: a pin on a
 * shared pattern its owner has since unshared is still on the shelf but not in
 * the list, so an index the client counted would be off by every hidden row.
 * `after: null` is the top. Moving shelves with no `after` also lands at the
 * top — what you just started practising is what you are practising now.
 */
export const updatePinSchema = z
  .object({
    shelf: shelfSchema.optional(),
    after: cuidSchema.nullable().optional(),
  })
  .refine((body) => body.shelf !== undefined || body.after !== undefined, {
    message: 'Say where it goes: a shelf, a position (after), or both',
  });

export type CreatePinInput = z.infer<typeof createPinSchema>;
export type UpdatePinInput = z.infer<typeof updatePinSchema>;

/**
 * What `GET /api/v1/pins` answers, as a client reads it — checked, not cast.
 * Only what the Studio uses is held to a shape; the rest of each target (bpm,
 * meter, artist…) is what the Patterns drawer and Home will read in 4.8/4.9.
 */
const pinnedTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('break'), id: z.string(), title: z.string(), mine: z.boolean() }),
  z.object({
    kind: z.literal('entry'),
    id: z.string(),
    title: z.string(),
    libraryKey: z.string(),
  }),
]);

export const pinViewSchema = z.object({
  id: z.string(),
  shelf: shelfSchema,
  position: z.number().int(),
  target: pinnedTargetSchema,
});

export const practiceShelvesSchema = z.object({
  practising: z.array(pinViewSchema),
  later: z.array(pinViewSchema),
});

export type PracticeShelvesView = z.infer<typeof practiceShelvesSchema>;
