import { APIError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { PUBLIC } from '@/lib/app/breaks/catalogue/data';
import { usernameOf } from '@/lib/app/breaks/community/profile';
import { mintSlug } from '@/lib/app/breaks/community/slug';
import { withFreshSlug } from '@/lib/app/breaks/community/sharing';
import { readVisibility } from '@/lib/app/breaks/community/visibility';
import {
  assertRoom,
  ITEM_SELECT,
  type ItemData,
  type ItemRow,
  readableTarget,
  readShape,
  SESSION_SELECT,
  slotTarget,
  toView,
  withSplit,
} from '@/lib/app/breaks/saved/sessions';
import { bestKey, yourBests } from '@/lib/app/breaks/saved/speeds';
import { effectiveClimb, slotPlan } from '@/lib/app/practice/climb';
import { prisma } from '@/lib/db/client';
import type { PinTarget } from '@/lib/validations/pins';
import type {
  PublicSession,
  PublicSessionItem,
  SessionView,
  ShareBlocked,
  ShareState,
} from '@/lib/validations/practice-sessions';

/**
 * Sharing a practice session with a link (Phase 7D, D32): its public page,
 * `/s/<slug>`, and saving a copy of someone's.
 *
 * **Server-side only.**
 *
 * - A session can be shared only when **every** pattern in it is readable by
 *   anyone: a pattern shared by link or published, or a famous break. A
 *   refusal names the ones that are not, so the owner knows what to share
 *   first.
 * - The public read carries **no user id, account name or email** — the
 *   owner is their username, or nobody. A pattern made private after the
 *   session was shared is "no longer shared" on the page, with no title.
 * - A copy is the saver's own private session, credited to the one it came
 *   from (`parentId`). It keeps only the patterns the saver can open, and
 *   its targets are the saver's: no goals come with it, so each slot aims at
 *   the saver's best, else the pattern's tempo.
 */

/** A pattern anyone may open, signed in or not: shared, published, or a famous break. */
function readableByAnyone(item: ItemRow): boolean {
  if (item.breakRef) return readVisibility(item.breakRef.visibility) !== 'private';
  return item.libraryEntry?.library.visibility === PUBLIC.visibility;
}

/**
 * Share one of yours with a link. The slug is minted the first time and kept
 * after, so a link that stopped working when the session was unshared works
 * again when it is shared again. Null when it is not yours.
 *
 * @throws ValidationError with no patterns in it.
 * @throws APIError 409 `ITEMS_NOT_SHARED`, `details.items` naming each pattern
 *   someone else could not open.
 */
export async function shareSession(userId: string, id: string): Promise<ShareState | null> {
  const row = await prisma.practiceSession.findFirst({
    where: { id, userId },
    select: { slug: true, items: { orderBy: { position: 'asc' }, select: ITEM_SELECT } },
  });
  if (!row) return null;
  if (row.items.length === 0) {
    throw new ValidationError('Add a pattern before sharing the session', {
      items: ['No patterns yet'],
    });
  }

  const blocked: ShareBlocked = row.items
    .filter((item) => !readableByAnyone(item))
    .map((item) => {
      const target = readableTarget(item, userId);
      return {
        position: item.position,
        title: target?.title ?? item.titleSnapshot,
        reason: target ? 'private' : 'gone',
      };
    });
  if (blocked.length) {
    throw new APIError(
      blocked.length === 1
        ? `Share “${blocked[0].title}” first: someone without your account could not open it.`
        : `Share these ${blocked.length} patterns first: someone without your account could not open them.`,
      'ITEMS_NOT_SHARED',
      409,
      { items: blocked }
    );
  }

  const existing = row.slug;
  const updated = await withFreshSlug(() =>
    prisma.practiceSession.update({
      where: { id },
      data: { visibility: 'link', slug: existing ?? mintSlug() },
      select: { slug: true },
    })
  );
  return { visibility: 'link', slug: updated.slug };
}

/** Stop sharing one of yours; its address stops working. False when it is not yours. */
export async function unshareSession(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.practiceSession.updateMany({
    where: { id, userId },
    data: { visibility: 'private' },
  });
  return count > 0;
}

/**
 * A shared session as anyone reads it, or null — unshared, deleted and never
 * minted are the same null. Each pattern's target is the owner's: their goal,
 * else their best at its layer, else the pattern's tempo.
 */
export async function getPublicSession(slug: string): Promise<PublicSession | null> {
  const row = await prisma.practiceSession.findFirst({
    where: { slug, visibility: 'link' },
    select: {
      userId: true,
      slug: true,
      name: true,
      description: true,
      totalMinutes: true,
      startPct: true,
      climbPct: true,
      climbShape: true,
      climbSteps: true,
      countIn: true,
      items: { orderBy: { position: 'asc' }, select: ITEM_SELECT },
    },
  });
  if (!row?.slug) return null;

  const open = row.items.map((item) => (readableByAnyone(item) ? item : null));
  const targets = open.flatMap((item): PinTarget[] => {
    if (item?.breakRef) return [{ breakId: item.breakRef.id }];
    if (item?.libraryEntry) return [{ libraryEntryId: item.libraryEntry.id }];
    return [];
  });
  const [bests, author] = await Promise.all([
    yourBests(row.userId, targets),
    usernameOf(row.userId),
  ]);
  const session = {
    startPct: row.startPct,
    climbPct: row.climbPct,
    climbShape: readShape(row.climbShape) ?? 'steady',
    climbSteps: row.climbSteps,
  };

  const items = row.items.map((item, i): PublicSessionItem => {
    const b = open[i]?.breakRef;
    const e = open[i]?.libraryEntry;
    const pattern = b?.slug
      ? { ...b, link: { kind: 'pattern' as const, slug: b.slug }, pin: { breakId: b.id } }
      : e
        ? { ...e, link: { kind: 'entry' as const, id: e.id }, pin: { libraryEntryId: e.id } }
        : null;
    if (!pattern) return { available: false, position: item.position, minutes: item.minutes };

    const best = bests.get(bestKey(pattern.pin, item.level));
    const targetBpm = slotTarget(item.goalBpm ?? best ?? pattern.bpm, pattern.meter);
    const climb = effectiveClimb(session, {
      startPct: item.startPct,
      climbPct: item.climbPct,
      climbShape: readShape(item.climbShape),
      climbSteps: item.climbSteps,
    });
    const plan = slotPlan(item.minutes, targetBpm, climb);
    return {
      available: true,
      position: item.position,
      title: pattern.title,
      link: pattern.link,
      level: item.level,
      minutes: item.minutes,
      targetBpm,
      startBpm: plan.startBpm,
      climbPct: climb.climbPct,
      climbShape: climb.climbShape,
      climbSteps: climb.climbSteps,
    };
  });

  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    totalMinutes: row.totalMinutes,
    countIn: row.countIn,
    author,
    items,
  };
}

