import { BEATBUDDY_SLUG } from '@/lib/app/breaks/buddy/agent';
import { prisma } from '@/lib/db/client';

/**
 * BeatBuddy's daily allowance (D4): how many turns a person may take a day.
 *
 * Sunrise has no per-user daily cap, so the app counts. A turn is one message
 * the person sent to BeatBuddy — an `AiMessage` with `role: 'user'` in one of
 * their BeatBuddy conversations. Nothing else is stored: the count is read
 * from the transcript, so deleting a conversation gives its turns back, which
 * is acceptable for a cost cap and not worth a table.
 *
 * The day is the UTC day. One boundary for everybody is simple to state
 * ("back at midnight UTC") and needs nothing from the browser.
 */

/** D4: 30 turns a day, to be tuned from the cost dashboard. */
export const BUDDY_DAILY_TURNS = 30;

export interface BuddyAllowance {
  limit: number;
  used: number;
  remaining: number;
  /** When today's count starts again: the next UTC midnight, ISO 8601. */
  resetsAt: string;
}

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * The person's allowance as it stands. `userId` comes from the session.
 *
 * A soft cap: two turns sent at the same instant can both read 29 and both
 * go ahead. That overshoots by a turn or two, never by a day's worth, which is
 * fine for a cost limit (Sunrise's conversation cap makes the same trade).
 */
export async function readAllowance(userId: string, now = new Date()): Promise<BuddyAllowance> {
  const dayStart = startOfUtcDay(now);
  const used = await prisma.aiMessage.count({
    where: {
      role: 'user',
      createdAt: { gte: dayStart },
      conversation: { userId, agent: { slug: BEATBUDDY_SLUG } },
    },
  });
  const resetsAt = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return {
    limit: BUDDY_DAILY_TURNS,
    used,
    remaining: Math.max(0, BUDDY_DAILY_TURNS - used),
    resetsAt: resetsAt.toISOString(),
  };
}

/** What the drawer shows when the day's turns are gone. */
export const ALLOWANCE_SPENT_MESSAGE = `That's all ${BUDDY_DAILY_TURNS} of today's BeatBuddy turns. They come back at midnight UTC — everything else in the Studio still works.`;
