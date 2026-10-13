/**
 * The lineage tables as the `004-lineage` seed fills them, held in memory:
 * the real drummer model, built by the real `buildLineage`. BeatBuddy's
 * drummer tools (11-f) read the data layer, so a test mocks it with these and
 * the tools see every real record, the masked performer's included.
 */

import { buildLineage, slugOf } from '@/lib/app/lineage/build';
import type { DrummerEntry, LineageProfile } from '@/lib/app/lineage/data';
import { DRUMMER_MODEL_DIR, readCorpus } from '@/scripts/lineage/read-corpus';

const corpus = readCorpus(DRUMMER_MODEL_DIR);
const graph = buildLineage(corpus);
const records = new Map<string, unknown>(
  corpus.drummers.map(({ record }) => [record.meta.id, record] as const)
);

const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * `listDrummers()`: drummers only, modelled first, then by name. The names
 * sort by code point here and by the database's collation there, so a test
 * may hold the modelled-first split but not the order of two names.
 */
export async function listDrummersFromModel(): Promise<DrummerEntry[]> {
  return graph.nodes
    .filter((n) => n.kind === 'drummer')
    .sort((a, b) => Number(b.modelled) - Number(a.modelled) || byCodePoint(a.label, b.label))
    .map((node) => ({ node, record: records.get(node.id) ?? null }));
}

/**
 * `findLineageSlug()`, the same rules: never a genre; an exact name first (a
 * modelled node, then by kind, then slug), then the slug as typed or slugged.
 */
export async function findSlugInModel(typed: string): Promise<string | null> {
  const t = typed.trim();
  if (!t) return null;
  const people = graph.nodes.filter((n) => n.kind !== 'style');
  const [byName] = people
    .filter((n) => n.label.toLowerCase() === t.toLowerCase())
    .sort(
      (a, b) =>
        Number(b.modelled) - Number(a.modelled) ||
        byCodePoint(a.kind, b.kind) ||
        byCodePoint(a.slug, b.slug)
    );
  if (byName) return byName.slug;
  const [bySlug] = people
    .filter((n) => n.slug === t || n.slug === slugOf(t))
    .sort((a, b) => byCodePoint(a.slug, b.slug));
  return bySlug?.slug ?? null;
}

/** `getLineageProfile()`, from the built graph. */
export async function profileFromModel(slug: string): Promise<LineageProfile | null> {
  const node = graph.nodes.find((n) => n.slug === slug);
  if (!node) return null;
  const edges = graph.edges.filter((e) => e.from === node.id || e.to === node.id);
  const others = new Set(edges.map((e) => (e.from === node.id ? e.to : e.from)));
  return {
    node,
    record: records.get(node.id) ?? null,
    edges,
    neighbours: graph.nodes.filter((n) => others.has(n.id)),
    recordings: corpus.recordings
      .map(({ record: r }) => r)
      .filter((r) => r.drum_performances.some((p) => p.drummer_id === node.id))
      .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title))
      .map((r) => ({ id: r.id, title: r.title, artist: r.artist, year: r.year, record: r })),
  };
}
