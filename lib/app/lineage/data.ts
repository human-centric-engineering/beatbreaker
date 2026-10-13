/**
 * The lineage data layer: the one place that reads the `lineage_*` tables.
 *
 * **Server-side only**, like `lib/app/breaks/catalogue/data.ts` and for the
 * same reason. Not memoised: the graph is a couple of hundred rows, read with
 * two queries, and the routes answer with an ETag so a client that has it
 * already gets a 304.
 */

import { slugOf } from '@/lib/app/lineage/build';
import { prisma } from '@/lib/db/client';
import {
  CONFIDENCES,
  type Confidence,
  EDGE_KINDS,
  type EdgeKind,
  type LineageEdge,
  type LineageGraph,
  type LineageNode,
  NODE_KINDS,
  type NodeKind,
} from '@/lib/app/lineage/types';

type NodeRow = Awaited<ReturnType<typeof prisma.lineageNode.findMany>>[number];
type EdgeRow = Awaited<ReturnType<typeof prisma.lineageEdge.findMany>>[number];

const NODE_FIELDS = {
  id: true,
  slug: true,
  kind: true,
  label: true,
  modelled: true,
  activeFrom: true,
  activeTo: true,
  styleKey: true,
  genres: true,
  tags: true,
  summary: true,
} as const;

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return values.some((v) => v === value);
}

function oneOf<T extends string>(values: readonly T[], value: string, fallback: T): T {
  return isOneOf(values, value) ? value : fallback;
}

function toNode(row: Pick<NodeRow, keyof typeof NODE_FIELDS>): LineageNode {
  return {
    id: row.id,
    slug: row.slug,
    kind: oneOf<NodeKind>(NODE_KINDS, row.kind, 'musician'),
    label: row.label,
    modelled: row.modelled,
    activeFrom: row.activeFrom,
    activeTo: row.activeTo,
    styleKey: row.styleKey,
    genres: row.genres,
    tags: row.tags,
    summary: row.summary,
  };
}

function toEdge(row: EdgeRow): LineageEdge {
  const scope = row.scope === 'band' || row.scope === 'unknown' ? row.scope : 'individual';
  return {
    id: row.id,
    from: row.fromId,
    to: row.toId,
    relation: row.relation,
    kind: oneOf<EdgeKind>(EDGE_KINDS, row.kind, 'peer'),
    directed: row.directed,
    strength: row.strength,
    confidence:
      row.confidence === null
        ? null
        : oneOf<Confidence>(CONFIDENCES, row.confidence, 'needs_verification'),
    scope,
    declaredBy: row.declaredBy,
    recordingId: row.recordingId,
  };
}

/** The whole map: every node (without its record) and every edge. */
export async function getLineageGraph(): Promise<LineageGraph> {
  const [nodes, edges] = await Promise.all([
    prisma.lineageNode.findMany({ select: NODE_FIELDS, orderBy: { id: 'asc' } }),
    prisma.lineageEdge.findMany({ orderBy: { id: 'asc' } }),
  ]);
  return { nodes: nodes.map(toNode), edges: edges.map(toEdge) };
}

export interface LineageRecordingSummary {
  id: string;
  title: string;
  artist: string;
  year: number;
  /** The recording's whole record, as the model holds it. */
  record: unknown;
}

export interface LineageProfile {
  node: LineageNode;
  /** The model's record for a modelled node; null for a stub. Unvalidated JSON. */
  record: unknown;
  /** Every edge touching the node. */
  edges: LineageEdge[];
  /** The nodes at the other end of those edges. */
  neighbours: LineageNode[];
  /** Recordings with a drum performance by this drummer, oldest first. */
  recordings: LineageRecordingSummary[];
}

/** One node by its slug, with its record, its edges and its recordings; null if none. */
export async function getLineageProfile(slug: string): Promise<LineageProfile | null> {
  const row = await prisma.lineageNode.findUnique({ where: { slug } });
  if (!row) return null;

  const [edges, recordings] = await Promise.all([
    prisma.lineageEdge.findMany({
      where: { OR: [{ fromId: row.id }, { toId: row.id }] },
      orderBy: { id: 'asc' },
    }),
    prisma.lineageRecording.findMany({
      where: { drummerIds: { has: row.id } },
      orderBy: [{ year: 'asc' }, { title: 'asc' }],
    }),
  ]);
  const others = [...new Set(edges.map((e) => (e.fromId === row.id ? e.toId : e.fromId)))];
  const neighbours = await prisma.lineageNode.findMany({
    where: { id: { in: others } },
    select: NODE_FIELDS,
    orderBy: { id: 'asc' },
  });

  return {
    node: toNode(row),
    record: row.record,
    edges: edges.map(toEdge),
    neighbours: neighbours.map(toNode),
    recordings: recordings.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      year: r.year,
      record: r.record,
    })),
  };
}

/** A drummer node with its record (null for a stub), for BeatBuddy's search. */
export interface DrummerEntry {
  node: LineageNode;
  record: unknown;
}

/** Every drummer node, modelled ones first, each with its record (11-f). */
export async function listDrummers(): Promise<DrummerEntry[]> {
  const rows = await prisma.lineageNode.findMany({
    where: { kind: 'drummer' },
    select: { ...NODE_FIELDS, record: true },
    orderBy: [{ modelled: 'desc' }, { label: 'asc' }],
  });
  return rows.map(({ record, ...row }) => ({ node: toNode(row), record }));
}

/**
 * The slug of the node a person means, from a slug or a name as typed
 * ("Bernard Purdie", "bernard-purdie", "purdie" does not match); null if none.
 */
export async function findLineageSlug(nameOrSlug: string): Promise<string | null> {
  const typed = nameOrSlug.trim();
  if (!typed) return null;
  const bySlug = await prisma.lineageNode.findFirst({
    where: { slug: { in: [...new Set([typed, slugOf(typed)])] } },
    select: { slug: true },
    orderBy: { slug: 'asc' },
  });
  if (bySlug) return bySlug.slug;
  const byName = await prisma.lineageNode.findFirst({
    where: { label: { equals: typed, mode: 'insensitive' } },
    select: { slug: true },
    // a drummer before a band or a style of the same name
    orderBy: [{ modelled: 'desc' }, { kind: 'asc' }],
  });
  return byName?.slug ?? null;
}
