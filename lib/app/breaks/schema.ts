import { z } from 'zod';

import { LANES, LANE_VALUES, PERC_KEYS } from '@/lib/app/breaks/lanes';
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

/* Bounds on a packed bar. The longest meter (15/8) is 30 steps, and a bar is
   every lane's row joined by `|`; the caps leave room without letting a pasted
   code carry a megabyte of digits into the database. */
const MAX_ROW = 32;
const MAX_BAR_STRING = LANES.length * (MAX_ROW + 1);

/**
 * One bar of a share code: every lane's row, in `LANES` order, joined by `|`.
 * Each step is a digit no higher than that lane has values for — a crash is
 * 0 or 1, a snare 0–4 (see `LANE_VALUES`). This is the one place untrusted
 * step values enter, so it is where they are held to the lane's own range.
 */
const packedBar = z
  .string()
  .max(MAX_BAR_STRING)
  .regex(/^[0-4|]*$/, 'a bar is step values 0-4 separated by |')
  .refine((b) => {
    const rows = b.split('|');
    return rows.length <= LANES.length && rows.every((r) => r.length <= MAX_ROW);
  }, 'too many lanes, or a lane longer than any meter')
  .refine(
    (b) =>
      b.split('|').every((row, i) => {
        const max = LANE_VALUES[LANES[i]]?.length ?? 0;
        for (const ch of row) if (Number(ch) > max) return false;
        return true;
      }),
    'a step value that lane does not have'
  );

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
  sd: z.number().int().min(0).max(0xffffffff).default(0),
  /** backbeats */
  bb: z.array(z.number().int().min(0).max(63)).max(MAX_ROW).default([]),
  /** meter — absent in a v2 code */
  mt: z.string().optional(),
  /** lane roster — absent in a v2 code */
  ln: z.array(z.string().max(4)).max(LANES.length).optional(),
  /** percussion slots */
  pc: z
    .partialRecord(
      z.enum(['p1', 'p2']),
      z.string().refine((s) => PERC_KEYS.includes(s), 'unknown percussion instrument')
    )
    .optional(),
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
    .union([
      z.literal(0),
      z
        .array(
          z.union([
            z.literal(0),
            z.record(
              z.string(),
              z
                .string()
                .max(MAX_ROW)
                .regex(/^[0-5]*$/, 'a pin is a layer 0-5')
            ),
          ])
        )
        .max(8),
    ])
    .optional(),
  /** bars, each one every lane's row joined by `|` */
  b: z.array(packedBar).min(1).max(8),
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

/* ---- reading a stored row ------------------------------------------
   The schema above is what a break is held to on the way *in*. Rows saved
   before it was tightened (H6) could carry a crash of 3, a stray letter in a
   bar row, an unknown percussion key or a negative seed — nothing a real
   encoder writes, but nothing that stopped a hand-written API body either.
   Refusing those on the way *out* would make a saved break unopenable for its
   owner and for everyone its link was sent to, with no repair short of a
   PATCH of the whole document. So a stored row is repaired to the nearest
   thing the current rules allow, then held to them like anything else.
   -------------------------------------------------------------------- */

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** One bar string, each lane's steps clamped into that lane's range and length. */
function repairBar(bar: unknown): unknown {
  if (typeof bar !== 'string') return bar;
  return bar
    .split('|')
    .slice(0, LANES.length)
    .map((row, i) => {
      const max = LANE_VALUES[LANES[i]]?.length ?? 0;
      let out = '';
      for (const ch of row.slice(0, MAX_ROW)) {
        const n = /^[0-9]$/.test(ch) ? Number(ch) : 0;
        out += String(Math.min(n, max));
      }
      return out;
    })
    .join('|');
}

function repairPacked(p: unknown): unknown {
  if (!isObject(p)) return p;
  const out: Record<string, unknown> = { ...p };
  if (Array.isArray(p.b)) out.b = p.b.map(repairBar);
  if (typeof p.sd === 'number' && Number.isInteger(p.sd)) out.sd = p.sd >>> 0;
  if (Array.isArray(p.bb)) {
    out.bb = p.bb
      .filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 63)
      .slice(0, MAX_ROW);
  }
  if (isObject(p.pc)) {
    const pc: Record<string, unknown> = {};
    for (const k of ['p1', 'p2']) {
      const v = p.pc[k];
      if (typeof v === 'string' && PERC_KEYS.includes(v)) pc[k] = v;
    }
    out.pc = pc;
  }
  if (Array.isArray(p.ln)) {
    out.ln = p.ln
      .filter((l) => typeof l === 'string' && (LANES as string[]).includes(l))
      .slice(0, LANES.length);
  }
  if (Array.isArray(p.pn)) {
    out.pn = p.pn.slice(0, 8).map((bar) => {
      if (!isObject(bar)) return 0;
      const o: Record<string, string> = {};
      for (const [k, v] of Object.entries(bar)) {
        if (typeof v === 'string') o[k] = v.slice(0, MAX_ROW).replace(/[^0-5]/g, '0');
      }
      return o;
    });
  }
  return out;
}

/**
 * A `Break.doc` read back from the database: repaired where rows written under
 * the looser rules would now fail, then parsed by {@link sharePayloadSchema}.
 * Use this for stored rows only — anything arriving from outside is refused,
 * not repaired.
 */
export const storedPayloadSchema = z.preprocess((raw) => {
  if (!isObject(raw)) return raw;
  return { ...raw, A: repairPacked(raw.A), B: repairPacked(raw.B) };
}, sharePayloadSchema);
