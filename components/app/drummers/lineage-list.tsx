import Link from 'next/link';

import { FAMILIES, FAMILY_LABELS, type LineageLayout } from '@/lib/app/lineage/layout';
import { type Relation, relationsOf } from '@/lib/app/lineage/relations';
import type { LineageGraph } from '@/lib/app/lineage/types';

/**
 * The lineage as a list, for a screen too narrow for the map (Phase 11-b,
 * D49): each drummer with a record, by family, with who they learned from and
 * who they passed it on to. The same graph as the map, server-rendered.
 */

function People({ label, relations }: { label: string; relations: Relation[] }) {
  if (relations.length === 0) return null;
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      {relations.map((r, i) => (
        <span key={r.edge.id}>
          {i > 0 && ', '}
          <Link href={`/drummers/${r.node.slug}`} className="underline-offset-4 hover:underline">
            {r.node.label}
          </Link>
        </span>
      ))}
    </p>
  );
}

export function LineageList({ graph, layout }: { graph: LineageGraph; layout: LineageLayout }) {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  return (
    <div className="space-y-8">
      {FAMILIES.map((family) => {
        const drummers = layout.nodes
          .filter((n) => n.family === family && n.modelled)
          .sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || a.label.localeCompare(b.label));
        if (drummers.length === 0) return null;
        return (
          <section key={family} aria-labelledby={`family-${family}`} className="space-y-3">
            <h2 id={`family-${family}`} className="text-lg font-semibold">
              {FAMILY_LABELS[family]}
            </h2>
            <ul className="space-y-4">
              {drummers.map((d) => {
                const rel = relationsOf(d.id, graph.edges, nodes);
                return (
                  <li key={d.id} className="space-y-1 border-l-2 pl-3">
                    <p>
                      <Link
                        href={`/drummers/${d.slug}`}
                        className="font-semibold underline-offset-4 hover:underline"
                      >
                        {d.label}
                      </Link>
                      {d.year !== null && (
                        <span className="text-muted-foreground text-sm"> · from {d.year}</span>
                      )}
                    </p>
                    <People label="Learned from" relations={rel.learnedFrom} />
                    <People label="Passed on to" relations={rel.passedOnTo} />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
