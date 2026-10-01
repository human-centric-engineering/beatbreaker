import type { Prisma } from '@prisma/client';

import { APIError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { maxBpm } from '@/lib/app/breaks/audio/transport';
import { PUBLIC } from '@/lib/app/breaks/catalogue/data';
import { openableBy, readVisibility } from '@/lib/app/breaks/community/visibility';
import { bestKey, yourBests } from '@/lib/app/breaks/saved/speeds';
import {
  type ClimbShape,
  CLIMB_SHAPES,
  effectiveClimb,
  PRACTICE_BPM_MIN,
  slotPlan,
} from '@/lib/app/practice/climb';
import { splitMinutes } from '@/lib/app/practice/split';
import { prisma } from '@/lib/db/client';
import type { PinTarget } from '@/lib/validations/pins';
import {
  type CreateSessionInput,
  type ItemInput,
  type SessionItemView,
  type SessionSummary,
  type SessionView,
  type UpdateSessionInput,
} from '@/lib/validations/practice-sessions';

/**
 * Your practice sessions (Phase 7D): a timed run through patterns, each
 * climbing from below its target to the target and holding it (D30), in a
 * total time shared between them (D31).
 *
 * **Server-side only.** Every read and write is scoped to the caller: someone
 * else's session is a 404, the same as one that does not exist. The split of
 * the minutes is worked out here on every write, so what is stored always adds
 * up, whatever a client sent. An item's target is checked visible to the
 * caller when it is added, by the rule opening it applies.
 */

/** Sessions one person may have. */
export const SESSIONS_MAX = 100;

const ITEM_SELECT = {
  id: true,
  position: true,
  breakId: true,
  libraryEntryId: true,
  titleSnapshot: true,
  level: true,
  goalBpm: true,
  minutes: true,
  minutesPinned: true,
  startPct: true,
  climbPct: true,
  climbShape: true,
  climbSteps: true,
  breakRef: {
    select: {
      id: true,
      userId: true,
      title: true,
      meter: true,
      bpm: true,
      visibility: true,
      slug: true,
    },
  },
  libraryEntry: {
    select: {
      id: true,
      title: true,
      meter: true,
      bpm: true,
      library: { select: { visibility: true } },
    },
  },
} as const satisfies Prisma.PracticeSessionItemSelect;

const SESSION_SELECT = {
  id: true,
  name: true,
  description: true,
  totalMinutes: true,
  startPct: true,
  climbPct: true,
  climbShape: true,
  climbSteps: true,
  countIn: true,
  visibility: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
  items: { orderBy: { position: 'asc' }, select: ITEM_SELECT },
} as const satisfies Prisma.PracticeSessionSelect;

type ItemRow = Prisma.PracticeSessionItemGetPayload<{ select: typeof ITEM_SELECT }>;
type SessionRow = Prisma.PracticeSessionGetPayload<{ select: typeof SESSION_SELECT }>;

function readShape(value: string | null): ClimbShape | null {
  return CLIMB_SHAPES.find((s) => s === value) ?? null;
}

/** An item's pattern, if the caller may still open it — the rule `openableBy` and `PUBLIC` apply. */
function readableTarget(row: ItemRow, userId: string): SessionItemView['target'] {
  const b = row.breakRef;
  if (b && (b.userId === userId || readVisibility(b.visibility) !== 'private')) {
    return {
      kind: 'break',
      id: b.id,
      title: b.title,
      meter: b.meter,
      bpm: b.bpm,
      mine: b.userId === userId,
      // the address only while it works for someone else too
      slug: readVisibility(b.visibility) === 'private' ? null : b.slug,
    };
  }
  const e = row.libraryEntry;
  if (e && e.library.visibility === PUBLIC.visibility) {
    return { kind: 'entry', id: e.id, title: e.title, meter: e.meter, bpm: e.bpm };
  }
  return null;
}

function pinTargetOf(target: NonNullable<SessionItemView['target']>): PinTarget {
  return target.kind === 'break' ? { breakId: target.id } : { libraryEntryId: target.id };
}

async function toView(row: SessionRow, userId: string): Promise<SessionView> {
  const targets = row.items.map((item) => readableTarget(item, userId));
  const bests = await yourBests(
    userId,
    targets.flatMap((t) => (t ? [pinTargetOf(t)] : []))
  );
  const session = {
    startPct: row.startPct,
    climbPct: row.climbPct,
    climbShape: readShape(row.climbShape) ?? 'steady',
    climbSteps: row.climbSteps,
  };

  const items = row.items.map((item, i): SessionItemView => {
    const target = targets[i];
    const overrides = {
      startPct: item.startPct,
      climbPct: item.climbPct,
      climbShape: readShape(item.climbShape),
      climbSteps: item.climbSteps,
    };
    const bestBpm = target ? (bests.get(bestKey(pinTargetOf(target), item.level)) ?? null) : null;
    // a pattern may be saved at any tempo, but a run logs only what a speed
    // record allows, so the target is kept inside that range
    const targetBpm = target
      ? Math.min(
          maxBpm(target.meter),
          Math.max(PRACTICE_BPM_MIN, item.goalBpm ?? bestBpm ?? target.bpm)
        )
      : null;
    const plan =
      targetBpm === null
        ? null
        : slotPlan(item.minutes, targetBpm, effectiveClimb(session, overrides));
    return {
      id: item.id,
      position: item.position,
      target,
      // the pattern's name now, while it can be seen; what it was called, once not
      title: target?.title ?? item.titleSnapshot,
      level: item.level,
      minutes: item.minutes,
      minutesPinned: item.minutesPinned,
      goalBpm: item.goalBpm,
      bestBpm,
      targetBpm,
      startBpm: plan?.startBpm ?? null,
      ...overrides,
    };
  });

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    totalMinutes: row.totalMinutes,
    ...session,
    countIn: row.countIn,
    visibility: row.visibility === 'link' ? 'link' : 'private',
    slug: row.visibility === 'link' ? row.slug : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items,
  };
}

