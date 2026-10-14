/**
 * A small lineage graph for the map and the pages that draw it (Phase 11-b):
 * built by hand, then laid out by the real `layoutLineage`, so a test reads
 * coordinates and bands the way the page does.
 *
 *   Alpha ──influence──▶ Beta ──teacher──▶ Gamma      (a directed chain)
 *     └────family (no confidence)──────────┘
 *   Beta ──peer── Delta ◀──succession (speculative)── Echo
 *   Foxtrot: modelled, no edges, no start year
 *
 * Devices: Alpha and Gamma play cross-rhythms, Beta groupings; nobody plays
 * the rest, so the map offers only those two.
 *
 * Each kind is used once so a test can find an edge by `path[data-kind=…]`.
 */

import type {
  DeviceKind,
  LineageDevice,
  LineageEdge,
  LineageGraph,
  LineageNode,
} from '@/lib/app/lineage/types';

export function lineageNode(slug: string, extra: Partial<LineageNode> = {}): LineageNode {
  return {
    id: `drummer:${slug}`,
    slug,
    kind: 'drummer',
    label: slug.charAt(0).toUpperCase() + slug.slice(1),
    modelled: true,
    activeFrom: 1960,
    activeTo: null,
    styleKey: null,
    genres: ['style:funk'],
    tags: [],
    summary: null,
    devices: [],
    ...extra,
  };
}

export function lineageDevice(kind: DeviceKind, extra: Partial<LineageDevice> = {}): LineageDevice {
  return {
    kind,
    ratio: kind === 'cross-rhythm' ? '3:2' : null,
    where: ['fills'],
    description: `A ${kind}.`,
    examples: [],
    confidence: 'likely',
    sources: [{ title: 'A transcription', url: 'https://example.com/t' }],
    ...extra,
  };
}

export function lineageEdge(
  id: string,
  from: string,
  to: string,
  extra: Partial<LineageEdge> = {}
): LineageEdge {
  return {
    id,
    from: `drummer:${from}`,
    to: `drummer:${to}`,
    relation: 'cites_as_influence',
    kind: 'influence',
    directed: true,
    strength: null,
    confidence: 'verified',
    scope: 'individual',
    declaredBy: `drummer:${to}`,
    recordingId: null,
    ...extra,
  };
}

export function mapGraph(): LineageGraph {
  return {
    nodes: [
      lineageNode('alpha', { activeFrom: 1950, devices: [lineageDevice('cross-rhythm')] }),
      lineageNode('beta', { activeFrom: 1960, devices: [lineageDevice('grouping')] }),
      lineageNode('gamma', {
        activeFrom: 1970,
        devices: [lineageDevice('cross-rhythm'), lineageDevice('grouping')],
      }),
      lineageNode('delta', { activeFrom: 1960 }),
      // a stub: no record, no year of its own, here only for its edge
      lineageNode('echo', { modelled: false, activeFrom: null, genres: [] }),
      lineageNode('foxtrot', { activeFrom: null }),
    ],
    edges: [
      lineageEdge('e-ab', 'alpha', 'beta', { kind: 'influence', confidence: 'verified' }),
      lineageEdge('e-bc', 'beta', 'gamma', {
        kind: 'teacher',
        relation: 'taught_by',
        confidence: 'widely_reported',
      }),
      lineageEdge('e-bd', 'beta', 'delta', {
        kind: 'peer',
        relation: 'bandmate',
        directed: false,
        confidence: 'likely',
      }),
      lineageEdge('e-ed', 'echo', 'delta', {
        kind: 'succession',
        relation: 'succeeded',
        confidence: 'speculative',
      }),
      lineageEdge('e-ac', 'alpha', 'gamma', {
        kind: 'family',
        relation: 'relative',
        directed: false,
        confidence: null,
      }),
    ],
  };
}
