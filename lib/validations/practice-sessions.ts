import { z } from 'zod';

import {
  CLIMB_DEFAULTS,
  CLIMB_PCT_RANGE,
  CLIMB_SHAPES,
  CLIMB_STEPS_RANGE,
  PRACTICE_BPM_MIN,
  START_PCT_RANGE,
} from '@/lib/app/practice/climb';
import { cuidSchema } from '@/lib/validations/common';
import { oneTarget, type PinTarget, targetFields } from '@/lib/validations/pins';
import { SPEED_BPM_MAX } from '@/lib/validations/speeds';

/**
 * Request and response schemas for practice sessions (Phase 7D) —
 * `/api/v1/practice-sessions`.
 *
 * An item names its pattern by id, as a pin does. The title, the meter that
 * bounds its tempo and whether the caller may see it are read from the
 * database, never taken from the body; so is the split of the minutes, which
 * the server works out again on every write (D31).
 */

export const SESSION_MINUTES = { min: 5, max: 120 } as const;
export const SESSION_ITEMS_MAX = 12;
export const SESSION_NAME_MAX = 80;
export const SESSION_DESCRIPTION_MAX = 500;
export const COUNT_IN_RANGE = { min: 0, max: 2 } as const;
/** The widest tempo an item may aim at; the data layer holds each to its own meter's. */
export const SESSION_BPM_MAX = SPEED_BPM_MAX;
/** The longest one slot of a run can have lasted, with every +1 min pressed. */
export const RUN_SLOT_SECONDS_MAX = 4 * 60 * 60;

const int = (min: number, max: number) => z.number().int().min(min).max(max);
const levelSchema = int(1, 5);
const bpmSchema = int(PRACTICE_BPM_MIN, SESSION_BPM_MAX);

const climbFields = {
  startPct: int(START_PCT_RANGE.min, START_PCT_RANGE.max),
  climbPct: int(CLIMB_PCT_RANGE.min, CLIMB_PCT_RANGE.max),
  climbShape: z.enum(CLIMB_SHAPES),
  climbSteps: int(CLIMB_STEPS_RANGE.min, CLIMB_STEPS_RANGE.max),
};

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Give it a name')
  .max(SESSION_NAME_MAX, `Up to ${SESSION_NAME_MAX} characters`);

const descriptionSchema = z
  .string()
  .trim()
  .max(SESSION_DESCRIPTION_MAX, `Up to ${SESSION_DESCRIPTION_MAX} characters`)
  .nullable()
  .transform((s) => s || null);

/** The fields of an item, before its target is checked. */
const itemFields = z.object({
  ...targetFields,
  level: levelSchema,
  /** Null or absent: your best at this layer, or the pattern's own tempo. */
  goalBpm: bpmSchema.nullable().optional(),
  /** Read only when `minutesPinned`; the free items are split by the server. */
  minutes: int(1, SESSION_MINUTES.max).optional(),
  minutesPinned: z.boolean().optional(),
  startPct: climbFields.startPct.nullable().optional(),
  climbPct: climbFields.climbPct.nullable().optional(),
  climbShape: climbFields.climbShape.nullable().optional(),
  climbSteps: climbFields.climbSteps.nullable().optional(),
});

type ItemFields = z.infer<typeof itemFields>;

/** One item as the data layer takes it: everything but its target settled. */
export interface ItemInput {
  /** An item already in the session, kept with its target. */
  id?: string;
  /** The target of a new item. Null on a kept one. */
  target: PinTarget | null;
  level: number;
  goalBpm: number | null;
  minutes: number;
  minutesPinned: boolean;
  startPct: number | null;
  climbPct: number | null;
  climbShape: (typeof CLIMB_SHAPES)[number] | null;
  climbSteps: number | null;
}

function settle(fields: Omit<ItemFields, 'breakId' | 'libraryEntryId'>) {
  return {
    level: fields.level,
    goalBpm: fields.goalBpm ?? null,
    minutes: fields.minutes ?? 1,
    minutesPinned: fields.minutesPinned ?? false,
    startPct: fields.startPct ?? null,
    climbPct: fields.climbPct ?? null,
    climbShape: fields.climbShape ?? null,
    climbSteps: fields.climbSteps ?? null,
  };
}

const TARGET_RULE = 'A new item names one pattern: a breakId or a libraryEntryId';

/** A new item: exactly one target. */
const newItemSchema = itemFields.transform(
  ({ breakId, libraryEntryId, ...rest }, ctx): ItemInput => {
    const target = oneTarget(breakId, libraryEntryId);
    if (!target) {
      ctx.addIssue({ code: 'custom', message: TARGET_RULE, path: ['breakId'] });
      return z.NEVER;
    }
    return { target, ...settle(rest) };
  }
);

/**
 * An item in a replacement list: an existing one by `id`, whose target never
 * changes — so it names none — or a new one with exactly one target.
 */
const listItemSchema = itemFields
  .extend({ id: cuidSchema.optional() })
  .transform(({ id, breakId, libraryEntryId, ...rest }, ctx): ItemInput => {
    if (id !== undefined) {
      if (breakId !== undefined || libraryEntryId !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: "An item's pattern cannot be changed; remove it and add another",
          path: ['breakId'],
        });
        return z.NEVER;
      }
      return { id, target: null, ...settle(rest) };
    }
    const target = oneTarget(breakId, libraryEntryId);
    if (!target) {
      ctx.addIssue({ code: 'custom', message: TARGET_RULE, path: ['breakId'] });
      return z.NEVER;
    }
    return { target, ...settle(rest) };
  });

