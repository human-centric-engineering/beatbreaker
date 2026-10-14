/**
 * The lineage map's layout (Phase 11-b, D49): where each person goes, which
 * year a stub is given, and who lights up when one is traced.
 *
 * Small hand-made graphs for each rule, then the real records for what only
 * the whole corpus can show (every genre has a family; no labels collide).
 */

import { describe, expect, it } from 'vitest';

import { buildLineage } from '@/lib/app/lineage/build';
import {
  FAMILIES,
  GENRE_FAMILY,
  LAYOUT,
  edgePath,
  isTentative,
  layoutLineage,
  meetsConfidence,
  traceLineage,
} from '@/lib/app/lineage/layout';
import type {
  DeviceKind,
  LineageDevice,
  LineageEdge,
  LineageGraph,
  LineageNode,
} from '@/lib/app/lineage/types';
import { DRUMMER_MODEL_DIR, readCorpus } from '@/scripts/lineage/read-corpus';

function node(id: string, over: Partial<LineageNode> = {}): LineageNode {
  const slug = id.split(':')[1] ?? id;
  return {
    id,
    slug,
    kind: id.startsWith('style:') ? 'style' : 'drummer',
    label: slug,
    modelled: false,
    activeFrom: null,
    activeTo: null,
    styleKey: null,
    genres: [],
    tags: [],
    summary: null,
    devices: [],
    ...over,
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

const peer = (a: string, b: string, over: Partial<LineageEdge> = {}) =>
  edge(a, b, { kind: 'peer', relation: 'bandmate', directed: false, ...over });

describe('confidence', () => {
  it('draws dashed below likely, and a claim with no confidence', () => {
    expect(isTentative('verified')).toBe(false);
    expect(isTentative('widely_reported')).toBe(false);
    expect(isTentative('likely')).toBe(false);
    expect(isTentative('inferred')).toBe(true);
    expect(isTentative('needs_verification')).toBe(true);
    expect(isTentative(null)).toBe(true);
  });

  it('keeps a claim at or above the floor, and everything with no floor', () => {
    expect(meetsConfidence('widely_reported', 'likely')).toBe(true);
    expect(meetsConfidence('likely', 'likely')).toBe(true);
    expect(meetsConfidence('inferred', 'likely')).toBe(false);
    expect(meetsConfidence('likely', 'verified')).toBe(false);
    expect(meetsConfidence(null, 'likely')).toBe(false);
    expect(meetsConfidence(null, null)).toBe(true);
  });
});

describe('traceLineage', () => {
  // a → b → c, b → d, e — b (peer), f → a (teacher)
  const edges = [
    edge('a', 'b'),
    edge('b', 'c'),
    edge('b', 'd'),
    peer('e', 'b'),
    edge('f', 'a', { kind: 'teacher', relation: 'taught' }),
  ];

  it('follows directed edges back to every ancestor and on to every descendant', () => {
    const t = traceLineage(edges, 'b');
    expect([...t.ancestors].sort()).toEqual(['a', 'f']);
    expect([...t.descendants].sort()).toEqual(['c', 'd']);
  });

  it('does not travel along an undirected edge', () => {
    const t = traceLineage(edges, 'b');
    expect(t.ancestors.has('e')).toBe(false);
    expect(t.descendants.has('e')).toBe(false);
    expect(t.edges.has(edges[3].id)).toBe(false);
  });

  it('lights only the edges on a path through the traced person', () => {
    const t = traceLineage(edges, 'a');
    expect([...t.ancestors]).toEqual(['f']);
    expect([...t.descendants].sort()).toEqual(['b', 'c', 'd']);
    expect([...t.edges].sort()).toEqual(
      [edges[0].id, edges[1].id, edges[2].id, edges[4].id].sort()
    );
  });

  it('does not trace through a chair taken: it has a direction but passes nothing on', () => {
    const chair = edge('a', 'b', { kind: 'succession', relation: 'replaced' });
    const t = traceLineage([chair], 'b');
    expect(t.ancestors.size).toBe(0);
    expect(t.edges.size).toBe(0);
  });

  it('ends on a cycle rather than walking it forever, and never lists the person themself', () => {
    const t = traceLineage([edge('x', 'y'), edge('y', 'x')], 'x');
    expect([...t.ancestors]).toEqual(['y']);
    expect([...t.descendants]).toEqual(['y']);
  });
});

describe('layoutLineage', () => {
  it('runs time left to right: a later start is further right', () => {
    const l = layoutLineage({
      nodes: [
        node('drummer:old', { modelled: true, activeFrom: 1950, genres: ['style:jazz'] }),
        node('drummer:new', { modelled: true, activeFrom: 1990, genres: ['style:jazz'] }),
      ],
      edges: [],
    });
    const [old, young] = ['drummer:old', 'drummer:new'].map((id) =>
      l.nodes.find((n) => n.id === id)
    );
    expect(young!.x - old!.x).toBe(40 * LAYOUT.pxPerYear);
    expect(l.ticks.map((t) => t.year)).toEqual([1950, 1960, 1970, 1980, 1990, 2000]);
  });

  it('puts each family in its own band, in the fixed order, from the heaviest genre it knows', () => {
    const l = layoutLineage({
      nodes: [
        node('drummer:metal', { modelled: true, activeFrom: 1980, genres: ['style:thrash-metal'] }),
        node('drummer:jazz', {
          modelled: true,
          activeFrom: 1960,
          // an unknown genre first is skipped, not guessed at
          genres: ['style:not-a-genre', 'style:post-bop', 'style:rock'],
        }),
      ],
      edges: [],
    });
    expect(l.bands.map((b) => b.family)).toEqual([...FAMILIES]);
    const at = (id: string) => l.nodes.find((n) => n.id === id)!;
    expect(at('drummer:jazz').family).toBe('jazz');
    expect(at('drummer:metal').family).toBe('metal-experimental');
    const band = (f: string) => l.bands.find((b) => b.family === f)!;
    for (const n of l.nodes) {
      expect(n.y).toBeGreaterThan(band(n.family).top);
      expect(n.y).toBeLessThan(band(n.family).top + band(n.family).height);
    }
  });

  it('leaves genres off the map, and the edges between them', () => {
    const l = layoutLineage({
      nodes: [
        node('drummer:a', { modelled: true, activeFrom: 1960 }),
        node('style:funk', { modelled: true, activeFrom: 1964 }),
        node('style:rnb-soul', { modelled: true, activeFrom: 1950 }),
      ],
      edges: [edge('style:rnb-soul', 'style:funk', { kind: 'style', relation: 'derived_from' })],
    });
    expect(l.nodes.map((n) => n.id)).toEqual(['drummer:a']);
    expect(l.edges).toEqual([]);
  });

  it('leaves out a stub with no link to a person, and keeps a record with none', () => {
    const l = layoutLineage({
      nodes: [
        node('drummer:loner', { modelled: true, activeFrom: 1970 }),
        node('drummer:named-on-a-record'),
      ],
      edges: [],
    });
    expect(l.nodes.map((n) => n.id)).toEqual(['drummer:loner']);
    expect(l.unknownX).toBeNull();
  });

  describe('a stub’s year', () => {
    const year = (graph: LineageGraph, id: string) => {
      const n = layoutLineage(graph).nodes.find((p) => p.id === id)!;
      return { year: n.year, inferred: n.inferred };
    };

    it('keeps a record’s own start year, not inferred', () => {
      const g = { nodes: [node('drummer:a', { modelled: true, activeFrom: 1962 })], edges: [] };
      expect(year(g, 'drummer:a')).toEqual({ year: 1962, inferred: false });
    });

    it('is a decade before a descendant, a decade after an ancestor, beside a peer', () => {
      const nodes = [
        node('drummer:known', { modelled: true, activeFrom: 1970 }),
        node('drummer:teacher'),
        node('drummer:student'),
        node('drummer:bandmate'),
      ];
      const g = {
        nodes,
        edges: [
          edge('drummer:teacher', 'drummer:known'),
          edge('drummer:known', 'drummer:student'),
          peer('drummer:bandmate', 'drummer:known'),
        ],
      };
      expect(year(g, 'drummer:teacher')).toEqual({ year: 1960, inferred: true });
      expect(year(g, 'drummer:student')).toEqual({ year: 1980, inferred: true });
      expect(year(g, 'drummer:bandmate')).toEqual({ year: 1970, inferred: true });
    });

    it('takes the middle hint, so one late admirer does not drag them forward', () => {
      // admired by drummers starting in 1960, 1962 and 2019: the stub sits at 1952
      const g = {
        nodes: [
          node('drummer:early', { modelled: true, activeFrom: 1960 }),
          node('drummer:mid', { modelled: true, activeFrom: 1962 }),
          node('drummer:late', { modelled: true, activeFrom: 2019 }),
          node('drummer:stub'),
        ],
        edges: [
          edge('drummer:stub', 'drummer:early'),
          edge('drummer:stub', 'drummer:mid'),
          edge('drummer:stub', 'drummer:late'),
        ],
      };
      expect(year(g, 'drummer:stub')).toEqual({ year: 1952, inferred: true });
    });

    it('fills in along a chain of stubs from the person with a year', () => {
      const g = {
        nodes: [
          node('drummer:known', { modelled: true, activeFrom: 1990 }),
          node('drummer:one'),
          node('drummer:two'),
        ],
        edges: [edge('drummer:two', 'drummer:one'), edge('drummer:one', 'drummer:known')],
      };
      expect(year(g, 'drummer:one')).toEqual({ year: 1980, inferred: true });
      expect(year(g, 'drummer:two')).toEqual({ year: 1970, inferred: true });
    });

    it('goes in the dates-unknown column when nothing it touches has a year', () => {
      const g = {
        nodes: [
          node('drummer:known', { modelled: true, activeFrom: 1990 }),
          node('drummer:x'),
          node('drummer:y'),
        ],
        edges: [peer('drummer:x', 'drummer:y')],
      };
      const l = layoutLineage(g);
      const x = l.nodes.find((n) => n.id === 'drummer:x')!;
      expect(x.year).toBeNull();
      expect(l.unknownX).not.toBeNull();
      expect(x.x).toBe(l.unknownX);
      expect(l.unknownX!).toBeGreaterThan(l.ticks.at(-1)!.x);
    });
  });

  it('gives a stub the family most of its neighbours are in', () => {
    const g = {
      nodes: [
        node('drummer:j1', { modelled: true, activeFrom: 1960, genres: ['style:jazz'] }),
        node('drummer:j2', { modelled: true, activeFrom: 1962, genres: ['style:post-bop'] }),
        node('drummer:r', { modelled: true, activeFrom: 1965, genres: ['style:rock'] }),
        node('drummer:stub'),
      ],
      edges: [
        edge('drummer:stub', 'drummer:j1'),
        edge('drummer:stub', 'drummer:j2'),
        edge('drummer:stub', 'drummer:r'),
      ],
    };
    expect(layoutLineage(g).nodes.find((n) => n.id === 'drummer:stub')!.family).toBe('jazz');
  });

  it('packs people in one band and one column into separate rows', () => {
    const nodes = ['a', 'b', 'c'].map((s) =>
      node(`drummer:${s}`, { modelled: true, activeFrom: 1970, genres: ['style:funk'] })
    );
    const l = layoutLineage({ nodes, edges: [] });
    const ys = l.nodes.map((n) => n.y);
    expect(new Set(ys).size).toBe(3);
    const band = l.bands.find((b) => b.family === 'funk-soul')!;
    expect(band.height).toBe(3 * LAYOUT.rowHeight + 2 * LAYOUT.bandPadding);
  });

  it('carries the kinds of device a record names, each once, for the map’s filter', () => {
    const device = (kind: DeviceKind): LineageDevice => ({
      kind,
      ratio: null,
      where: [],
      description: kind,
      examples: [],
      confidence: null,
      sources: [{ title: 'S', url: null }],
    });
    const l = layoutLineage({
      nodes: [
        node('drummer:a', {
          modelled: true,
          activeFrom: 1960,
          devices: [device('grouping'), device('displacement'), device('grouping')],
        }),
      ],
      edges: [],
    });
    expect(l.nodes[0].devices).toEqual(['grouping', 'displacement']);
  });

  it('is the same map every time for the same graph', () => {
    const g = buildLineage(readCorpus(DRUMMER_MODEL_DIR));
    expect(layoutLineage(g)).toEqual(layoutLineage(g));
  });
});

describe('the real records on the map', () => {
  const graph = buildLineage(readCorpus(DRUMMER_MODEL_DIR));
  const layout = layoutLineage(graph);

  it('has a family for every genre the model has', () => {
    const genres = graph.nodes.filter((n) => n.kind === 'style').map((n) => n.id);
    expect(genres.length).toBeGreaterThan(0);
    expect(genres.filter((g) => !GENRE_FAMILY[g])).toEqual([]);
  });

  it('places every drummer with a record, each with a year from their record', () => {
    const modelled = graph.nodes.filter((n) => n.kind === 'drummer' && n.modelled);
    for (const d of modelled) {
      const placed = layout.nodes.find((n) => n.id === d.id);
      expect(placed, d.id).toBeDefined();
      expect(placed!.inferred).toBe(false);
      expect(placed!.year).toBe(d.activeFrom);
    }
  });

  it('dates everyone on it: nobody is left in a dates-unknown column', () => {
    expect(layout.nodes.filter((n) => n.year === null).map((n) => n.id)).toEqual([]);
    expect(layout.unknownX).toBeNull();
  });

  it('never overlaps two labels in a row', () => {
    const width = (label: string) => 14 + label.length * LAYOUT.charWidth;
    const rows = new Map<number, typeof layout.nodes>();
    for (const n of layout.nodes) rows.set(n.y, [...(rows.get(n.y) ?? []), n]);
    for (const row of rows.values()) {
      const sorted = [...row].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + width(sorted[i - 1].label));
      }
    }
  });

  it('draws every edge between two people it placed', () => {
    const placed = new Set(layout.nodes.map((n) => n.id));
    for (const e of layout.edges) {
      expect(placed.has(e.from) && placed.has(e.to), e.id).toBe(true);
    }
    expect(new Set<string>(layout.edges.map((e) => e.kind)).has('style')).toBe(false);
  });

  it('fits everything inside the drawing', () => {
    for (const n of layout.nodes) {
      expect(n.x).toBeLessThan(layout.width);
      expect(n.y).toBeLessThan(layout.height);
    }
  });
});

describe('edgePath', () => {
  it('curves from one dot to the other through the middle', () => {
    expect(edgePath({ x: 0, y: 10 }, { x: 100, y: 50 })).toBe('M 0 10 C 50 10, 50 50, 100 50');
  });

  it('bows out to the right between two people in one column', () => {
    const d = edgePath({ x: 200, y: 0 }, { x: 200, y: 80 });
    expect(d).toBe('M 200 0 C 260 0, 260 80, 200 80');
  });
});
