import type { Prisma } from '@prisma/client';

import { ValidationError } from '@/lib/api/errors';
import { PUBLIC } from '@/lib/app/breaks/catalogue/data';
import { prisma } from '@/lib/db/client';
import { type PinTarget, SHELVES, type Shelf } from '@/lib/validations/pins';

/**
 * The practice shelves (D17): what you are practising, and what you want to
 * practise later.
 *
 * **Server-side only**, like `data.ts` beside it. The route handlers and the
 * Studio's server pages call these functions; the browser gets what they
 * return.
 *
 * **A pin is only as visible as its target.** You may pin your own pattern,
 * someone else's shared one, or a library entry the catalogue shows. If the
 * target stops being visible to you — its owner unshares it — the pin stays on
 * the shelf but drops out of the list, and comes back if it is shared again.
 * One `where` (`visibleTarget`) decides that for the list and for
 * pinning, so the two cannot disagree.
 *
 * **Positions are dense, 0 first, per shelf.** Every placement renumbers the
 * shelf it lands on inside one transaction. Shelves are short — a drummer
 * practises a handful of things — so rewriting a few rows beats the gaps and
 * rebalancing a fractional order would need.
 */

/** A pinned pattern — one of yours, or a shared one of someone else's. */
export interface PinnedBreak {
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

/** A pinned library entry — a famous break, opened as a scratch copy. */
export interface PinnedEntry {
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

export interface PinView {
  id: string;
  shelf: Shelf;
  position: number;
  createdAt: Date;
  target: PinnedBreak | PinnedEntry;
}

/** Both shelves, each in order. What one `GET /api/v1/pins` answers. */
export type PracticeShelves = Record<Shelf, PinView[]>;

type Tx = Prisma.TransactionClient;

/** Pins whose target the caller may still see. */
function visibleTarget(userId: string): Prisma.PinWhereInput {
  return {
    OR: [
      { breakRef: { OR: [{ userId }, { shared: true }] } },
      { libraryEntry: { library: PUBLIC } },
    ],
  };
}

const PIN_SELECT = {
  id: true,
  shelf: true,
  position: true,
  createdAt: true,
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
} as const satisfies Prisma.PinSelect;

type PinRow = Prisma.PinGetPayload<{ select: typeof PIN_SELECT }>;

function isShelf(value: string): value is Shelf {
  return (SHELVES as readonly string[]).includes(value);
}

/** A row as the API shows it, or null for one it should not. */
function toView(row: PinRow, userId: string): PinView | null {
  /* `shelf` is a VARCHAR, so a value this code does not know (a shelf added
     later, a hand edit) is dropped rather than put on a shelf that does not
     exist. */
  if (!isShelf(row.shelf)) return null;
  const base = { id: row.id, shelf: row.shelf, position: row.position, createdAt: row.createdAt };
  if (row.breakRef) {
    const { userId: owner, ...b } = row.breakRef;
    // the owner's id is theirs — the view says only whether it is you
    return { ...base, target: { kind: 'break', ...b, mine: owner === userId } };
  }
  if (row.libraryEntry) {
    const { library, ...e } = row.libraryEntry;
    return { ...base, target: { kind: 'entry', ...e, libraryKey: library.key } };
  }
  return null;
}

/** Both shelves in one query — the list that fills Home and the Patterns drawer. */
export async function listPins(userId: string): Promise<PracticeShelves> {
  const rows = await prisma.pin.findMany({
    where: { userId, ...visibleTarget(userId) },
    select: PIN_SELECT,
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
  });
  const shelves: PracticeShelves = { practising: [], later: [] };
  for (const row of rows) {
    const view = toView(row, userId);
    if (view) shelves[view.shelf].push(view);
  }
  return shelves;
}

/** One pin, only while its target is visible — the list's rule, not a looser one. */
async function readPin(tx: Tx, id: string, userId: string): Promise<PinView | null> {
  const row = await tx.pin.findFirst({
    where: { id, userId, ...visibleTarget(userId) },
    select: PIN_SELECT,
  });
  return row ? toView(row, userId) : null;
}

/** Can the caller pin this? The same visibility the list applies. */
async function targetVisible(tx: Tx, userId: string, target: PinTarget): Promise<boolean> {
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

/**
 * Put one pin on `shelf`, after `after` (null: at the top), and renumber that
 * shelf 0…n. Only rows whose position changes are written.
 */
async function place(
  tx: Tx,
  userId: string,
  pinId: string,
  shelf: Shelf,
  after: string | null
): Promise<void> {
  const others = await tx.pin.findMany({
    where: { userId, shelf, NOT: { id: pinId } },
    select: { id: true, position: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
  });

  let at = 0;
  if (after !== null) {
    const index = others.findIndex((p) => p.id === after);
    if (index < 0) {
      throw new ValidationError('That pin is not on the shelf this one is going to', {
        after: ['Must be another pin of yours on the destination shelf'],
      });
    }
    at = index + 1;
  }

  await tx.pin.update({ where: { id: pinId }, data: { shelf, position: at } });
  const order = [...others.slice(0, at), null, ...others.slice(at)];
  for (const [position, pin] of order.entries()) {
    if (pin && pin.position !== position) {
      await tx.pin.update({ where: { id: pin.id }, data: { position } });
    }
  }
}

export interface PinResult {
  pin: PinView;
  /** False when the target was already pinned and this moved (or kept) it. */
  created: boolean;
}

/**
 * Pin a target to a shelf, at the top.
 *
 * Pinning something already pinned is not an error — a ★ pressed twice, or on
 * two devices, should land where it was asked to. On the same shelf it stays
 * where it is; on the other shelf it moves to the top of this one.
 *
 * Null when the target does not exist or the caller cannot see it — the same
 * answer for both, so an id cannot be probed.
 */
export async function pinTarget(
  userId: string,
  shelf: Shelf,
  target: PinTarget
): Promise<PinResult | null> {
  return prisma.$transaction(async (tx) => {
    if (!(await targetVisible(tx, userId, target))) return null;

    const existing = await tx.pin.findFirst({
      where: { userId, ...target },
      select: { id: true, shelf: true },
    });
    if (existing) {
      if (existing.shelf !== shelf) await place(tx, userId, existing.id, shelf, null);
      const pin = await readPin(tx, existing.id, userId);
      return pin ? { pin, created: false } : null;
    }

    const { id } = await tx.pin.create({
      data: { userId, shelf, position: 0, ...target },
      select: { id: true },
    });
    await place(tx, userId, id, shelf, null);
    const pin = await readPin(tx, id, userId);
    return pin ? { pin, created: true } : null;
  });
}

/**
 * Move a pin to another shelf, reorder it within its own, or both.
 *
 * Null when it is not the caller's pin, **or when its target is hidden** — a
 * pattern its owner has since unshared. Such a pin is not in the list, so no
 * client has a reason to move it, and answering would hand back the pattern's
 * current title and numbers after the owner took them away. Checked before the
 * move, so a refused move changes nothing.
 */
export async function movePin(
  userId: string,
  id: string,
  move: { shelf?: Shelf; after?: string | null }
): Promise<PinView | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.pin.findFirst({
      where: { id, userId, ...visibleTarget(userId) },
      select: { shelf: true },
    });
    if (!existing || !isShelf(existing.shelf)) return null;
    await place(tx, userId, id, move.shelf ?? existing.shelf, move.after ?? null);
    return readPin(tx, id, userId);
  });
}

/**
 * Unpin. False when it is not the caller's pin. The shelf is not renumbered:
 * a gap sorts the same as no gap, and the next placement closes it.
 */
export async function unpin(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.pin.deleteMany({ where: { id, userId } });
  return count > 0;
}
