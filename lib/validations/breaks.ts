import { z } from 'zod';

import { LINK_RULE, MAX_LINKS, parseReferenceLink } from '@/lib/app/breaks/links';
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
 * One reference link as it arrives: what was typed, and an optional label. What
 * comes out is the canonical URL `parseReferenceLink` rebuilt and the kind it
 * read off the host — never the typed string, and never a kind the client
 * claimed (see `lib/app/breaks/links.ts`).
 */
const linkSchema = z
  .object({
    url: z.string().trim().max(2048),
    label: z.string().trim().max(60).optional(),
  })
  .transform((link, ctx) => {
    const parsed = parseReferenceLink(link.url);
    if (!parsed) {
      ctx.addIssue({ code: 'custom', message: LINK_RULE, path: ['url'] });
      return z.NEVER;
    }
    return {
      kind: parsed.kind,
      url: parsed.canonicalUrl,
      ...(link.label ? { label: link.label } : {}),
    };
  });

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
  /** Empty clears it. */
  description: z.string().trim().max(500),
  links: z.array(linkSchema).max(MAX_LINKS, `Up to ${MAX_LINKS} links`),
});

export const createBreakSchema = breakFields.extend({
  shared: breakFields.shape.shared.default(false),
  description: breakFields.shape.description.optional(),
  links: breakFields.shape.links.default([]),
});

/**
 * How many patterns one bulk create may carry. They are written in one
 * transaction, so the ceiling keeps a single request's writes small.
 */
export const MAX_BULK_BREAKS = 30;

/** `POST /api/v1/breaks` with `{ breaks: [...] }`: all of them, or none. */
export const bulkCreateBreaksSchema = z.object({
  breaks: z.array(createBreakSchema).min(1).max(MAX_BULK_BREAKS),
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
  /** Title search, case-insensitive. */
  q: z.string().trim().max(120).optional(),
  /**
   * `created` (the default, and what the list always did) or `updated`. What
   * you opened recently is the practice history (task 4.7, D18), not a sort.
   */
  sort: z.enum(['created', 'updated']).default('created'),
  /** Page size. */
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * One row of `GET /api/v1/breaks` as a client reads it — checked, not cast.
 * Only what the Patterns drawer's _All_ tab prints is held to a shape.
 */
export const savedPatternRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  style: z.string(),
  meter: z.string(),
  bpm: z.number(),
  level: z.number(),
});

export const savedPatternListSchema = z.array(savedPatternRowSchema);

export type SavedPatternRow = z.infer<typeof savedPatternRowSchema>;

export type CreateBreakInput = z.infer<typeof createBreakSchema>;
export type UpdateBreakInput = z.infer<typeof updateBreakSchema>;
export type BulkCreateBreaksInput = z.infer<typeof bulkCreateBreaksSchema>;
