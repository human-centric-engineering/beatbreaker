/**
 * Integration Test: GET /api/v1/admin/patterns
 *
 * The real `withAdminAuth` guard runs over a mocked session; `moderationQueue`
 * is mocked at its own module boundary — its grouping and query shape are
 * covered by `tests/unit/lib/app/breaks/community/reports.test.ts`.
 *
 * @see app/api/v1/admin/patterns/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v1/admin/patterns/route';
import {
  mockAdminUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(() => Promise.resolve(new Headers())) }));
vi.mock('@/lib/app/breaks/community/reports', () => ({ moderationQueue: vi.fn() }));

import { auth } from '@/lib/auth/config';
import { moderationQueue } from '@/lib/app/breaks/community/reports';

const url = 'http://localhost:3000/api/v1/admin/patterns';

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authorization', () => {
  it('401s without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(401);
    expect(moderationQueue).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('403s a signed-in non-admin', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(403);
    expect(moderationQueue).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });
});

it('200s the queue for an admin', async () => {
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
  vi.mocked(moderationQueue).mockResolvedValue([
    {
      breakId: 'cbrk00000000000000000001',
      title: 'Cold Carpet',
      slug: 'cold000001',
      visibility: 'published',
      owner: { username: 'ghostnotes', email: 'owner@example.com' },
      links: 1,
      reports: [
        {
          id: 'r1',
          reason: 'spam',
          note: null,
          createdAt: '2026-09-20T00:00:00.000Z',
          reporterGone: false,
        },
      ],
    },
  ]);

  const res = await GET(new NextRequest(url));

  expect(res.status).toBe(200);
  const { data } = await json<{ data: unknown[] }>(res);
  expect(data).toHaveLength(1);
  expect(moderationQueue).toHaveBeenCalledTimes(1);
});
