/**
 * `GET /api/v1/catalogue/index?q=` — validates the query, searches the index,
 * answers like every catalogue read (ETag, public Cache-Control).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/lineage/data', () => ({ getCatalogueIndex: vi.fn() }));

import { GET } from '@/app/api/v1/catalogue/index/route';
import { getCatalogueIndex } from '@/lib/app/lineage/data';
import type { CatalogueIndex } from '@/lib/app/lineage/search';

const INDEX: CatalogueIndex = {
  drummers: [
    {
      slug: 'mike-joyce',
      label: 'Mike Joyce',
      candidate: true,
      styleKey: null,
      bands: ['The Smiths'],
    },
  ],
  songs: [
    {
      title: 'How Soon Is Now?',
      artist: 'The Smiths',
      record: 'Meat Is Murder',
      recordingId: 'rec:m',
      year: 1985,
      drums: 'x',
      drummerIds: ['drummer:mike-joyce'],
      scored: null,
      spotify: null,
      youtube: null,
      transcriptions: [],
    },
  ],
};

function get(qs: string, headers?: Record<string, string>): Request {
  return new Request(`http://localhost:3000/api/v1/catalogue/index${qs}`, { headers });
}

beforeEach(() => {
  vi.mocked(getCatalogueIndex).mockResolvedValue(INDEX);
});

describe('GET /api/v1/catalogue/index', () => {
  it.each([
    ['', 'missing'],
    ['?q=', 'empty'],
    ['?q=%20%20', 'blank'],
    [`?q=${'a'.repeat(101)}`, 'over 100'],
  ])('is a 400 for a %s query, without reading the index', async (qs) => {
    const res = await GET(get(qs));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
    expect(getCatalogueIndex).not.toHaveBeenCalled();
  });

  it('accepts exactly 100 characters', async () => {
    expect((await GET(get(`?q=${'a'.repeat(100)}`))).status).toBe(200);
  });

  it('answers with the search of the index, publicly cacheable', async () => {
    const res = await GET(get('?q=how+soon+is+now'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
    expect(res.headers.get('ETag')).toBeTruthy();
    const body = (await res.json()) as {
      success: boolean;
      data: {
        query: string;
        songs: Array<{ title: string; drummers: unknown[]; scored: unknown }>;
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.query).toBe('how soon is now');
    expect(body.data.songs).toEqual([
      expect.objectContaining({
        title: 'How Soon Is Now?',
        scored: null,
        drummers: [{ slug: 'mike-joyce', label: 'Mike Joyce', candidate: true }],
      }),
    ]);
    // the index's own fields (youtube links, transcriptions) are not sent
    expect(body.data.songs[0]).not.toHaveProperty('youtube');
  });

  it('answers a matching If-None-Match with a public 304', async () => {
    const etag = (await GET(get('?q=smiths'))).headers.get('ETag')!;
    const again = await GET(get('?q=smiths', { 'If-None-Match': etag }));
    expect(again.status).toBe(304);
    expect(again.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
  });
});
