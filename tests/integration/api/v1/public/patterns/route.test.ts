/**
 * GET /api/v1/public/patterns — the community library's list endpoint.
 *
 * No session at all (D2): the library is public, so this file mocks no auth.
 * The data layer (`listPublished`) is mocked; the route's own job — parsing
 * the query, short-circuiting on a bad one, and wrapping the answer in the
 * public envelope (ETag, `Cache-Control`, `meta.nextCursor`) — is what's
 * under test.
 *
 * @see app/api/v1/public/patterns/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/app/breaks/community/public')>();
  return { ...actual, listPublished: vi.fn() };
});

import { GET } from '@/app/api/v1/public/patterns/route';
import { listPublished } from '@/lib/app/breaks/community/public';

function req(query = ''): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/public/patterns${query}`);
}

function reqWithHeaders(query: string, headers: Record<string, string>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/public/patterns${query}`, { headers });
}

async function body(res: Response): Promise<{
  success: boolean;
  data?: unknown;
  meta?: { nextCursor: string | null };
  error?: { code: string };
}> {
  return (await res.json()) as never;
}

const CARD = {
  id: 'cbrk00000000000000000001',
  slug: 'abc1234567',
  title: 'Cold Carpet',
  description: null,
  style: 'funk',
  meter: '4/4',
  bpm: 90,
  level: 5,
  difficulty: 2,
  linkKinds: [],
  publishedAt: '2026-01-01T00:00:00.000Z',
  author: 'ghostnotes',
  saves: 3,
};

beforeEach(() => {
  vi.mocked(listPublished).mockReset();
  vi.mocked(listPublished).mockResolvedValue({ patterns: [CARD], nextCursor: null });
});

describe('GET /api/v1/public/patterns', () => {
  it('answers a caller with no session at all', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
  });

  it('400s a query over the page-size cap, without calling the data layer', async () => {
    const res = await GET(req('?limit=999'));
    const data = await body(res);
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
    expect(listPublished).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('400s an unknown meter, without calling the data layer', async () => {
    const res = await GET(req('?meter=bogus'));
    expect(res.status).toBe(400);
    expect(listPublished).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('carries an ETag and says the answer is shareable', async () => {
    const res = await GET(req());
    expect(res.headers.get('ETag')).toMatch(/^W\/"[\w-]+"$/);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
  });

  it('answers a matching If-None-Match with 304 and no body', async () => {
    const first = await GET(req());
    const etag = first.headers.get('ETag') as string;

    const second = await GET(reqWithHeaders('', { 'If-None-Match': etag }));
    expect(second.status).toBe(304);
    expect(await second.text()).toBe('');
    expect(second.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
    expect(second.headers.get('ETag')).toBe(etag);
  });

  it('puts nextCursor in meta when the data layer has one', async () => {
    vi.mocked(listPublished).mockResolvedValue({ patterns: [CARD], nextCursor: 'MjQ' });
    const res = await GET(req());
    const data = await body(res);
    expect(data.meta?.nextCursor).toBe('MjQ');
  });

  it('puts a null nextCursor in meta on the last page', async () => {
    const res = await GET(req());
    const data = await body(res);
    expect(data.meta?.nextCursor).toBeNull();
  });

  it('wraps the cards from the data layer as the response data', async () => {
    const res = await GET(req());
    const data = await body(res);
    expect(data.data).toEqual([CARD]);
  });

  it('parses the query and passes it through, defaults filled in', async () => {
    await GET(req('?sort=saved&limit=10'));
    expect(listPublished).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'saved', limit: 10 })
    );
  });

  it('passes filters through as parsed, not as raw strings', async () => {
    await GET(req('?style=funk&meter=4%2F4&tempo=fast&difficulty=2'));
    expect(listPublished).toHaveBeenCalledWith(
      expect.objectContaining({
        style: 'funk',
        meter: '4/4',
        tempo: 'fast',
        difficulty: 2, // coerced to a number, not the string "2"
      })
    );
  });

  it('defaults to newest and the default page size when nothing is given', async () => {
    await GET(req());
    expect(listPublished).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'newest', limit: 24 })
    );
  });
});
