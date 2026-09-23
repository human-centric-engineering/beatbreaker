import { z } from 'zod';

import { METER_KEYS } from '@/lib/app/breaks/meter';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';

/**
 * Request schemas for `/api/v1/breaks`.
 *
 * The break itself is validated by `sharePayloadSchema` — the same schema a
 * pasted share code goes through — so a break that arrived over HTTP and one
 * that arrived through the textarea are held to one standard, and there is one
 * place to change when the wire format moves again.
 */

/**
 * The fields, with no defaults. Defaults belong to create only: Zod applies a
 * `.default()` inside `.partial()`, so a PATCH schema built from one that has
 * them fills in every field the request left out — a rename would write
 * `shared: false` and every link to the break would start answering 404.
 * **Never `.partial()` a schema that has defaults.**
 */
const breakFields = z.object({
  title: z.string().trim().min(1, 'A break needs a name').max(120),
  /** The whole break, in share-code wire format. */
  doc: sharePayloadSchema,
  shared: z.boolean(),
});

export const createBreakSchema = breakFields.extend({
  shared: breakFields.shape.shared.default(false),
});

export const updateBreakSchema = breakFields.partial();

export const listBreaksSchema = z.object({
  /* A filter, not a claim about the catalogue. It used to be checked against
     the compiled-in style list; styles are rows now, so the list is a query and
     this schema is synchronous. Filtering by a style that no longer exists is
     not an error — it is an empty page, which is the honest answer. What the
     value is still held to is the column width it is compared against. */
  style: z.string().max(40).optional(),
  meter: z
    .string()
    .refine((s) => METER_KEYS.includes(s), 'unknown meter')
    .optional(),
  /** Page size. */
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type CreateBreakInput = z.infer<typeof createBreakSchema>;
export type UpdateBreakInput = z.infer<typeof updateBreakSchema>;
