/**
 * The parts of a drummer record a `/drummers/[slug]` page shows (Phase 11-b).
 *
 * The record is stored whole as the model wrote it and comes back from the
 * table as unchecked JSON, so it is read here through Zod rather than cast.
 * Each field stands alone: one that does not read is left out, and the rest
 * of the page still shows. The schemas in the model folder are the standard;
 * this is only the slice a page needs.
 */

import { z } from 'zod';

import { CONFIDENCES, type Confidence } from '@/lib/app/lineage/types';

const text = z.string().trim().min(1);
const year = z.number().int();

/** A field that reads, or `undefined` — never a failed page. */
function maybe<T extends z.ZodType>(schema: T) {
  return schema.optional().catch(undefined);
}

/** A list that keeps the items that read and drops the rest. */
function someOf<T extends z.ZodType>(item: T) {
  return z
    .array(z.unknown())
    .catch([])
    .optional()
    .transform((items) =>
      (items ?? []).flatMap((i) => {
        const read = item.safeParse(i);
        return read.success ? [read.data] : [];
      })
    );
}

const confidence = z.enum(CONFIDENCES);
const evidence = z.object({ confidence: maybe(confidence) });
const dated = z.object({ date: maybe(text), place: maybe(text) });

const recordSchema = z.object({
  meta: maybe(z.object({ record_status: maybe(text) })),
  identity: z.object({
    name: text,
    full_name: maybe(text),
    pseudonymous: maybe(z.boolean()),
    persona: maybe(z.object({ stage_name: maybe(text), description: maybe(text) })),
    born: maybe(dated),
    died: maybe(dated),
    nationality: someOf(text),
    home_scenes: someOf(text),
    active: maybe(z.object({ from: maybe(year), to: maybe(year), ongoing: maybe(z.boolean()) })),
    roles: someOf(text),
    summary: maybe(text),
  }),
  eras: someOf(
    z.object({
      label: text,
      years: maybe(z.object({ from: maybe(year), to: maybe(year) })),
      context: maybe(text),
    })
  ),
  style_profile: maybe(z.object({ descriptors: someOf(text) })),
  feel_profile: maybe(z.object({ descriptors: someOf(text) })),
  technique_profile: maybe(
    z.object({
      hand_techniques: someOf(z.object({ name: text, description: maybe(text) })),
      foot_techniques: someOf(z.object({ name: text, description: maybe(text) })),
    })
  ),
  signature_traits: someOf(
    z.object({
      label: text,
      category: maybe(text),
      description: maybe(text),
      evidence: maybe(evidence),
    })
  ),
  legacy: maybe(z.object({ contribution: maybe(z.object({ description: text })) })),
});

export interface DrummerTrait {
  label: string;
  category: string | null;
  description: string | null;
  confidence: Confidence | null;
}

export interface DrummerTechnique {
  name: string;
  description: string | null;
}

export interface DrummerEra {
  label: string;
  from: number | null;
  to: number | null;
  context: string | null;
}

export interface DrummerRecord {
  name: string;
  /** Left out for a masked performer; the record may not hold one then. */
  fullName: string | null;
  /** A masked performer's persona, as the band presents it. */
  persona: string | null;
  born: string | null;
  died: string | null;
  from: string[];
  activeFrom: number | null;
  activeTo: number | null;
  ongoing: boolean;
  roles: string[];
  summary: string | null;
  /** What they brought to music history, sourced: why a candidate is on the long list (D72). */
  contribution: string | null;
  /** `draft`, `reviewed`… — how far the record itself has been checked. */
  status: string | null;
  descriptors: string[];
  eras: DrummerEra[];
  traits: DrummerTrait[];
  techniques: DrummerTechnique[];
}

/** A record's showable parts, or null when it has not even a name. */
export function readDrummerRecord(record: unknown): DrummerRecord | null {
  const read = recordSchema.safeParse(record);
  if (!read.success) return null;
  const r = read.data;
  const id = r.identity;
  const masked = id.pseudonymous === true || id.persona !== undefined;
  const technique = r.technique_profile;
  return {
    name: id.name,
    fullName: masked ? null : (id.full_name ?? null),
    persona: id.persona?.description ?? null,
    born: masked ? null : (id.born?.date ?? null),
    died: masked ? null : (id.died?.date ?? null),
    from: [...new Set([...id.home_scenes, ...id.nationality])],
    activeFrom: id.active?.from ?? null,
    activeTo: id.active?.to ?? null,
    ongoing: id.active?.ongoing === true,
    roles: id.roles.map((role) => role.replaceAll('_', ' ')),
    summary: id.summary ?? null,
    contribution: r.legacy?.contribution?.description ?? null,
    status: r.meta?.record_status ?? null,
    descriptors: [
      ...new Set([...(r.style_profile?.descriptors ?? []), ...(r.feel_profile?.descriptors ?? [])]),
    ],
    eras: r.eras.map((e) => ({
      label: e.label,
      from: e.years?.from ?? null,
      to: e.years?.to ?? null,
      context: e.context ?? null,
    })),
    traits: r.signature_traits.map((t) => ({
      label: t.label,
      category: t.category ?? null,
      description: t.description ?? null,
      confidence: t.evidence?.confidence ?? null,
    })),
    techniques: [...(technique?.hand_techniques ?? []), ...(technique?.foot_techniques ?? [])].map(
      (t) => ({ name: t.name, description: t.description ?? null })
    ),
  };
}
