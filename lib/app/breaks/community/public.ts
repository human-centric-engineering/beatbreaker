import type { Prisma } from '@prisma/client';

import { critique, playability } from '@/lib/app/breaks/critic';
import { type PublicAbout, publicAbout } from '@/lib/app/breaks/community/about';
import { lineageOf, type BasedOn } from '@/lib/app/breaks/community/sharing';
import { usernameProblem } from '@/lib/app/breaks/community/username';
import { readVisibility, type Visibility } from '@/lib/app/breaks/community/visibility';
import { readStoredLinks, type StoredLink } from '@/lib/app/breaks/links';
import { type SharePayload, storedPayloadSchema } from '@/lib/app/breaks/schema';
import { breakDocFromPayload } from '@/lib/app/breaks/share';
import { prisma } from '@/lib/db/client';

/**
 * What anyone may read about shared and published patterns (Phase 6, task
 * 6.5) — the one data layer behind `/api/v1/public/patterns`, `/p/[slug]`,
 * `/explore` and `/u/[username]`, so the pages and the API cannot disagree
 * about what is public.
 *
 * **Server-side only.**
 *
 * **Nothing here returns a user id, an account name or an email.** A row's
 * `userId` is read only to look up the username, and dropped before anything
 * leaves this module. Authors are usernames (D3), or nobody.
 */

/** How many a page of the library holds, at most. */
export const PUBLIC_PAGE_MAX = 48;
export const PUBLIC_PAGE_DEFAULT = 24;

/** Tempo bands for the library's filter: slow < 90, medium 90–120, fast > 120. */
export const TEMPO_BANDS = {
  slow: { lt: 90 },
  medium: { gte: 90, lte: 120 },
  fast: { gt: 120 },
} as const;
export type TempoBand = keyof typeof TEMPO_BANDS;

export type PublicSort = 'newest' | 'saved';

export interface PublicListQuery {
  /** Words in the title. */
  q?: string;
  style?: string;
  meter?: string;
  tempo?: TempoBand;
  difficulty?: 1 | 2 | 3;
  /** Only this username's patterns — `/u/[username]`. */
  username?: string;
  sort: PublicSort;
  limit: number;
  /** Opaque: where the last page ended. */
  cursor?: string;
}

/** One card in the library. */
export interface PublicPatternCard {
  /**
   * The pattern's own id — never its owner's. A signed-in client opens a
   * pattern in the Studio by id; anyone who can see the card could open it by
   * slug anyway, so the id reveals nothing more.
   */
  id: string;
  slug: string;
  title: string;
  description: string | null;
  style: string;
  meter: string;
  bpm: number;
  level: number;
  difficulty: number | null;
  /** Which kinds of reference link it carries — the card shows icons, never the links. */
  linkKinds: Array<StoredLink['kind']>;
  publishedAt: string | null;
  author: string | null;
  /** How many people saved a copy — "most saved". */
  saves: number;
}

/** One pattern, whole. */
export interface PublicPattern extends Omit<PublicPatternCard, 'linkKinds'> {
  visibility: Exclude<Visibility, 'private'>;
  links: StoredLink[];
  doc: SharePayload;
  basedOn: BasedOn | null;
  critique: { score: number; verdict: string; playable: boolean };
  updatedAt: string;
}

const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  style: true,
  meter: true,
  bpm: true,
  level: true,
  difficulty: true,
  links: true,
  publishedAt: true,
  userId: true,
  _count: { select: { children: true } },
} as const satisfies Prisma.BreakSelect;

type CardRow = Prisma.BreakGetPayload<{ select: typeof CARD_SELECT }>;

/**
 * Usernames for a page of rows, in one query — never one per row.
 * A row whose owner has no profile has no author.
 */
async function usernamesOf(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)];
  if (!unique.length) return new Map();
  const profiles = await prisma.drummerProfile.findMany({
    where: { userId: { in: unique } },
    select: { userId: true, username: true },
  });
  return new Map(profiles.map((p) => [p.userId, p.username]));
}

