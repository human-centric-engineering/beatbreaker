/**
 * Integration Test: /api/v1/speed-records — your speed records (Phase 7C)
 *
 * The real `withAuth` guard runs over a mocked session; `recordSpeed` and
 * `yourSpeeds` are mocked at their own module boundary — their behaviour
 * (target resolution, the bpm ceiling, the daily cap, listing) is covered by
 * `lib/app/breaks/saved/speeds.ts`'s own tests. This file is about the
 * ROUTE's own composition: signed-out is a 401, a malformed or missing
 * target never reaches the data layer, and a data-layer refusal comes back
 * with its own status and code.
 *
 * @see app/api/v1/speed-records/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '@/app/api/v1/speed-records/route';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/saved/speeds', () => ({
  recordSpeed: vi.fn(),
  yourSpeeds: vi.fn(),
}));

import { auth } from '@/lib/auth/config';
import { recordSpeed, yourSpeeds } from '@/lib/app/breaks/saved/speeds';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const BREAK_ID = 'cbrk00000000000000000001';
const ENTRY_ID = 'centry000000000000000001';

const BASE = 'http://localhost:3000/api/v1/speed-records';

function get(query = ''): NextRequest {
  return new NextRequest(`${BASE}${query}`);
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

const YOUR_SPEEDS = {
  records: [],
  public: true,
  places: [],
  hasUsername: true,
  listSpeeds: 'ask' as const,
};

const RECORD = {
  id: 'cspd00000000000000000001',
  level: 3,
  bpm: 120,
  video: null,
  note: null,
  listed: false,
  recordedAt: '2026-09-30T00:00:00.000Z',
  title: 'Cold Carpet',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(yourSpeeds).mockResolvedValue(YOUR_SPEEDS);
  vi.mocked(recordSpeed).mockResolvedValue(RECORD);
});

describe('GET /api/v1/speed-records', () => {
  it('401s a signed-out caller, before calling yourSpeeds', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await GET(get(`?breakId=${BREAK_ID}`));
    expect(res.status).toBe(401);
    expect(yourSpeeds).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('400s a request with no target at all', async () => {
    const res = await GET(get());
    expect(res.status).toBe(400);
    expect(yourSpeeds).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('400s a request naming both a breakId and a libraryEntryId', async () => {
    const res = await GET(get(`?breakId=${BREAK_ID}&libraryEntryId=${ENTRY_ID}`));
    expect(res.status).toBe(400);
    expect(yourSpeeds).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('400s a breakId that is not a cuid', async () => {
    const res = await GET(get('?breakId=not-a-cuid'));
    expect(res.status).toBe(400);
    expect(yourSpeeds).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('404s a target yourSpeeds cannot resolve', async () => {
    vi.mocked(yourSpeeds).mockResolvedValue(null);
    const res = await GET(get(`?breakId=${BREAK_ID}`));
    expect(res.status).toBe(404);
  });

  it('200s with the data, asking yourSpeeds for the session user on the given target', async () => {
    const res = await GET(get(`?breakId=${BREAK_ID}`));
    const body = await json<{ data: typeof YOUR_SPEEDS }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toEqual(YOUR_SPEEDS);
    expect(yourSpeeds).toHaveBeenCalledWith(USER_ID, { breakId: BREAK_ID });
  });

  it('reads a libraryEntryId target the same way', async () => {
    await GET(get(`?libraryEntryId=${ENTRY_ID}`));
    expect(yourSpeeds).toHaveBeenCalledWith(USER_ID, { libraryEntryId: ENTRY_ID });
  });
});

describe('POST /api/v1/speed-records', () => {
  it('401s a signed-out caller, before calling recordSpeed', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockUnauthenticatedUser());
    const res = await POST(post({ breakId: BREAK_ID, level: 3, bpm: 120 }));
    expect(res.status).toBe(401);
    expect(recordSpeed).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it.each([
    ['bpm under the floor', { breakId: BREAK_ID, level: 3, bpm: 39 }],
    ['bpm over the ceiling', { breakId: BREAK_ID, level: 3, bpm: 301 }],
    ['level 0', { breakId: BREAK_ID, level: 0, bpm: 120 }],
    ['level 6', { breakId: BREAK_ID, level: 6, bpm: 120 }],
    ['both targets', { breakId: BREAK_ID, libraryEntryId: ENTRY_ID, level: 3, bpm: 120 }],
    [
      'a video link off the allowlist (a song, not a video)',
      {
        breakId: BREAK_ID,
        level: 3,
        bpm: 120,
        videoUrl: 'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    ],
  ])('400s on %s, before calling recordSpeed', async (_, body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect(recordSpeed).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('201s with the record on success', async () => {
    const res = await POST(post({ breakId: BREAK_ID, level: 3, bpm: 120 }));
    const body = await json<{ data: typeof RECORD }>(res);

    expect(res.status).toBe(201);
    expect(body.data).toEqual(RECORD);
  });

  it('calls recordSpeed with the session user id and the parsed target', async () => {
    await POST(post({ breakId: BREAK_ID, level: 3, bpm: 120, note: 'felt good' }));

    expect(recordSpeed).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        target: { breakId: BREAK_ID },
        level: 3,
        bpm: 120,
        note: 'felt good',
      })
    );
  });

  it('canonicalises a video link before recordSpeed ever sees it', async () => {
    await POST(
      post({ breakId: BREAK_ID, level: 3, bpm: 120, videoUrl: 'https://youtu.be/dQw4w9WgXcQ' })
    );

    expect(recordSpeed).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    );
  });

  describe('surfacing recordSpeed’s refusals', () => {
    it('passes through a 429 at the daily cap', async () => {
      const { APIError } = await import('@/lib/api/errors');
      vi.mocked(recordSpeed).mockRejectedValue(
        new APIError("That's a lot of speeds for one day. Try again tomorrow.", 'SPEED_LIMIT', 429)
      );

      const res = await POST(post({ breakId: BREAK_ID, level: 3, bpm: 120 }));
      expect(res.status).toBe(429);
    });

    it('passes through a 404 for a target it cannot resolve', async () => {
      const { NotFoundError } = await import('@/lib/api/errors');
      vi.mocked(recordSpeed).mockRejectedValue(new NotFoundError('Pattern not found'));

      const res = await POST(post({ breakId: BREAK_ID, level: 3, bpm: 120 }));
      expect(res.status).toBe(404);
    });

    it('passes through a 400 for a bpm outside the target meter’s ceiling', async () => {
      const { ValidationError } = await import('@/lib/api/errors');
      vi.mocked(recordSpeed).mockRejectedValue(
        new ValidationError('A speed is between 40 and 220 bpm', { bpm: ['Between 40 and 220'] })
      );

      const res = await POST(post({ breakId: BREAK_ID, level: 3, bpm: 250 }));
      expect(res.status).toBe(400);
    });
  });
});
