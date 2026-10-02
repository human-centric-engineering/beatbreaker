/**
 * Integration Test: PUT /api/v1/practice-sessions/:id/items — the patterns in
 * one of yours (Phase 7D)
 *
 * The real `withAuth` guard runs over a mocked session; `replaceItems` is
 * mocked at its own module boundary — the minutes re-split and target
 * resolution are covered by `lib/app/breaks/saved/sessions.ts`'s own tests.
 * This file is about the ROUTE's own composition: signed-out is a 401, a
 * non-cuid session id or an invalid item list never reaches the data layer,
 * a `null` from the data layer is a 404, and the data layer receives the
 * parsed (defaulted) item list.
 *
 * @see app/api/v1/practice-sessions/[id]/items/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PUT } from '@/app/api/v1/practice-sessions/[id]/items/route';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/saved/sessions', () => ({ replaceItems: vi.fn() }));

import { auth } from '@/lib/auth/config';
import { replaceItems } from '@/lib/app/breaks/saved/sessions';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const SESSION_ID = 'csesh00000000000000000001';
const BREAK_ID = 'cbrk00000000000000000001';
const EXISTING_ITEM_ID = 'citem00000000000000000001';

function put(body: unknown, id = SESSION_ID): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/practice-sessions/${id}/items`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const ctx = (id = SESSION_ID) => ({ params: Promise.resolve({ id }) });

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

const VIEW = {
  id: SESSION_ID,
  name: 'Warm-up',
  description: null,
  totalMinutes: 20,
  visibility: 'private' as const,
  slug: null,
  updatedAt: '2026-09-30T00:00:00.000Z',
  startPct: 20,
  climbPct: 67,
  climbShape: 'steady' as const,
  climbSteps: 4,
  countIn: 1,
  createdAt: '2026-09-30T00:00:00.000Z',
  copiedFrom: null,
  items: [
    {
      id: EXISTING_ITEM_ID,
      position: 0,
      target: {
        kind: 'break' as const,
        id: BREAK_ID,
        title: 'Cold Carpet',
        meter: '4/4',
        bpm: 120,
        mine: true,
        slug: null,
      },
      title: 'Cold Carpet',
      level: 2,
      minutes: 20,
      minutesPinned: false,
      goalBpm: null,
      bestBpm: null,
      targetBpm: 120,
      startBpm: 96,
      startPct: 20,
      climbPct: 67,
      climbShape: 'steady' as const,
      climbSteps: 4,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(replaceItems).mockResolvedValue(VIEW);
});

it('401s a signed-out caller, before calling replaceItems', async () => {
  vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
  const res = await PUT(put({ items: [] }), ctx());
  expect(res.status).toBe(401);
  expect(replaceItems).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
});

it('400s a session id that is not a cuid, before calling replaceItems', async () => {
  const res = await PUT(put({ items: [] }, 'not-a-cuid'), ctx('not-a-cuid'));
  expect(res.status).toBe(400);
  expect(replaceItems).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
});

describe('invalid item lists never reach replaceItems', () => {
  it.each([
    [
      'an item naming both an existing id and a breakId',
      { items: [{ id: EXISTING_ITEM_ID, breakId: BREAK_ID, level: 2 }] },
    ],
    ['a new item naming neither target', { items: [{ level: 2 }] }],
    [
      'more than twelve items',
      { items: Array.from({ length: 13 }, () => ({ breakId: BREAK_ID, level: 2 })) },
    ],
  ])('400s on %s', async (_, body) => {
    const res = await PUT(put(body), ctx());
    expect(res.status).toBe(400);
    expect(replaceItems).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });
});

it('404s when replaceItems finds nothing of the caller’s', async () => {
  vi.mocked(replaceItems).mockResolvedValue(null);
  const res = await PUT(put({ items: [] }), ctx());
  expect(res.status).toBe(404);
});

it('200s with the updated session on success', async () => {
  const res = await PUT(put({ items: [] }), ctx());
  const body = await json<{ success: true; data: typeof VIEW }>(res);

  expect(res.status).toBe(200);
  expect(body.success).toBe(true);
  expect(body.data).toEqual(VIEW);
});

it('calls replaceItems with the session user id, the session id, and the parsed item list', async () => {
  await PUT(
    put({
      items: [
        { id: EXISTING_ITEM_ID, level: 2 },
        { breakId: BREAK_ID, level: 4, goalBpm: 120 },
      ],
    }),
    ctx()
  );

  expect(replaceItems).toHaveBeenCalledWith(USER_ID, SESSION_ID, [
    {
      id: EXISTING_ITEM_ID,
      target: null,
      level: 2,
      goalBpm: null,
      minutes: 1,
      minutesPinned: false,
      startPct: null,
      climbPct: null,
      climbShape: null,
      climbSteps: null,
    },
    {
      target: { breakId: BREAK_ID },
      level: 4,
      goalBpm: 120,
      minutes: 1,
      minutesPinned: false,
      startPct: null,
      climbPct: null,
      climbShape: null,
      climbSteps: null,
    },
  ]);
});

describe("surfacing replaceItems's refusals", () => {
  it('passes through a 404 for a pattern it cannot resolve', async () => {
    const { NotFoundError } = await import('@/lib/api/errors');
    vi.mocked(replaceItems).mockRejectedValue(new NotFoundError('Pattern not found'));

    const res = await PUT(put({ items: [{ breakId: BREAK_ID, level: 3 }] }), ctx());
    expect(res.status).toBe(404);
  });

  it('passes through a 400 for an id not in this session', async () => {
    const { ValidationError } = await import('@/lib/api/errors');
    vi.mocked(replaceItems).mockRejectedValue(
      new ValidationError('That item is not in this session', {
        'items.0.id': ['Not an item of this session'],
      })
    );

    const res = await PUT(put({ items: [{ id: 'citemnotinthissession001', level: 3 }] }), ctx());
    expect(res.status).toBe(400);
  });
});
