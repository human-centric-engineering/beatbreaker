/**
 * GET /api/v1/public/patterns/:slug — one shared or published pattern, whole.
 *
 * No session (D2). The address space must not be probeable: a malformed slug
 * and a slug that parses but misses must be the SAME 404 — that equivalence
 * is the thing this file exists to pin, alongside the usual ETag/304 pair.
 *
 * @see app/api/v1/public/patterns/[slug]/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/public', () => ({
  getPublicPattern: vi.fn(),
}));

import { GET } from '@/app/api/v1/public/patterns/[slug]/route';
import { getPublicPattern } from '@/lib/app/breaks/community/public';

const SLUG = 'abc1234567';

function req(headers?: Record<string, string>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/public/patterns/${SLUG}`, { headers });
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

const PATTERN = {
  id: 'cbrk00000000000000000001',
  slug: SLUG,
  title: 'Cold Carpet',
  description: null,
  style: 'funk',
  meter: '4/4',
  bpm: 90,
  level: 5,
  difficulty: 2,
  publishedAt: '2026-01-01T00:00:00.000Z',
  author: 'ghostnotes',
  saves: 3,
  visibility: 'published',
  links: [],
  doc: { ver: 4 },
  basedOn: null,
  critique: { score: 80, verdict: 'Solid', playable: true },
  updatedAt: '2026-01-02T00:00:00.000Z',
};

beforeEach(() => {
  vi.mocked(getPublicPattern).mockReset();
  vi.mocked(getPublicPattern).mockResolvedValue(PATTERN as never);
});

describe('GET /api/v1/public/patterns/:slug', () => {
  it('answers a caller with no session at all', async () => {
    const res = await GET(req(), ctx(SLUG));
    expect(res.status).toBe(200);
  });

  it('asks the data layer for the slug from the route params', async () => {
    await GET(req(), ctx(SLUG));
    expect(getPublicPattern).toHaveBeenCalledWith(SLUG);
  });

  it('404s a malformed slug without calling the data layer', async () => {
    const res = await GET(req(), ctx('NOT-A-VALID-SLUG!!'));
    expect(res.status).toBe(404);
    expect(getPublicPattern).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('404s a well-formed slug the data layer has no answer for', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(null);
    const res = await GET(req(), ctx(SLUG));
    expect(res.status).toBe(404);
    expect(getPublicPattern).toHaveBeenCalledWith(SLUG);
  });

  it('gives the malformed-slug 404 and the miss 404 the identical body — the address space cannot be probed', async () => {
    const malformed = await body(await GET(req(), ctx('!!not-valid!!')));

    vi.mocked(getPublicPattern).mockResolvedValue(null);
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

  it('wraps the pattern from the data layer as the response data', async () => {
    const res = await GET(req(), ctx(SLUG));
    const data = await body(res);
    expect(data.data).toEqual(PATTERN);
  });
});
