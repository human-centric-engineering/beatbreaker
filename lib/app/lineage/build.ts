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

import type { Corpus, DrummerRecord, SourceRecord } from '@/lib/app/lineage/corpus';
import type {
  Confidence,
  EdgeKind,
  LineageDevice,
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
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The URL slug for a node id: a drummer's is bare, the rest keep their kind. */
export function nodeSlug(id: string): string {
  const [ns, rest] = id.split(':', 2);
  return ns === 'drummer' ? rest : `${ns}-${rest}`;
}

/**
 * A name's slug, never empty: a name with no Latin letters at all (written in
 * another script) gets a short hash of itself, so two such names stay two
 * people instead of collapsing into one `person:` node.
 */
function slugForName(name: string): string {
  return slugOf(name) || `n-${createHash('sha1').update(name).digest('hex').slice(0, 10)}`;
}

/**
 * The id for a target named without one.
 *
 * A person is one node however each record described them: if anyone calls
 * them a drummer — by kind, or by a `drummer:` id with their slug — every
 * unnamed mention is `drummer:<slug>`; otherwise musicians and teachers share
 * `person:<slug>`. Styles, traditions and ensembles keep their own namespace.
 */
function idForUnnamed(name: string, kind: NodeKind | undefined, drummers: Set<string>): string {
  const slug = slugForName(name);
  switch (kind) {
    case 'style':
    case 'tradition':
    case 'ensemble':
      return `${kind}:${slug}`;
    default:
      return kind === 'drummer' || drummers.has(slug) ? `drummer:${slug}` : `person:${slug}`;
  }
}

/** Every slug some record says is a drummer's — what `idForUnnamed` merges on. */
function drummerSlugs(corpus: Corpus): Set<string> {
  const slugs = new Set<string>();
  const addId = (id: string | undefined) => {
    if (id?.startsWith('drummer:')) slugs.add(id.slice('drummer:'.length));
  };
  for (const { record } of corpus.drummers) {
    addId(record.meta.id);
    for (const r of record.relationships ?? []) {
      addId(r.target.id);
      if (!r.target.id && r.target.kind === 'drummer') slugs.add(slugForName(r.target.name));
    }
  }
  for (const { record } of corpus.recordings) {
    for (const p of record.drum_performances) addId(p.drummer_id);
  }
  return slugs;
}

function kindOfId(id: string, fallback: NodeKind | undefined): NodeKind {
  const ns = id.split(':', 1)[0];
  if (ns === 'drummer' || ns === 'style' || ns === 'tradition' || ns === 'ensemble') return ns;
  return fallback ?? 'musician';
}

/** One edge per pair, kind and recording: the same id whichever claim of the kind wins. */
function edgeId(from: string, to: string, kind: EdgeKind, recordingId: string | null): string {
  return createHash('sha1')
    .update(`${from}|${to}|${kind}|${recordingId ?? ''}`)
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
    devices: [],
  };
}

/** A record's devices, each with its sources looked up in the registry for citing. */
function devicesOf(d: DrummerRecord, sources: ReadonlyMap<string, SourceRecord>): LineageDevice[] {
  return (d.technique_profile?.coordination?.devices ?? []).map((v) => ({
    kind: v.kind,
    ratio: v.ratio ?? null,
    where: v.where ?? [],
    description: v.description,
    examples: v.examples ?? [],
    confidence: v.evidence?.confidence ?? null,
    sources: (v.evidence?.source_ids ?? []).flatMap((sid) => {
      const s = sources.get(sid);
      return s ? [{ title: s.title, url: s.url ?? null }] : [];
    }),
  }));
}

function drummerNode(d: DrummerRecord, sources: ReadonlyMap<string, SourceRecord>): LineageNode {
  const genres = [...d.style_profile.genres]
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .flatMap((g) => (g.style_id ? [g.style_id] : []));
  return {
    id: d.meta.id,
    slug: nodeSlug(d.meta.id),
    kind: 'drummer',
    label: d.identity.name,
    // a candidate is researched, not built (D74): on the map only where it links to one that is
    modelled: d.meta.record_status !== 'candidate',
    activeFrom: d.identity.active?.from ?? null,
    activeTo: d.identity.active?.ongoing ? null : (d.identity.active?.to ?? null),
    styleKey: d.beatbreaker?.style_key ?? null,
    genres,
    tags: d.beatbreaker?.tags ?? [],
    summary: d.identity.summary ?? null,
    devices: devicesOf(d, sources),
  };
}

/**
 * Build the graph.
 *
 * Claims of one kind about one pair become one edge: mirrored claims (A says
 * B influenced them, B says they influenced A) and claims of two relations of
 * a kind (`taught` and `mentored`). The edge carries the best-evidenced claim
 * whole — its relation, confidence, scope and declarer — so a relation is
 * never paired with evidence that belongs to another; strength is the
 * largest any claim gave. Undirected edges are stored with their ends in id
 * order, so A–B and B–A are the same edge.
 *
 * A relationship type outside `RELATIONSHIPS` is skipped here and reported by
 * `checkCorpus`, which the seed runs first.
 */
export function buildLineage(corpus: Corpus): LineageGraph {
  const nodes = new Map<string, LineageNode>();

  const sources = new Map(corpus.sources.map(({ record }) => [record.id, record]));
  for (const { record } of corpus.drummers) {
    nodes.set(record.meta.id, drummerNode(record, sources));
  }
  for (const { record: s } of corpus.styles) {
    nodes.set(s.id, {
      ...stub(s.id, s.name, 'style'),
      modelled: true,
      activeFrom: s.era?.from ?? null,
      activeTo: s.era?.to ?? null,
      summary: s.summary ?? null,
    });
  }

  const drummers = drummerSlugs(corpus);
  const edges = new Map<string, LineageEdge>();
  const add = (e: Omit<LineageEdge, 'id'>) => {
    const [a, b] = e.directed ? [e.from, e.to] : [e.from, e.to].sort();
    const id = edgeId(a, b, e.kind, e.recordingId);
    const seen = edges.get(id);
    const strength = Math.max(e.strength ?? -1, seen?.strength ?? -1);
    const winner = !seen || rank(e.confidence) < rank(seen.confidence) ? e : seen;
    edges.set(id, { ...winner, from: a, to: b, id, strength: strength < 0 ? null : strength });
  };

  for (const { record: d } of corpus.drummers) {
    const me = d.meta.id;
    for (const r of d.relationships ?? []) {
      const rule = RELATIONSHIPS[r.type];
      if (!rule) continue;
      const target = r.target.id ?? idForUnnamed(r.target.name, r.target.kind, drummers);
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