const itemsRule = `Up to ${SESSION_ITEMS_MAX} patterns`;

/** `POST /api/v1/practice-sessions`. Everything but the name and total has a default. */
export const createSessionSchema = z.object({
  name: nameSchema,
  description: descriptionSchema.optional().transform((s) => s ?? null),
  totalMinutes: int(SESSION_MINUTES.min, SESSION_MINUTES.max),
  startPct: climbFields.startPct.default(CLIMB_DEFAULTS.startPct),
  climbPct: climbFields.climbPct.default(CLIMB_DEFAULTS.climbPct),
  climbShape: climbFields.climbShape.default(CLIMB_DEFAULTS.climbShape),
  climbSteps: climbFields.climbSteps.default(CLIMB_DEFAULTS.climbSteps),
  countIn: int(COUNT_IN_RANGE.min, COUNT_IN_RANGE.max).default(1),
  items: z.array(newItemSchema).max(SESSION_ITEMS_MAX, itemsRule).default([]),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

/** `PATCH /api/v1/practice-sessions/:id` — the session's own fields; items have their own route. */
export const updateSessionSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema,
    totalMinutes: int(SESSION_MINUTES.min, SESSION_MINUTES.max),
    ...climbFields,
    countIn: int(COUNT_IN_RANGE.min, COUNT_IN_RANGE.max),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to change' });

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

/**
 * `PUT /api/v1/practice-sessions/:id/items` — the whole list, in order. An
 * item left out is removed; the minutes are split again on the server.
 */
export const replaceItemsSchema = z.object({
  items: z.array(listItemSchema).max(SESSION_ITEMS_MAX, itemsRule),
});

export type ReplaceItemsInput = z.infer<typeof replaceItemsSchema>;

/** One slot of a finished run, as the runner reports it. */
export const runSlotSchema = z.object({
  title: z.string().trim().min(1).max(160),
  level: levelSchema,
  targetBpm: bpmSchema,
  reachedBpm: bpmSchema,
  seconds: int(0, RUN_SLOT_SECONDS_MAX),
});

/** `POST /api/v1/practice-sessions/:id/runs` — a run that has ended. The end is the server's. */
export const createRunSchema = z.object({
  startedAt: z.iso.datetime(),
  items: z
    .array(runSlotSchema)
    .min(1, 'A run with no pattern played is not logged')
    .max(SESSION_ITEMS_MAX),
});

export type CreateRunInput = z.infer<typeof createRunSchema>;

/* ---- what the API answers, as a client reads it -------------------- */

const itemTargetSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('break'),
    id: z.string(),
    title: z.string(),
    meter: z.string(),
    bpm: z.number().int(),
    /** False for someone else's shared pattern. */
    mine: z.boolean(),
    /** Its `/p/` address, when it has one and is shared. */
    slug: z.string().nullable(),
  }),
  z.object({
    kind: z.literal('entry'),
    id: z.string(),
    title: z.string(),
    meter: z.string(),
    bpm: z.number().int(),
  }),
]);

export const sessionItemViewSchema = z.object({
  id: z.string(),
  position: z.number().int(),
  /** Null when the pattern was deleted or its owner made it private: the runner skips it. */
  target: itemTargetSchema.nullable(),
  title: z.string(),
  level: levelSchema,
  minutes: z.number().int(),
  minutesPinned: z.boolean(),
  goalBpm: z.number().int().nullable(),
  /** Your best at this layer, listed or not; null with no record. */
  bestBpm: z.number().int().nullable(),
  /** What the slot climbs to: the goal, else your best, else the pattern's tempo. Null on a gap. */
  targetBpm: z.number().int().nullable(),
  /** Where it starts: `startPct` below the target. Null on a gap. */
  startBpm: z.number().int().nullable(),
  startPct: z.number().int().nullable(),
  climbPct: z.number().int().nullable(),
  climbShape: z.enum(CLIMB_SHAPES).nullable(),
  climbSteps: z.number().int().nullable(),
});

export type SessionItemView = z.infer<typeof sessionItemViewSchema>;

const sessionFields = {
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  totalMinutes: z.number().int(),
  visibility: z.enum(['private', 'link']),
  slug: z.string().nullable(),
  updatedAt: z.string(),
};

export const sessionViewSchema = z.object({
  ...sessionFields,
  startPct: z.number().int(),
  climbPct: z.number().int(),
  climbShape: z.enum(CLIMB_SHAPES),
  climbSteps: z.number().int(),
  countIn: z.number().int(),
  createdAt: z.string(),
  items: z.array(sessionItemViewSchema),
});

export type SessionView = z.infer<typeof sessionViewSchema>;

/** A row of `GET /api/v1/practice-sessions`. */
export const sessionSummarySchema = z.object({
  ...sessionFields,
  itemCount: z.number().int(),
  /** The pattern titles in order, for the card. */
  titles: z.array(z.string()),
  lastRunAt: z.string().nullable(),
});

export type SessionSummary = z.infer<typeof sessionSummarySchema>;

export const runViewSchema = z.object({
  id: z.string(),
  sessionId: z.string().nullable(),
  sessionName: z.string(),
  startedAt: z.string(),
  endedAt: z.string(),
  items: z.array(runSlotSchema),
});

export type RunView = z.infer<typeof runViewSchema>;
