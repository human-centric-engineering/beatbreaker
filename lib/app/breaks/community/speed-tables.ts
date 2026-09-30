import { PUBLIC } from '@/lib/app/breaks/catalogue/data';
import { gridHash, sectionHash } from '@/lib/app/breaks/community/grid';
import { readCursor, writeCursor } from '@/lib/app/breaks/community/public';
import { readStoredVideo, type VideoLink } from '@/lib/app/breaks/community/video-links';
import { packedPatternSchema, storedPayloadSchema } from '@/lib/app/breaks/schema';
import { breakDocFromPayload, patternFromPacked } from '@/lib/app/breaks/share';
import { prisma } from '@/lib/db/client';
import type { PinTarget } from '@/lib/validations/pins';
import type { SpeedPlace, SpeedTableQuery } from '@/lib/validations/speeds';

/**
 * The speed tables (Phase 7C): one row per drummer — their best at a layer —
 * on a target everyone can see, a published pattern or a famous break.
 *
 * **Server-side only.** Like `public.ts`, nothing here returns a user id. A
 * row is a username, a tempo, a date and a video link.
 *
 * **Who is on a table.** A record is listed when it is `listed`, its drummer
 * has a username, and it is on the notes the target has now — its `gridHash`
 * matches. A published pattern's notes are fixed (7A), so its records always
 * match; a famous break's can be corrected by an admin, and records on the
 * old notes drop off. The tables are read from live rows, so an erased
 * drummer, or an unlisted record, is gone on the next read.
 *
 * **Order.** Highest tempo first; on a tie, whoever got there first.
 */

/** A target with a public table, as the tables need it. */
export interface TableTarget {
  target: PinTarget;
  /** The notes a record must be on to be listed. */
  hash: string;
}

/**
 * A pattern's notes hash: the `gridHash` column, or worked out from the
 * document on a row written before Phase 6 filled it.
 */
export async function breakHash(row: { gridHash: string | null; doc: unknown }): Promise<string> {
  if (row.gridHash) return row.gridHash;
  return gridHash(breakDocFromPayload(storedPayloadSchema.parse(row.doc)));
}

/**
 * A library entry's notes hash. An entry holds one section — the B section
 * is derived when it opens — so this is that section's hash.
 */
export function entryHash(doc: unknown): Promise<string> {
  return sectionHash(patternFromPacked(packedPatternSchema.parse(doc)));
}

/** A published pattern's table, by its address. Null when it is not published. */
export async function patternTableTarget(slug: string): Promise<TableTarget | null> {
  const row = await prisma.break.findFirst({
    where: { slug, visibility: 'published' },
    select: { id: true, gridHash: true, doc: true },
  });
  return row ? { target: { breakId: row.id }, hash: await breakHash(row) } : null;
}

/** A famous break's table. Null when it is not in a library everyone can see. */
export async function entryTableTarget(id: string): Promise<TableTarget | null> {
  const row = await prisma.libraryEntry.findFirst({
    where: { id, library: PUBLIC },
    select: { id: true, doc: true },
  });
  return row ? { target: { libraryEntryId: row.id }, hash: await entryHash(row.doc) } : null;
}

/** One row of a table. */
export interface SpeedTableRow {
  /** The record's id — what a report names. */
  id: string;
  position: number;
  username: string;
  bpm: number;
  recordedAt: string;
  video: VideoLink | null;
}

/**
 * The target as two bound parameters, one of them null. A column name can't
 * be a parameter, and `lib/app` builds no SQL fragments, so the query names
 * both columns and the null one matches nothing (`= NULL` is never true).
 */
function targetIds(target: PinTarget): { breakId: string | null; entryId: string | null } {
  return 'breakId' in target
    ? { breakId: target.breakId, entryId: null }
    : { breakId: null, entryId: target.libraryEntryId };
}

/**
 * One page of a table at one layer. `video` narrows it to records with a
 * video link — each drummer's best video-backed record, not their best
 * record if it happens to have one.
 *
 * One query: `DISTINCT ON` picks each drummer's best, the join to
 * `drummer_profile` keeps only drummers with a username, and the window count
 * is the table's length before the page is cut. Prisma's `distinct` would do
 * the first step in memory, over every row.
 */
export async function readSpeedTable(
  { target, hash }: TableTarget,
  q: SpeedTableQuery
): Promise<{ rows: SpeedTableRow[]; total: number; nextCursor: string | null }> {
  const offset = readCursor(q.cursor);
  const { breakId, entryId } = targetIds(target);
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      bpm: number;
      recordedAt: Date;
      videoUrl: string | null;
      username: string;
      total: bigint;
    }>
  >`
    WITH best AS (
      SELECT DISTINCT ON (r."userId") r."id", r."userId", r."bpm", r."recordedAt", r."videoUrl"
      FROM "speed_record" r
      WHERE (r."breakId" = ${breakId}::text OR r."libraryEntryId" = ${entryId}::text)
        AND r."level" = ${q.level}
        AND r."listed"
        AND r."gridHash" = ${hash}
        AND (NOT ${q.video}::boolean OR r."videoUrl" IS NOT NULL)
      ORDER BY r."userId", r."bpm" DESC, r."recordedAt" ASC, r."id" ASC
    )
    SELECT b."id", b."bpm", b."recordedAt", b."videoUrl", p."username",
           count(*) OVER () AS "total"
    FROM best b
    JOIN "drummer_profile" p ON p."userId" = b."userId"
    ORDER BY b."bpm" DESC, b."recordedAt" ASC, b."id" ASC
    LIMIT ${q.limit + 1} OFFSET ${offset}
  `;
  const hasMore = rows.length > q.limit;
  const page = hasMore ? rows.slice(0, q.limit) : rows;
  return {
    rows: page.map((r, i) => ({
      id: r.id,
      position: offset + i + 1,
      username: r.username,
      bpm: r.bpm,
      recordedAt: r.recordedAt.toISOString(),
      video: readStoredVideo(r.videoUrl),
    })),
    total: Number(rows[0]?.total ?? 0),
    nextCursor: hasMore ? writeCursor(offset + q.limit) : null,
  };
}

