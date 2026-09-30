/**
 * Integration Test: GET /api/v1/admin/drummers (task 7B.6)
 *
 * The real `withAdminAuth` guard and the real `profileQueue`
 * (`lib/app/breaks/community/reports.ts`) run over a mocked session and a
 * mocked Prisma. `profileQueue` has no unit-test coverage of its own yet —
 * unlike `moderationQueue`, which `admin/patterns/route.test.ts` mocks at the
 * boundary because `reports.test.ts` already proves its shape — so the shape
 * this route is for (no reporter identity, profiles beside patterns) is
 * exercised here.
 *
 * @see app/api/v1/admin/drummers/route.ts
 * @see lib/app/breaks/community/reports.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v1/admin/drummers/route';
import {
  mockAdminUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', () => ({
  prisma: {
    drummerReport: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    drummerProfile: { findMany: vi.fn() },
    drummerAbout: { findMany: vi.fn() },
  },
}));

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';

const URL = 'http://localhost:3000/api/v1/admin/drummers';
const SUBJECT_ID = 'csubj00000000000000000001';
const REPORTER_ID = 'crptr00000000000000000001';

interface QueueItem {
  subjectId: string;
  username: string | null;
  email: string;
  bio: string | null;
  links: number;
  reports: Array<{ id: string; reason: string; reporterGone: boolean }>;
}

async function json(res: Response): Promise<{ data: QueueItem[] }> {
  return (await res.json()) as { data: QueueItem[] };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
  vi.mocked(prisma.drummerReport.findMany).mockResolvedValue([]);
  vi.mocked(prisma.user.findMany).mockResolvedValue([]);
  vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([]);
  vi.mocked(prisma.drummerAbout.findMany).mockResolvedValue([]);
});

describe('authorization', () => {
  it('401s without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await GET(new NextRequest(URL));
    expect(res.status).toBe(401);
    expect(prisma.drummerReport.findMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('403s a signed-in non-admin', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await GET(new NextRequest(URL));
    expect(res.status).toBe(403);
    expect(prisma.drummerReport.findMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });
});

describe('GET /api/v1/admin/drummers', () => {
  it('answers an empty queue when nothing is reported', async () => {
    const res = await GET(new NextRequest(URL));
    expect(res.status).toBe(200);
    const { data } = await json(res);
    expect(data).toEqual([]);
  });

  it('lists a reported profile with its reports, never the reporter’s identity', async () => {
    vi.mocked(prisma.drummerReport.findMany).mockResolvedValue([
      {
        id: 'rpt1',
        subjectId: SUBJECT_ID,
        reason: 'bad-link',
        note: 'sketchy link',
        createdAt: new Date('2026-09-20T00:00:00Z'),
        reporterId: REPORTER_ID,
      },
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: SUBJECT_ID, email: 'drummer@example.com' },
    ] as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([
      { userId: SUBJECT_ID, username: 'ginger_baker', bio: 'Funk drummer' },
    ] as never);
    vi.mocked(prisma.drummerAbout.findMany).mockResolvedValue([
      { userId: SUBJECT_ID, channels: [{ kind: 'youtube', url: 'x', drumming: true }] },
    ] as never);

    const { data } = await json(await GET(new NextRequest(URL)));

    expect(data).toEqual([
      {
        subjectId: SUBJECT_ID,
        username: 'ginger_baker',
        email: 'drummer@example.com',
        bio: 'Funk drummer',
        links: 1,
        reports: [
          {
            id: 'rpt1',
            reason: 'bad-link',
            note: 'sketchy link',
            createdAt: '2026-09-20T00:00:00.000Z',
            reporterGone: false,
          },
        ],
      },
    ]);
    // the reporter's own id is never in the response, only whether they're still around
    expect(JSON.stringify(data)).not.toContain(REPORTER_ID);
  });

  it('marks a report whose reporter account is gone, without naming who it was', async () => {
    vi.mocked(prisma.drummerReport.findMany).mockResolvedValue([
      {
        id: 'rpt1',
        subjectId: SUBJECT_ID,
        reason: 'spam',
        note: null,
        createdAt: new Date('2026-09-20T00:00:00Z'),
        reporterId: null,
      },
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: SUBJECT_ID, email: 'drummer@example.com' },
    ] as never);

    const { data } = await json(await GET(new NextRequest(URL)));
    expect(data[0].reports[0].reporterGone).toBe(true);
  });

  it('queries only open reports, oldest first', async () => {
    await GET(new NextRequest(URL));
    expect(vi.mocked(prisma.drummerReport.findMany).mock.calls[0][0]).toMatchObject({
      where: { status: 'open' },
      orderBy: { createdAt: 'asc' },
    });
  });
});
