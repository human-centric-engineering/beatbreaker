import type { Prisma } from '@prisma/client';

import {
  TARGET_SELECT,
  type TargetView,
  targetVisible,
  toTargetView,
  visibleTarget,
} from '@/lib/app/breaks/saved/targets';
import { prisma } from '@/lib/db/client';
import type { PinTarget } from '@/lib/validations/pins';

/**
 * The practice history (D18): what you opened, newest first, and where you
 * left each one — the layer and the tempo.
 *
 * **Server-side only**, like `pins.ts` beside it.
 *
 * **One row per target.** A revisit moves it to the top rather than adding a
 * second row, so the list is "what have I been working on", not a log of
 * every click. The newest {@link HISTORY_CAP} are kept; recording the 201st
 * drops the oldest.
 *
 * **A visit is only as visible as its target**, by the same rule a pin is
 * (`targets.ts`): a pattern its owner has unshared drops out of the list.
 */

/** How many visits are kept per person (D18). */
export const HISTORY_CAP = 200;

export interface PracticeVisitView {
  id: string;
  /** The layer it was left at. */
  level: number;
  /** The tempo it was left at. */
  bpm: number;
  visitedAt: Date;
  target: TargetView;
}

const VISIT_SELECT = {
  id: true,
  level: true,
  bpm: true,
  visitedAt: true,
  ...TARGET_SELECT,
} as const satisfies Prisma.PracticeVisitSelect;

type VisitRow = Prisma.PracticeVisitGetPayload<{ select: typeof VISIT_SELECT }>;

function toView(row: VisitRow, userId: string): PracticeVisitView | null {
  const target = toTargetView(row, userId);
  return target
    ? { id: row.id, level: row.level, bpm: row.bpm, visitedAt: row.visitedAt, target }
    : null;
}

/** The history, newest first, in one query — Recent in the drawer, and Back. */
export async function listHistory(userId: string): Promise<PracticeVisitView[]> {
  const rows = await prisma.practiceVisit.findMany({
    where: { userId, ...visibleTarget(userId) },
    select: VISIT_SELECT,
    orderBy: [{ visitedAt: 'desc' }, { id: 'desc' }],
    take: HISTORY_CAP,
  });
  return rows.flatMap((row) => toView(row, userId) ?? []);
}

/**
 * Record that a target is on the stage, at this layer and tempo: a first
 * visit adds it, a revisit (or a new layer or tempo) moves it to the top.
 *
 * Null when the target does not exist or the caller cannot see it — the same
 * answer for both, so an id cannot be probed.
 */
export async function recordVisit(
  userId: string,
  target: PinTarget,
  at: { level: number; bpm: number }
): Promise<PracticeVisitView | null> {
  return prisma.$transaction(async (tx) => {
    if (!(await targetVisible(tx, userId, target))) return null;

    const visitedAt = new Date();
    /* An upsert on the unique index, not a find then a create: two tabs
       recording the same pattern at once must not race for the one row. */
    const where: Prisma.PracticeVisitWhereUniqueInput =
      'breakId' in target
        ? { userId_breakId: { userId, breakId: target.breakId } }
        : { userId_libraryEntryId: { userId, libraryEntryId: target.libraryEntryId } };
    /* Selecting the id alone is what lets Prisma send one INSERT … ON
       CONFLICT; with the relations in the select it reads first and inserts
       second, and the second tab's insert fails on the index. */
    const { id } = await tx.practiceVisit.upsert({
      where,
      create: { userId, ...target, ...at, visitedAt },
      update: { ...at, visitedAt },
      select: { id: true },
    });

    /* The cap. Hidden rows count toward it: they are still yours, and would
       come back if their pattern were shared again. */
    const overflow = await tx.practiceVisit.findMany({
      where: { userId },
      orderBy: [{ visitedAt: 'desc' }, { id: 'desc' }],
      skip: HISTORY_CAP,
      select: { id: true },
    });
    if (overflow.length) {
      await tx.practiceVisit.deleteMany({ where: { id: { in: overflow.map((v) => v.id) } } });
    }

    const row = await tx.practiceVisit.findUnique({ where: { id }, select: VISIT_SELECT });
    return row ? toView(row, userId) : null;
  });
}

/** Forget everything you opened. The number of rows removed. */
export async function clearHistory(userId: string): Promise<number> {
  const { count } = await prisma.practiceVisit.deleteMany({ where: { userId } });
  return count;
}