/**
 * Where one drummer's best sits on a target's table, at every layer they are
 * on it — "you're 3rd of 41 at layer 2". The same rules as the table, in one
 * query. Nothing for a drummer with no username: they are on no table.
 */
export async function placesOn(
  { target, hash }: TableTarget,
  userId: string
): Promise<SpeedPlace[]> {
  const { breakId, entryId } = targetIds(target);
  const rows = await prisma.$queryRaw<Array<{ level: number; position: bigint; of: bigint }>>`
    WITH best AS (
      SELECT DISTINCT ON (r."userId", r."level") r."id", r."userId", r."level", r."bpm", r."recordedAt"
      FROM "speed_record" r
      WHERE (r."breakId" = ${breakId}::text OR r."libraryEntryId" = ${entryId}::text)
        AND r."listed"
        AND r."gridHash" = ${hash}
      ORDER BY r."userId", r."level", r."bpm" DESC, r."recordedAt" ASC, r."id" ASC
    ), ranked AS (
      SELECT b."userId", b."level",
             row_number() OVER (PARTITION BY b."level" ORDER BY b."bpm" DESC, b."recordedAt" ASC, b."id" ASC) AS "position",
             count(*) OVER (PARTITION BY b."level") AS "of"
      FROM best b
      JOIN "drummer_profile" p ON p."userId" = b."userId"
    )
    SELECT "level", "position", "of" FROM ranked WHERE "userId" = ${userId} ORDER BY "level"
  `;
  return rows.map((r) => ({ level: r.level, position: Number(r.position), of: Number(r.of) }));
}

/** One of a drummer's listed bests, for their public page. */
export interface ListedBest {
  title: string;
  /** The published pattern's address; null for a famous break, which has no page. */
  slug: string | null;
  level: number;
  bpm: number;
  recordedAt: string;
  video: VideoLink | null;
}

/** How many a drummer's page shows. */
export const LISTED_BESTS_MAX = 24;

/**
 * A drummer's listed bests, by their username — what `/u/[username]` shows.
 * Empty for a username nobody has; the page has already 404ed on that.
 */
export async function listedBestsFor(username: string): Promise<ListedBest[]> {
  const profile = await prisma.drummerProfile.findUnique({
    where: { username: username.toLowerCase() },
    select: { userId: true },
  });
  return profile ? listedBests(profile.userId) : [];
}

/**
 * A drummer's listed bests (their page, `/u/[username]`): their best per
 * target and layer, on every target whose table they are on, newest first.
 * The same rules as a table — listed, on a public target, on its current
 * notes — so the page never shows a record the table would not.
 *
 * Read in two queries and filtered here rather than in SQL, because a famous
 * break's current hash is worked out from its document, not stored.
 */
export async function listedBests(userId: string): Promise<ListedBest[]> {
  const records = await prisma.speedRecord.findMany({
    where: {
      userId,
      listed: true,
      OR: [
        { breakRef: { visibility: 'published', slug: { not: null } } },
        { libraryEntry: { library: PUBLIC } },
      ],
    },
    orderBy: [{ bpm: 'desc' }, { recordedAt: 'asc' }, { id: 'asc' }],
    take: 2000,
    select: {
      level: true,
      bpm: true,
      recordedAt: true,
      videoUrl: true,
      gridHash: true,
      breakRef: { select: { id: true, title: true, slug: true, gridHash: true, doc: true } },
      libraryEntry: { select: { id: true, title: true, doc: true } },
    },
  });

  const hashes = new Map<string, Promise<string>>();
  const current = (key: string, work: () => Promise<string>) => {
    let h = hashes.get(key);
    if (!h) {
      h = work();
      hashes.set(key, h);
    }
    return h;
  };

  const seen = new Set<string>();
  const out: ListedBest[] = [];
  // best first, so the first record seen per target and layer is the best
  for (const r of records) {
    const b = r.breakRef;
    const e = r.libraryEntry;
    const key = b ? `break:${b.id}` : e ? `entry:${e.id}` : null;
    if (!key || seen.has(`${key}:${r.level}`)) continue;
    const hash = await current(key, () => (b ? breakHash(b) : entryHash(e?.doc)));
    if (hash !== r.gridHash) continue;
    seen.add(`${key}:${r.level}`);
    out.push({
      title: b?.title ?? e?.title ?? '',
      slug: b?.slug ?? null,
      level: r.level,
      bpm: r.bpm,
      recordedAt: r.recordedAt.toISOString(),
      video: readStoredVideo(r.videoUrl),
    });
  }
  return out.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).slice(0, LISTED_BESTS_MAX);
}
