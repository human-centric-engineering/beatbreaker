import { ValidationError } from '@/lib/api/errors';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { type ChannelView, readStoredChannels } from '@/lib/app/breaks/community/channels';
import { prisma } from '@/lib/db/client';
import {
  ABILITIES,
  type Ability,
  DEFAULT_PUBLIC,
  type DrummerAboutInput,
  PUBLIC_FIELDS,
  PURPOSES,
  type Purpose,
  type PublicSwitches,
} from '@/lib/validations/drummer-about';

/**
 * About you (Phase 7B): what you use BeatBreaker for, what you play and how
 * well, and your channel links. **Server-side only.**
 *
 * **Read field by field.** A row is external data: a purpose or ability the
 * lists no longer have, a style the catalogue dropped, a channel that no
 * longer parses — each is left out on its own, and the rest reads as stored.
 *
 * **Public means switched on.** {@link publicAbout} is the only function a
 * public response may call, and it returns only the fields whose switch is
 * on. A per-style ability names the style, so it is public only when both
 * _styles_ and _ability_ are.
 */

export interface AboutView {
  purposes: Purpose[];
  styles: string[];
  ability: Ability | null;
  styleAbility: Record<string, Ability>;
  channels: ChannelView[];
  public: PublicSwitches;
  /** When Home's three questions were answered or skipped; null if never. */
  askedAt: string | null;
}

/** The public part of {@link AboutView}: a field is present only when its switch is on. */
export interface PublicAbout {
  purposes?: Purpose[];
  styles?: string[];
  ability?: Ability | null;
  styleAbility?: Record<string, Ability>;
  channels?: ChannelView[];
}

const EMPTY: AboutView = {
  purposes: [],
  styles: [],
  ability: null,
  styleAbility: {},
  channels: [],
  public: { ...DEFAULT_PUBLIC },
  askedAt: null,
};

function isPurpose(v: unknown): v is Purpose {
  return PURPOSES.some((p) => p === v);
}

function isAbility(v: unknown): v is Ability {
  return ABILITIES.some((a) => a === v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function styleKeys(): Promise<Set<string>> {
  return new Set((await listStyles()).map((s) => s.key));
}

interface AboutRow {
  purposes: string[];
  styles: string[];
  ability: string | null;
  styleAbility: unknown;
  channels: unknown;
  public: unknown;
  askedAt: Date | null;
}

/** A stored row, read field by field against today's lists and catalogue. */
export function readAboutRow(row: AboutRow, known: Set<string>): AboutView {
  const styles = [...new Set(row.styles.filter((s) => known.has(s)))];
  const styleAbility: Record<string, Ability> = {};
  if (isRecord(row.styleAbility)) {
    for (const style of styles) {
      const level = row.styleAbility[style];
      if (isAbility(level)) styleAbility[style] = level;
    }
  }
  const switches: PublicSwitches = { ...DEFAULT_PUBLIC };
  if (isRecord(row.public)) {
    for (const field of PUBLIC_FIELDS) {
      const on = row.public[field];
      if (typeof on === 'boolean') switches[field] = on;
    }
  }
  return {
    purposes: [...new Set(row.purposes.filter(isPurpose))],
    styles,
    ability: isAbility(row.ability) ? row.ability : null,
    styleAbility,
    channels: readStoredChannels(row.channels),
    public: switches,
    askedAt: row.askedAt?.toISOString() ?? null,
  };
}

/** Yours, with every field present — empty where you have said nothing. */
export async function getAbout(userId: string): Promise<AboutView> {
  const [row, known] = await Promise.all([
    prisma.drummerAbout.findUnique({ where: { userId } }),
    styleKeys(),
  ]);
  return row ? readAboutRow(row, known) : structuredClone(EMPTY);
}

/**
 * Merge `input` into yours and answer the result. `input` has passed
 * `drummerAboutSchema`, so the channels are already canonical; what is left to
 * check needs the database: that each style is in the catalogue, and that a
 * per-style ability names one of your styles. Choosing fewer styles drops the
 * abilities of the ones you let go.
 */
export async function saveAbout(
  userId: string,
  input: DrummerAboutInput,
  now = new Date()
): Promise<{ about: AboutView; abilityChanged: boolean }> {
  const [current, known] = await Promise.all([getAbout(userId), styleKeys()]);

  if (input.styles) {
    const unknown = input.styles.filter((s) => !known.has(s));
    if (unknown.length) {
      throw new ValidationError('Not a style BeatBreaker has', { styles: unknown });
    }
  }
  const styles = input.styles ?? current.styles;

  if (input.styleAbility) {
    const stray = Object.keys(input.styleAbility).filter((s) => !styles.includes(s));
    if (stray.length) {
      throw new ValidationError('Choose the style before saying how well you play it', {
        styleAbility: stray,
      });
    }
  }
  const styleAbility = Object.fromEntries(
    Object.entries(input.styleAbility ?? current.styleAbility).filter(([s]) => styles.includes(s))
  );

  const ability = input.ability === undefined ? current.ability : input.ability;
  const data = {
    purposes: input.purposes ?? current.purposes,
    styles,
    ability,
    styleAbility,
    channels:
      input.channels ??
      current.channels.map(({ kind, url, drumming }) => ({ kind, url, drumming })),
    public: { ...current.public, ...input.public },
    ...(input.asked ? { askedAt: now } : {}),
  };

  const row = await prisma.drummerAbout.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return { about: readAboutRow(row, known), abilityChanged: ability !== current.ability };
}

/** Only the fields switched on — what a public response may carry. */
export function publicPart(about: AboutView): PublicAbout {
  const on = about.public;
  return {
    ...(on.purposes ? { purposes: about.purposes } : {}),
    ...(on.styles ? { styles: about.styles } : {}),
    ...(on.ability ? { ability: about.ability } : {}),
    ...(on.styles && on.ability ? { styleAbility: about.styleAbility } : {}),
    ...(on.channels ? { channels: about.channels } : {}),
  };
}

/** The public part of someone's About you, by their user id. */
export async function publicAbout(userId: string): Promise<PublicAbout> {
  return publicPart(await getAbout(userId));
}
