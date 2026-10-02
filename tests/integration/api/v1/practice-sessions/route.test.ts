/**
 * Integration Test: /api/v1/practice-sessions — your practice sessions (Phase 7D)
 *
 * The real `withAuth` guard runs over a mocked session; `listSessions` and
 * `createSession` are mocked at their own module boundary — their behaviour
 * (the minutes split, target resolution, the session cap) is covered by
 * `lib/app/breaks/saved/sessions.ts`'s own tests. This file is about the
 * ROUTE's own composition: signed-out is a 401, an invalid body never
 * reaches the data layer, the parsed (defaulted, item-transformed) input is
 * what the data layer actually receives, and a data-layer refusal comes
 * back with its own status and code.
 *
 * @see app/api/v1/practice-sessions/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '@/app/api/v1/practice-sessions/route';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';
import { CLIMB_DEFAULTS } from '@/lib/app/practice/climb';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/saved/sessions', () => ({
  listSessions: vi.fn(),
  createSession: vi.fn(),
}));

import { auth } from '@/lib/auth/config';
import { createSession, listSessions } from '@/lib/app/breaks/saved/sessions';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const BREAK_ID = 'cbrk00000000000000000001';
const ENTRY_ID = 'centry000000000000000001';
const SESSION_ID = 'csesh00000000000000000001';

const BASE = 'http://localhost:3000/api/v1/practice-sessions';

function get(): NextRequest {
  return new NextRequest(BASE);
}

function post(body: unknown): NextRequest {
  return new NextRequest(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

const SUMMARIES = [
  {
    id: SESSION_ID,
    name: 'Warm-up',
    description: null,
    totalMinutes: 20,
    visibility: 'private' as const,
    slug: null,
    updatedAt: '2026-09-30T00:00:00.000Z',
    itemCount: 1,
    titles: ['Cold Carpet'],
    lastRunAt: null,
  },
];

const CREATED = {
  id: SESSION_ID,
  name: 'Warm-up',
  description: null,
  totalMinutes: 20,
  visibility: 'private' as const,
  slug: null,
  updatedAt: '2026-09-30T00:00:00.000Z',
  startPct: CLIMB_DEFAULTS.startPct,
  climbPct: CLIMB_DEFAULTS.climbPct,
  climbShape: CLIMB_DEFAULTS.climbShape,
  climbSteps: CLIMB_DEFAULTS.climbSteps,
  countIn: 1,
  createdAt: '2026-09-30T00:00:00.000Z',
  copiedFrom: null,
  items: [
    {
      id: 'citem00000000000000000001',
      position: 0,
      target: {
        kind: 'break' as const,
        id: BREAK_ID,
        title: 'Cold Carpet',
        meter: '4/4',
        bpm: 120,
        mine: true,
        slug: null,
      },
      title: 'Cold Carpet',
      level: 3,
      minutes: 20,
      minutesPinned: false,
      goalBpm: null,
      bestBpm: null,
      targetBpm: 120,
      startBpm: 96,
      startPct: 20,
      climbPct: 67,
      climbShape: 'steady' as const,
      climbSteps: 4,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(listSessions).mockResolvedValue(SUMMARIES);
  vi.mocked(createSession).mockResolvedValue(CREATED);
});

describe('GET /api/v1/practice-sessions', () => {
  it('401s a signed-out caller, before calling listSessions', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await GET(get());
    expect(res.status).toBe(401);
    expect(listSessions).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('200s with the list, asking listSessions for the session user', async () => {
    const res = await GET(get());
    const body = await json<{ success: true; data: typeof SUMMARIES }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(SUMMARIES);
    expect(listSessions).toHaveBeenCalledWith(USER_ID);
  });
});

describe('POST /api/v1/practice-sessions', () => {
  it('401s a signed-out caller, before calling createSession', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await POST(post({ name: 'Warm-up', totalMinutes: 20 }));
    expect(res.status).toBe(401);
    expect(createSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it.each([
    ['totalMinutes under the floor', { name: 'Warm-up', totalMinutes: 4 }],
    ['totalMinutes over the ceiling', { name: 'Warm-up', totalMinutes: 121 }],
    [
      'more than twelve items',
      {
        name: 'Warm-up',
        totalMinutes: 60,
        items: Array.from({ length: 13 }, () => ({ breakId: BREAK_ID, level: 3 })),
      },
    ],
    [
      'an item naming both a breakId and a libraryEntryId',
      {
        name: 'Warm-up',
        totalMinutes: 20,
        items: [{ breakId: BREAK_ID, libraryEntryId: ENTRY_ID, level: 3 }],
      },
    ],
    ['an item naming neither target', { name: 'Warm-up', totalMinutes: 20, items: [{ level: 3 }] }],
    [
      'a goalBpm under the floor',
      { name: 'Warm-up', totalMinutes: 20, items: [{ breakId: BREAK_ID, level: 3, goalBpm: 39 }] },
    ],
    [
      'a goalBpm over the ceiling',
      {
        name: 'Warm-up',
        totalMinutes: 20,
        items: [{ breakId: BREAK_ID, level: 3, goalBpm: 301 }],
      },
    ],
  ])('400s on %s, before calling createSession', async (_, body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect(createSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('201s with the created session on success', async () => {
    const res = await POST(post({ name: 'Warm-up', totalMinutes: 20 }));
    const body = await json<{ success: true; data: typeof CREATED }>(res);

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(CREATED);
  });

  it('calls createSession with the session user id and the parsed, defaulted input', async () => {
    await POST(
      post({
        name: 'Warm-up',
        totalMinutes: 20,
        items: [{ breakId: BREAK_ID, level: 3 }],
      })
    );

    expect(createSession).toHaveBeenCalledWith(USER_ID, {
      name: 'Warm-up',
      description: null,
      totalMinutes: 20,
      startPct: CLIMB_DEFAULTS.startPct,
      climbPct: CLIMB_DEFAULTS.climbPct,
      climbShape: CLIMB_DEFAULTS.climbShape,
      climbSteps: CLIMB_DEFAULTS.climbSteps,
      countIn: 1,
      items: [
        {
          target: { breakId: BREAK_ID },
          level: 3,
          goalBpm: null,
          minutes: 1,
          minutesPinned: false,
          startPct: null,
          climbPct: null,
          climbShape: null,
          climbSteps: null,
        },
      ],
    });
  });

  it('resolves a libraryEntryId item the same way', async () => {
    await POST(
      post({
        name: 'Warm-up',
        totalMinutes: 20,
        items: [{ libraryEntryId: ENTRY_ID, level: 2 }],
      })
    );

    expect(createSession).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        items: [expect.objectContaining({ target: { libraryEntryId: ENTRY_ID } })],
      })
    );
  });

  describe("surfacing createSession's refusals", () => {
    it('passes through a 429 at the session cap', async () => {
      const { APIError } = await import('@/lib/api/errors');
      vi.mocked(createSession).mockRejectedValue(
        new APIError(
          'You have 100 practice sessions. Delete one to make another.',
          'SESSION_LIMIT',
          429
        )
      );

      const res = await POST(post({ name: 'Warm-up', totalMinutes: 20 }));
      const body = await json<{ success: false; error: { code: string } }>(res);

      expect(res.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('SESSION_LIMIT');
    });

    it('passes through a 404 for a pattern it cannot resolve', async () => {
      const { NotFoundError } = await import('@/lib/api/errors');
      vi.mocked(createSession).mockRejectedValue(new NotFoundError('Pattern not found'));

      const res = await POST(
        post({ name: 'Warm-up', totalMinutes: 20, items: [{ breakId: BREAK_ID, level: 3 }] })
      );
      expect(res.status).toBe(404);
    });

    it('passes through a 400 for more patterns than minutes', async () => {
      const { ValidationError } = await import('@/lib/api/errors');
      vi.mocked(createSession).mockRejectedValue(
        new ValidationError('2 patterns need at least 2 minutes — a minute each', {
          totalMinutes: ['At least 2'],
        })
      );

      const res = await POST(
        post({ name: 'Warm-up', totalMinutes: 5, items: [{ breakId: BREAK_ID, level: 3 }] })
      );
      expect(res.status).toBe(400);
    });
  });
});