/** What a new item needs to know about its pattern, if the caller may see it. */
interface Resolved {
  title: string;
  meter: string;
}

/**
 * The new items' patterns, each checked visible to the caller. One that is
 * not — or does not exist — is a 404 for the whole write, so an id cannot be
 * probed by adding it to a session.
 */
async function resolveTargets(
  userId: string,
  targets: readonly PinTarget[]
): Promise<Map<string, Resolved>> {
  const breakIds = [...new Set(targets.flatMap((t) => ('breakId' in t ? [t.breakId] : [])))];
  const entryIds = [
    ...new Set(targets.flatMap((t) => ('libraryEntryId' in t ? [t.libraryEntryId] : []))),
  ];
  const [breaks, entries] = await Promise.all([
    breakIds.length
      ? prisma.break.findMany({
          where: { id: { in: breakIds }, ...openableBy(userId) },
          select: { id: true, title: true, meter: true },
        })
      : [],
    entryIds.length
      ? prisma.libraryEntry.findMany({
          where: { id: { in: entryIds }, library: PUBLIC },
          select: { id: true, title: true, meter: true },
        })
      : [],
  ]);
  if (breaks.length !== breakIds.length || entries.length !== entryIds.length) {
    throw new NotFoundError('Pattern not found');
  }
  const resolved = new Map<string, Resolved>();
  for (const b of breaks) resolved.set(`b:${b.id}`, b);
  for (const e of entries) resolved.set(`e:${e.id}`, e);
  return resolved;
}

function targetKey(target: PinTarget): string {
  return 'breakId' in target ? `b:${target.breakId}` : `e:${target.libraryEntryId}`;
}

function goalTooFast(goalBpm: number | null, meter: string, index: number): void {
  if (goalBpm === null) return;
  const ceiling = maxBpm(meter);
  if (goalBpm > ceiling) {
    throw new ValidationError(`A goal is at most ${ceiling} bpm in this pattern's meter`, {
      [`items.${index}.goalBpm`]: [`At most ${ceiling}`],
    });
  }
}

