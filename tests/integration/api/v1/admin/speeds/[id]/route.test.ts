/**
 * Integration Test: POST /api/v1/admin/speeds/:id — moderate a reported speed
 * (Phase 7C)
 *
 * The real `withAdminAuth` guard runs over a mocked session; `moderateSpeed`
 * and `logAdminAction` are mocked at their own module boundaries —
 * `moderateSpeed`'s behaviour is covered by
 * `tests/unit/lib/app/breaks/community/moderation.test.ts`.
 *
 * @see app/api/v1/admin/speeds/[id]/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/v1/admin/speeds/[id]/route';
import {
  mockAdminUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/community/moderation', () => ({
  moderateSpeed: vi.fn(),
  SPEED_MODERATION_ACTIONS: ['unlist', 'dismiss'],
}));
vi.mock('@/lib/orchestration/audit/admin-audit-logger', () => ({ logAdminAction: vi.fn() }));
vi.mock('@/lib/security/ip', () => ({ getClientIP: vi.fn(() => '127.0.0.1') }));

import { auth } from '@/lib/auth/config';
import { moderateSpeed } from '@/lib/app/breaks/community/moderation';
import { logAdminAction } from '@/lib/orchestration/audit/admin-audit-logger';

const ADMIN_ID = 'cmjbv4i3x00003wsloputgwul';
const RECORD_ID = 'cspd00000000000000000001';

function post(body: unknown, id = RECORD_ID): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/admin/speeds/${id}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const ctx = (id = RECORD_ID) => ({ params: Promise.resolve({ id }) });

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
  vi.mocked(moderateSpeed).mockResolvedValue({
    recordId: RECORD_ID,
    action: 'dismiss',
    reportsClosed: 1,
  });
});

describe('authorization', () => {
  it('401s without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await POST(post({ action: 'dismiss' }), ctx());
    expect(res.status).toBe(401);
    expect(moderateSpeed).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('403s a signed-in non-admin', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await POST(post({ action: 'dismiss' }), ctx());
    expect(res.status).toBe(403);
    expect(moderateSpeed).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });
});

it('400s an id that is not a cuid, before calling moderateSpeed', async () => {
  const res = await POST(post({ action: 'dismiss' }, 'nope'), ctx('nope'));
  expect(res.status).toBe(400);
  expect(moderateSpeed).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
});

it('400s an action outside the enum', async () => {
  const res = await POST(post({ action: 'delete-everything' }), ctx());
  expect(res.status).toBe(400);
  expect(moderateSpeed).not.toHaveBeenCalled(); // test-review:accept no_arg_called — schema validation short-circuits
});

it.each(['unlist', 'dismiss'] as const)('200s with the result for %s', async (action) => {
  vi.mocked(moderateSpeed).mockResolvedValue({ recordId: RECORD_ID, action, reportsClosed: 2 });

  const res = await POST(post({ action }), ctx());
  const body = await json<{ data: { recordId: string; action: string; reportsClosed: number } }>(
    res
  );

  expect(res.status).toBe(200);
  expect(body.data).toEqual({ recordId: RECORD_ID, action, reportsClosed: 2 });
  expect(moderateSpeed).toHaveBeenCalledWith(RECORD_ID, action, ADMIN_ID);
});

it('logs the admin action with the record id and how many reports closed', async () => {
  vi.mocked(moderateSpeed).mockResolvedValue({
    recordId: RECORD_ID,
    action: 'unlist',
    reportsClosed: 3,
  });

  await POST(post({ action: 'unlist' }), ctx());

  expect(logAdminAction).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: ADMIN_ID,
      action: 'speed.unlist',
      entityType: 'speed_record',
      entityId: RECORD_ID,
      metadata: { reportsClosed: 3 },
    })
  );
});

it('names the audit action after dismiss when that ran', async () => {
  await POST(post({ action: 'dismiss' }), ctx());
  expect(logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'speed.dismiss' }));
});

it('calls moderateSpeed with the admin’s own id, never a body-supplied one', async () => {
  await POST(post({ action: 'dismiss', adminId: 'someone-else' }), ctx());
  expect(moderateSpeed).toHaveBeenCalledWith(RECORD_ID, 'dismiss', ADMIN_ID);
});

it('passes through a 404 for a record that does not exist', async () => {
  const { NotFoundError } = await import('@/lib/api/errors');
  vi.mocked(moderateSpeed).mockRejectedValue(
    new NotFoundError(`Speed record ${RECORD_ID} not found`)
  );

  const res = await POST(post({ action: 'dismiss' }), ctx());
  expect(res.status).toBe(404);
  expect(logAdminAction).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing happened to log
});
