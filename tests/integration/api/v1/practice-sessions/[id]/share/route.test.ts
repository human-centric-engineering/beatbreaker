/**
 * Integration Test: /api/v1/practice-sessions/:id/share (Phase 7D, D32)
 *
 * The real `withAuth` guard runs over a mocked session; `shareSession` and
 * `unshareSession` are mocked at their own module boundary — their refusals
 * and the slug minting are covered by
 * `tests/unit/lib/app/breaks/saved/session-sharing.test.ts`. This file is
 * about the ROUTE's own composition: signed-out is a 401, a non-cuid id
 * never reaches the data layer, a `null`/`false` from the data layer is a
 * 404, and a data-layer refusal (409 `ITEMS_NOT_SHARED`, 400 empty session)
 * passes through with its own status and code.
 *
 * @see app/api/v1/practice-sessions/[id]/share/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, POST } from '@/app/api/v1/practice-sessions/[id]/share/route';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/saved/session-sharing', () => ({
  shareSession: vi.fn(),
  unshareSession: vi.fn(),
}));

import { auth } from '@/lib/auth/config';
import { shareSession, unshareSession } from '@/lib/app/breaks/saved/session-sharing';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const SESSION_ID = 'csesh00000000000000000001';

const BASE = (id = SESSION_ID) => `http://localhost:3000/api/v1/practice-sessions/${id}/share`;

function post(id = SESSION_ID): NextRequest {
  return new NextRequest(BASE(id), { method: 'POST' });
}

function del(id = SESSION_ID): NextRequest {
  return new NextRequest(BASE(id), { method: 'DELETE' });
}

const ctx = (id = SESSION_ID) => ({ params: Promise.resolve({ id }) });

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(shareSession).mockResolvedValue({ visibility: 'link', slug: 'shared001' });
  vi.mocked(unshareSession).mockResolvedValue(true);
});

describe('POST /api/v1/practice-sessions/:id/share', () => {
  it('401s a signed-out caller, before calling shareSession', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await POST(post(), ctx());
    expect(res.status).toBe(401);
    expect(shareSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('400s an id that is not a cuid, before calling shareSession', async () => {
    const res = await POST(post('not-a-cuid'), ctx('not-a-cuid'));
    expect(res.status).toBe(400);
    expect(shareSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('404s when shareSession finds nothing of the caller’s', async () => {
    vi.mocked(shareSession).mockResolvedValue(null);
    const res = await POST(post(), ctx());
    expect(res.status).toBe(404);
  });

  it('200s with the share state, calling shareSession with the session user id and the path id', async () => {
    const res = await POST(post(), ctx());
    const body = await json<{ success: true; data: { visibility: string; slug: string } }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ visibility: 'link', slug: 'shared001' });
    expect(shareSession).toHaveBeenCalledWith(USER_ID, SESSION_ID);
  });

  it('passes through a 409 ITEMS_NOT_SHARED, with the blocked items in details', async () => {
    const { APIError } = await import('@/lib/api/errors');
    vi.mocked(shareSession).mockRejectedValue(
      new APIError('Share it first', 'ITEMS_NOT_SHARED', 409, {
        items: [{ position: 0, title: 'Private one', reason: 'private' }],
      })
    );

    const res = await POST(post(), ctx());
    const body = await json<{
      success: false;
      error: { code: string; details?: { items: unknown[] } };
    }>(res);

    expect(res.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ITEMS_NOT_SHARED');
    expect(body.error.details?.items).toEqual([
      { position: 0, title: 'Private one', reason: 'private' },
    ]);
  });

  it('passes through a 400 for an empty session', async () => {
    const { ValidationError } = await import('@/lib/api/errors');
    vi.mocked(shareSession).mockRejectedValue(
      new ValidationError('Add a pattern before sharing the session', {
        items: ['No patterns yet'],
      })
    );

    const res = await POST(post(), ctx());
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/v1/practice-sessions/:id/share', () => {
  it('401s a signed-out caller, before calling unshareSession', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await DELETE(del(), ctx());
    expect(res.status).toBe(401);
    expect(unshareSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('400s an id that is not a cuid, before calling unshareSession', async () => {
    const res = await DELETE(del('not-a-cuid'), ctx('not-a-cuid'));
    expect(res.status).toBe(400);
    expect(unshareSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('404s when unshareSession finds nothing of the caller’s', async () => {
    vi.mocked(unshareSession).mockResolvedValue(false);
    const res = await DELETE(del(), ctx());
    expect(res.status).toBe(404);
  });

  it('200s with a private share state, calling unshareSession with the session user id and the path id', async () => {
    const res = await DELETE(del(), ctx());
    const body = await json<{ success: true; data: { visibility: string; slug: null } }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ visibility: 'private', slug: null });
    expect(unshareSession).toHaveBeenCalledWith(USER_ID, SESSION_ID);
  });
});
