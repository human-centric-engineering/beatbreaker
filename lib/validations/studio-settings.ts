import { z } from 'zod';

import {
  DRIFT_PARAM_DEFS,
  MASTER_PARAM_DEFS,
  PARAM_DEFS,
  type ParamDef,
  SYNTH_ONLY,
  USER_PARAM_DEFS,
  VOICE_KEYS,
} from '@/lib/app/breaks/kit';
import { PERC_KEYS } from '@/lib/app/breaks/lanes';
import { DEFAULT_METER, METERS } from '@/lib/app/breaks/meter';

/**
 * Your Studio settings (D19) — `/api/v1/studio-settings` and the
 * `StudioSettings.prefs` column.
 *
 * How you play, as opposed to what you are playing: the kit and its tuning,
 * the count-in, the generator's dials, and the starting values a new pattern
 * opens with. What belongs to a pattern (its tempo, swing, layer, arrangement,
 * style and meter) is in its document and is not a field here.
 *
 * Every field is bounded. Three name catalogue rows — `kit`, `userKit` and
 * `startStyle` — and a static schema cannot know which rows exist, so the data
 * layer checks those against the catalogue on write and on read
 * (`lib/app/breaks/saved/settings.ts`).
 */

/** The tempo range a setting may hold. The meter's own `maxBpm` clamps it where it is used. */
export const SETTINGS_BPM_MIN = 50;
export const SETTINGS_BPM_MAX = 300;

/** How many kits may carry a tuning override. There are 13 system kits; this is headroom, not a target. */
export const MAX_TUNED_KITS = 64;

const catalogueKeySchema = z.string().min(1).max(40);

const meterKeySchema = z
  .string()
  .refine((k) => Object.hasOwn(METERS, k), { message: 'Not a meter the Studio has' });

const percKeySchema = z
  .string()
  .refine((k) => PERC_KEYS.includes(k), { message: 'Not a percussion instrument the Studio has' });

const tempoSchema = z.number().int().min(SETTINGS_BPM_MIN).max(SETTINGS_BPM_MAX);

type Range = { min: number; max: number };

/** One range per parameter name: the widest any of these definitions gives it. */
function widest(defs: ParamDef[]): Record<string, Range> {
  const out: Record<string, Range> = {};
  for (const d of defs) {
    const r = out[d.key];
    out[d.key] = r
      ? { min: Math.min(r.min, d.min), max: Math.max(r.max, d.max) }
      : { min: d.min, max: d.max };
  }
  return out;
}

/**
 * What each voice's tuning may hold, whatever engine the kit runs.
 *
 * Tuning is kept per kit, and the same voice has different knobs on different
 * engines — hertz and seconds on the synthesiser, 0–1 on the drum machines,
 * speed and level on a sampled kit. The schema cannot know a kit's engine
 * without the catalogue, so it holds each parameter to the widest range any
 * engine gives it; `withTuning` then takes only the keys the kit's own engine
 * has. Toms and percussion are synthesised on every kit (`SYNTH_ONLY`), so
 * theirs are the synthesiser's alone.
 */
export const TUNING_RANGES: Record<string, Record<string, Range>> = {
  ...Object.fromEntries(
    VOICE_KEYS.map((v): [string, Record<string, Range>] => [
      v,
      widest(
        SYNTH_ONLY[v] ? PARAM_DEFS[v] : [...PARAM_DEFS[v], ...DRIFT_PARAM_DEFS, ...USER_PARAM_DEFS]
      ),
    ])
  ),
  master: widest(MASTER_PARAM_DEFS),
};

/**
 * `bb.sound`: kit key → voice (or `master`) → parameter → value.
 *
 * Typed as plain records, which is what the console and `withTuning` take,
 * and refined rather than built from `z.object`, so an unknown voice or
 * parameter names itself in the error.
 */
const tuningSchema = z
  .record(catalogueKeySchema, z.record(z.string(), z.record(z.string(), z.number())))
  .superRefine((sound, ctx) => {
    const kits = Object.keys(sound);
    if (kits.length > MAX_TUNED_KITS) {
      ctx.addIssue({ code: 'custom', message: `At most ${MAX_TUNED_KITS} kits may be tuned` });
    }
    for (const kit of kits) {
      for (const [voice, params] of Object.entries(sound[kit])) {
        const ranges = TUNING_RANGES[voice];
        if (!ranges) {
          ctx.addIssue({ code: 'custom', message: 'Not a voice', path: [kit, voice] });
          continue;
        }
        for (const [key, value] of Object.entries(params)) {
          const r = ranges[key];
          if (!r) {
            ctx.addIssue({ code: 'custom', message: 'Not a parameter', path: [kit, voice, key] });
          } else if (!(value >= r.min && value <= r.max)) {
            ctx.addIssue({
              code: 'custom',
              message: `Out of range (${r.min}–${r.max})`,
              path: [kit, voice, key],
            });
          }
        }
      }
    }
  });

