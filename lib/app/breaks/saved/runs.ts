import { z } from 'zod';

import { APIError, ValidationError } from '@/lib/api/errors';
import { prisma } from '@/lib/db/client';
import {
  type CreateRunInput,
  type RunView,
  runSlotSchema,
} from '@/lib/validations/practice-sessions';

/**
 * Runs of your practice sessions (Phase 7D): when you ran one, and the tempo
 * each pattern reached — your practice history.
 *
 * **Server-side only.** A run is logged when it ends, by the client that ran
 * it; the end is the server's time. Like a speed record it is self-reported,
 * and it is yours alone: nobody else reads it.
 */

/** Runs one person may log in 24 hours. */
export const RUN_DAILY_CAP = 50;
/** How many runs of one session a read is sent, newest first. */
export const RUNS_MAX = 50;

const DAY_MS = 24 * 60 * 60 * 1000;
/** How far ahead of the server's clock a device's may run before a start is refused. */
export const CLOCK_SKEW_MS = 60 * 1000;

const storedSlots = z.array(runSlotSchema);

const RUN_SELECT = {
  id: true,
  sessionId: true,
  sessionName: true,
  startedAt: true,
  endedAt: true,
  items: true,
} as const;

function toView(row: {
  id: string;
  sessionId: string | null;
  sessionName: string;
  startedAt: Date;
  endedAt: Date;
  items: unknown;
}): RunView {
  const items = storedSlots.safeParse(row.items);
  return {
    id: row.id,
    sessionId: row.sessionId,
    sessionName: row.sessionName,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    // written through the same schema; a row that no longer parses shows no slots
    items: items.success ? items.data : [],
  };
}

/**
 * Log a finished run of one of your sessions. It must have started in the
 * last day; a start up to {@link CLOCK_SKEW_MS} ahead of the server's clock is
 * a fast device clock, and is taken as now. Past {@link RUN_DAILY_CAP} runs in
 * a day is a 429. Null when the session is not yours.
 */
export async function recordRun(
  userId: string,
  sessionId: string,
  input: CreateRunInput,
  now = new Date()
): Promise<RunView | null> {
  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, userId },
    select: { name: true },
  });
  if (!session) return null;

  const claimed = new Date(input.startedAt).getTime();
  if (claimed > now.getTime() + CLOCK_SKEW_MS || claimed < now.getTime() - DAY_MS) {
    throw new ValidationError('A run is logged within a day of starting it', {
      startedAt: ['In the last 24 hours'],
    });
  }
  // never after its own end
  const startedAt = new Date(Math.min(claimed, now.getTime()));

  const today = await prisma.practiceRun.count({
    where: { userId, endedAt: { gte: new Date(now.getTime() - DAY_MS) } },
  });
  if (today >= RUN_DAILY_CAP) {
    throw new APIError(
      "That's a lot of practice for one day. Try again tomorrow.",
      'RUN_LIMIT',
      429
    );
  }

  const row = await prisma.practiceRun.create({
    data: {
      userId,
      sessionId,
      sessionName: session.name,
      startedAt,
      endedAt: now,
      items: input.items,
    },
    select: RUN_SELECT,
  });
  return toView(row);
}

/** Your runs of one of your sessions, newest first. Null when it is not yours. */
export async function listRuns(userId: string, sessionId: string): Promise<RunView[] | null> {
  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  });
  if (!session) return null;
  const rows = await prisma.practiceRun.findMany({
    where: { userId, sessionId },
    orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
    take: RUNS_MAX,
    select: RUN_SELECT,
  });
  return rows.map(toView);
}
