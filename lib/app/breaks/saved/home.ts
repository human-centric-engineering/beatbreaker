import type { Prisma } from '@prisma/client';

import { type Engraving, engrave } from '@/lib/app/breaks/engrave';
import { FULL_LAYER, reducePattern } from '@/lib/app/breaks/layers';
import { packedPatternSchema, storedPayloadSchema } from '@/lib/app/breaks/schema';
import { listHistory, type PracticeVisitView } from '@/lib/app/breaks/saved/history';
import {
  TARGET_SELECT,
  type TargetView,
  toTargetView,
  visibleTarget,
} from '@/lib/app/breaks/saved/targets';
import { patternFromPacked } from '@/lib/app/breaks/share';
import { logger } from '@/lib/logging';
import { prisma } from '@/lib/db/client';

/**
 * Home (task 4.9): what you are practising, what you opened lately, and
 * whether you have saved anything at all.
 *
 * **Server-side only**, like the rest of `saved/`. `GET /api/v1/home` and the
 * `/dashboard` page both call {@link readHome}, so a native client (D14) gets
 * the same cards the web page draws.
 *
 * **One read, no per-card fetch.** The Practising shelf comes back with each
 * target's document, and the thumbnails are engraved here from it — the
 * engraver returns a plain node tree, so it runs on the server and the page
 * draws what it is given. Three queries run side by side (shelf, history,
 * saved count); none of them is per row.
 */

/** How many history items Home lists — the drawer's Recent holds the rest. */
export const HOME_RECENT = 8;

/** How many bars a thumbnail shows. Enough to recognise the groove, small enough for a card. */
const THUMB_BARS = 2;
const THUMB_SCALE = 0.55;

export interface HomeCard {
  pinId: string;
  target: TargetView;
  /** The layer and tempo it opens at — where you left it. */
  level: number;
  bpm: number;
  /** When you last opened it; null when it was pinned but never opened. */
  lastOpenedAt: Date | null;
  /** The first bars, engraved. Null when the stored document will not read. */
  thumbnail: Engraving | null;
}

export interface HomeView {
  practising: HomeCard[];
  recent: PracticeVisitView[];
  /** How many patterns you have saved — tells a first visit from an empty shelf. */
  savedCount: number;
  /** Your published patterns, newest first (Phase 6) — what the community sees of you. */
  published: PublishedItem[];
  /**
   * Whether to offer the three About-you questions (Phase 7B): until you
   * answer or skip them, or save About you in Settings, which sends `asked`
   * as well. A row with purposes, styles or ability set counts as answered.
   */
  askAbout: boolean;
}

/** One of your published patterns, as Home lists it. */
export interface PublishedItem {
  id: string;
  slug: string;
  title: string;
  style: string;
  bpm: number;
  publishedAt: string;
  /** How many people saved a copy. */
  saves: number;
  /** How many of those are published variations, listed on its page (7A). */
  variations: number;
}

/** How many published patterns Home shows. */
export const HOME_PUBLISHED = 12;

const CARD_SELECT = {
  id: true,
  breakRef: { select: { ...TARGET_SELECT.breakRef.select, doc: true } },
  libraryEntry: { select: { ...TARGET_SELECT.libraryEntry.select, doc: true } },
} as const satisfies Prisma.PinSelect;

type CardRow = Prisma.PinGetPayload<{ select: typeof CARD_SELECT }>;

/**
 * The first bars of a stored document at a layer, engraved small.
 *
 * A saved pattern's `doc` is a whole share payload and a library entry's is
 * one packed section; either reads through the schema it was stored under.
 * A row that does not read gets no thumbnail rather than failing the page.
 */
export function thumbnailOf(
  doc: Prisma.JsonValue,
  kind: TargetView['kind'],
  level: number
): Engraving | null {
  let packed;
  if (kind === 'break') {
    const payload = storedPayloadSchema.safeParse(doc);
    packed = payload.success ? payload.data.A : null;
  } else {
    const entry = packedPatternSchema.safeParse(doc);
    packed = entry.success ? entry.data : null;
  }
  if (!packed) return null;

  const full = patternFromPacked(packed);
  const shown = reducePattern({ ...full, bars: full.bars.slice(0, THUMB_BARS) }, level);
  return engrave(shown, null, { scale: THUMB_SCALE, perSystem: THUMB_BARS });
}

