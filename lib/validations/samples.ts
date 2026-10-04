import { z } from 'zod';

import {
  kitPanSchema,
  kitParamsSchema,
  kitSampleSlotSchema,
  kitSlotSettingsSchema,
  pieceKeySchema,
} from '@/lib/app/breaks/catalogue/schemas';
import { SLOTS } from '@/lib/app/breaks/kit';
import { LANES } from '@/lib/app/breaks/lanes';
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

/**
 * A new kit: empty, or a copy of another (9-v). `from` is a kit key: a
 * recorded kit's, whose pieces it takes, or one of yours.
 */
export const createYourKitSchema = z
  .object({
    label: kitLabelSchema.optional(),
    from: z.string().min(1).max(40).optional(),
  })
  .strict();
export type CreateYourKit = z.infer<typeof createYourKitSchema>;

/**
 * What a slot of your kit may be given (9-v): one of your samples, or a piece
 * and which of its slots to play, each with Level, Tune and Decay. A bare
 * sample id is the shape this took before pieces, and still means
 * `{ sample }`.
 */
export const yourKitSlotInputSchema = z.union([
  cuidSchema,
  kitSlotSettingsSchema.extend({ sample: cuidSchema }).strict(),
  kitSlotSettingsSchema.extend({ piece: pieceKeySchema, from: slotSchema.optional() }).strict(),
]);
export type YourKitSlotInput = z.infer<typeof yourKitSlotInputSchema>;

/**
 * A rename, and any slots or pans to change: each slot given is filled, or
 * `null` to empty it; each lane's pan is set, or `null` for the default.
 * Slots and lanes not given are left alone.
 */
export const updateYourKitSchema = z
  .object({
    label: kitLabelSchema.optional(),
    slots: z.partialRecord(slotSchema, yourKitSlotInputSchema.nullable()).optional(),
    pan: z.partialRecord(z.enum(LANES), z.number().min(-1).max(1).nullable()).optional(),
  })
  .strict()
  .refine(
    (v) => v.label !== undefined || v.slots !== undefined || v.pan !== undefined,
    'Nothing to change'
  );
export type UpdateYourKit = z.infer<typeof updateYourKitSchema>;

/** One filled slot of your kit: one of your samples, or a piece (9-v), and how it plays. */
export const yourKitSlotSchema = z.union([
  kitSlotSettingsSchema.extend({
    sampleId: z.string(),
    name: z.string(),
    audioUrl: z.string(),
  }),
  kitSlotSettingsSchema.extend({
    piece: z.string(),
    from: z.string().optional(),
    /** The piece's name, for the builder. */
    label: z.string(),
    /** Its recordings, resolved, so the Studio plays it without the piece catalogue. */
    spec: kitSampleSlotSchema,
  }),
]);
export type YourKitSlotView = z.infer<typeof yourKitSlotSchema>;

export const yourKitViewSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  slots: z.record(z.string(), yourKitSlotSchema),
  /** Lane → pan, as the drummer hears it. A lane not named takes the default. */
  pan: kitPanSchema.optional(),
  /**
   * The kit's own numbers for its voices and master: a recorded kit's, where
   * it was copied from one (9-v). Absent where the row's do not read, and the
   * Studio plays what a new kit starts with.
   */
  params: kitParamsSchema.optional(),
});
export type YourKitView = z.infer<typeof yourKitViewSchema>;
