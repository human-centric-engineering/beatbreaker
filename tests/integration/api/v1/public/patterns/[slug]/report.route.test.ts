/**
 * Integration Test: POST /api/v1/public/patterns/:slug/report
 *
 * The real `withAuth` guard runs over a mocked session; `fileReport` is
 * mocked at its own module boundary — its refusals and the write are covered
 * by `tests/unit/lib/app/breaks/community/reports.test.ts`. This file is
 * about the ROUTE's own composition: signed-out is a 401, a malformed slug
 * never reaches `fileReport`, and an invalid reason is a 400.
 *
 * @see app/api/v1/public/patterns/[slug]/report/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/v1/public/patterns/[slug]/report/route';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/community/reports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/app/breaks/community/reports')>();
  return { ...actual, fileReport: vi.fn() };
});

import { auth } from '@/lib/auth/config';
import { fileReport } from '@/lib/app/breaks/community/reports';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const SLUG = 'cold000001';

function post(body: unknown, slug = SLUG): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/public/patterns/${slug}/report`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const ctx = (slug = SLUG) => ({ params: Promise.resolve({ slug }) });

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
});

it('401s a signed-out reader, before calling fileReport', async () => {
  vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
  const res = await POST(post({ reason: 'spam' }), ctx());
  expect(res.status).toBe(401);
  expect(fileReport).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
});

it('404s a malformed slug, before calling fileReport', async () => {
  const res = await POST(post({ reason: 'spam' }, 'has/a/slash'), ctx('has/a/slash'));
  expect(res.status).toBe(404);
  expect(fileReport).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the slug never reaches the data layer
});

it('400s a reason outside the enum', async () => {
  const res = await POST(post({ reason: 'because' }), ctx());
  expect(res.status).toBe(400);
  expect(fileReport).not.toHaveBeenCalled(); // test-review:accept no_arg_called — schema validation short-circuits
});

it('201s on success, filing under the session user against the path’s slug', async () => {
  vi.mocked(fileReport).mockResolvedValue({ id: 'rpt1', status: 'open' });

  const res = await POST(post({ reason: 'bad-link', note: 'dead link' }), ctx());

  expect(res.status).toBe(201);
  expect(fileReport).toHaveBeenCalledWith(USER_ID, SLUG, { reason: 'bad-link', note: 'dead link' });
  const { data } = await json<{ data: { id: string; status: string } }>(res);
  expect(data).toEqual({ id: 'rpt1', status: 'open' });
});

describe('surfacing fileReport’s refusals', () => {
  it('passes through a 400 for your own pattern', async () => {
    const { ValidationError } = await import('@/lib/api/errors');
    vi.mocked(fileReport).mockRejectedValue(
      new ValidationError('You cannot report your own pattern', { slug: ['yours'] })
    );

    const res = await POST(post({ reason: 'spam' }), ctx());
    expect(res.status).toBe(400);
  });

  it('passes through a 429 at the daily cap', async () => {
    const { APIError } = await import('@/lib/api/errors');
    vi.mocked(fileReport).mockRejectedValue(
      new APIError('That’s a lot of reports', 'REPORT_LIMIT', 429)
    );

    const res = await POST(post({ reason: 'spam' }), ctx());
    expect(res.status).toBe(429);
  });
});
