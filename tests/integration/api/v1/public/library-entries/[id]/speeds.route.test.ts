/**
 * Integration Test: GET /api/v1/public/library-entries/:id/speeds — a famous
 * break's speed table (Phase 7C).
 *
 * No session (D2). `entryTableTarget` and `readSpeedTable` are mocked —
 * their behaviour is covered by
 * `lib/app/breaks/community/speed-tables.ts`'s own tests. Same shape as
 * the published-pattern table route, minus the slug lookup.
 *
 * @see app/api/v1/public/library-entries/[id]/speeds/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/speed-tables', () => ({
  entryTableTarget: vi.fn(),
  readSpeedTable: vi.fn(),
}));

import { GET } from '@/app/api/v1/public/library-entries/[id]/speeds/route';
import { entryTableTarget, readSpeedTable } from '@/lib/app/breaks/community/speed-tables';

const ENTRY_ID = 'centry000000000000000001';
const TARGET = { target: { libraryEntryId: ENTRY_ID }, hash: 'hash-1' };

function req(query = '', headers?: Record<string, string>): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/v1/public/library-entries/${ENTRY_ID}/speeds${query}`,
    { headers }
  );
}

const ctx = (id = ENTRY_ID) => ({ params: Promise.resolve({ id }) });

async function body(res: Response): Promise<{
  success: boolean;
  data?: Array<Record<string, unknown>>;
  meta?: { total: number; nextCursor: string | null };
  error?: { code: string };
}> {
  return (await res.json()) as never;
}

const ROW = {
  id: 'cspd00000000000000000002',
  position: 1,
  username: 'clyde',
  bpm: 100,
  recordedAt: '2026-09-01T00:00:00.000Z',
  video: null,
};

beforeEach(() => {
  vi.mocked(entryTableTarget).mockReset();
  vi.mocked(readSpeedTable).mockReset();
  vi.mocked(entryTableTarget).mockResolvedValue(TARGET);
  vi.mocked(readSpeedTable).mockResolvedValue({ rows: [ROW], total: 1, nextCursor: null });
});

describe('GET /api/v1/public/library-entries/:id/speeds', () => {
  it('answers with the rows and the table length', async () => {
    const res = await GET(req(), ctx());
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.data).toEqual([ROW]);
    expect(json.meta?.total).toBe(1);
  });

  it('400s a level outside 1–5', async () => {
    const res = await GET(req('?level=9'), ctx());
    expect(res.status).toBe(400);
    expect(entryTableTarget).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('400s a limit over the page maximum', async () => {
    const res = await GET(req('?limit=99'), ctx());
    expect(res.status).toBe(400);
    expect(entryTableTarget).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('404s a non-cuid id, without asking the data layer', async () => {
    const res = await GET(req(), ctx('not-a-cuid'));
    expect(res.status).toBe(404);
    expect(entryTableTarget).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the id never reaches the data layer
    expect(readSpeedTable).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no target to read from
  });

  it('404s an id that is not a famous break everyone can see', async () => {
    vi.mocked(entryTableTarget).mockResolvedValue(null);
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
