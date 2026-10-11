/**
 * The lineage graph: famous drummers, the people and styles around them, and
 * how each passed something to the next.
 *
 * Built from the drummer model's records (`buildLineage`), stored as
 * `LineageNode` / `LineageEdge` rows by the `004-lineage` seed, and read by
 * `/api/v1/catalogue/lineage`. See `.context/app/drummers.md`.
 */

/** What a node is. A `drummer` may be modelled (it has a record) or a stub. */
export const NODE_KINDS = [
  'drummer',
  'musician',
  'teacher',
  'ensemble',
  'tradition',
  'style',
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

/**
 * What an edge means, grouped for drawing and filtering. The model has two
 * dozen relationship types; these are the families they fall into.
 *
 * - `influence`: something was passed on (cited, imitated, covered).
 * - `teacher`: lessons or mentoring.
 * - `succession`: one took over the other's chair.
 * - `peer`: played together or held each other in regard — no direction.
 * - `family`: related — no direction.
 * - `recording`: both drummers play on one record — no direction.
 * - `style`: a genre came out of another.
 */
export const EDGE_KINDS = [
  'influence',
  'teacher',
  'succession',
  'peer',
  'family',
  'recording',
  'style',
] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

/** How sure a claim is, strongest first. Mirrors the model's `Confidence`. */
export const CONFIDENCES = [
  'verified',
  'widely_reported',
  'likely',
  'inferred',
  'speculative',
  'needs_verification',
] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export interface LineageNode {
  /** The model id, e.g. `drummer:bernard-purdie`. Never changes. */
  id: string;
  /** The URL slug, unique across kinds: a drummer's is bare, others are prefixed by kind. */
  slug: string;
  kind: NodeKind;
  label: string;
  /** True when the model has a record for it; false for a stub someone else named. */
  modelled: boolean;
  activeFrom: number | null;
  activeTo: number | null;
  /** The playable BeatBreaker style, for a modelled drummer. */
  styleKey: string | null;
  /** The model's style ids for a drummer's genres, heaviest first. */
  genres: string[];
  tags: string[];
  summary: string | null;
}

export interface LineageEdge {
  /** Stable across re-seeds: a hash of what the edge says. */
  id: string;
  /** For a directed edge, the ancestor. */
  from: string;
  /** For a directed edge, the descendant. */
  to: string;
  /** The model's relationship type, as declared (`cites_as_influence`, `bandmate`…). */
  relation: string;
  kind: EdgeKind;
  /** False for peers, family and shared recordings: drawn without an arrow. */
  directed: boolean;
  strength: number | null;
  confidence: Confidence | null;
  /** `band` when the influence was the band's, not the drummer's own. */
  scope: 'individual' | 'band' | 'unknown';
  /** The record that made the claim. */
  declaredBy: string;
  /** For a `recording` edge, the record it is on. */
  recordingId: string | null;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}
