/**
 * Integration Test: POST /api/v1/admin/patterns/:id
 *
 * The real `withAdminAuth` guard runs over a mocked session; `moderate` and
 * `logAdminAction` are mocked at their own module boundaries — `moderate`'s
 * behaviour is covered by
 * `tests/unit/lib/app/breaks/community/moderation.test.ts`.
 *
 * @see app/api/v1/admin/patterns/[id]/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/v1/admin/patterns/[id]/route';
import {
  mockAdminUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(() => Promise.resolve(new Headers())) }));
vi.mock('@/lib/app/breaks/community/moderation', () => ({
  moderate: vi.fn(),
  MODERATION_ACTIONS: ['unpublish', 'strip-links', 'dismiss'],
}));
vi.mock('@/lib/orchestration/audit/admin-audit-logger', () => ({ logAdminAction: vi.fn() }));

import { auth } from '@/lib/auth/config';
import { moderate } from '@/lib/app/breaks/community/moderation';
import { logAdminAction } from '@/lib/orchestration/audit/admin-audit-logger';

const ADMIN_ID = 'cmjbv4i3x00003wsloputgwul';
const BREAK_ID = 'cbrk00000000000000000001';

function post(body: unknown, id = BREAK_ID): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/admin/patterns/${id}`, {
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
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
});

describe('authorization', () => {
  it('401s without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await POST(post({ action: 'dismiss' }), ctx());
    expect(res.status).toBe(401);
    expect(moderate).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('403s a signed-in non-admin', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await POST(post({ action: 'dismiss' }), ctx());
    expect(res.status).toBe(403);
    expect(moderate).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });
});

it('400s an id that is not a cuid, before calling moderate', async () => {
  const res = await POST(post({ action: 'dismiss' }, 'nope'), ctx('nope'));
  expect(res.status).toBe(400);
  expect(moderate).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
});

it('400s an action outside the enum', async () => {
  const res = await POST(post({ action: 'delete-everything' }), ctx());
  expect(res.status).toBe(400);
  expect(moderate).not.toHaveBeenCalled(); // test-review:accept no_arg_called — schema validation short-circuits
});

it('calls moderate with the admin’s own id, never a body-supplied one, and logs the action', async () => {
  vi.mocked(moderate).mockResolvedValue({
    breakId: BREAK_ID,
    title: 'Cold Carpet',
    action: 'unpublish',
    reportsClosed: 3,
  });

  const res = await POST(
    post({ action: 'unpublish', userId: 'someone-else', adminId: 'someone-else' }),
    ctx()
  );

  expect(res.status).toBe(200);
  expect(moderate).toHaveBeenCalledWith(BREAK_ID, 'unpublish', ADMIN_ID);
  const { data } = await json<{ data: { breakId: string; action: string; reportsClosed: number } }>(
    res
  );
  expect(data).toEqual({ breakId: BREAK_ID, action: 'unpublish', reportsClosed: 3 });

  expect(logAdminAction).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: ADMIN_ID,
      action: 'pattern.unpublish',
      entityType: 'break',
      entityId: BREAK_ID,
      entityName: 'Cold Carpet',
      metadata: { reportsClosed: 3 },
    })
  );
});

it('names the audit action after whichever action ran, not always the same one', async () => {
  vi.mocked(moderate).mockResolvedValue({
    breakId: BREAK_ID,
    title: 'Cold Carpet',
    action: 'strip-links',
    reportsClosed: 1,
  });

  await POST(post({ action: 'strip-links' }), ctx());

  expect(logAdminAction).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'pattern.strip-links' })
  );
});

it('passes through moderate’s 404 for a break that no longer exists', async () => {
  const { NotFoundError } = await import('@/lib/api/errors');
  vi.mocked(moderate).mockRejectedValue(new NotFoundError(`Break ${BREAK_ID} not found`));

  const res = await POST(post({ action: 'dismiss' }), ctx());
  expect(res.status).toBe(404);
  expect(logAdminAction).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing happened to log
});