function fitsTotal(count: number, totalMinutes: number): void {
  if (count > totalMinutes) {
    throw new ValidationError(`${count} patterns need at least ${count} minutes — a minute each`, {
      totalMinutes: [`At least ${count}`],
    });
  }
}

/** The stored columns of each item, in order, with the minutes split (D31). */
type ItemData = Omit<Prisma.PracticeSessionItemCreateManyInput, 'sessionId'>;

function withSplit(totalMinutes: number, items: ItemData[]): ItemData[] {
  const split = splitMinutes(
    totalMinutes,
    items.map((i) => ({ minutes: i.minutes, pinned: i.minutesPinned ?? false }))
  );
  return items.map((item, position) => ({ ...item, position, minutes: split[position] }));
}

/** The settings an item carries, apart from its identity and its pattern. */
function itemSettings(input: ItemInput) {
  return {
    level: input.level,
    goalBpm: input.goalBpm,
    minutes: input.minutes,
    minutesPinned: input.minutesPinned,
    startPct: input.startPct,
    climbPct: input.climbPct,
    climbShape: input.climbShape,
    climbSteps: input.climbSteps,
  };
}

/** A new item's columns: its pattern, checked visible, and what it was called. */
function newItemData(input: ItemInput, resolved: Map<string, Resolved>, index: number): ItemData {
  const found = input.target ? resolved.get(targetKey(input.target)) : undefined;
  if (!input.target || !found) throw new NotFoundError('Pattern not found');
  goalTooFast(input.goalBpm, found.meter, index);
  return {
    ...input.target,
    titleSnapshot: found.title.slice(0, 160),
    position: index,
    ...itemSettings(input),
  };
}

/**
 * Your sessions, most recently changed first, each with what its card shows —
 * one query. `limit` is for Home, which shows the first few.
 */
