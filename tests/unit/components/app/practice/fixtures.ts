import type { SessionItemView, SessionView } from '@/lib/validations/practice-sessions';

/**
 * A practice session as `GET /api/v1/practice-sessions/:id` answers it, for
 * the editor and Add-to-a-session tests. Items are `item(n)`: a saved
 * pattern of yours, an equal share, no goal, no overrides.
 */

export const SESSION_ID = 'csess0000000000000000001';

export function item(n: number, over: Partial<SessionItemView> = {}): SessionItemView {
  const id = `citem00000000000000000${String(n).padStart(2, '0')}`;
  return {
    id,
    position: n - 1,
    target: {
      kind: 'break',
      id: `cbrk000000000000000000${String(n).padStart(2, '0')}`,
      title: `Pattern ${n}`,
      meter: '4/4',
      bpm: 90,
      mine: true,
      slug: null,
    },
    title: `Pattern ${n}`,
    level: 5,
    minutes: 5,
    minutesPinned: false,
    goalBpm: null,
    bestBpm: null,
    targetBpm: 90,
    startBpm: 72,
    startPct: null,
    climbPct: null,
    climbShape: null,
    climbSteps: null,
    ...over,
  };
}

export function sessionView(over: Partial<SessionView> = {}): SessionView {
  return {
    id: SESSION_ID,
    name: 'Warm-up',
    description: null,
    totalMinutes: 15,
    visibility: 'private',
    slug: null,
    updatedAt: '2026-10-01T09:00:00.000Z',
    createdAt: '2026-10-01T09:00:00.000Z',
    copiedFrom: null,
    startPct: 20,
    climbPct: 67,
    climbShape: 'steady',
    climbSteps: 4,
    countIn: 1,
    items: [item(1), item(2), item(3)],
    ...over,
  };
}
