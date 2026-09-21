import { z } from 'zod';

import { METER_KEYS } from '@/lib/app/breaks/meter';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { STYLE_KEYS } from '@/lib/app/breaks/styles';

/**
 * Request schemas for `/api/v1/breaks`.
 *
 * The break itself is validated by `sharePayloadSchema` — the same schema a
 * pasted share code goes through — so a break that arrived over HTTP and one
 * that arrived through the textarea are held to one standard, and there is one
 * place to change when the wire format moves to version 4.
 */

export const createBreakSchema = z.object({
  title: z.string().trim().min(1, 'A break needs a name').max(120),
  /** The whole break, in share-code wire format. */
  doc: sharePayloadSchema,
  shared: z.boolean().default(false),
});

export const updateBreakSchema = createBreakSchema.partial();

export const listBreaksSchema = z.object({
  style: z
    .string()
    .refine((s) => STYLE_KEYS.includes(s), 'unknown style')
    .optional(),
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
