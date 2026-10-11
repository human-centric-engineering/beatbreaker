/**
 * One person's place in the lineage, in words: who they learned from, who
 * learned from them, and who was around them. The phone list on `/drummers`
 * and each `/drummers/[slug]` page read it (Phase 11-b).
 */

import type { LineageEdge, LineageNode } from '@/lib/app/lineage/types';

export interface Relation {
  /** The person at the other end. */
  node: LineageNode;
  edge: LineageEdge;
}

export interface Relations {
  /** Influences and teachers: directed edges into this person. */
  learnedFrom: Relation[];
  /** The people they influenced or taught: directed edges out. */
  passedOnTo: Relation[];
  /** Bandmates, family, shared records and the chair they took or gave up. */
  around: Relation[];
}

const LINEAGE_KINDS = new Set(['influence', 'teacher']);

/**
 * The relations of `id` among `edges`. An edge whose other end is not in
 * `nodes`, or that joins genres, is left out.
 */
export function relationsOf(
  id: string,
  edges: readonly LineageEdge[],
  nodes: ReadonlyMap<string, LineageNode>
): Relations {
  const out: Relations = { learnedFrom: [], passedOnTo: [], around: [] };
  for (const edge of edges) {
    if (edge.kind === 'style') continue;
    const otherId = edge.from === id ? edge.to : edge.to === id ? edge.from : null;
    const node = otherId === null ? undefined : nodes.get(otherId);
    if (!node) continue;
    if (edge.directed && LINEAGE_KINDS.has(edge.kind)) {
      (edge.to === id ? out.learnedFrom : out.passedOnTo).push({ node, edge });
    } else out.around.push({ node, edge });
  }
  const byLabel = (a: Relation, b: Relation) =>
    a.node.label.localeCompare(b.node.label) || a.edge.id.localeCompare(b.edge.id);
  out.learnedFrom.sort(byLabel);
  out.passedOnTo.sort(byLabel);
  out.around.sort(byLabel);
  return out;
}
