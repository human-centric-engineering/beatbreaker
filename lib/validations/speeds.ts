import { z } from 'zod';

import {
  parseVideoLink,
  VIDEO_PLATFORMS,
  VIDEO_RULE,
} from '@/lib/app/breaks/community/video-links';
import { oneTarget, targetFields } from '@/lib/validations/pins';

/**
 * Request and response schemas for speed records (Phase 7C) —
 * `/api/v1/speed-records` and the public tables.
 *
 * A record names its target by id, as a pin does. The title, the meter that
 * bounds the tempo, the notes it is on and whether it may be listed are all
 * read from the database, never taken from the body.
 */

/** The slowest tempo a record may claim. The meter's `maxBpm` is the fastest. */
export const SPEED_BPM_MIN = 40;
/** The widest `maxBpm` any meter has; the data layer holds each record to its own meter's. */
export const SPEED_BPM_MAX = 300;
/** How long the note on a record may be. */
export const SPEED_NOTE_MAX = 280;

/** The layer a table shows when none is asked for: the full break. */
export const DEFAULT_TABLE_LEVEL = 5;
export const TABLE_PAGE_DEFAULT = 25;
export const TABLE_PAGE_MAX = 50;

const levelSchema = z.number().int().min(1).max(5);

/**
 * `POST /api/v1/speed-records`. `listed` is optional: without it your
 * `listSpeeds` setting decides. A video link is re-parsed here and stored as
 * the canonical URL the parser rebuilt, never the string sent.
 */
export const createSpeedSchema = z
  .object({
    ...targetFields,
    level: levelSchema,
    bpm: z.number().int().min(SPEED_BPM_MIN).max(SPEED_BPM_MAX),
    videoUrl: z
      .string()
      .trim()
      .max(300, VIDEO_RULE)
      .optional()
      .transform((raw, ctx) => {
        if (!raw) return undefined;
        const parsed = parseVideoLink(raw);
        if (!parsed) {
          ctx.addIssue({ code: 'custom', message: VIDEO_RULE });
          return z.NEVER;
        }
        return parsed.url;
      }),
    note: z
      .string()
      .trim()
      .max(SPEED_NOTE_MAX, `Up to ${SPEED_NOTE_MAX} characters`)
      .optional()
      .transform((s) => s || undefined),
    listed: z.boolean().optional(),
  })
  .transform(({ breakId, libraryEntryId, ...rest }, ctx) => {
    const target = oneTarget(breakId, libraryEntryId);
    if (!target) {
      ctx.addIssue({
        code: 'custom',
        message: 'Record one thing: a breakId or a libraryEntryId, not both and not neither',
        path: ['breakId'],
      });
      return z.NEVER;
    }
    return { target, ...rest };
  });

export type CreateSpeedInput = z.infer<typeof createSpeedSchema>;

/** `GET /api/v1/speed-records?breakId=…` or `?libraryEntryId=…` — yours, on one target. */
export const yourSpeedsQuerySchema = z
  .object(targetFields)
  .transform(({ breakId, libraryEntryId }, ctx) => {
    const target = oneTarget(breakId, libraryEntryId);
    if (!target) {
      ctx.addIssue({
        code: 'custom',
        message: 'Name one target: a breakId or a libraryEntryId',
        path: ['breakId'],
      });
      return z.NEVER;
    }
    return target;
  });

/** A public table's query: the layer, video-backed rows only, and paging. */
export const speedTableQuerySchema = z.object({
  level: z.coerce.number().int().min(1).max(5).default(DEFAULT_TABLE_LEVEL),
  video: z
    .enum(['1', 'true'])
    .optional()
    .transform((v) => v !== undefined),
  limit: z.coerce.number().int().min(1).max(TABLE_PAGE_MAX).default(TABLE_PAGE_DEFAULT),
  cursor: z.string().max(40).optional(),
});

export type SpeedTableQuery = z.infer<typeof speedTableQuerySchema>;

/* ---- what the API answers, as a client reads it -------------------- */

const videoSchema = z.object({
  platform: z.enum(VIDEO_PLATFORMS),
  url: z.string(),
  embedUrl: z.string().nullable(),
});

/** One of your records. */
export const speedRecordViewSchema = z.object({
  id: z.string(),
  level: levelSchema,
  bpm: z.number().int(),
  video: videoSchema.nullable(),
  note: z.string().nullable(),
  listed: z.boolean(),
  recordedAt: z.string(),
  title: z.string(),
});

export type SpeedRecordView = z.infer<typeof speedRecordViewSchema>;

/** Where your best at one layer sits on the target's table. */
export const speedPlaceSchema = z.object({
  level: levelSchema,
  position: z.number().int().min(1),
  of: z.number().int().min(1),
});

export type SpeedPlace = z.infer<typeof speedPlaceSchema>;

/** `GET /api/v1/speed-records` — your records on one target, and where they place you. */
export const yourSpeedsSchema = z.object({
  records: z.array(speedRecordViewSchema),
  /** The target has a public table: a published pattern or a famous break. */
  public: z.boolean(),
  /** Your place per layer, where your best is on the table. */
  places: z.array(speedPlaceSchema),
  /** Tables list drummers by username; without one you are on none. */
  hasUsername: z.boolean(),
  /** Your `listSpeeds` setting, so a client knows whether to ask. */
  listSpeeds: z.enum(['ask', 'list', 'keep']),
});

export type YourSpeeds = z.infer<typeof yourSpeedsSchema>;

/** One row of a public table: a drummer's best. */
export const speedTableRowSchema = z.object({
  /** The record's id — what a report names. Never the drummer's. */
  id: z.string(),
  position: z.number().int().min(1),
  username: z.string(),
  bpm: z.number().int(),
  recordedAt: z.string(),
  video: videoSchema.nullable(),
});

export type SpeedTableRow = z.infer<typeof speedTableRowSchema>;

export const speedTableSchema = z.array(speedTableRowSchema);