function withoutDoc<T extends { doc: Prisma.JsonValue }>({
  doc: _doc,
  ...rest
}: T): Omit<T, 'doc'> {
  return rest;
}

function toCard(
  row: CardRow,
  userId: string,
  visits: Map<string, PracticeVisitView>
): HomeCard | null {
  /* The document is read for the thumbnail and goes no further: `toTargetView`
     spreads what it is given, and a card is not the way to fetch a pattern. */
  const { breakRef, libraryEntry } = row;
  const doc = breakRef?.doc ?? libraryEntry?.doc;
  const target = toTargetView(
    {
      breakRef: breakRef && withoutDoc(breakRef),
      libraryEntry: libraryEntry && withoutDoc(libraryEntry),
    },
    userId
  );
  if (!target || doc === undefined) return null;

  const visit = visits.get(`${target.kind}:${target.id}`);
  /* Your own pattern autosaves its layer and tempo, so its row is where you
     left it; anything else is where the last visit left it, or its own
     defaults when it has never been opened. */
  const place =
    target.kind === 'break' && target.mine
      ? { level: target.level, bpm: target.bpm }
      : visit
        ? { level: visit.level, bpm: visit.bpm }
        : { level: target.kind === 'break' ? target.level : FULL_LAYER, bpm: target.bpm };

  let thumbnail: Engraving | null = null;
  try {
    thumbnail = thumbnailOf(doc, target.kind, place.level);
  } catch (err) {
    logger.warn('Home thumbnail could not be engraved', {
      kind: target.kind,
      id: target.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    pinId: row.id,
    target,
    ...place,
    lastOpenedAt: visit?.visitedAt ?? null,
    thumbnail,
  };
}

export async function readHome(userId: string): Promise<HomeView> {
  const [rows, history, savedCount, publishedRows, about] = await Promise.all([
    prisma.pin.findMany({
      where: { userId, shelf: 'practising', ...visibleTarget(userId) },
      select: CARD_SELECT,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    }),
    listHistory(userId),
    prisma.break.count({ where: { userId } }),
    prisma.break.findMany({
      where: { userId, visibility: 'published', slug: { not: null } },
      select: {
        id: true,
        slug: true,
        title: true,
        style: true,
        bpm: true,
        publishedAt: true,
        _count: { select: { children: true } },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: HOME_PUBLISHED,
    }),
    prisma.drummerAbout.findUnique({
      where: { userId },
      select: { askedAt: true, purposes: true, styles: true, ability: true },
    }),
  ]);
  const askAbout =
    !about ||
    (about.askedAt === null && !about.purposes.length && !about.styles.length && !about.ability);

  /* Published variations per pattern, for the whole section at once — other
     people's (`parentId`) and your own (`ownParentId`), one grouped query
     each. `_count` above counts every copy by someone else, and cannot count
     the same relation twice. */
  const ids = publishedRows.map((r) => r.id);
  const [byOthers, byYou] = ids.length
    ? await Promise.all([
        prisma.break.groupBy({
          by: ['parentId'],
          where: { parentId: { in: ids }, visibility: 'published' },
          _count: { _all: true },
        }),
        prisma.break.groupBy({
          by: ['ownParentId'],
          where: { ownParentId: { in: ids }, visibility: 'published' },
          _count: { _all: true },
        }),
      ])
    : [[], []];
  const variations = new Map<string, number>();
  for (const [id, n] of [
    ...byOthers.map((v) => [v.parentId, v._count._all] as const),
    ...byYou.map((v) => [v.ownParentId, v._count._all] as const),
  ]) {
    if (id) variations.set(id, (variations.get(id) ?? 0) + n);
  }

  const visits = new Map(history.map((v) => [`${v.target.kind}:${v.target.id}`, v]));
  const practising = rows.flatMap((row) => toCard(row, userId, visits) ?? []);

  const published = publishedRows.flatMap((r) =>
    r.slug && r.publishedAt
      ? [
          {
            id: r.id,
            slug: r.slug,
            title: r.title,
            style: r.style,
            bpm: r.bpm,
            publishedAt: r.publishedAt.toISOString(),
            saves: r._count.children,
            variations: variations.get(r.id) ?? 0,
          },
        ]
      : []
  );

  return {
    practising,
    recent: history.slice(0, HOME_RECENT),
    savedCount,
    published,
    askAbout,
  };
}
