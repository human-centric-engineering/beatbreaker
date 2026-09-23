import { z } from 'zod';

import { LANES, PERC_KEYS } from '@/lib/app/breaks/lanes';
import type { LaneKey } from '@/lib/app/breaks/types';
import { METER_KEYS } from '@/lib/app/breaks/meter';
import { feelSchema, styleAttrsSchema } from '@/lib/app/breaks/schema';

/**
 * What a catalogue row is allowed to say.
 *
 * **A row is external data.** That is the whole reason this file exists. While
 * styles and kits were TypeScript constants, the compiler was the validation:
 * a weight of `NaN` or a step index of `-1` would not have got past review, let
 * alone past `tsc`. They are rows now, written by an admin through a form and
 * — from D16 — by users, and a row arrives as `Json`, which is `unknown`
 * wearing a hat.
 *
 * So rows are validated **on write and on read** (§11, H9). Validating only on
 * write trusts that no row predates the current rules, that no migration ever
 * touched the column, and that nobody has a psql prompt. Reading through the
 * schema costs one parse per catalogue fetch, which is cached, and means the
 * generator can never be handed a weight table that hangs it.
 *
 * The bounds are deliberately generous about taste and strict about arithmetic:
 * they refuse what would produce `NaN`, loop forever or index off the end of a
 * bar, and allow anything musical, including things no shipped style does.
 */

/* Every step index a bar can hold. The longest meter, 15/8, is 30 steps; 63 is
   the same ceiling the wire format uses, so a style and a pattern agree about
   what a step number is. */
const stepIndex = z.number().int().min(0).max(63);
const stepList = z.array(stepIndex).max(64);

/* A weight is a relative preference, so the scale is arbitrary and only the
   ratios matter. What it must not be is negative, infinite or NaN: `wpick`
   walks a running total, and any of those three makes the walk never finish or
   finish in the wrong place. */
const weight = z.number().finite().min(0).max(1000);

/** A four-step kick cell, one character per sixteenth. `'1010'` is 1 and 3. */
const kickCell = z.string().regex(/^[01]{4}$/, 'a kick cell is four 0s and 1s');
const kickCells = z
  .array(z.tuple([kickCell, weight]))
  .min(1)
  .max(64);

/* Cast to the lane union, not to `[string, ...]`: the wider cast infers a
   plain `string` and `StyleParams` then stops being assignable to `Style`. */
const laneKey = z.enum(LANES as [LaneKey, ...LaneKey[]]);

/** What a percussion slot plays. */
export const percSpecSchema = z.object({
  inst: z
    .string()
    .refine((s) => PERC_KEYS.includes(s), 'unknown percussion instrument')
    .optional(),
  steps: stepList.optional(),
  /** An ostinato every n steps. Zero or a fraction would never advance. */
  every: z.number().int().min(1).max(64).optional(),
  from: stepIndex.optional(),
  follow: z.enum(['backbeats', 'snare']).optional(),
  accents: stepList.optional(),
  accentPulse: z.boolean().optional(),
  /** Probability of dropping a hit, so a part breathes. */
  drop: z.number().min(0).max(1).optional(),
});

/**
 * A whole style's parameters — the `Style` type, bounded.
 *
 * Mirrors `lib/app/breaks/types.ts` field for field. When a field is added
 * there this must grow with it, and the parity test
 * (`tests/unit/lib/app/breaks/catalogue/schemas.test.ts`) fails until it does:
 * a field the schema does not know is stripped, so the generator would silently
 * stop reading it.
 */
export const styleParamsSchema = styleAttrsSchema.extend({
  label: z.string().min(1).max(80),
  hint: z.string().max(800),

  /** Where the faders start. A fader is a gain, so 0–2 rather than 0–1. */
  mix: z.partialRecord(laneKey, z.number().min(0).max(2)).optional(),

  /** The cymbal ostinato's subdivision: 8ths or 16ths, and nothing else. */
  hats: z.union([z.literal(8), z.literal(16)]),
  /** `[min, max]` — the same 30–300 the tempo control allows. */
  bpm: z
    .tuple([z.number().min(30).max(300), z.number().min(30).max(300)])
    .refine(([lo, hi]) => lo <= hi, 'the low end of a tempo range comes first'),
  /** The style's own swing, as the slider reads it. */
  swing: z.number().min(0).max(100),

  ghostBias: z.number().min(0).max(4),
  /** Step → weight. Keys are step indices, so they arrive as numeric strings. */
  ghostWeights: z.record(z.coerce.number().int().min(0).max(63), weight).optional(),
  ghostHit: z.number().min(0).max(1).optional(),
  snareGhosts: stepList.optional(),

  opens: z.number().int().min(0).max(32),
  openSlots: stepList.optional(),
  backbeats: stepList.optional(),
  backbeatLane: laneKey.optional(),

  kick1: kickCells,
  kick: kickCells,
  noKick: stepList.optional(),
  forceKick: stepList.optional(),

  toms: z.boolean().optional(),
  foot: stepList.optional(),
  perc: z.array(percSpecSchema).max(2).optional(),

  meter: z
    .string()
    .refine((s) => METER_KEYS.includes(s), 'unknown meter')
    .optional(),
  /** A kit the style asks for. Not checked against the kit table: a style may
      legitimately name a kit this installation does not have, and the picker
      falls back rather than the style failing to load. */
  kit: z.string().max(40).optional(),

  ride: z.object({ steps: stepList.optional(), bell: stepList.optional() }).optional(),
  hat: z
    .object({
      steps: stepList.optional(),
      accents: stepList.optional(),
      opens: stepList.optional(),
    })
    .optional(),

  crossStick: z.boolean().optional(),
  clave: z.boolean().optional(),
  linear: z.boolean().optional(),
  displace: z.number().min(0).max(1).optional(),
  fill: z.literal('comp').optional(),
  fillComps: z.number().int().min(0).max(16).optional(),

  feel: feelSchema.optional(),
});

