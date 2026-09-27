import { ConflictError } from '@/lib/api/errors';
import { isUniqueClash } from '@/lib/app/breaks/community/sharing';
import {
  USERNAME_CHANGE_DAYS,
  USERNAME_HOLD_DAYS,
  USERNAME_MESSAGES,
  usernameProblem,
} from '@/lib/app/breaks/community/username';
import { prisma } from '@/lib/db/client';

/**
 * Your drummer profile (task 6.2): the username your published patterns
 * appear under, and what you say about yourself on `/u/<username>`.
 *
 * **Server-side only.** The rules are `username.ts`; this is where they meet
 * the database — whether a name is taken or held, and the once-a-month limit
 * on changing it.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DrummerProfileView {
  username: string;
  bio: string;
  /** When the username may next change; null if it may change now. */
  nextChangeAt: string | null;
}

function nextChange(changedAt: Date | null, now: Date): Date | null {
  if (!changedAt) return null;
  const next = new Date(changedAt.getTime() + USERNAME_CHANGE_DAYS * DAY_MS);
  return next > now ? next : null;
}

function view(
  row: { username: string; bio: string | null; usernameChangedAt: Date | null },
  now = new Date()
): DrummerProfileView {
  return {
    username: row.username,
    bio: row.bio ?? '',
    nextChangeAt: nextChange(row.usernameChangedAt, now)?.toISOString() ?? null,
  };
}

/** Your profile, or null if you have not chosen a username yet. */
export async function getDrummerProfile(userId: string): Promise<DrummerProfileView | null> {
  const row = await prisma.drummerProfile.findUnique({ where: { userId } });
  return row ? view(row) : null;
}

/** The username alone — what publishing needs to know. */
export async function usernameOf(userId: string): Promise<string | null> {
  const row = await prisma.drummerProfile.findUnique({
    where: { userId },
    select: { username: true },
  });
  return row?.username ?? null;
}

export type Availability =
  | { available: true }
  | { available: false; reason: 'shape' | 'unavailable' | 'taken'; message: string };

/**
 * Whether `username` could be yours. Your own current name is available to
 * you; a name someone gave up in the last 30 days is not available to anyone.
 */
export async function usernameAvailability(
  raw: string,
  userId: string,
  now = new Date()
): Promise<Availability> {
  const username = raw.trim().toLowerCase();
  const problem = usernameProblem(username);
  if (problem) return { available: false, reason: problem, message: USERNAME_MESSAGES[problem] };

  const [holder, held] = await Promise.all([
    prisma.drummerProfile.findUnique({ where: { username }, select: { userId: true } }),
    prisma.reservedUsername.findUnique({ where: { username }, select: { heldUntil: true } }),
  ]);
  if (holder && holder.userId !== userId) {
    return { available: false, reason: 'taken', message: USERNAME_MESSAGES.taken };
  }
  /* A held name reads as taken, not as unavailable: it is someone's, for now,
     and saying so does not reveal whose. */
  if (!holder && held && held.heldUntil > now) {
    return { available: false, reason: 'taken', message: USERNAME_MESSAGES.taken };
  }
  return { available: true };
}

export interface ProfileInput {
  username: string;
  bio?: string;
}

/**
 * Choose a username, change it, or change what you wrote about yourself.
 *
 * - Choosing your first username is not a change, and is not limited.
 * - Changing it is allowed once per `USERNAME_CHANGE_DAYS`, and the old name
 *   is held for `USERNAME_HOLD_DAYS` so nobody can take it while the old `/u/`
 *   links still circulate.
 * - A name that is taken, held or not allowed is a 409 with the site's words
 *   for it; two people claiming the same free name at once meet the unique
 *   index, and the second is told it is taken.
 */
export async function saveDrummerProfile(
  userId: string,
  input: ProfileInput,
  now = new Date()
): Promise<DrummerProfileView> {
  const username = input.username.trim().toLowerCase();
  const bio = input.bio === undefined ? undefined : input.bio.trim() || null;
  const current = await prisma.drummerProfile.findUnique({ where: { userId } });
  const changing = current !== null && current.username !== username;

  if (changing) {
    const next = nextChange(current.usernameChangedAt, now);
    if (next) {
      throw new ConflictError(
        `You can change your username once every ${USERNAME_CHANGE_DAYS} days. The next change can be made on ${next.toISOString().slice(0, 10)}.`,
        { username: ['too soon'] }
      );
    }
  }
  if (!current || changing) {
    const availability = await usernameAvailability(username, userId, now);
    if (!availability.available) {
      throw new ConflictError(availability.message, { username: [availability.reason] });
    }
  }

  try {
    const row = await prisma.$transaction(async (tx) => {
      // a lapsed hold is cleared as the name is claimed, so the key is free
      await tx.reservedUsername.deleteMany({ where: { username, heldUntil: { lte: now } } });
      if (!current) {
        return tx.drummerProfile.create({
          data: { userId, username, bio: bio ?? null },
        });
      }
      if (changing) {
        await tx.reservedUsername.upsert({
          where: { username: current.username },
          create: {
            username: current.username,
            heldUntil: new Date(now.getTime() + USERNAME_HOLD_DAYS * DAY_MS),
          },
          update: { heldUntil: new Date(now.getTime() + USERNAME_HOLD_DAYS * DAY_MS) },
        });
      }
      return tx.drummerProfile.update({
        where: { userId },
        data: {
          ...(changing ? { username, usernameChangedAt: now } : {}),
          ...(bio === undefined ? {} : { bio }),
        },
      });
    });
    return view(row, now);
  } catch (error) {
    if (isUniqueClash(error, 'username')) {
      throw new ConflictError(USERNAME_MESSAGES.taken, { username: ['taken'] });
    }
    throw error;
  }
}
