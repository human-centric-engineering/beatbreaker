/**
 * The drummer model's records, as far as the app reads them.
 *
 * The model's JSON Schemas (`data/drummer-model/schema/`) are the standard and
 * a test checks every file against them with Ajv. These Zod schemas are the
 * narrow slice the builder and the pages rely on, parsed at the boundary so
 * nothing downstream casts. Every object is loose: a record carries far more
 * than this, and the rest is stored as it is.
 */

import { z } from 'zod';

import { CONFIDENCES, NODE_KINDS } from '@/lib/app/lineage/types';

const id = z
  .string()
  .regex(/^(drummer|rec|style|pattern|src|kit|era|trait|lick):[a-z0-9][a-z0-9-]*$/);

const evidence = z.looseObject({ confidence: z.enum(CONFIDENCES).optional() });

const yearRange = z.looseObject({
  from: z.number().int().optional(),
  to: z.number().int().optional(),
  ongoing: z.boolean().optional(),
});

export const relationshipSchema = z.looseObject({
  type: z.string(),
  target: z.looseObject({
    name: z.string().min(1),
    kind: z.enum(NODE_KINDS).optional(),
    id: id.optional(),
  }),
  strength: z.number().min(0).max(1).nullable().optional(),
  evidence: evidence.optional(),
  scope: z.enum(['individual', 'band', 'unknown']).optional(),
});

export const drummerRecordSchema = z.looseObject({
  meta: z.looseObject({ id, schema_version: z.string() }),
  identity: z.looseObject({
    name: z.string().min(1),
    active: yearRange.optional(),
    summary: z.string().optional(),
  }),
  style_profile: z.looseObject({
    genres: z.array(z.looseObject({ style_id: id.optional(), weight: z.number().optional() })),
  }),
  relationships: z.array(relationshipSchema).optional(),
  key_recording_ids: z.array(id).optional(),
  beatbreaker: z
    .looseObject({
      style_key: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});
export type DrummerRecord = z.infer<typeof drummerRecordSchema>;

export const recordingRecordSchema = z.looseObject({
  id,
  title: z.string().min(1),
  artist: z.string().min(1),
  year: z.number().int(),
  drum_performances: z.array(z.looseObject({ drummer_id: id, name: z.string().optional() })),
});
export type RecordingRecord = z.infer<typeof recordingRecordSchema>;

export const styleRecordSchema = z.looseObject({
  id,
  name: z.string().min(1),
  era: yearRange.optional(),
  summary: z.string().optional(),
  parents: z
    .array(z.looseObject({ style_id: id, relation: z.string(), evidence: evidence.optional() }))
    .optional(),
});
export type StyleRecord = z.infer<typeof styleRecordSchema>;

export const sourceRecordSchema = z.looseObject({ id, type: z.string(), title: z.string() });
export type SourceRecord = z.infer<typeof sourceRecordSchema>;

/** Every record in the model, parsed. `file` is where each came from, for messages. */
export interface Corpus {
  drummers: { file: string; record: DrummerRecord }[];
  recordings: { file: string; record: RecordingRecord }[];
  styles: { file: string; record: StyleRecord }[];
  sources: { file: string; record: SourceRecord }[];
}

/**
 * Parse raw JSON into a corpus.
 *
 * @throws a ZodError naming the file when one does not fit.
 */
export function parseCorpus(raw: {
  drummers: { file: string; json: unknown }[];
  recordings: { file: string; json: unknown }[];
  styles: { file: string; json: unknown }[];
  sources: { file: string; json: unknown }[];
}): Corpus {
  const each = <T>(items: { file: string; json: unknown }[], schema: z.ZodType<T>) =>
    items.map(({ file, json }) => {
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new Error(`${file}: ${z.prettifyError(parsed.error)}`);
      }
      return { file, record: parsed.data };
    });
  return {
    drummers: each(raw.drummers, drummerRecordSchema),
    recordings: each(raw.recordings, recordingRecordSchema),
    styles: each(raw.styles, styleRecordSchema),
    sources: raw.sources.flatMap(({ file, json }) => {
      const parsed = z.array(sourceRecordSchema).safeParse(json);
      if (!parsed.success) throw new Error(`${file}: ${z.prettifyError(parsed.error)}`);
      return parsed.data.map((record) => ({ file, record }));
    }),
  };
}