function toCard(row: CardRow, authors: Map<string, string>): PublicPatternCard {
  return {
    id: row.id,
    slug: row.slug ?? '',
    title: row.title,
    description: row.description,
    style: row.style,
    meter: row.meter,
    bpm: row.bpm,
    level: row.level,
    difficulty: row.difficulty,
    linkKinds: readStoredLinks(row.links).map((l) => l.kind),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    author: authors.get(row.userId) ?? null,
    saves: row._count.children,
  };
}

/* The cursor is an offset, base64url'd so a client treats it as opaque. An
   offset rather than a keyset because "most saved" orders by a count, which no
   keyset can hold; one kind of cursor for both sorts keeps the client simple.
   A published pattern that appears between two pages can repeat a card —
   acceptable for a browsing list. */
export function readCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  let n = NaN;
  try {
    n = Number(atob(cursor.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    // not base64 at all: the first page
  }
  return Number.isInteger(n) && n > 0 && n < 100_000 ? n : 0;
}

export function writeCursor(offset: number): string {
  return btoa(String(offset)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Where a published list starts: only published rows with an address. */
function listWhere(
  q: Partial<PublicListQuery>,
  userId?: string,
  parentId?: string
): Prisma.BreakWhereInput {
  return {
    visibility: 'published',
    slug: { not: null },
    // a variation by someone else, or by the original's own author
    ...(parentId ? { OR: [{ parentId }, { ownParentId: parentId }] } : {}),
    ...(q.q ? { title: { contains: q.q, mode: 'insensitive' as const } } : {}),
    ...(q.style ? { style: q.style } : {}),
    ...(q.meter ? { meter: q.meter } : {}),
    ...(q.tempo ? { bpm: TEMPO_BANDS[q.tempo] } : {}),
    ...(q.difficulty ? { difficulty: q.difficulty } : {}),
    ...(userId ? { userId } : {}),
  };
}

const ORDER: Record<PublicSort, Prisma.BreakOrderByWithRelationInput[]> = {
  newest: [{ publishedAt: 'desc' }, { id: 'desc' }],
  saved: [{ children: { _count: 'desc' } }, { publishedAt: 'desc' }, { id: 'desc' }],
};

/** One page of cards, in order, with the cursor to the next. */
async function readPage(
  where: Prisma.BreakWhereInput,
  q: Pick<PublicListQuery, 'sort' | 'limit' | 'cursor'>
): Promise<{ patterns: PublicPatternCard[]; nextCursor: string | null }> {
  const offset = readCursor(q.cursor);
  const rows = await prisma.break.findMany({
    where,
    select: CARD_SELECT,
    orderBy: ORDER[q.sort],
    skip: offset,
    // one extra row says whether there is a next page, without a count
    take: q.limit + 1,
  });
  const hasMore = rows.length > q.limit;
  const page = hasMore ? rows.slice(0, q.limit) : rows;
  const authors = await usernamesOf(page.map((r) => r.userId));

  return {
    patterns: page.map((r) => toCard(r, authors)),
    nextCursor: hasMore ? writeCursor(offset + q.limit) : null,
  };
}

/**
 * A page of the community library. Only `published` patterns — a link share
 * is never listed. `username` narrows it to one drummer; an unknown username
 * is an empty page, and the caller decides whether that is a 404.
 */
export async function listPublished(
  q: PublicListQuery
): Promise<{ patterns: PublicPatternCard[]; nextCursor: string | null }> {
  let userId: string | undefined;
  if (q.username) {
    const profile = await prisma.drummerProfile.findUnique({
      where: { username: q.username.toLowerCase() },
      select: { userId: true },
    });
    if (!profile) return { patterns: [], nextCursor: null };
    userId = profile.userId;
  }

  return readPage(listWhere(q, userId), q);
}

/**
 * The published variations of a published pattern (7A) — its direct children
 * only, so a variation of a variation is listed under its own parent. `null`
 * when the address is not a published pattern: a link share's copies are
 * plain copies, not variations (they carry no credit), so it has no list.
 */
export async function listVariations(
  slug: string,
  q: Pick<PublicListQuery, 'sort' | 'limit' | 'cursor'>
): Promise<{ patterns: PublicPatternCard[]; nextCursor: string | null } | null> {
  const parent = await prisma.break.findFirst({
    where: { slug, visibility: 'published' },
    select: { id: true },
  });
  if (!parent) return null;

  return readPage(listWhere({}, undefined, parent.id), q);
}

/**
 * One shared or published pattern, by its address. `null` for a private one,
 * a slug that was never minted, or one whose pattern was deleted — the same
 * answer for all three, so the address space cannot be probed.
 */
export async function getPublicPattern(slug: string): Promise<PublicPattern | null> {
  const row = await prisma.break.findFirst({
    where: { slug, visibility: { in: ['link', 'published'] } },
    select: {
      ...CARD_SELECT,
      visibility: true,
      doc: true,
      parentId: true,
      ownParentId: true,
      updatedAt: true,
    },
  });
  if (!row) return null;

  const payload = storedPayloadSchema.parse(row.doc);
  const doc = breakDocFromPayload(payload);
  const report = critique(doc.A, doc.bpm);
  const checks = playability(doc.A, doc.bpm);
  const [authors, basedOn] = await Promise.all([
    usernamesOf([row.userId]),
    lineageOf(row.parentId ?? row.ownParentId),
  ]);
  const { linkKinds: _kinds, ...card } = toCard(row, authors);
  const visibility = readVisibility(row.visibility);

  return {
    ...card,
    visibility: visibility === 'private' ? 'link' : visibility,
    links: readStoredLinks(row.links),
    doc: payload,
    basedOn,
    critique: { score: report.score, verdict: report.verdict, playable: checks.hard },
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** A drummer as anyone may see them: the username, the bio, and the About-you fields they switched on. */
export interface PublicDrummer extends PublicAbout {
  username: string;
  bio: string | null;
}

/**
 * A drummer's public page (Phase 6, task 6.8; Phase 7B): their username and
 * bio, and the public part of About you. Never the user id, which is read here only to
 * find their About-you row. Null if nobody has the username, or if it is not
 * the shape a username can be.
 */
export async function getPublicDrummer(username: string): Promise<PublicDrummer | null> {
  if (usernameProblem(username) === 'shape') return null;
  const profile = await prisma.drummerProfile.findUnique({
    where: { username: username.toLowerCase() },
    select: { userId: true, username: true, bio: true },
  });
  if (!profile) return null;
  return { username: profile.username, bio: profile.bio, ...(await publicAbout(profile.userId)) };
}

/**
 * Every published address and every drummer with something published — the
 * sitemap's rows. Capped, since a sitemap file holds 50,000 at most.
 */
export async function publishedForSitemap(): Promise<{
  patterns: Array<{ slug: string; updatedAt: Date }>;
  usernames: string[];
}> {
  const rows = await prisma.break.findMany({
    where: { visibility: 'published', slug: { not: null } },
    select: { slug: true, updatedAt: true, userId: true },
    orderBy: { publishedAt: 'desc' },
    take: 40_000,
  });
  const authors = await usernamesOf(rows.map((r) => r.userId));
  return {
    patterns: rows.flatMap((r) => (r.slug ? [{ slug: r.slug, updatedAt: r.updatedAt }] : [])),
    usernames: [...new Set(authors.values())],
  };
}

/**
 * The internal id behind a public address — for a signed-in reader's _Save a
 * copy_ and _Open in the editor_, which work by id. Only for a pattern that
 * is shared or published, which a signed-in reader could open by id anyway.
 */
export async function openableIdForSlug(slug: string): Promise<string | null> {
  const row = await prisma.break.findFirst({
    where: { slug, visibility: { in: ['link', 'published'] } },
    select: { id: true },
  });
  return row?.id ?? null;
}
