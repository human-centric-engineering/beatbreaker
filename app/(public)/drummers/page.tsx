import type { Metadata } from 'next';

import { LineageList } from '@/components/app/drummers/lineage-list';
import { LineageMap } from '@/components/app/drummers/lineage-map';
import { layoutLineage } from '@/lib/app/lineage/layout';
import { getLineageGraph } from '@/lib/app/lineage/data';

/**
 * The drummer lineage map — `/drummers` (Phase 11-b, D49). Public, like the
 * catalogue it is drawn from.
 *
 * The layout is computed here, on the server, so the first HTML is the whole
 * map and every person on it a link. On a phone the same graph is a list.
 * `?trace=<slug>` opens it with that drummer traced, which is how a drummer's
 * page links back to their place on the map.
 */

export const metadata: Metadata = {
  title: 'Drummers',
  description:
    'A map of famous drummers: who they learned from, who learned from them, and how sure each link is.',
  alternates: { canonical: '/drummers' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DrummersPage({ searchParams }: { searchParams: SearchParams }) {
  const [graph, query] = await Promise.all([getLineageGraph(), searchParams]);
  const layout = layoutLineage(graph);
  /* Only a slug on the map is traced; anything else opens it untraced. */
  const trace = typeof query.trace === 'string' ? query.trace : null;
  const initialTrace = layout.nodes.find((n) => n.slug === trace)?.id ?? null;

  return (
    <div className="container mx-auto max-w-7xl space-y-8 px-4 py-10">
      <header className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Drummers</h1>
        <p className="text-muted-foreground">
          Who learned from whom. Each drummer here has a record: how they play, what they recorded,
          and every link to another drummer with how well it is backed up. Time runs left to right.
          Open a drummer to read their record and play in their style.
        </p>
      </header>

      <div className="hidden md:block">
        <LineageMap layout={layout} initialTrace={initialTrace} />
      </div>
      <div className="md:hidden">
        <LineageList graph={graph} layout={layout} />
      </div>
    </div>
  );
}
