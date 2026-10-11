/**
 * Corpus → graph.
 *
 * The TypeScript successor of the model's `tools/validate.py` build step, with
 * what it got wrong put right (`.context/app/drummers.md`, "What the builder
 * fixes"):
 *
 * - every edge end is a node, including a drummer met only on a shared record;
 * - a person named without an id is one node, not one per kind they were
 *   called (Cozy Cole was a `person:` and a `drummer:`);
 * - peers, family and shared records have no direction, and say so;
 * - Ringo "admired" Keltner, who is younger: regard, not lineage.
 *
 * Pure: no I/O, so the seed, the tests and anything else build the same graph.
 */

import { createHash } from 'crypto';

import type { Corpus, DrummerRecord } from '@/lib/app/lineage/corpus';
import type {
  Confidence,
  EdgeKind,
  LineageEdge,
  LineageGraph,
  LineageNode,
  NodeKind,
} from '@/lib/app/lineage/types';

/**
 * Each relationship type: its family, and which way the arrow runs from the
 * declaring drummer's point of view. `in` means the target came first (the
 * declarer learned from it); `out` means the declarer came first; `none` is
 * undirected.
 */
export const RELATIONSHIPS: Record<string, { kind: EdgeKind; way: 'in' | 'out' | 'none' }> = {
  influenced_by: { kind: 'influence', way: 'in' },
  cites_as_influence: { kind: 'influence', way: 'in' },
  style_lineage: { kind: 'influence', way: 'in' },
  tradition_lineage: { kind: 'influence', way: 'in' },
  influenced: { kind: 'influence', way: 'out' },
  cited_by: { kind: 'influence', way: 'out' },
  imitated_by: { kind: 'influence', way: 'out' },
  parodied_by: { kind: 'influence', way: 'out' },
  covered_by: { kind: 'influence', way: 'out' },
  studied_with: { kind: 'teacher', way: 'in' },
  mentored_by: { kind: 'teacher', way: 'in' },
  taught: { kind: 'teacher', way: 'out' },
  mentored: { kind: 'teacher', way: 'out' },
  replaced: { kind: 'succession', way: 'in' },
  replaced_by: { kind: 'succession', way: 'out' },
  family: { kind: 'family', way: 'none' },
  bandmate: { kind: 'peer', way: 'none' },
  rhythm_section_partner: { kind: 'peer', way: 'none' },
  played_alongside: { kind: 'peer', way: 'none' },
  co_drummer_with: { kind: 'peer', way: 'none' },
  sub_for: { kind: 'peer', way: 'none' },
  admired: { kind: 'peer', way: 'none' },
  composed_for: { kind: 'peer', way: 'none' },
};

const CONFIDENCE_RANK: Record<Confidence, number> = {
  verified: 0,
  widely_reported: 1,
  likely: 2,
  inferred: 3,
  speculative: 4,
  needs_verification: 5,
};

