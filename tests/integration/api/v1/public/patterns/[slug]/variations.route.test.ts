/**
 * GET /api/v1/public/patterns/:slug/variations — a published pattern's
 * published variations (Phase 7A).
 *
 * No session (D2). An address that is not a published pattern — malformed,
 * missing, private or a link share — is the same 404, as the pattern route
 * answers. The data layer is mocked; `listVariations` has its own tests.
 *
 * @see app/api/v1/public/patterns/[slug]/variations/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/public', async (importOriginal) => ({
  // the page-size constants the query schema reads are real
  ...(await importOriginal<typeof import('@/lib/app/breaks/community/public')>()),
  listVariations: vi.fn(),
}));

import { GET } from '@/app/api/v1/public/patterns/[slug]/variations/route';
import { listVariations } from '@/lib/app/breaks/community/public';

const SLUG = 'abc1234567';

function req(query = '', headers?: Record<string, string>): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/v1/public/patterns/${SLUG}/variations${query}`,
    { headers }
  );
}

const ctx = (slug = SLUG) => ({ params: Promise.resolve({ slug }) });

async function body(res: Response): Promise<{
  success: boolean;
  data?: Array<Record<string, unknown>>;
  meta?: { nextCursor: string | null };
  error?: { code: string };
}> {
  return (await res.json()) as never;
}

const CARD = {
  id: 'cbrk00000000000000000002',
  slug: 'warm000001',
  title: 'Warm Carpet',
  description: null,
  style: 'funk',
  meter: '4/4',
  bpm: 96,
  level: 5,
  difficulty: 2,
  linkKinds: [],
  publishedAt: '2026-02-01T00:00:00.000Z',
  author: 'ghostnotes',
  saves: 0,
};

beforeEach(() => {
  vi.mocked(listVariations).mockReset();
  vi.mocked(listVariations).mockResolvedValue({ patterns: [CARD], nextCursor: 'MjQ' });
});

describe('GET /api/v1/public/patterns/:slug/variations', () => {
  it('answers a caller with no session, with the cards and the next cursor', async () => {
    const res = await GET(req(), ctx());
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.data?.map((c) => c.slug)).toEqual(['warm000001']);
    expect(json.meta?.nextCursor).toBe('MjQ');
  });

  it('defaults to newest first, 24 to a page', async () => {
    await GET(req(), ctx());
    expect(listVariations).toHaveBeenCalledWith(SLUG, { sort: 'newest', limit: 24 });
  });

  it('passes the sort, limit and cursor it was given', async () => {
    await GET(req('?sort=saved&limit=6&cursor=MjQ'), ctx());
    expect(listVariations).toHaveBeenCalledWith(SLUG, { sort: 'saved', limit: 6, cursor: 'MjQ' });
  });

  it('400s a sort it does not know, before reading anything', async () => {
    const res = await GET(req('?sort=loudest'), ctx());
    expect(res.status).toBe(400);
    expect(listVariations).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('400s a limit over the page maximum', async () => {
    const res = await GET(req('?limit=500'), ctx());
    expect(res.status).toBe(400);
  });

  it('404s an address that is not a published pattern', async () => {
    vi.mocked(listVariations).mockResolvedValue(null);
    const res = await GET(req(), ctx());
    expect(res.status).toBe(404);
    expect((await body(res)).error?.code).toBe('NOT_FOUND');
  });

  it('404s a malformed slug the same way, without asking the data layer', async () => {
    const res = await GET(req(), ctx('NOT-A-SLUG!!'));
    expect(res.status).toBe(404);
    expect(listVariations).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('answers 304 to a matching If-None-Match', async () => {
    const first = await GET(req(), ctx());
    const etag = first.headers.get('etag');
    expect(etag).toBeTruthy();
    const again = await GET(req('', { 'if-none-match': etag ?? '' }), ctx());
    expect(again.status).toBe(304);
  });
});
