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

/**
 * What a pin points at — exactly one of these. A practice visit (D18) points
 * the same way, so `/api/v1/history` uses this type and {@link oneTarget} too.
 */
export type PinTarget = { breakId: string } | { libraryEntryId: string };

/** The two target fields of a request body, before exactly-one is checked. */
export const targetFields = {
  breakId: cuidSchema.optional(),
  libraryEntryId: cuidSchema.optional(),
};

/** Exactly one of the two, as a target — or null for both or neither. */
export function oneTarget(breakId?: string, libraryEntryId?: string): PinTarget | null {
  if (breakId !== undefined && libraryEntryId === undefined) return { breakId };
  if (libraryEntryId !== undefined && breakId === undefined) return { libraryEntryId };
  return null;
}

/** `POST /api/v1/pins` — pin one pattern or one library entry to a shelf. */
export const createPinSchema = z
  .object({ shelf: shelfSchema, ...targetFields })
  .transform(({ shelf, breakId, libraryEntryId }, ctx) => {
    const target = oneTarget(breakId, libraryEntryId);
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
 * The numbers a row prints (tempo, meter, style, layer) are optional here: the
 * server always sends them, and a row without one prints less rather than
 * failing to render the shelf.
 */
const shownFields = {
  bpm: z.number().optional(),
  meter: z.string().optional(),
};

export const pinnedTargetSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('break'),
    id: z.string(),
    title: z.string(),
    mine: z.boolean(),
    style: z.string().optional(),
    level: z.number().optional(),
    ...shownFields,
  }),
  z.object({
    kind: z.literal('entry'),
    id: z.string(),
    title: z.string(),
    libraryKey: z.string(),
    artist: z.string().optional(),
    styleKey: z.string().optional(),
    ...shownFields,
  }),
]);

export type PinnedTarget = z.infer<typeof pinnedTargetSchema>;

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
