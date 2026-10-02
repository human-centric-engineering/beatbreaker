/**
 * Integration Test: GET /api/v1/public/practice-sessions/:slug (Phase 7D, D32)
 *
 * No session (D2). The address space must not be probeable: a malformed slug
 * and a slug that parses but misses must be the SAME 404 — that equivalence
 * is the thing this file exists to pin, alongside the usual ETag/304 pair.
 * `getPublicSession` is mocked at its own module boundary — its clamping,
 * credit and PII-scrubbing are covered by
 * `tests/unit/lib/app/breaks/saved/session-sharing.test.ts`.
 *
 * @see app/api/v1/public/practice-sessions/[slug]/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/saved/session-sharing', () => ({
  getPublicSession: vi.fn(),
}));

import { GET } from '@/app/api/v1/public/practice-sessions/[slug]/route';
import { getPublicSession } from '@/lib/app/breaks/saved/session-sharing';

const SLUG = 'shrd000001';

function req(headers?: Record<string, string>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/public/practice-sessions/${SLUG}`, {
    headers,
  });
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

async function body(res: Response): Promise<{
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}> {
  return (await res.json()) as never;
}

const SESSION = {
  slug: SLUG,
  name: 'Warm-up',
  description: null,
  totalMinutes: 15,
  countIn: 1,
  author: 'ghostnotes',
  items: [
    {
      available: true as const,
      position: 0,
      title: 'Cold Carpet',
      link: { kind: 'pattern' as const, slug: 'cold000001' },
      level: 3,
      minutes: 15,
      targetBpm: 120,
      startBpm: 96,
      climbPct: 67,
      climbShape: 'steady' as const,
      climbSteps: 4,
    },
  ],
};

beforeEach(() => {
  vi.mocked(getPublicSession).mockReset();
  vi.mocked(getPublicSession).mockResolvedValue(SESSION);
});

describe('GET /api/v1/public/practice-sessions/:slug', () => {
  it('answers a caller with no session at all', async () => {
    const res = await GET(req(), ctx(SLUG));
    expect(res.status).toBe(200);
  });

  it('asks the data layer for the slug from the route params', async () => {
    await GET(req(), ctx(SLUG));
    expect(getPublicSession).toHaveBeenCalledWith(SLUG);
  });

  it('404s a malformed slug without calling the data layer', async () => {
    const res = await GET(req(), ctx('NOT-A-VALID-SLUG!!'));
    expect(res.status).toBe(404);
    expect(getPublicSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('404s a well-formed slug the data layer has no answer for', async () => {
    vi.mocked(getPublicSession).mockResolvedValue(null);
    const res = await GET(req(), ctx(SLUG));
    expect(res.status).toBe(404);
    expect(getPublicSession).toHaveBeenCalledWith(SLUG);
  });

  it('gives the malformed-slug 404 and the miss 404 the identical body — the address space cannot be probed', async () => {
    const malformed = await body(await GET(req(), ctx('!!not-valid!!')));

    vi.mocked(getPublicSession).mockResolvedValue(null);
    const miss = await body(await GET(req(), ctx(SLUG)));

    expect(malformed).toEqual(miss);
    expect(malformed.error?.code).toBe('NOT_FOUND');
  });

  it('carries an ETag and says the answer is shareable', async () => {
    const res = await GET(req(), ctx(SLUG));
    expect(res.headers.get('ETag')).toMatch(/^W\/"[\w-]+"$/);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
  });

  it('answers a matching If-None-Match with 304 and no body', async () => {
    const first = await GET(req(), ctx(SLUG));
    const etag = first.headers.get('ETag') as string;

    const second = await GET(req({ 'If-None-Match': etag }), ctx(SLUG));
    expect(second.status).toBe(304);
    expect(await second.text()).toBe('');
    expect(second.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
  });

  it('wraps the session from the data layer as the response data', async () => {
    const res = await GET(req(), ctx(SLUG));
    const data = await body(res);
    expect(data.data).toEqual(SESSION);
  });
});
