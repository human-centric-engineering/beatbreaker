/**
 * Integration Test: /api/v1/practice-sessions/:id/runs — runs of one of
 * yours (Phase 7D)
 *
 * The real `withAuth` guard runs over a mocked session; `listRuns` and
 * `recordRun` are mocked at their own module boundary — their scoping to the
 * caller and the daily cap are covered by `lib/app/breaks/saved/runs.ts`'s
 * own tests. This file is about the ROUTE's own composition: signed-out is
 * a 401, a non-cuid session id or an invalid body never reaches the data
 * layer, a `null` from the data layer is a 404, and a data-layer refusal
 * comes back with its own status and code.
 *
 * @see app/api/v1/practice-sessions/[id]/runs/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '@/app/api/v1/practice-sessions/[id]/runs/route';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/saved/runs', () => ({ listRuns: vi.fn(), recordRun: vi.fn() }));

import { auth } from '@/lib/auth/config';
import { listRuns, recordRun } from '@/lib/app/breaks/saved/runs';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const SESSION_ID = 'csesh00000000000000000001';
const RUN_ID = 'crun00000000000000000001';

const BASE = (id = SESSION_ID) => `http://localhost:3000/api/v1/practice-sessions/${id}/runs`;

function get(id = SESSION_ID): NextRequest {
  return new NextRequest(BASE(id));
}

function post(body: unknown, id = SESSION_ID): NextRequest {
  return new NextRequest(BASE(id), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const ctx = (id = SESSION_ID) => ({ params: Promise.resolve({ id }) });

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

const SLOT = { title: 'Test break', level: 3, targetBpm: 120, reachedBpm: 118, seconds: 60 };
const STARTED_AT = '2026-09-30T12:00:00.000Z';

const RUNS = [
  {
    id: RUN_ID,
    sessionId: SESSION_ID,
    sessionName: 'Warm-up',
    startedAt: STARTED_AT,
    endedAt: '2026-09-30T12:01:00.000Z',
    items: [SLOT],
  },
];

const RUN = RUNS[0];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(listRuns).mockResolvedValue(RUNS);
  vi.mocked(recordRun).mockResolvedValue(RUN);
});

describe('GET /api/v1/practice-sessions/:id/runs', () => {
  it('401s a signed-out caller, before calling listRuns', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await GET(get(), ctx());
    expect(res.status).toBe(401);
    expect(listRuns).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('400s a session id that is not a cuid, before calling listRuns', async () => {
    const res = await GET(get('not-a-cuid'), ctx('not-a-cuid'));
    expect(res.status).toBe(400);
    expect(listRuns).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('404s when listRuns finds nothing of the caller’s', async () => {
    vi.mocked(listRuns).mockResolvedValue(null);
    const res = await GET(get(), ctx());
    expect(res.status).toBe(404);
  });

  it('200s with the runs, calling listRuns with the session user id and session id', async () => {
    const res = await GET(get(), ctx());
    const body = await json<{ success: true; data: typeof RUNS }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(RUNS);
    expect(listRuns).toHaveBeenCalledWith(USER_ID, SESSION_ID);
  });
});

describe('POST /api/v1/practice-sessions/:id/runs', () => {
  it('401s a signed-out caller, before calling recordRun', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await POST(post({ startedAt: STARTED_AT, items: [SLOT] }), ctx());
    expect(res.status).toBe(401);
    expect(recordRun).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('400s a session id that is not a cuid, before calling recordRun', async () => {
    const res = await POST(
      post({ startedAt: STARTED_AT, items: [SLOT] }, 'not-a-cuid'),
      ctx('not-a-cuid')
    );
    expect(res.status).toBe(400);
    expect(recordRun).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it.each([
    ['zero slots played', { startedAt: STARTED_AT, items: [] }],
    ['a non-ISO startedAt', { startedAt: 'not-a-date', items: [SLOT] }],
    ['a slot bpm under the floor', { startedAt: STARTED_AT, items: [{ ...SLOT, targetBpm: 39 }] }],
    [
      'more than twelve slots',
      { startedAt: STARTED_AT, items: Array.from({ length: 13 }, () => SLOT) },
    ],
  ])('400s on %s, before calling recordRun', async (_, body) => {
    const res = await POST(post(body), ctx());
    expect(res.status).toBe(400);
    expect(recordRun).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('404s when recordRun finds nothing of the caller’s', async () => {
    vi.mocked(recordRun).mockResolvedValue(null);
    const res = await POST(post({ startedAt: STARTED_AT, items: [SLOT] }), ctx());
    expect(res.status).toBe(404);
  });

  it('201s with the logged run on success', async () => {
    const res = await POST(post({ startedAt: STARTED_AT, items: [SLOT] }), ctx());
    const body = await json<{ success: true; data: typeof RUN }>(res);

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(RUN);
  });

  it('calls recordRun with the session user id, the session id, and the parsed input', async () => {
    await POST(post({ startedAt: STARTED_AT, items: [SLOT] }), ctx());

    expect(recordRun).toHaveBeenCalledWith(USER_ID, SESSION_ID, {
      startedAt: STARTED_AT,
      items: [SLOT],
    });
  });

  describe("surfacing recordRun's refusals", () => {
    it('passes through a 429 at the daily cap', async () => {
      const { APIError } = await import('@/lib/api/errors');
      vi.mocked(recordRun).mockRejectedValue(
        new APIError("That's a lot of practice for one day. Try again tomorrow.", 'RUN_LIMIT', 429)
      );

      const res = await POST(post({ startedAt: STARTED_AT, items: [SLOT] }), ctx());
      const body = await json<{ success: false; error: { code: string } }>(res);

      expect(res.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RUN_LIMIT');
    });

    it('passes through a 400 for a start outside the allowed window', async () => {
      const { ValidationError } = await import('@/lib/api/errors');
      vi.mocked(recordRun).mockRejectedValue(
        new ValidationError('A run is logged within a day of starting it', {
          startedAt: ['In the last 24 hours'],
        })
      );

      const res = await POST(post({ startedAt: STARTED_AT, items: [SLOT] }), ctx());
      expect(res.status).toBe(400);
    });
  });
});
