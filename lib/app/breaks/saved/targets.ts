import type { Prisma } from '@prisma/client';

import { PUBLIC } from '@/lib/app/breaks/catalogue/data';
import type { PinTarget } from '@/lib/validations/pins';

/**
 * What a pin (D17) and a practice visit (D18) point at: one of your patterns,
 * someone else's shared one, or a library entry the catalogue shows.
 *
 * **Server-side only.** Both tables name their target the same way — a
 * `breakRef` or a `libraryEntry` relation, exactly one set — so the rule for
 * which targets the caller may see, and the shape a row shows them in, live
 * here once. A pin and a visit on the same pattern cannot disagree about
 * whether it is visible.
 */

/** A pattern — one of yours, or a shared one of someone else's. */
export interface TargetBreak {
  kind: 'break';
  id: string;
  title: string;
  style: string;
  meter: string;
  bpm: number;
  level: number;
  /** False for someone else's shared pattern. */
  mine: boolean;
  updatedAt: Date;
}

/** A library entry — a famous break, opened as a scratch copy. */
export interface TargetEntry {
  kind: 'entry';
  id: string;
  /** The library it is in, for `GET /api/v1/catalogue/libraries/[key]`. */
  libraryKey: string;
  title: string;
  artist: string;
  styleKey: string;
  meter: string;
  bpm: number;
}

export type TargetView = TargetBreak | TargetEntry;

type Tx = Prisma.TransactionClient;

/**
 * Rows whose target the caller may still see. When an owner unshares a
 * pattern, pins and visits on it drop out of every list — and come back if it
 * is shared again.
 */
export function visibleTarget(
  userId: string
): Prisma.PinWhereInput & Prisma.PracticeVisitWhereInput {
  return {
    OR: [
      { breakRef: { OR: [{ userId }, { shared: true }] } },
      { libraryEntry: { library: PUBLIC } },
    ],
  };
}

/** The target columns a row needs, for either table's `select`. */
export const TARGET_SELECT = {
  breakRef: {
    select: {
      id: true,
      userId: true,
      title: true,
      style: true,
      meter: true,
      bpm: true,
      level: true,
      updatedAt: true,
    },
  },
  libraryEntry: {
    select: {
      id: true,
      title: true,
      artist: true,
      styleKey: true,
      meter: true,
      bpm: true,
      library: { select: { key: true } },
    },
  },
} as const satisfies Prisma.PinSelect & Prisma.PracticeVisitSelect;

type TargetRow = Prisma.PinGetPayload<{ select: typeof TARGET_SELECT }>;

/** A row's target as the API shows it, or null when it has none. */
export function toTargetView(row: TargetRow, userId: string): TargetView | null {
  if (row.breakRef) {
    const { userId: owner, ...b } = row.breakRef;
    // the owner's id is theirs — the view says only whether it is you
    return { kind: 'break', ...b, mine: owner === userId };
  }
  if (row.libraryEntry) {
    const { library, ...e } = row.libraryEntry;
    return { kind: 'entry', ...e, libraryKey: library.key };
  }
  return null;
}

/** May the caller point at this? The same visibility the lists apply. */
export async function targetVisible(tx: Tx, userId: string, target: PinTarget): Promise<boolean> {
  if ('breakId' in target) {
    const found = await tx.break.findFirst({
      where: { id: target.breakId, OR: [{ userId }, { shared: true }] },
      select: { id: true },
    });
    return found !== null;
  }
  const found = await tx.libraryEntry.findFirst({
    where: { id: target.libraryEntryId, library: PUBLIC },
    select: { id: true },
  });
  return found !== null;
}
