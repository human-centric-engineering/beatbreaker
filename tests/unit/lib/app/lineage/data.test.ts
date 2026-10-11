/**
 * The lineage data layer: rows in, `LineageNode` / `LineageEdge` out.
 *
 * What is worth holding here is what the mapping decides, because each one
 * fails quietly: a kind or confidence the types do not know is coerced to a
 * safe value rather than passed through; a profile's neighbours are the nodes
 * at the far end of its edges, whichever end it is; its recordings are found by
 * the drummer's id; and an unknown slug is `null`, not an empty profile.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  prisma: {
    lineageNode: { findMany: vi.fn(), findUnique: vi.fn() },
    lineageEdge: { findMany: vi.fn() },
    lineageRecording: { findMany: vi.fn() },
  },
}));

import { getLineageGraph, getLineageProfile } from '@/lib/app/lineage/data';
import { prisma } from '@/lib/db/client';

function nodeRow(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    slug: id.split(':')[1],
    kind: 'drummer',
    label: id,
    modelled: true,
    activeFrom: 1960,
    activeTo: null,
    styleKey: null,
    genres: [],
    tags: [],
    summary: null,
    ...extra,
  };
}

function edgeRow(fromId: string, toId: string, extra: Record<string, unknown> = {}) {
  return {
    id: `${fromId}>${toId}`,
    fromId,
    toId,
    relation: 'influenced',
    kind: 'influence',
    directed: true,
    strength: 0.5,
    confidence: 'verified',
    scope: 'individual',
    declaredBy: fromId,
    recordingId: null,
    ...extra,
  };
}

const findNodes = vi.mocked(prisma.lineageNode.findMany);
const findNode = vi.mocked(prisma.lineageNode.findUnique);
const findEdges = vi.mocked(prisma.lineageEdge.findMany);
const findRecordings = vi.mocked(prisma.lineageRecording.findMany);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getLineageGraph', () => {
  it('returns every node and edge, mapped', async () => {
    findNodes.mockResolvedValue([nodeRow('drummer:a'), nodeRow('drummer:b')] as never);
    findEdges.mockResolvedValue([edgeRow('drummer:a', 'drummer:b')] as never);

    const graph = await getLineageGraph();

    expect(graph.nodes.map((n) => n.id)).toEqual(['drummer:a', 'drummer:b']);
    expect(graph.edges).toEqual([
      expect.objectContaining({
        from: 'drummer:a',
        to: 'drummer:b',
        relation: 'influenced',
        kind: 'influence',
      }),
    ]);
    // the list leaves each record out
    expect(findNodes.mock.calls[0][0]).toMatchObject({
      select: expect.not.objectContaining({ record: true }),
    });
  });

  it('coerces a kind, confidence or scope it does not know to a safe value', async () => {
    findNodes.mockResolvedValue([nodeRow('x:a', { kind: 'alien' })] as never);
    findEdges.mockResolvedValue([
      edgeRow('x:a', 'x:b', { kind: 'telepathy', confidence: 'rumour', scope: 'galaxy' }),
      edgeRow('x:b', 'x:c', { confidence: null, scope: 'band' }),
    ] as never);

    const graph = await getLineageGraph();

    expect(graph.nodes[0].kind).toBe('musician');
    expect(graph.edges[0]).toMatchObject({
      kind: 'peer',
      confidence: 'needs_verification',
      scope: 'individual',
    });
    expect(graph.edges[1]).toMatchObject({ confidence: null, scope: 'band' });
  });
});

describe('getLineageProfile', () => {
  it('is null for a slug nobody has, without reading edges', async () => {
    findNode.mockResolvedValue(null);
    expect(await getLineageProfile('nobody')).toBeNull();
    expect(findEdges).not.toHaveBeenCalled();
  });

  it('returns the node, its record, its edges, the nodes at their far ends and its recordings', async () => {
    findNode.mockResolvedValue({
      ...nodeRow('drummer:me'),
      record: { identity: { name: 'Me' } },
    } as never);
    findEdges.mockResolvedValue([
      edgeRow('drummer:elder', 'drummer:me'),
      edgeRow('drummer:me', 'drummer:pupil', { relation: 'taught', kind: 'teacher' }),
    ] as never);
    findRecordings.mockResolvedValue([
      {
        id: 'rec:r',
        title: 'R',
        artist: 'Band',
        year: 1971,
        drummerIds: ['drummer:me'],
        record: { id: 'rec:r' },
      },
    ] as never);
    findNodes.mockResolvedValue([nodeRow('drummer:elder'), nodeRow('drummer:pupil')] as never);

    const profile = await getLineageProfile('me');

    expect(profile?.record).toEqual({ identity: { name: 'Me' } });
    expect(profile?.edges).toHaveLength(2);
    expect(findNodes.mock.calls[0][0]).toMatchObject({
      where: { id: { in: ['drummer:elder', 'drummer:pupil'] } },
    });
    expect(profile?.neighbours.map((n) => n.id)).toEqual(['drummer:elder', 'drummer:pupil']);
    expect(findRecordings.mock.calls[0][0]).toMatchObject({
      where: { drummerIds: { has: 'drummer:me' } },
    });
    expect(profile?.recordings).toEqual([
      { id: 'rec:r', title: 'R', artist: 'Band', year: 1971, record: { id: 'rec:r' } },
    ]);
  });
});
