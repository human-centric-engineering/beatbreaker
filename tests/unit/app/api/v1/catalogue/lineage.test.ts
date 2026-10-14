/**
 * The lineage read endpoints. They are catalogue reads, so the same three
 * claims hold as for the rest of the catalogue (see `routes.test.ts`): no
 * session needed, an ETag with a 304, and `public` caching on both. Plus a
 * 404 that does not reach the database for a slug that cannot exist.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/lineage/data', () => ({
  getLineageGraph: vi.fn(),
  getLineageProfile: vi.fn(),
}));

import { GET as GRAPH } from '@/app/api/v1/catalogue/lineage/route';
import { GET as PROFILE } from '@/app/api/v1/catalogue/lineage/[slug]/route';
import { getLineageGraph, getLineageProfile, type LineageProfile } from '@/lib/app/lineage/data';
import type { LineageGraph, LineageNode } from '@/lib/app/lineage/types';

const PURDIE: LineageNode = {
  id: 'drummer:bernard-purdie',
  slug: 'bernard-purdie',
  kind: 'drummer',
  label: 'Bernard Purdie',
  modelled: true,
  activeFrom: 1958,
  activeTo: null,
  styleKey: null,
  genres: ['style:rnb-soul'],
  tags: ['shuffle'],
  summary: 'Session drummer.',
  devices: [],
};
const PORCARO: LineageNode = {
  ...PURDIE,
  id: 'drummer:jeff-porcaro',
  slug: 'jeff-porcaro',
  label: 'Jeff Porcaro',
  modelled: false,
};
const GRAPH_DATA: LineageGraph = {
  nodes: [PURDIE, PORCARO],
  edges: [
    {
      id: 'e1',
      from: PURDIE.id,
      to: PORCARO.id,
      relation: 'influenced',
      kind: 'influence',
      directed: true,
      strength: 0.7,
      confidence: 'widely_reported',
      scope: 'individual',
      declaredBy: PURDIE.id,
      recordingId: null,
    },
  ],
};
const PROFILE_DATA: LineageProfile = {
  node: PURDIE,
  record: { identity: { name: 'Bernard Purdie' } },
  edges: GRAPH_DATA.edges,
  neighbours: [PORCARO],
  recordings: [],
};

function get(path: string, headers?: Record<string, string>): Request {
  return new Request(`http://localhost:3000/api/v1/catalogue/lineage${path}`, { headers });
}
const slug = (s: string) => ({ params: Promise.resolve({ slug: s }) });

beforeEach(() => {
  vi.mocked(getLineageGraph).mockResolvedValue(GRAPH_DATA);
  vi.mocked(getLineageProfile).mockImplementation((s) =>
    Promise.resolve(s === 'bernard-purdie' ? PROFILE_DATA : null)
  );
});

describe('GET /api/v1/catalogue/lineage', () => {
  it('answers without a session with the whole graph, publicly cacheable', async () => {
    const res = await GRAPH(get(''));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
    const body = (await res.json()) as { success: boolean; data: LineageGraph };
    expect(body.success).toBe(true);
    expect(body.data.nodes.map((n) => n.id)).toEqual([PURDIE.id, PORCARO.id]);
    expect(body.data.edges[0]).toMatchObject({ from: PURDIE.id, to: PORCARO.id, directed: true });
  });

  it('answers a matching If-None-Match with a public 304', async () => {
    const etag = (await GRAPH(get(''))).headers.get('ETag');
    expect(etag).toBeTruthy();
    const again = await GRAPH(get('', { 'If-None-Match': etag! }));
    expect(again.status).toBe(304);
    expect(again.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
  });
});

describe('GET /api/v1/catalogue/lineage/[slug]', () => {
  it('returns a drummer’s profile', async () => {
    const res = await PROFILE(get('/bernard-purdie'), slug('bernard-purdie'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: LineageProfile };
    expect(body.data.node.label).toBe('Bernard Purdie');
    expect(body.data.neighbours.map((n) => n.slug)).toEqual(['jeff-porcaro']);
  });

  it('is a 404 for a slug nobody has', async () => {
    const res = await PROFILE(get('/nobody'), slug('nobody'));
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });

  it('is a 404 without a query for a slug that cannot exist', async () => {
    const res = await PROFILE(get('/..%2Fetc'), slug('../etc'));
    expect(res.status).toBe(404);
    expect(getLineageProfile).not.toHaveBeenCalledWith('../etc');
  });
});