export async function listSessions(
  userId: string,
  limit: number = SESSIONS_MAX
): Promise<SessionSummary[]> {
  const rows = await prisma.practiceSession.findMany({
    where: { userId },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      totalMinutes: true,
      visibility: true,
      slug: true,
      updatedAt: true,
      items: {
        orderBy: { position: 'asc' },
        select: ITEM_SELECT,
      },
      runs: { orderBy: { endedAt: 'desc' }, take: 1, select: { endedAt: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    totalMinutes: row.totalMinutes,
    visibility: row.visibility === 'link' ? 'link' : 'private',
    slug: row.visibility === 'link' ? row.slug : null,
    updatedAt: row.updatedAt.toISOString(),
    itemCount: row.items.length,
    titles: row.items.map((item) => readableTarget(item, userId)?.title ?? item.titleSnapshot),
    lastRunAt: row.runs[0]?.endedAt.toISOString() ?? null,
  }));
}

/** One of your sessions, with its targets worked out. Null when it is not yours. */
export async function readSession(userId: string, id: string): Promise<SessionView | null> {
  const row = await prisma.practiceSession.findFirst({
    where: { id, userId },
    select: SESSION_SELECT,
  });
  return row ? toView(row, userId) : null;
}

/**
 * Make a session, with any items it starts with. Past {@link SESSIONS_MAX}
 * sessions is a 429; a pattern you cannot see is a 404; more patterns than
 * minutes, or a goal past the meter's ceiling, is a 400.
 */
export async function createSession(
  userId: string,
  input: CreateSessionInput
): Promise<SessionView> {
  const { items, ...fields } = input;
  fitsTotal(items.length, fields.totalMinutes);

  const count = await prisma.practiceSession.count({ where: { userId } });
  if (count >= SESSIONS_MAX) {
    throw new APIError(
      `You have ${SESSIONS_MAX} practice sessions. Delete one to make another.`,
      'SESSION_LIMIT',
      429
    );
  }

  const resolved = await resolveTargets(
    userId,
    items.flatMap((i) => (i.target ? [i.target] : []))
  );
  const data = items.map((item, index) => newItemData(item, resolved, index));

  const row = await prisma.practiceSession.create({
    data: {
      userId,
      ...fields,
      items: { createMany: { data: withSplit(fields.totalMinutes, data) } },
    },
    select: SESSION_SELECT,
  });
  return toView(row, userId);
}

/**
 * Change a session's own fields. A new total re-splits the items around their
 * pins. Null when it is not yours.
 */
export async function updateSession(
  userId: string,
  id: string,
  input: UpdateSessionInput
): Promise<SessionView | null> {
  const row = await prisma.$transaction(async (tx) => {
    const current = await tx.practiceSession.findFirst({
      where: { id, userId },
      select: {
        totalMinutes: true,
        items: {
          orderBy: { position: 'asc' },
          select: { id: true, minutes: true, minutesPinned: true },
        },
      },
    });
    if (!current) return null;

    if (input.totalMinutes !== undefined && input.totalMinutes !== current.totalMinutes) {
      fitsTotal(current.items.length, input.totalMinutes);
      const split = splitMinutes(
        input.totalMinutes,
        current.items.map((i) => ({ minutes: i.minutes, pinned: i.minutesPinned }))
      );
      for (const [k, item] of current.items.entries()) {
        if (item.minutes !== split[k]) {
          await tx.practiceSessionItem.update({
            where: { id: item.id },
            data: { minutes: split[k] },
          });
        }
      }
    }
    return tx.practiceSession.update({ where: { id }, data: input, select: SESSION_SELECT });
  });
  return row ? toView(row, userId) : null;
}

/**
 * Replace a session's items with this list, in this order. An item named by
 * `id` keeps its pattern; one left out is removed; a new one is checked
 * visible to you. The minutes are split again. Null when it is not yours.
 */
export async function replaceItems(
  userId: string,
  id: string,
  items: readonly ItemInput[]
): Promise<SessionView | null> {
  const row = await prisma.$transaction(async (tx) => {
    const current = await tx.practiceSession.findFirst({
      where: { id, userId },
      select: { totalMinutes: true, items: { select: ITEM_SELECT } },
    });
    if (!current) return null;
    fitsTotal(items.length, current.totalMinutes);

    const kept = new Map(current.items.map((item) => [item.id, item]));
    const seen = new Set<string>();
    const resolved = await resolveTargets(
      userId,
      items.flatMap((i) => (i.target ? [i.target] : []))
    );

    const data = items.map((item, index): ItemData => {
      if (item.id !== undefined) {
        const existing = kept.get(item.id);
        if (!existing || seen.has(item.id)) {
          throw new ValidationError('That item is not in this session', {
            [`items.${index}.id`]: ['Not an item of this session'],
          });
        }
        seen.add(item.id);
        const meter = readableTarget(existing, userId)?.meter;
        if (meter) goalTooFast(item.goalBpm, meter, index);
        return {
          id: item.id,
          breakId: existing.breakId,
          libraryEntryId: existing.libraryEntryId,
          titleSnapshot: existing.titleSnapshot,
          position: index,
          ...itemSettings(item),
        };
      }
      return newItemData(item, resolved, index);
    });

    await tx.practiceSessionItem.deleteMany({ where: { sessionId: id } });
    if (data.length) {
      await tx.practiceSessionItem.createMany({
        data: withSplit(current.totalMinutes, data).map((item) => ({ ...item, sessionId: id })),
      });
    }
    // touch the session, so the list puts it first
    return tx.practiceSession.update({
      where: { id },
      data: { updatedAt: new Date() },
      select: SESSION_SELECT,
    });
  });
  return row ? toView(row, userId) : null;
}

/**
 * Delete one of your sessions, and its items. Its runs stay in your history,
 * named; copies other people saved of it stay theirs. False when it is not yours.
 */
export async function deleteSession(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.practiceSession.deleteMany({ where: { id, userId } });
  return count > 0;
}
