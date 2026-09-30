/**
 * Integration Test: GET /api/v1/public/patterns/:slug/speeds — a published
 * pattern's speed table (Phase 7C).
 *
 * No session (D2). `patternTableTarget` and `readSpeedTable` are mocked —
 * their behaviour (who is on a table, ordering, the `DISTINCT ON` query) is
 * covered by `lib/app/breaks/community/speed-tables.ts`'s own tests.
 *
 * @see app/api/v1/public/patterns/[slug]/speeds/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/speed-tables', () => ({
  patternTableTarget: vi.fn(),
  readSpeedTable: vi.fn(),
}));

import { GET } from '@/app/api/v1/public/patterns/[slug]/speeds/route';
import { patternTableTarget, readSpeedTable } from '@/lib/app/breaks/community/speed-tables';

const SLUG = 'abc1234567';
const TARGET = { target: { breakId: 'cbrk00000000000000000001' }, hash: 'hash-1' };

function req(query = '', headers?: Record<string, string>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/public/patterns/${SLUG}/speeds${query}`, {
    headers,
  });
}

const ctx = (slug = SLUG) => ({ params: Promise.resolve({ slug }) });

async function body(res: Response): Promise<{
  success: boolean;
  data?: Array<Record<string, unknown>>;
  meta?: { total: number; nextCursor: string | null };
  error?: { code: string };
}> {
  return (await res.json()) as never;
}

const ROW = {
  id: 'cspd00000000000000000001',
  position: 1,
  username: 'ghostnotes',
  bpm: 140,
  recordedAt: '2026-09-01T00:00:00.000Z',
  video: null,
};

beforeEach(() => {
  vi.mocked(patternTableTarget).mockReset();
  vi.mocked(readSpeedTable).mockReset();
  vi.mocked(patternTableTarget).mockResolvedValue(TARGET);
  vi.mocked(readSpeedTable).mockResolvedValue({ rows: [ROW], total: 1, nextCursor: null });
});

describe('GET /api/v1/public/patterns/:slug/speeds', () => {
  it('answers with the rows and the table length', async () => {
    const res = await GET(req(), ctx());
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.data).toEqual([ROW]);
    expect(json.meta?.total).toBe(1);
    expect(json.meta?.nextCursor).toBeNull();
  });

  it('400s a level outside 1–5', async () => {
    const res = await GET(req('?level=9'), ctx());
    expect(res.status).toBe(400);
    expect(patternTableTarget).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('400s a limit over the page maximum', async () => {
    const res = await GET(req('?limit=99'), ctx());
    expect(res.status).toBe(400);
    expect(patternTableTarget).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('404s a malformed slug, without asking the data layer', async () => {
    const res = await GET(req(), ctx('NOT-A-SLUG!!'));
    expect(res.status).toBe(404);
    expect(patternTableTarget).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the slug never reaches the data layer
    expect(readSpeedTable).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no target to read from
  });

  it('404s an address that is not a published pattern', async () => {
    vi.mocked(patternTableTarget).mockResolvedValue(null);
    const res = await GET(req(), ctx());
    expect(res.status).toBe(404);
    const json = await body(res);
    expect(json.error?.code).toBe('NOT_FOUND');
    expect(readSpeedTable).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no target to read from
  });

  it('defaults to layer 5, no video filter, 25 to a page', async () => {
    await GET(req(), ctx());
    expect(readSpeedTable).toHaveBeenCalledWith(TARGET, {
      level: 5,
      video: false,
      limit: 25,
      cursor: undefined,
    });
  });

  it('passes the level, limit and cursor it was given', async () => {
    await GET(req('?level=2&limit=10&cursor=MjQ'), ctx());
    expect(readSpeedTable).toHaveBeenCalledWith(TARGET, {
      level: 2,
      video: false,
      limit: 10,
      cursor: 'MjQ',
    });
  });

  it('turns video=1 into the video-only filter', async () => {
    await GET(req('?video=1'), ctx());
    expect(readSpeedTable).toHaveBeenCalledWith(TARGET, expect.objectContaining({ video: true }));
  });

  it('answers 304 to a matching If-None-Match', async () => {
    const first = await GET(req(), ctx());
    const etag = first.headers.get('etag');
    expect(etag).toBeTruthy();
    const again = await GET(req('', { 'if-none-match': etag ?? '' }), ctx());
    expect(again.status).toBe(304);
  });
});
