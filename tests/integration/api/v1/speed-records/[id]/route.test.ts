/**
 * Integration Test: DELETE /api/v1/speed-records/:id — delete one of yours
 * (Phase 7C)
 *
 * The real `withAuth` guard runs over a mocked session; `deleteSpeed` is
 * mocked at its own module boundary — its scoping to the caller is covered
 * by `lib/app/breaks/saved/speeds.ts`'s own tests.
 *
 * @see app/api/v1/speed-records/[id]/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';

import { DELETE } from '@/app/api/v1/speed-records/[id]/route';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/saved/speeds', () => ({ deleteSpeed: vi.fn() }));

import { auth } from '@/lib/auth/config';
import { deleteSpeed } from '@/lib/app/breaks/saved/speeds';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const RECORD_ID = 'cspd00000000000000000001';

function del(id = RECORD_ID): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/speed-records/${id}`, {
    method: 'DELETE',
  });
}

const ctx = (id = RECORD_ID) => ({ params: Promise.resolve({ id }) });

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(deleteSpeed).mockResolvedValue(true);
});

it('401s a signed-out caller, before calling deleteSpeed', async () => {
  vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
  const res = await DELETE(del(), ctx());
  expect(res.status).toBe(401);
  expect(deleteSpeed).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
});

it('400s an id that is not a cuid, before calling deleteSpeed', async () => {
  const res = await DELETE(del('nope'), ctx('nope'));
  expect(res.status).toBe(400);
  expect(deleteSpeed).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
});

it('404s when deleteSpeed finds nothing of the caller’s to delete', async () => {
  vi.mocked(deleteSpeed).mockResolvedValue(false);
  const res = await DELETE(del(), ctx());
  expect(res.status).toBe(404);
});

it('200s with the deleted id, calling deleteSpeed with the session user id', async () => {
  const res = await DELETE(del(), ctx());
  const body = await json<{ data: { id: string; deleted: boolean } }>(res);

  expect(res.status).toBe(200);
  expect(body.data).toEqual({ id: RECORD_ID, deleted: true });
  expect(deleteSpeed).toHaveBeenCalledWith(USER_ID, RECORD_ID);
});
