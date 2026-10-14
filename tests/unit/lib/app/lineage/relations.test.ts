/**
 * One person's lineage in words (Phase 11-b): who they learned from, who they
 * passed it on to, and who was around them.
 */

import { describe, expect, it } from 'vitest';

import { relationsOf } from '@/lib/app/lineage/relations';
import type { LineageEdge, LineageNode } from '@/lib/app/lineage/types';

function node(id: string, label: string): LineageNode {
  return {
    id,
    slug: id.split(':')[1],
    kind: 'drummer',
    label,
    modelled: false,
    activeFrom: null,
    activeTo: null,
    styleKey: null,
    genres: [],
    tags: [],
    summary: null,
    devices: [],
  };
}

function edge(from: string, to: string, over: Partial<LineageEdge> = {}): LineageEdge {
  return {
    id: `${from}>${to}:${over.kind ?? 'influence'}`,
    from,
    to,
    relation: 'influenced',
    kind: 'influence',
    directed: true,
    strength: null,
    confidence: 'verified',
    scope: 'individual',
    declaredBy: to,
    recordingId: null,
    ...over,
  };
}

const ME = 'drummer:me';
const nodes = new Map(
  [
    node('drummer:zed', 'Zed'),
    node('drummer:abe', 'Abe'),
    node('drummer:kid', 'Kid'),
    node('drummer:pal', 'Pal'),
    node('drummer:old', 'Old'),
    node('drummer:new', 'New'),
  ].map((n) => [n.id, n])
);

describe('relationsOf', () => {
  const edges = [
    edge('drummer:zed', ME),
    edge('drummer:abe', ME, { kind: 'teacher', relation: 'taught' }),
    edge(ME, 'drummer:kid'),
    edge('drummer:pal', ME, { kind: 'peer', relation: 'bandmate', directed: false }),
    edge('drummer:old', ME, { kind: 'succession', relation: 'replaced' }),
    edge('style:a', 'style:b', { kind: 'style', relation: 'derived_from' }),
    edge('drummer:new', 'drummer:kid'),
  ];
  const rel = relationsOf(ME, edges, nodes);

  it('puts influences and teachers into the person under "learned from", by name', () => {
    expect(rel.learnedFrom.map((r) => r.node.label)).toEqual(['Abe', 'Zed']);
    expect(rel.learnedFrom[0].edge.kind).toBe('teacher');
  });

  it('puts the people they influenced under "passed on to"', () => {
    expect(rel.passedOnTo.map((r) => r.node.label)).toEqual(['Kid']);
  });

  it('puts peers and the chair they took under "around", not in the lineage', () => {
    expect(rel.around.map((r) => [r.node.label, r.edge.kind])).toEqual([
      ['Old', 'succession'],
      ['Pal', 'peer'],
    ]);
  });

  it('ignores edges that are not theirs, genre edges, and neighbours it was not given', () => {
    const all = [...rel.learnedFrom, ...rel.passedOnTo, ...rel.around];
    expect(all).toHaveLength(5);
    expect(relationsOf(ME, [edge('drummer:ghost', ME)], nodes).learnedFrom).toEqual([]);
  });

  it('keeps two claims about one pair as two entries', () => {
    const both = relationsOf(
      ME,
      [
        edge('drummer:pal', ME),
        edge('drummer:pal', ME, { kind: 'peer', relation: 'bandmate', directed: false }),
      ],
      nodes
    );
    expect(both.learnedFrom.map((r) => r.node.label)).toEqual(['Pal']);
    expect(both.around.map((r) => r.node.label)).toEqual(['Pal']);
  });
});
