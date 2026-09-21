import { z } from 'zod';

import { LANES, PERC_KEYS } from '@/lib/app/breaks/lanes';
import { METER_KEYS } from '@/lib/app/breaks/meter';
import { STYLE_KEYS } from '@/lib/app/breaks/styles';

/**
 * Zod schemas for everything that arrives from outside: a pasted share code, a
 * `POST /api/v1/breaks` body, a row read back from the database.
 *
 * A share code is a base64 blob a stranger can paste in, so it is untrusted
 * input in exactly the sense the type system cannot help with. Decoding it
 * through a schema — rather than casting the parsed JSON — is what stops a
 * malformed or hostile code from reaching the engraver as a `Pattern`-shaped
 * object that is not one.
 *
 * The schemas are deliberately **tolerant of what is missing and strict about
 * what is present**: a version-2 code has no meter and no lane roster, and
 * should still load as 4/4 with the five lanes everybody had.
 */

const laneKey = z.enum(LANES as [string, ...string[]]);
const laneRow = z.array(z.number().int().min(0).max(4));

/** One bar: a lane-keyed map of step values. Absent lanes are filled in on load. */
const barSchema = z.record(laneKey, laneRow);

export const patternSchema = z.object({
  name: z.string().max(120),
  style: z.string().refine((s) => STYLE_KEYS.includes(s), 'unknown style'),
  meter: z.string().refine((s) => METER_KEYS.includes(s), 'unknown meter'),
  seed: z.number().int().min(0).max(0xffffffff),
  voice: z.enum(['hat', 'ride']),
  lanes: z.array(laneKey).min(1),
  perc: z.record(
    z.enum(['p1', 'p2']),
    z.string().refine((s) => PERC_KEYS.includes(s))
  ),
  backbeats: z.array(z.number().int().min(0).max(63)),
  bbLane: laneKey,
  hasRide: z.boolean(),
  hasHat: z.boolean(),
  pins: z.array(z.record(laneKey, z.array(z.number().int().min(0).max(5))).nullable()).nullable(),
  bars: z.array(barSchema).min(1).max(8),
});

/* ---- the wire format ------------------------------------------------
   Version 3 adds the meter, the lane roster and what is in each percussion
   slot. A version 2 code still decodes: no meter means 4/4, no roster means
   the five lanes everyone had, and the rows it does not carry come back empty.
   -------------------------------------------------------------------- */

/** One pattern, as it travels inside a share code: short keys, rows as strings. */
export const packedPatternSchema = z.object({
  /** name */
  n: z.string().max(120).default(''),
  /** style */
  st: z.string().default('funk'),
  /** voice */
  v: z.enum(['hat', 'ride']).default('hat'),
  /** seed */
  sd: z.number().int().default(0),
  /** backbeats */
  bb: z.array(z.number().int()).default([]),
  /** meter — absent in a v2 code */
  mt: z.string().optional(),
  /** lane roster — absent in a v2 code */
  ln: z.array(z.string()).optional(),
  /** percussion slots */
  pc: z.record(z.string(), z.string()).optional(),
  /** backbeat lane */
  bl: z.string().optional(),
  /** has a written ride pattern */
  hr: z.union([z.literal(0), z.literal(1)]).optional(),
  /** has a written hat pattern */
  hh: z.union([z.literal(0), z.literal(1)]).optional(),
  /**
   * Pins, per bar: a lane-keyed map of digit strings, or `0` for a bar with
   * none. `0` for the whole field means the code predates pins.
   */
  pn: z
    .union([z.literal(0), z.array(z.union([z.literal(0), z.record(z.string(), z.string())]))])
    .optional(),
  /** bars, each one every lane's row joined by `|` */
  b: z.array(z.string()).min(1).max(8),
});

export const sharePayloadSchema = z.object({
  ver: z.number().int().min(1).max(3),
  bpm: z.number().min(20).max(400).default(94),
  sw: z.number().min(0).max(100).default(0),
  lv: z.number().int().min(1).max(5).optional(),
  arr: z
    .array(z.enum(['A', 'B']))
    .max(16)
    .optional(),
  A: packedPatternSchema,
  B: packedPatternSchema,
});

export type PackedPattern = z.infer<typeof packedPatternSchema>;
export type SharePayload = z.infer<typeof sharePayloadSchema>;
