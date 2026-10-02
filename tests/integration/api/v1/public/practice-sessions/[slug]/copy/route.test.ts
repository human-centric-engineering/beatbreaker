/**
 * Integration Test: POST /api/v1/public/practice-sessions/:slug/copy (Phase 7D, D32)
 *
 * The real `withAuth` guard runs over a mocked session; `copySharedSession`
 * is mocked at its own module boundary — its filtering, credit and the
 * session-cap refusal are covered by
 * `tests/unit/lib/app/breaks/saved/session-sharing.test.ts`. This file is
 * about the ROUTE's own composition: signed-out is a 401 (saving needs an
 * account even though reading does not), a malformed slug never reaches the
 * data layer, success is a 201, and a data-layer refusal passes through with
 * its own status and code.
 *
 * @see app/api/v1/public/practice-sessions/[slug]/copy/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/v1/public/practice-sessions/[slug]/copy/route';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/saved/session-sharing', () => ({
  copySharedSession: vi.fn(),
}));

import { auth } from '@/lib/auth/config';
import { copySharedSession } from '@/lib/app/breaks/saved/session-sharing';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const SLUG = 'shrd000001';

function post(slug = SLUG): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/public/practice-sessions/${slug}/copy`, {
    method: 'POST',
  });
}

const ctx = (slug = SLUG) => ({ params: Promise.resolve({ slug }) });

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

const COPY = {
  id: 'csess0000000000000000100',
  name: 'Warm-up',
  description: null,
  totalMinutes: 15,
  visibility: 'private' as const,
  slug: null,
  startPct: 20,
  climbPct: 67,
  climbShape: 'steady' as const,
  climbSteps: 4,
  countIn: 1,
  createdAt: '2026-10-02T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
  copiedFrom: { username: 'ghostnotes', slug: SLUG },
  items: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(copySharedSession).mockResolvedValue(COPY);
});

describe('POST /api/v1/public/practice-sessions/:slug/copy', () => {
  it('401s a signed-out caller, before calling copySharedSession', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await POST(post(), ctx());
    expect(res.status).toBe(401);
    expect(copySharedSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('404s a malformed slug, before calling copySharedSession', async () => {
    const res = await POST(post('has/a/slash'), ctx('has/a/slash'));
    expect(res.status).toBe(404);
    expect(copySharedSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the slug never reaches the data layer
  });

  it('201s on success, calling copySharedSession with the session user id and the path slug', async () => {
    const res = await POST(post(), ctx());
    const body = await json<{ success: true; data: typeof COPY }>(res);

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(COPY);
    expect(copySharedSession).toHaveBeenCalledWith(USER_ID, SLUG);
  });

  it('passes through a 404 when the session is not shared', async () => {
    const { NotFoundError } = await import('@/lib/api/errors');
    vi.mocked(copySharedSession).mockRejectedValue(new NotFoundError('Practice session not found'));

    const res = await POST(post(), ctx());
    expect(res.status).toBe(404);
  });

  it('passes through a 429 past the session cap', async () => {
    const { APIError } = await import('@/lib/api/errors');
    vi.mocked(copySharedSession).mockRejectedValue(
      new APIError('You have 100 practice sessions.', 'SESSION_LIMIT', 429)
    );

    const res = await POST(post(), ctx());
    expect(res.status).toBe(429);
  });
});