/**
 * Every setting, each with its own schema. Kept as a field map rather than
 * only as one object schema because the stored row is read field by field
 * ({@link parseStoredSettings}).
 */
export const STUDIO_SETTINGS_FIELDS = {
  /** The kit playing now — yours, or one a style brought with it. */
  kit: catalogueKeySchema,
  /** The kit you picked yourself, handed back when a style that imposed one is left. */
  userKit: catalogueKeySchema,
  /** Your tuning overrides, per kit. */
  sound: tuningSchema,
  /** Sampled percussion on kits that ship it, rather than synthesised. */
  percSamples: z.boolean(),
  /** Bars of count-in before playback: 0, 1 or 2. */
  countIn: z.number().int().min(0).max(2),
  /** Where the tempo ramp stops. */
  ceiling: tempoSchema,
  /** Tempo follows the layer (L1 slow … L5 as written). */
  matchTempo: z.boolean(),
  /** The generator's dials. */
  density: z.number().int().min(0).max(100),
  ghosts: z.number().int().min(0).max(100),
  hats: z.number().int().min(0).max(150),
  feel: z.number().int().min(0).max(150),
  lanesMode: z.enum(['style', 'custom']),
  customLanes: z
    .object({
      toms: z.boolean().optional(),
      p1: percKeySchema.optional(),
      p2: percKeySchema.optional(),
    })
    .strict(),
  /** The meter you picked yourself, handed back when a style stops imposing one. */
  userMeter: meterKeySchema,
  /** Notation guides, sticking, and the preview of a change before you keep it. */
  guides: z.boolean(),
  sticking: z.boolean(),
  preview: z.boolean(),
  /** What _New pattern_ opens with (D21). Not the open pattern's own values — those are in its document. */
  startStyle: catalogueKeySchema,
  startMeter: meterKeySchema,
  startBars: z.number().int().min(1).max(4),
  startBpm: tempoSchema,
} as const;

type Fields = typeof STUDIO_SETTINGS_FIELDS;
export type StudioSettings = { -readonly [K in keyof Fields]: z.infer<Fields[K]> };
export type StudioSettingsField = keyof StudioSettings;

/** Everything as a new account has it — the values the prototype shipped with. */
export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  kit: 'studio70',
  userKit: 'studio70',
  sound: {},
  percSamples: true,
  countIn: 1,
  ceiling: 130,
  matchTempo: false,
  density: 55,
  ghosts: 60,
  hats: 100,
  feel: 100,
  lanesMode: 'style',
  customLanes: { toms: false },
  userMeter: DEFAULT_METER,
  guides: true,
  sticking: false,
  preview: true,
  startStyle: 'funk',
  startMeter: DEFAULT_METER,
  startBars: 2,
  startBpm: 94,
};

/** The settings that name a catalogue row, and which kind of row. */
export const CATALOGUE_FIELDS = {
  kit: 'kit',
  userKit: 'kit',
  startStyle: 'style',
} as const satisfies Partial<Record<StudioSettingsField, 'kit' | 'style'>>;

/** The whole object. An unknown field is refused. */
export const studioSettingsSchema = z.object(STUDIO_SETTINGS_FIELDS).strict();

/** `PATCH /api/v1/studio-settings` — any subset; each field given replaces the stored one. */
export const studioSettingsPatchSchema = studioSettingsSchema.partial();

export type StudioSettingsPatch = z.infer<typeof studioSettingsPatchSchema>;

/**
 * A stored `prefs` value, read field by field.
 *
 * A field that is missing takes its default quietly — that is a setting you
 * have never changed. A field that is present and no longer parses (a bound
 * tightened, a meter removed) also takes its default, and is named in
 * `invalid` so the caller can log it; the rest of the row is unaffected. A
 * stored field this schema no longer has is ignored.
 */
export function parseStoredSettings(raw: unknown): {
  settings: StudioSettings;
  invalid: StudioSettingsField[];
} {
  const settings = structuredClone(DEFAULT_STUDIO_SETTINGS);
  const invalid: StudioSettingsField[] = [];
  const stored = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const assign = <K extends StudioSettingsField>(key: K, value: unknown): void => {
    const parsed = STUDIO_SETTINGS_FIELDS[key].safeParse(value);
    if (parsed.success) settings[key] = parsed.data as StudioSettings[K];
    else invalid.push(key);
  };
  for (const key of Object.keys(STUDIO_SETTINGS_FIELDS) as StudioSettingsField[]) {
    if (Object.hasOwn(stored, key)) assign(key, (stored as Record<string, unknown>)[key]);
  }
  return { settings, invalid };
}
