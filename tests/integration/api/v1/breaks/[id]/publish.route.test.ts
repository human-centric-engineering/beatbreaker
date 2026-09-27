/**
 * Integration Test: POST /api/v1/breaks/:id/publish
 *
 * The real `withAuth` guard runs over a mocked session; `publishBreak` is
 * mocked at its own module boundary — its refusals and the write it performs
 * are covered by `tests/unit/lib/app/breaks/community/publish.test.ts`. This
 * file is about the ROUTE's own composition: id validation, the `confirm`
 * body check, and that the session user (never a body-supplied id) is what
 * is passed through.
 *
 * @see app/api/v1/breaks/[id]/publish/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/v1/breaks/[id]/publish/route';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/community/publish', () => ({ publishBreak: vi.fn() }));

import { auth } from '@/lib/auth/config';
import { publishBreak } from '@/lib/app/breaks/community/publish';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const BREAK_ID = 'cbrk00000000000000000001';

function post(body: unknown = { confirm: true }, id = BREAK_ID): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/breaks/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const ctx = (id = BREAK_ID) => ({ params: Promise.resolve({ id }) });

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
});

it('401s without a session, before calling publishBreak', async () => {
  vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
  const res = await POST(post(), ctx());
  expect(res.status).toBe(401);
  expect(publishBreak).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
});

it('400s an id that is not a cuid, before calling publishBreak', async () => {
  const res = await POST(post({ confirm: true }, 'nope'), ctx('nope'));
  expect(res.status).toBe(400);
  expect(publishBreak).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
});

it('400s a body without confirm: true', async () => {
  const res = await POST(post({}), ctx());
  expect(res.status).toBe(400);
  expect(publishBreak).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the tick is required
});

it('400s confirm: false the same as a missing one', async () => {
  const res = await POST(post({ confirm: false }), ctx());
  expect(res.status).toBe(400);
  expect(publishBreak).not.toHaveBeenCalled(); // test-review:accept no_arg_called — only a literal true counts
});

it('publishes with the session user’s id and the path’s break id, never a body one', async () => {
  vi.mocked(publishBreak).mockResolvedValue({
    id: BREAK_ID,
    visibility: 'published',
    slug: 'freshslug1',
    publishedAt: new Date('2026-09-27T00:00:00Z'),
  });

  const res = await POST(
    post({ confirm: true, userId: 'someone-else', id: 'cbrk00000000000000000099' }),
    ctx()
  );

  expect(res.status).toBe(200);
  expect(publishBreak).toHaveBeenCalledWith(USER_ID, BREAK_ID);
  const { data } = await json<{ data: { visibility: string; slug: string } }>(res);
  expect(data).toMatchObject({ visibility: 'published', slug: 'freshslug1' });
});

describe('surfacing publishBreak’s refusals', () => {
  it('passes through a refusal’s status and code untouched', async () => {
    const { APIError } = await import('@/lib/api/errors');
    vi.mocked(publishBreak).mockRejectedValue(
      new APIError('Choose a username first', 'USERNAME_REQUIRED', 409)
    );

    const res = await POST(post(), ctx());
    expect(res.status).toBe(409);
    const body = await json<{ error: { code: string } }>(res);
    expect(body.error.code).toBe('USERNAME_REQUIRED');
  });
});
