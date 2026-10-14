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
    lineageNode: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    lineageEdge: { findMany: vi.fn() },
    lineageRecording: { findMany: vi.fn() },
  },
}));

import {
  findLineageSlug,
  getLineageGraph,
  getLineageProfile,
  listDrummers,
} from '@/lib/app/lineage/data';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logging';

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
    devices: [],
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
const findFirstNode = vi.mocked(prisma.lineageNode.findFirst);
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

describe('a node’s devices', () => {
  it('reads the stored devices, and drops and logs one that does not read', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const good = {
      kind: 'hemiola',
      ratio: '3:2',
      where: ['groove'],
      description: 'Crashes every dotted quarter.',
      examples: [],
      confidence: 'verified',
      sources: [{ title: 'A source', url: null }],
    };
    findNodes.mockResolvedValue([
      nodeRow('drummer:a', { devices: [good, { kind: 'samba-swing' }, 'nonsense'] }),
      nodeRow('drummer:b', { devices: { not: 'a list' } }),
    ] as never);
    findEdges.mockResolvedValue([] as never);

    const graph = await getLineageGraph();

    expect(graph.nodes[0].devices).toEqual([good]);
    expect(graph.nodes[1].devices).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/do not read/), {
      nodeId: 'drummer:a',
      dropped: 2,
    });
    expect(warn).toHaveBeenCalledWith(expect.any(String), { nodeId: 'drummer:b', dropped: 1 });
    warn.mockRestore();
  });

  it('drops a device whose sources were lost, and logs nothing for a node with none', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    findNodes.mockResolvedValue([
      nodeRow('drummer:a', {
        devices: [
          {
            kind: 'grouping',
            ratio: null,
            where: [],
            description: 'Threes.',
            examples: [],
            confidence: null,
            sources: [],
          },
        ],
      }),
      nodeRow('drummer:b'),
    ] as never);
    findEdges.mockResolvedValue([] as never);

    const graph = await getLineageGraph();

    expect(graph.nodes[0].devices).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
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

describe('listDrummers', () => {
  it('reads drummers only, modelled first, each with its record (null for a stub)', async () => {
    findNodes.mockResolvedValue([
      { ...nodeRow('drummer:a'), record: { identity: { name: 'A' } } },
      { ...nodeRow('drummer:b', { modelled: false }), record: null },
    ] as never);

    const drummers = await listDrummers();

    expect(findNodes.mock.calls[0][0]).toMatchObject({
      where: { kind: 'drummer' },
      select: expect.objectContaining({ record: true }),
      orderBy: [{ modelled: 'desc' }, { label: 'asc' }],
    });
    expect(drummers).toEqual([
      { node: expect.objectContaining({ id: 'drummer:a' }), record: { identity: { name: 'A' } } },
      { node: expect.objectContaining({ id: 'drummer:b', modelled: false }), record: null },
    ]);
  });
});

describe('findLineageSlug', () => {
  it('takes an exact name first, any case, never a genre, a modelled drummer first', async () => {
    findFirstNode.mockResolvedValueOnce({ slug: 'max-roach' } as never);

    expect(await findLineageSlug('  MAX ROACH ')).toBe('max-roach');
    expect(findFirstNode.mock.calls[0][0]).toMatchObject({
      where: { kind: { not: 'style' }, label: { equals: 'MAX ROACH', mode: 'insensitive' } },
      orderBy: [{ modelled: 'desc' }, { kind: 'asc' }, { slug: 'asc' }],
    });
    // the name answered: the slug is not tried
    expect(findFirstNode).toHaveBeenCalledTimes(1);
  });

  it('falls back to the slug as typed, or the name slugged, never a genre', async () => {
    findFirstNode
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ slug: 'horacio-hernandez' } as never);

    expect(await findLineageSlug('Horacio Hernández')).toBe('horacio-hernandez');
    expect(findFirstNode.mock.calls[1][0]).toMatchObject({
      where: { kind: { not: 'style' }, slug: { in: ['Horacio Hernández', 'horacio-hernandez'] } },
    });
  });

  it('is null for a blank name or one nobody has', async () => {
    expect(await findLineageSlug('   ')).toBeNull();
    expect(findFirstNode).not.toHaveBeenCalled();

    findFirstNode.mockResolvedValue(null);
    expect(await findLineageSlug('Nobody')).toBeNull();
  });
});
