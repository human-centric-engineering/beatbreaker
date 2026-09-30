/**
 * Integration Test: POST /api/v1/admin/drummers/:id (task 7B.6)
 *
 * The real `withAdminAuth` guard and the real `moderateProfile`
 * (`lib/app/breaks/community/moderation.ts`) run over a mocked session and a
 * mocked Prisma — the array-of-promises `$transaction` form, the same house
 * pattern as `tests/unit/lib/app/breaks/community/moderation.test.ts` uses
 * for the pattern side of this file. `logAdminAction` is mocked at its own
 * boundary, as `admin/patterns/[id]/route.test.ts` does.
 *
 * @see app/api/v1/admin/drummers/[id]/route.ts
 * @see lib/app/breaks/community/moderation.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/v1/admin/drummers/[id]/route';
import {
  mockAdminUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', () => ({
  prisma: {
    drummerReport: { findFirst: vi.fn(), updateMany: vi.fn() },
    drummerAbout: { updateMany: vi.fn() },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));
vi.mock('@/lib/orchestration/audit/admin-audit-logger', () => ({ logAdminAction: vi.fn() }));

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';
import { logAdminAction } from '@/lib/orchestration/audit/admin-audit-logger';

const ADMIN_ID = 'cmjbv4i3x00003wsloputgwul';
// a valid-shaped cuid for the subject id path param
const SUBJECT_ID = 'csubj00000000000000000001';

function post(body: unknown, id = SUBJECT_ID): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/admin/drummers/${id}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const ctx = (id = SUBJECT_ID) => ({ params: Promise.resolve({ id }) });

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
  vi.mocked(prisma.drummerReport.findFirst).mockResolvedValue({ id: 'rpt1' } as never);
  vi.mocked(prisma.drummerReport.updateMany).mockResolvedValue({ count: 1 });
  vi.mocked(prisma.drummerAbout.updateMany).mockResolvedValue({ count: 1 });
});

describe('authorization', () => {
  it('401s without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await POST(post({ action: 'dismiss' }), ctx());
    expect(res.status).toBe(401);
    expect(prisma.drummerReport.findFirst).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('403s a signed-in non-admin', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await POST(post({ action: 'dismiss' }), ctx());
    expect(res.status).toBe(403);
    expect(prisma.drummerReport.findFirst).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });
});

it('400s an id that is not a cuid, before touching the database', async () => {
  const res = await POST(post({ action: 'dismiss' }, 'nope'), ctx('nope'));
  expect(res.status).toBe(400);
  expect(prisma.drummerReport.findFirst).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation short-circuits
});

it('400s an action outside the enum', async () => {
  const res = await POST(post({ action: 'delete-everything' }), ctx());
  expect(res.status).toBe(400);
  expect(prisma.drummerReport.findFirst).not.toHaveBeenCalled(); // test-review:accept no_arg_called — schema validation short-circuits
});

it('404s a profile id with no reports at all', async () => {
  vi.mocked(prisma.drummerReport.findFirst).mockResolvedValue(null);
  const res = await POST(post({ action: 'dismiss' }), ctx());
  expect(res.status).toBe(404);
});

describe('strip-links', () => {
  it('empties the channel links and closes only the open bad-link reports', async () => {
    const res = await POST(post({ action: 'strip-links' }), ctx());

    expect(res.status).toBe(200);
    expect(prisma.drummerAbout.updateMany).toHaveBeenCalledWith({
      where: { userId: SUBJECT_ID },
      data: { channels: [] },
    });
    expect(vi.mocked(prisma.drummerReport.updateMany).mock.calls[0][0]).toMatchObject({
      where: { subjectId: SUBJECT_ID, status: 'open', reason: 'bad-link' },
      data: expect.objectContaining({ status: 'actioned', resolvedById: ADMIN_ID }),
    });
    const { data } = await json<{
      data: { subjectId: string; action: string; reportsClosed: number };
    }>(res);
    expect(data).toEqual({ subjectId: SUBJECT_ID, action: 'strip-links', reportsClosed: 1 });
  });

  it('leaves non-bad-link open reports open', async () => {
    vi.mocked(prisma.drummerReport.updateMany).mockResolvedValue({ count: 0 });
    const res = await POST(post({ action: 'strip-links' }), ctx());
    const { data } = await json<{ data: { reportsClosed: number } }>(res);
    expect(data.reportsClosed).toBe(0);
    // the links were still stripped even though nothing closed
    expect(prisma.drummerAbout.updateMany).toHaveBeenCalled();
  });
});

describe('dismiss', () => {
  it('closes every open report as dismissed and touches nothing else', async () => {
    vi.mocked(prisma.drummerReport.updateMany).mockResolvedValue({ count: 3 });

    const res = await POST(post({ action: 'dismiss' }), ctx());

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.drummerReport.updateMany).mock.calls[0][0]).toMatchObject({
      where: { subjectId: SUBJECT_ID, status: 'open' },
      data: expect.objectContaining({ status: 'dismissed', resolvedById: ADMIN_ID }),
    });
    expect(prisma.drummerAbout.updateMany).not.toHaveBeenCalled();
    const { data } = await json<{ data: { reportsClosed: number } }>(res);
    expect(data.reportsClosed).toBe(3);
  });
});

it('calls moderateProfile with the admin’s own id, never a body-supplied one, and logs the action', async () => {
  await POST(post({ action: 'dismiss', adminId: 'someone-else' }), ctx());

  expect(vi.mocked(prisma.drummerReport.updateMany).mock.calls[0][0]).toMatchObject({
    data: expect.objectContaining({ resolvedById: ADMIN_ID }),
  });
  expect(logAdminAction).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: ADMIN_ID,
      action: 'profile.dismiss',
      entityType: 'user',
      entityId: SUBJECT_ID,
      metadata: { reportsClosed: 1 },
    })
  );
});

it('names the audit action after strip-links when that ran', async () => {
  await POST(post({ action: 'strip-links' }), ctx());
  expect(logAdminAction).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'profile.strip-links' })
  );
});
