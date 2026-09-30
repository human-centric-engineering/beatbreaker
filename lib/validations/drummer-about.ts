import { z } from 'zod';

import {
  CHANNEL_RULE,
  MAX_CHANNELS,
  parseChannelLink,
  type StoredChannel,
} from '@/lib/app/breaks/community/channels';

/**
 * About you (Phase 7B) — `PUT /api/v1/drummer-about` and the settings form.
 *
 * What a drummer uses BeatBreaker for, what they play and how well, and where
 * people can watch or hear them. Client-safe: the form and the route read the
 * same lists and refuse the same things. What a static schema cannot know —
 * which styles the catalogue has — is checked by the data layer
 * (`lib/app/breaks/community/about.ts`).
 */

export const PURPOSES = ['learning', 'teaching', 'designing'] as const;
export type Purpose = (typeof PURPOSES)[number];

export const PURPOSE_LABELS: Record<Purpose, string> = {
  learning: 'Learning to play',
  teaching: 'Teaching drums',
  designing: 'Designing and experimenting with beats',
};

/** The five-step scale (D27), lowest first. */
export const ABILITIES = [
  'just-starting',
  'beginner',
  'intermediate',
  'advanced',
  'professional',
] as const;
export type Ability = (typeof ABILITIES)[number];

export const ABILITY_LABELS: Record<Ability, string> = {
  'just-starting': 'Just starting',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  professional: 'Professional',
};

/** How many preferred styles you may choose. */
export const MAX_STYLES = 8;

/** The fields a switch can make public (D28). */
export const PUBLIC_FIELDS = ['purposes', 'styles', 'ability', 'channels'] as const;
export type PublicField = (typeof PUBLIC_FIELDS)[number];
export type PublicSwitches = Record<PublicField, boolean>;

/**
 * Channel links are public until switched off, because showing them is their
 * point; the rest are private until switched on.
 */
export const DEFAULT_PUBLIC: PublicSwitches = {
  purposes: false,
  styles: false,
  ability: false,
  channels: true,
};

function unique<T>(list: T[]): boolean {
  return new Set(list).size === list.length;
}

const styleKeySchema = z.string().min(1).max(40);

/**
 * The channels as typed, each re-read by `parseChannelLink` and replaced by
 * the canonical URL it rebuilds. The platform is the parser's, never the
 * client's. One website at most, and no link twice.
 */
export const channelsInputSchema = z
  .array(z.object({ url: z.string().max(300), drumming: z.boolean() }).strict())
  .max(MAX_CHANNELS, `Up to ${MAX_CHANNELS} links`)
  .transform((entries, ctx): StoredChannel[] => {
    const out: StoredChannel[] = [];
    entries.forEach((entry, i) => {
      const parsed = parseChannelLink(entry.url);
      if (!parsed) {
        ctx.addIssue({ code: 'custom', message: CHANNEL_RULE, path: [i, 'url'] });
        return;
      }
      out.push({ kind: parsed.kind, url: parsed.url, drumming: entry.drumming });
    });
    if (out.filter((c) => c.kind === 'website').length > 1) {
      ctx.addIssue({ code: 'custom', message: 'One personal website at most' });
    }
    if (!unique(out.map((c) => c.url))) {
      ctx.addIssue({ code: 'custom', message: 'The same link is in the list twice' });
    }
    return out;
  });

/**
 * `PUT /api/v1/drummer-about`. Every field is optional, and a field left out
 * is left alone, so Home's three-question card can send three fields and the
 * settings form all of them. An empty list clears it; `ability: null` clears
 * it. `asked: true` records that Home's card was answered or skipped.
 */
export const drummerAboutSchema = z
  .object({
    purposes: z.array(z.enum(PURPOSES)).max(PURPOSES.length).refine(unique, 'Each purpose once'),
    styles: z
      .array(styleKeySchema)
      .max(MAX_STYLES, `Up to ${MAX_STYLES} styles`)
      .refine(unique, 'Each style once'),
    ability: z.enum(ABILITIES).nullable(),
    /** Style key → ability. Every key must be one of your styles. */
    styleAbility: z
      .record(styleKeySchema, z.enum(ABILITIES))
      .refine((r) => Object.keys(r).length <= MAX_STYLES, `Up to ${MAX_STYLES} styles`),
    channels: channelsInputSchema,
    /** A switch per field; one left out keeps its stored value. */
    public: z
      .object({
        purposes: z.boolean(),
        styles: z.boolean(),
        ability: z.boolean(),
        channels: z.boolean(),
      } satisfies Record<PublicField, z.ZodBoolean>)
      .partial()
      .strict(),
    asked: z.literal(true),
  })
  .partial()
  .strict();

export type DrummerAboutInput = z.infer<typeof drummerAboutSchema>;

/**
 * Where a new pattern starts for each ability (Phase 7B): its layer and its
 * tempo. Intermediate is the Studio's own default. Written into your Studio
 * settings when you change your ability, where you can still change them.
 */
export const ABILITY_START: Record<Ability, { startLevel: number; startBpm: number }> = {
  'just-starting': { startLevel: 1, startBpm: 70 },
  beginner: { startLevel: 2, startBpm: 80 },
  intermediate: { startLevel: 3, startBpm: 94 },
  advanced: { startLevel: 4, startBpm: 105 },
  professional: { startLevel: 5, startBpm: 115 },
};

/**
 * The settings form's own values (task 7B.7). The same rules as
 * {@link drummerAboutSchema}, shaped for inputs: "not saying" is an empty
 * string rather than null, and the channels stay as typed — the server
 * rebuilds them, and the form shows what comes back.
 */
export const aboutFormSchema = z.object({
  purposes: z.array(z.enum(PURPOSES)),
  ability: z.union([z.enum(ABILITIES), z.literal('')]),
  styles: z.array(styleKeySchema).max(MAX_STYLES, `Up to ${MAX_STYLES} styles`),
  styleAbility: z.record(styleKeySchema, z.union([z.enum(ABILITIES), z.literal('')])),
  channels: z
    .array(
      z.object({
        url: z
          .string()
          .trim()
          .refine((u) => parseChannelLink(u) !== null, CHANNEL_RULE),
        drumming: z.boolean(),
      })
    )
    .max(MAX_CHANNELS, `Up to ${MAX_CHANNELS} links`)
    .refine(
      (list) => list.filter((c) => parseChannelLink(c.url)?.kind === 'website').length <= 1,
      'One personal website at most'
    ),
  public: z.object({
    purposes: z.boolean(),
    styles: z.boolean(),
    ability: z.boolean(),
    channels: z.boolean(),
  } satisfies Record<PublicField, z.ZodBoolean>),
});

export type AboutFormValues = z.infer<typeof aboutFormSchema>;
