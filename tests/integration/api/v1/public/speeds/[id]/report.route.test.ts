/**
 * Integration Test: POST /api/v1/public/speeds/:id/report — report a row on a
 * speed table (Phase 7C).
 *
 * The real `withAuth` guard runs over a mocked session; `fileSpeedReport` is
 * mocked at its own module boundary — its refusals and the write are covered
 * by `tests/unit/lib/app/breaks/community/reports.test.ts`. This file is
 * about the ROUTE's own composition: signed-out is a 401, a non-cuid id
 * never reaches `fileSpeedReport`, and an invalid reason or an overlong note
 * is a 400.
 *
 * @see app/api/v1/public/speeds/[id]/report/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/v1/public/speeds/[id]/report/route';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/community/reports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/app/breaks/community/reports')>();
  return { ...actual, fileSpeedReport: vi.fn() };
});

import { auth } from '@/lib/auth/config';
import { fileSpeedReport } from '@/lib/app/breaks/community/reports';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const RECORD_ID = 'cspd00000000000000000001';

function post(body: unknown, id = RECORD_ID): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/public/speeds/${id}/report`, {
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
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
});

it('401s a signed-out reader, before calling fileSpeedReport', async () => {
  vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
  const res = await POST(post({ reason: 'wrong-speed' }), ctx());
  expect(res.status).toBe(401);
  expect(fileSpeedReport).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
});

it('404s a non-cuid id, before calling fileSpeedReport', async () => {
  const res = await POST(post({ reason: 'wrong-speed' }, 'not-a-cuid'), ctx('not-a-cuid'));
  expect(res.status).toBe(404);
  expect(fileSpeedReport).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the id never reaches the data layer
});

it('400s a reason outside the enum', async () => {
  const res = await POST(post({ reason: 'because' }), ctx());
  expect(res.status).toBe(400);
  expect(fileSpeedReport).not.toHaveBeenCalled(); // test-review:accept no_arg_called — schema validation short-circuits
});

it('400s a note over 500 characters', async () => {
  const res = await POST(post({ reason: 'wrong-speed', note: 'x'.repeat(501) }), ctx());
  expect(res.status).toBe(400);
  expect(fileSpeedReport).not.toHaveBeenCalled(); // test-review:accept no_arg_called — schema validation short-circuits
});

it('201s on success, filing under the session user against the path’s record id', async () => {
  vi.mocked(fileSpeedReport).mockResolvedValue({ id: 'rpt1', status: 'open' });

  const res = await POST(post({ reason: 'bad-link', note: 'dead link' }), ctx());

  expect(res.status).toBe(201);
  expect(fileSpeedReport).toHaveBeenCalledWith(USER_ID, RECORD_ID, {
    reason: 'bad-link',
    note: 'dead link',
  });
  const { data } = await json<{ data: { id: string; status: string } }>(res);
  expect(data).toEqual({ id: 'rpt1', status: 'open' });
});

describe('surfacing fileSpeedReport’s refusals', () => {
  it('passes through a 404 for a record on no table', async () => {
    const { NotFoundError } = await import('@/lib/api/errors');
    vi.mocked(fileSpeedReport).mockRejectedValue(new NotFoundError('Speed not found'));

    const res = await POST(post({ reason: 'wrong-speed' }), ctx());
    expect(res.status).toBe(404);
  });

  it('passes through a 400 for your own record', async () => {
    const { ValidationError } = await import('@/lib/api/errors');
    vi.mocked(fileSpeedReport).mockRejectedValue(
      new ValidationError('You cannot report your own speed', { id: ['yours'] })
    );

    const res = await POST(post({ reason: 'wrong-speed' }), ctx());
    expect(res.status).toBe(400);
  });

  it('passes through a 429 at the daily cap', async () => {
    const { APIError } = await import('@/lib/api/errors');
    vi.mocked(fileSpeedReport).mockRejectedValue(
      new APIError('That’s a lot of reports', 'REPORT_LIMIT', 429)
    );

    const res = await POST(post({ reason: 'wrong-speed' }), ctx());
    expect(res.status).toBe(429);
  });
});
