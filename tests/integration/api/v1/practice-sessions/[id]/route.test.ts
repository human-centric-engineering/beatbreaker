/**
 * Integration Test: /api/v1/practice-sessions/:id — one of yours (Phase 7D)
 *
 * The real `withAuth` guard runs over a mocked session; `readSession`,
 * `updateSession` and `deleteSession` are mocked at their own module
 * boundary — their scoping to the caller and the minutes re-split are
 * covered by `lib/app/breaks/saved/sessions.ts`'s own tests. This file is
 * about the ROUTE's own composition: signed-out is a 401, a non-cuid id or
 * an invalid body never reaches the data layer, a `null`/`false` from the
 * data layer is a 404, and a data-layer refusal comes back with its own
 * status and code.
 *
 * @see app/api/v1/practice-sessions/[id]/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, GET, PATCH } from '@/app/api/v1/practice-sessions/[id]/route';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/saved/sessions', () => ({
  readSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
}));

import { auth } from '@/lib/auth/config';
import { deleteSession, readSession, updateSession } from '@/lib/app/breaks/saved/sessions';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const SESSION_ID = 'csesh00000000000000000001';

const BASE = (id = SESSION_ID) => `http://localhost:3000/api/v1/practice-sessions/${id}`;

function get(id = SESSION_ID): NextRequest {
  return new NextRequest(BASE(id));
}

function patch(body: unknown, id = SESSION_ID): NextRequest {
  return new NextRequest(BASE(id), {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function del(id = SESSION_ID): NextRequest {
  return new NextRequest(BASE(id), { method: 'DELETE' });
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
      id: 'citem00000000000000000001',
      position: 0,
      target: {
        kind: 'break' as const,
        id: 'cbrk00000000000000000001',
        title: 'Cold Carpet',
        meter: '4/4',
        bpm: 120,
        mine: true,
        slug: null,
      },
      title: 'Cold Carpet',
      level: 3,
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
  vi.mocked(readSession).mockResolvedValue(VIEW);
  vi.mocked(updateSession).mockResolvedValue(VIEW);
  vi.mocked(deleteSession).mockResolvedValue(true);
});

describe('GET /api/v1/practice-sessions/:id', () => {
  it('401s a signed-out caller, before calling readSession', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await GET(get(), ctx());
    expect(res.status).toBe(401);
    expect(readSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('400s an id that is not a cuid, before calling readSession', async () => {
    const res = await GET(get('not-a-cuid'), ctx('not-a-cuid'));
    expect(res.status).toBe(400);
    expect(readSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('404s when readSession finds nothing of the caller’s', async () => {
    vi.mocked(readSession).mockResolvedValue(null);
    const res = await GET(get(), ctx());
    expect(res.status).toBe(404);
  });

  it('200s with the session, calling readSession with the session user id', async () => {
    const res = await GET(get(), ctx());
    const body = await json<{ success: true; data: typeof VIEW }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(VIEW);
    expect(readSession).toHaveBeenCalledWith(USER_ID, SESSION_ID);
  });
});

describe('PATCH /api/v1/practice-sessions/:id', () => {
  it('401s a signed-out caller, before calling updateSession', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await PATCH(patch({ name: 'New name' }), ctx());
    expect(res.status).toBe(401);
    expect(updateSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('400s an id that is not a cuid, before calling updateSession', async () => {
    const res = await PATCH(patch({ name: 'New name' }, 'not-a-cuid'), ctx('not-a-cuid'));
    expect(res.status).toBe(400);
    expect(updateSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('400s an empty body, before calling updateSession', async () => {
    const res = await PATCH(patch({}), ctx());
    expect(res.status).toBe(400);
    expect(updateSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it.each([
    ['totalMinutes under the floor', { totalMinutes: 4 }],
    ['totalMinutes over the ceiling', { totalMinutes: 121 }],
  ])('400s on %s, before calling updateSession', async (_, body) => {
    const res = await PATCH(patch(body), ctx());
    expect(res.status).toBe(400);
    expect(updateSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('404s when updateSession finds nothing of the caller’s', async () => {
    vi.mocked(updateSession).mockResolvedValue(null);
    const res = await PATCH(patch({ name: 'New name' }), ctx());
    expect(res.status).toBe(404);
  });

  it('200s with the updated session, calling updateSession with the session user id and the parsed input', async () => {
    const res = await PATCH(patch({ name: 'New name', totalMinutes: 30 }), ctx());
    const body = await json<{ success: true; data: typeof VIEW }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toEqual(VIEW);
    expect(updateSession).toHaveBeenCalledWith(USER_ID, SESSION_ID, {
      name: 'New name',
      totalMinutes: 30,
    });
  });

  it('passes through a 400 for a data-layer refusal (more patterns than minutes)', async () => {
    const { ValidationError } = await import('@/lib/api/errors');
    vi.mocked(updateSession).mockRejectedValue(
      new ValidationError('3 patterns need at least 3 minutes — a minute each', {
        totalMinutes: ['At least 3'],
      })
    );

    const res = await PATCH(patch({ totalMinutes: 5 }), ctx());
    const body = await json<{ success: false; error: { code: string } }>(res);

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /api/v1/practice-sessions/:id', () => {
  it('401s a signed-out caller, before calling deleteSession', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await DELETE(del(), ctx());
    expect(res.status).toBe(401);
    expect(deleteSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('400s an id that is not a cuid, before calling deleteSession', async () => {
    const res = await DELETE(del('not-a-cuid'), ctx('not-a-cuid'));
    expect(res.status).toBe(400);
    expect(deleteSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('404s when deleteSession finds nothing of the caller’s to delete', async () => {
    vi.mocked(deleteSession).mockResolvedValue(false);
    const res = await DELETE(del(), ctx());
    expect(res.status).toBe(404);
  });

  it('200s with the deleted id, calling deleteSession with the session user id', async () => {
    const res = await DELETE(del(), ctx());
    const body = await json<{ success: true; data: { id: string; deleted: boolean } }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: SESSION_ID, deleted: true });
    expect(deleteSession).toHaveBeenCalledWith(USER_ID, SESSION_ID);
  });
});