/** `Ginger Baker` → `ginger-baker`. Accents folded, so `Hernández` → `hernandez`. */
export function slugOf(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The URL slug for a node id: a drummer's is bare, the rest keep their kind. */
export function nodeSlug(id: string): string {
  const [ns, rest] = id.split(':', 2);
  return ns === 'drummer' ? rest : `${ns}-${rest}`;
}

/** The id for a target named without one. Musicians and teachers share `person:`. */
function idForUnnamed(name: string, kind: NodeKind | undefined): string {
  const slug = slugOf(name);
  switch (kind) {
    case 'drummer':
    case 'style':
    case 'tradition':
    case 'ensemble':
      return `${kind}:${slug}`;
    default:
      return `person:${slug}`;
  }
}

function kindOfId(id: string, fallback: NodeKind | undefined): NodeKind {
  const ns = id.split(':', 1)[0];
  if (ns === 'drummer' || ns === 'style' || ns === 'tradition' || ns === 'ensemble') return ns;
  return fallback ?? 'musician';
}

function edgeId(from: string, to: string, relation: string, recordingId: string | null): string {
  return createHash('sha1')
    .update(`${from}|${to}|${relation}|${recordingId ?? ''}`)
    .digest('hex')
    .slice(0, 20);
}

function stub(id: string, label: string, kind: NodeKind): LineageNode {
  return {
    id,
    slug: nodeSlug(id),
    kind,
    label,
    modelled: false,
    activeFrom: null,
    activeTo: null,
    styleKey: null,
    genres: [],
    tags: [],
    summary: null,
  };
}

function drummerNode(d: DrummerRecord): LineageNode {
  const genres = [...d.style_profile.genres]
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .flatMap((g) => (g.style_id ? [g.style_id] : []));
  return {
    id: d.meta.id,
    slug: nodeSlug(d.meta.id),
    kind: 'drummer',
    label: d.identity.name,
    modelled: true,
    activeFrom: d.identity.active?.from ?? null,
    activeTo: d.identity.active?.ongoing ? null : (d.identity.active?.to ?? null),
    styleKey: d.beatbreaker?.style_key ?? null,
    genres,
    tags: d.beatbreaker?.tags ?? [],
    summary: d.identity.summary ?? null,
  };
}

/**
 * Build the graph.
 *
 * Mirrored claims (A says B influenced them, B says they influenced A) become
 * one edge carrying the stronger confidence and strength. Undirected edges are
 * stored with their ends in id order, so A–B and B–A are the same edge.
 */
export function buildLineage(corpus: Corpus): LineageGraph {
  const nodes = new Map<string, LineageNode>();

  for (const { record } of corpus.drummers) nodes.set(record.meta.id, drummerNode(record));
  for (const { record: s } of corpus.styles) {
    nodes.set(s.id, {
      ...stub(s.id, s.name, 'style'),
      modelled: true,
      activeFrom: s.era?.from ?? null,
      activeTo: s.era?.to ?? null,
      summary: s.summary ?? null,
    });
  }

  const edges = new Map<string, LineageEdge>();
  const add = (e: Omit<LineageEdge, 'id'>) => {
    const [a, b] = e.directed ? [e.from, e.to] : [e.from, e.to].sort();
    const key = `${a}|${b}|${e.kind}|${e.recordingId ?? ''}`;
    const seen = edges.get(key);
    if (!seen) {
      edges.set(key, { ...e, from: a, to: b, id: edgeId(a, b, e.relation, e.recordingId) });
      return;
    }
    if (rank(e.confidence) < rank(seen.confidence)) seen.confidence = e.confidence;
    if ((e.strength ?? -1) > (seen.strength ?? -1)) seen.strength = e.strength;
  };

  for (const { record: d } of corpus.drummers) {
    const me = d.meta.id;
    for (const r of d.relationships ?? []) {
      const rule = RELATIONSHIPS[r.type];
      if (!rule) continue; // the schema's enum is the gate; an unknown type is the check's to report
      const target = r.target.id ?? idForUnnamed(r.target.name, r.target.kind);
      if (!nodes.has(target)) {
        nodes.set(target, stub(target, r.target.name, kindOfId(target, r.target.kind)));
      }
      const [from, to] = rule.way === 'in' ? [target, me] : [me, target];
      add({
        from,
        to,
        relation: r.type,
        kind: rule.kind,
        directed: rule.way !== 'none',
        strength: r.strength ?? null,
        confidence: r.evidence?.confidence ?? null,
        scope: r.scope ?? 'individual',
        declaredBy: me,
        recordingId: null,
      });
    }
  }

  for (const { record: s } of corpus.styles) {
    for (const p of s.parents ?? []) {
      if (!nodes.has(p.style_id)) nodes.set(p.style_id, stub(p.style_id, p.style_id, 'style'));
      add({
        from: p.style_id,
        to: s.id,
        relation: p.relation,
        kind: 'style',
        directed: true,
        strength: null,
        confidence: p.evidence?.confidence ?? null,
        scope: 'unknown',
        declaredBy: s.id,
        recordingId: null,
      });
    }
  }

  for (const { record: rec } of corpus.recordings) {
    const ds = rec.drum_performances;
    for (const p of ds) {
      if (!nodes.has(p.drummer_id)) {
        const label = p.name ?? p.drummer_id.slice('drummer:'.length).replace(/-/g, ' ');
        nodes.set(p.drummer_id, stub(p.drummer_id, label, 'drummer'));
      }
    }
    for (let i = 0; i < ds.length; i++) {
      for (let j = i + 1; j < ds.length; j++) {
        if (ds[i].drummer_id === ds[j].drummer_id) continue;
        add({
          from: ds[i].drummer_id,
          to: ds[j].drummer_id,
          relation: 'same_recording',
          kind: 'recording',
          directed: false,
          strength: null,
          confidence: 'verified',
          scope: 'individual',
          declaredBy: rec.id,
          recordingId: rec.id,
        });
      }
    }
  }

  return {
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function rank(c: Confidence | null): number {
  return c === null ? 99 : CONFIDENCE_RANK[c];
}
