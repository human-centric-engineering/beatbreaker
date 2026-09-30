/**
 * Integration Test: GET /api/v1/admin/speeds — reported speeds (Phase 7C)
 *
 * The real `withAdminAuth` guard runs over a mocked session; `speedQueue` is
 * mocked at its own module boundary — its shape and ordering are covered by
 * `tests/unit/lib/app/breaks/community/reports.test.ts`.
 *
 * @see app/api/v1/admin/speeds/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v1/admin/speeds/route';
import {
  mockAdminUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/community/reports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/app/breaks/community/reports')>();
  return { ...actual, speedQueue: vi.fn() };
});

import { auth } from '@/lib/auth/config';
import { speedQueue } from '@/lib/app/breaks/community/reports';

function get(): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/admin/speeds');
}

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

const QUEUE = [
  {
    recordId: 'cspd00000000000000000001',
    title: 'Cold Carpet',
    slug: 'cold000001',
    level: 3,
    bpm: 140,
    recordedAt: '2026-09-01T00:00:00.000Z',
    videoUrl: null,
    listed: true,
    drummer: { username: 'ghostnotes', email: 'g@example.com' },
    reports: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminUser());
  vi.mocked(speedQueue).mockResolvedValue(QUEUE);
});

describe('authorization', () => {
  it('401s without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await GET(get());
    expect(res.status).toBe(401);
    expect(speedQueue).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('403s a signed-in non-admin', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser('USER'));
    const res = await GET(get());
    expect(res.status).toBe(403);
    expect(speedQueue).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });
});

it('200s with the queue speedQueue answers', async () => {
  const res = await GET(get());
  const body = await json<{ data: typeof QUEUE }>(res);

  expect(res.status).toBe(200);
  expect(body.data).toEqual(QUEUE);
});
