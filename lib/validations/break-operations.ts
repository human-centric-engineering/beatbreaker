import { z } from 'zod';

import { METER_KEYS } from '@/lib/app/breaks/meter';
import { packedPatternSchema, sharePayloadSchema } from '@/lib/app/breaks/schema';
import { DOCTOR_MOVES } from '@/lib/app/breaks/doctor';

/**
 * Request schemas for the domain endpoints — generate, doctor, critique,
 * engrave and MIDI.
 *
 * **Why these exist at all.** The generator, the critic and the engraver run in
 * the browser, and the web Studio will keep running them there: a regenerate
 * should not wait on the network. But the web app is the first client, not the
 * only one (D14), and a native app has nothing but `/api/v1` — so every domain
 * operation is an endpoint *as well*, calling the same functions on the same
 * catalogue data. One implementation, many callers.
 *
 * Nothing here is web-specific: no HTML, no redirects, no cookies-only
 * assumption a native client cannot meet.
 */

/** A style, named the way a pattern names one: a key, and optionally a version. */
const styleRef = z.object({
  styleKey: z.string().min(1).max(40),
  /**
   * Which version to read. Absent means the current one.
   *
   * A client re-deriving a saved break passes the version the break records,
   * which is what makes "the same seed gives the same break" survive a retune.
   */
  styleVersion: z.number().int().min(1).max(100000).optional(),
});

const meter = z
  .string()
  .refine((s) => METER_KEYS.includes(s), 'unknown meter')
  .default('4/4');

export const generateBreakSchema = styleRef.extend({
  meter,
  bars: z.number().int().min(1).max(8).default(2),
  /** Kick density, 0–100. */
  density: z.number().min(0).max(100).default(55),
  /** Ghost notes, 0–100. */
  ghosts: z.number().min(0).max(100).default(60),
  /** The tempo the critic scores against — not written into the pattern. */
  bpm: z.number().min(20).max(400).default(94),
  /**
   * Leave it out for a fresh break, pass it to reproduce one.
   *
   * With a seed the endpoint runs `generatePattern` once rather than the
   * rejection sampler: sixteen candidates from one seed would be a different
   * pattern each call, which is the opposite of what a seed is for.
   */
  seed: z.number().int().min(0).max(0xffffffff).optional(),
});

export const doctorBreakSchema = styleRef.extend({
  /** The pattern to operate on, in the wire format. */
  doc: packedPatternSchema,
  move: z.enum(DOCTOR_MOVES.map((m) => m.move) as [string, ...string[]]),
  /**
   * Varies the result between presses of the same button. Pass a fixed value
   * to make a move reproducible; leaving it out uses the clock, so two
   * identical requests give two different answers **on purpose**.
   */
  entropy: z.number().int().min(0).max(0xffffffff).optional(),
  /**
   * The tempo to judge the result at. Several playability checks are
   * tempo-dependent — `fastDoubles` cannot fire below 132 — so a fixed value
   * here would report on a tempo the caller never asked about, and the check's
   * own label says which one it used. Same default and bounds as `/critique`.
   */
  bpm: z.number().min(20).max(400).default(94),
});

export const critiqueBreakSchema = z.object({
  doc: packedPatternSchema,
  bpm: z.number().min(20).max(400).default(94),
});

export const engraveBreakSchema = z.object({
  doc: packedPatternSchema,
  /** The difficulty layer to draw. 5 is the whole break. */
  layer: z.number().int().min(1).max(5).default(5),
  /** Everything scales off this; 1 is the reference size. */
  scale: z.number().min(0.25).max(4).default(1),
  /** Bars per system. */
  perSystem: z.number().int().min(1).max(8).default(2),
  guides: z.boolean().default(false),
  sticking: z.boolean().default(false),
});

export const midiBreakSchema = z.object({
  /**
   * The whole break, not one pattern: a MIDI export is an arrangement, and the
   * arrangement is what says which section plays when.
   */
  doc: sharePayloadSchema,
  /** Off-grid feel, 0–150. 0 exports the same notes quantised. */
  feel: z.number().min(0).max(150).default(100),
  /** Hi-hat dynamics, 0–150. */
  hats: z.number().min(0).max(150).default(100),
  /** How many bars of the arrangement to write. */
  bars: z.number().int().min(1).max(64).default(8),
});

export type GenerateBreakInput = z.infer<typeof generateBreakSchema>;
export type DoctorBreakInput = z.infer<typeof doctorBreakSchema>;
export type CritiqueBreakInput = z.infer<typeof critiqueBreakSchema>;
export type EngraveBreakInput = z.infer<typeof engraveBreakSchema>;
export type MidiBreakInput = z.infer<typeof midiBreakSchema>;
