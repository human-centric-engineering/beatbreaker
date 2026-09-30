/**
 * Integration Test: POST /api/v1/public/drummers/:username/report (task 7B.5)
 *
 * The real `withAuth` guard and the real `fileProfileReport` (which shares
 * the daily cap with `fileReport`) run over a mocked session and a mocked
 * Prisma — the Done-when for 7B.5 names route-level behaviour ("a repeat
 * updates the open report", "the daily cap ... counted over both kinds")
 * that lives in the data layer, so it is exercised here rather than stubbed
 * out from under itself.
 *
 * @see app/api/v1/public/drummers/[username]/report/route.ts
 * @see lib/app/breaks/community/reports.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/v1/public/drummers/[username]/report/route';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', () => ({
  prisma: {
    drummerProfile: { findUnique: vi.fn() },
    drummerReport: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    breakReport: { count: vi.fn() },
    speedReport: { count: vi.fn() },
  },
}));

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const OTHER_ID = 'clzx9k8p40000x8c2g3h5m7b1';
const USERNAME = 'ginger_baker';

function post(body: unknown, username = USERNAME): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/public/drummers/${username}/report`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const ctx = (username = USERNAME) => ({ params: Promise.resolve({ username }) });

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({ userId: OTHER_ID } as never);
  vi.mocked(prisma.drummerReport.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.drummerReport.count).mockResolvedValue(0);
  vi.mocked(prisma.breakReport.count).mockResolvedValue(0);
  vi.mocked(prisma.speedReport.count).mockResolvedValue(0);
  vi.mocked(prisma.drummerReport.create).mockResolvedValue({ id: 'rpt1' } as never);
  vi.mocked(prisma.drummerReport.update).mockResolvedValue({ id: 'rpt1' } as never);
});

it('401s a signed-out reader, before touching the database', async () => {
  vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
  const res = await POST(post({ reason: 'spam' }), ctx());
  expect(res.status).toBe(401);
  expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
});

it('201s on success, filing the report against the target’s user id', async () => {
  const res = await POST(post({ reason: 'bad-link', note: 'dead link' }), ctx());

  expect(res.status).toBe(201);
  expect(vi.mocked(prisma.drummerReport.create).mock.calls[0][0]).toMatchObject({
    data: { subjectId: OTHER_ID, reporterId: USER_ID, reason: 'bad-link', note: 'dead link' },
  });
  const { data } = await json<{ data: { id: string; status: string } }>(res);
  expect(data).toEqual({ id: 'rpt1', status: 'open' });
});

it('400s reporting your own profile, and writes nothing', async () => {
  vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({ userId: USER_ID } as never);
  const res = await POST(post({ reason: 'spam' }), ctx());
  expect(res.status).toBe(400);
  expect(prisma.drummerReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
});

it('404s an unknown username', async () => {
  vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
  const res = await POST(post({ reason: 'spam' }), ctx());
  expect(res.status).toBe(404);
  expect(prisma.drummerReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to report against
});

it('404s a malformed username, before touching the database', async () => {
  const res = await POST(post({ reason: 'spam' }, '!!not-a-username!!'), ctx('!!not-a-username!!'));
  expect(res.status).toBe(404);
  expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — shape check short-circuits
});

it('400s a reason outside the enum', async () => {
  const res = await POST(post({ reason: 'because' }), ctx());
  expect(res.status).toBe(400);
  expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — schema validation short-circuits
});

it('updates the existing open report rather than filing a second one', async () => {
  vi.mocked(prisma.drummerReport.findFirst).mockResolvedValue({ id: 'existing-report' } as never);

  const res = await POST(post({ reason: 'offensive' }), ctx());

  expect(res.status).toBe(201);
  const { data } = await json<{ data: { id: string; status: string } }>(res);
  expect(data).toEqual({ id: 'existing-report', status: 'open' });
  expect(vi.mocked(prisma.drummerReport.update).mock.calls[0][0]).toMatchObject({
    where: { id: 'existing-report' },
    data: { reason: 'offensive' },
  });
  expect(prisma.drummerReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the open report is updated, not duplicated
});

describe('the daily cap, counted over patterns, profiles and speeds together', () => {
  it('counts speed reports too (7C)', async () => {
    vi.mocked(prisma.breakReport.count).mockResolvedValue(10);
    vi.mocked(prisma.drummerReport.count).mockResolvedValue(5);
    vi.mocked(prisma.speedReport.count).mockResolvedValue(5);
    const res = await POST(post({ reason: 'spam' }), ctx());
    expect(res.status).toBe(429);
    expect(prisma.drummerReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the cap refuses before any write
  });

  it('429s once patterns + profiles reach the cap, and files nothing', async () => {
    vi.mocked(prisma.breakReport.count).mockResolvedValue(15);
    vi.mocked(prisma.drummerReport.count).mockResolvedValue(5);

    const res = await POST(post({ reason: 'spam' }), ctx());

    expect(res.status).toBe(429);
    expect(prisma.drummerReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the cap refuses before any write
  });

  it('is not tripped by pattern and profile counts that are each under the cap alone but not together', async () => {
    // 10 + 9 = 19, one under the cap of 20 — still allowed
    vi.mocked(prisma.breakReport.count).mockResolvedValue(10);
    vi.mocked(prisma.drummerReport.count).mockResolvedValue(9);

    const res = await POST(post({ reason: 'spam' }), ctx());

    expect(res.status).toBe(201);
  });

  it('does not check the cap at all when the report updates an existing open one', async () => {
    vi.mocked(prisma.drummerReport.findFirst).mockResolvedValue({ id: 'existing-report' } as never);
    vi.mocked(prisma.breakReport.count).mockResolvedValue(100);
    vi.mocked(prisma.drummerReport.count).mockResolvedValue(100);

    const res = await POST(post({ reason: 'spam' }), ctx());

    expect(res.status).toBe(201);
  });
});