/**
 * Save a copy of a shared session as one of your own. A shared session that
 * is not there is a 404; past the session cap, a 429. A copy of your own
 * shared session is just a copy, credited to nobody.
 */
export async function copySharedSession(userId: string, slug: string): Promise<SessionView> {
  const source = await prisma.practiceSession.findFirst({
    where: { slug, visibility: 'link' },
    select: {
      id: true,
      userId: true,
      name: true,
      description: true,
      totalMinutes: true,
      startPct: true,
      climbPct: true,
      climbShape: true,
      climbSteps: true,
      countIn: true,
      items: { orderBy: { position: 'asc' }, select: ITEM_SELECT },
    },
  });
  if (!source) throw new NotFoundError('Practice session not found');
  await assertRoom(userId);

  const kept = source.items.flatMap((item): ItemData[] => {
    const target = readableTarget(item, userId);
    if (!target) return [];
    return [
      {
        breakId: target.kind === 'break' ? target.id : null,
        libraryEntryId: target.kind === 'entry' ? target.id : null,
        titleSnapshot: target.title.slice(0, 160),
        position: item.position,
        level: item.level,
        // the owner's goal is theirs; the copy aims at the saver's own best
        goalBpm: null,
        minutes: item.minutes,
        minutesPinned: item.minutesPinned,
        startPct: item.startPct,
        climbPct: item.climbPct,
        climbShape: item.climbShape,
        climbSteps: item.climbSteps,
      },
    ];
  });

  const row = await prisma.practiceSession.create({
    data: {
      userId,
      name: source.name,
      description: source.description,
      totalMinutes: source.totalMinutes,
      startPct: source.startPct,
      climbPct: source.climbPct,
      climbShape: source.climbShape,
      climbSteps: source.climbSteps,
      countIn: source.countIn,
      parentId: source.userId === userId ? null : source.id,
      items: kept.length
        ? { createMany: { data: withSplit(source.totalMinutes, kept) } }
        : undefined,
    },
    select: SESSION_SELECT,
  });
  return toView(row, userId);
}

/** Whether this shared session is yours — the page offers _Edit_ and _Run it_ then. */
export async function ownSharedSessionId(slug: string, userId: string): Promise<string | null> {
  const row = await prisma.practiceSession.findFirst({
    where: { slug, userId },
    select: { id: true },
  });
  return row?.id ?? null;
}
