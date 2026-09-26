import { z } from 'zod';

import { SLOTS } from '@/lib/app/breaks/kit';
import { cuidSchema } from '@/lib/validations/common';

/**
 * Your own samples and kits (D20): what the API accepts, and what it answers.
 *
 * The response shapes are schemas too, not just types, because the Studio
 * reads them back from `fetch` — external data by the time it arrives.
 */

const SLOT_IDS = SLOTS.map((s) => s.id) as [string, ...string[]];

/** A kit slot, held to `SLOTS`. */
export const slotSchema = z.enum(SLOT_IDS);

/**
 * The name a sample is listed under: the file name you picked, tidied. Control
 * characters go, and it is trimmed and cut to the column's width; an empty
 * result is refused rather than stored as nothing.
 */
export const sampleNameSchema = z
  .string()
  .transform((s) =>
    s
      // eslint-disable-next-line no-control-regex -- stripping them is the point
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 120)
  )
  .pipe(z.string().min(1, 'A sample needs a name'));

/** The text fields of `POST /api/v1/samples`; the file is checked separately. */
export const sampleUploadFieldsSchema = z.object({
  slot: slotSchema,
  name: sampleNameSchema,
});

export const sampleViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  slot: z.string(),
  bytes: z.number().int(),
  durationMs: z.number().int(),
  createdAt: z.string(),
  audioUrl: z.string(),
});
export type SampleView = z.infer<typeof sampleViewSchema>;

/** How much of your allowance you have used. */
export const sampleUsageSchema = z.object({
  count: z.number().int(),
  bytes: z.number().int(),
  maxCount: z.number().int(),
  maxBytes: z.number().int(),
});
export type SampleUsage = z.infer<typeof sampleUsageSchema>;

export const sampleListSchema = z.object({
  samples: z.array(sampleViewSchema),
  usage: sampleUsageSchema,
});
export type SampleList = z.infer<typeof sampleListSchema>;

/** What `POST /api/v1/samples` answers: the new sample, and your usage after it. */
export const sampleCreatedSchema = z.object({
  sample: sampleViewSchema,
  usage: sampleUsageSchema,
});

/* ---- your kits ------------------------------------------------------- */

const kitLabelSchema = z.string().trim().min(1, 'A kit needs a name').max(80);

export const createYourKitSchema = z.object({ label: kitLabelSchema.default('My kit') }).strict();

/**
 * A rename, and any slots to change: each slot given names one of your
 * samples, or `null` to empty it. Slots not given are left alone.
 */
export const updateYourKitSchema = z
  .object({
    label: kitLabelSchema.optional(),
    slots: z.partialRecord(slotSchema, cuidSchema.nullable()).optional(),
  })
  .strict()
  .refine((v) => v.label !== undefined || v.slots !== undefined, 'Nothing to change');
export type UpdateYourKit = z.infer<typeof updateYourKitSchema>;

/** One filled slot of your kit, with the sample in it. */
export const yourKitSlotSchema = z.object({
  sampleId: z.string(),
  name: z.string(),
  audioUrl: z.string(),
});

export const yourKitViewSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  slots: z.record(z.string(), yourKitSlotSchema),
});
export type YourKitView = z.infer<typeof yourKitViewSchema>;
