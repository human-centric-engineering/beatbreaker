/**
 * BeatBuddy's daily allowance (D4). The count is what decides whether a turn
 * is refused, so what matters is what it counts: only the person's own
 * messages, only to BeatBuddy, only messages they sent, only today (UTC).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buddyTurns, fakeMessageTable, type MessageRow } from '@/tests/helpers/buddy';

const table = vi.hoisted(() => ({ current: null as ReturnType<typeof fakeMessageTable> | null }));

vi.mock('@/lib/db/client', () => ({
  prisma: {
    get aiMessage() {
      return table.current;
    },
  },
}));

import { BUDDY_DAILY_TURNS, readAllowance } from '@/lib/app/breaks/buddy/allowance';

const NOW = new Date('2026-09-29T15:30:00Z');
const TODAY = new Date('2026-09-29T00:00:00Z');

function withMessages(rows: MessageRow[]) {
  table.current = fakeMessageTable(rows);
}

beforeEach(() => withMessages([]));

describe('readAllowance', () => {
  it('starts the day with the whole allowance, back at the next UTC midnight', async () => {
    expect(await readAllowance('user-1', NOW)).toEqual({
      limit: 30,
      used: 0,
      remaining: 30,
      resetsAt: '2026-09-30T00:00:00.000Z',
    });
  });

  it('counts the turns the person sent to BeatBuddy today', async () => {
    withMessages(buddyTurns('user-1', 12, TODAY));

    const a = await readAllowance('user-1', NOW);

    expect(a.used).toBe(12);
    expect(a.remaining).toBe(18);
  });

  it("does not count another person's turns, another agent's, BeatBuddy's replies or yesterday's", async () => {
    withMessages([
      ...buddyTurns('user-1', 3, TODAY),
      ...buddyTurns('user-2', 30, TODAY),
      ...buddyTurns('user-1', 30, new Date('2026-09-28T20:00:00Z')),
      { userId: 'user-1', agentSlug: 'support-bot', role: 'user', createdAt: NOW },
      { userId: 'user-1', agentSlug: 'beatbuddy', role: 'assistant', createdAt: NOW },
      { userId: 'user-1', agentSlug: 'beatbuddy', role: 'tool', createdAt: NOW },
    ]);

    expect((await readAllowance('user-1', NOW)).used).toBe(3);
  });

  it('counts a turn sent at the very start of the UTC day, and not one a millisecond before', async () => {
    withMessages([
      ...buddyTurns('user-1', 1, TODAY),
      ...buddyTurns('user-1', 1, new Date(TODAY.getTime() - 1)),
    ]);

    expect((await readAllowance('user-1', NOW)).used).toBe(1);
  });

  it('has nothing remaining once the day is spent, and never goes below zero', async () => {
    withMessages(buddyTurns('user-1', BUDDY_DAILY_TURNS + 2, TODAY));

    const a = await readAllowance('user-1', NOW);

    expect(a.used).toBe(32);
    expect(a.remaining).toBe(0);
  });
});