export type StyleParams = z.infer<typeof styleParamsSchema>;

/* ---- kits ----------------------------------------------------------- */

/** One voice's knobs. Units depend on the engine — see `PARAM_DEFS`. */
const voiceParams = z.record(z.string().max(24), z.number().finite().min(-1e6).max(1e6));

export const KIT_ENGINES = ['synth', 'drift', 'pack', 'user'] as const;
export const kitEngineSchema = z.enum(KIT_ENGINES);

/**
 * A kit's numbers: the master chain, one entry per voice, and the three fields
 * that say where its sound comes from.
 *
 * The label, hint, engine and credit are columns rather than parameters, so
 * they are not here — nothing is stored in two places.
 */
export const kitParamsSchema = z.object({
  /** Which drum machine's voice models, for `engine: 'drift'`. */
  machine: z.string().max(40).optional(),
  /** Which sample pack's folder, for `engine: 'pack'`. */
  pack: z
    .string()
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'a pack name is a folder name')
    .optional(),
  /** Output trim measured against the synthesised kits. */
  trim: z.number().min(0).max(4).optional(),
  master: z.object({
    lp: z.number().min(20).max(24000).optional(),
    drive: z.number().min(0).max(8).optional(),
    room: z.number().min(0).max(1).optional(),
  }),
  /* The seven voices, named one by one rather than spread from `VOICE_KEYS`.
     A spread infers an index signature, and a parsed kit then stops being
     assignable to `Kit` — which is how the first version of this needed an
     `as CatalogueKit` to compile, and how a missing voice would have got past
     the parse. `VOICE_KEYS` and this list are held together by
     `kit-params-parity` in `tests/unit/lib/app/breaks/catalogue/schemas.test.ts`. */
  k: voiceParams,
  s: voiceParams,
  h: voiceParams,
  r: voiceParams,
  c: voiceParams,
  t: voiceParams,
  p: voiceParams,
});

/** One slot's recordings: the files, and the velocity each was recorded at. */
const kitSampleSlot = z.object({
  v: z.array(z.number().min(0).max(1)).max(8).nullable(),
  /* A file name, not a path: the URL is built as `/kits/<pack>/<file>`, and a
     `..` or a leading slash here would climb out of that folder. The kit rows
     are seeded today and admin-written tomorrow, which is exactly when a path
     traversal stops being hypothetical. */
  files: z
    .array(
      z
        .string()
        .max(64)
        .regex(/^[A-Za-z0-9._-]+$/, 'a sample is a plain file name')
    )
    .min(1)
    .max(8),
});

export const kitSamplesSchema = z.object({
  sampleRate: z.number().int().min(8000).max(192000).optional(),
  slots: z.record(z.string().max(24), kitSampleSlot).optional(),
  perc: z.record(z.string().max(24), kitSampleSlot).optional(),
});

/* ---- library entries ------------------------------------------------ */

/**
 * One entry's metadata. The pattern itself is `doc`, validated by the wire
 * format's own `packedPatternSchema` — one schema for a pattern, wherever it
 * arrived from.
 */
export const libraryEntrySchema = z.object({
  group: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  artist: z.string().max(200),
  note: z.string().max(600).nullable().optional(),
  bpm: z.number().int().min(30).max(300),
  styleKey: z.string().max(40),
  meter: z.string().refine((s) => METER_KEYS.includes(s), 'unknown meter'),
});

/** The three states a catalogue row can be in. Only `system` exists until D16. */
export const VISIBILITIES = ['system', 'private', 'published'] as const;
export const visibilitySchema = z.enum(VISIBILITIES);
