/**
 * Where the lineage map puts everything (Phase 11-b, D49). Pure: the graph in,
 * coordinates out, so the server computes it once and the page renders SVG.
 *
 * Time runs left to right — x is the year a person started — and each family
 * of music is a band down the page, so the map reads as a family tree. Inside
 * a band, people are packed into rows so no two labels overlap.
 *
 * Only people are placed. A genre (`style` node) is joined only to other
 * genres, so it is a graph of its own and stays off this map.
 */

import {
  CONFIDENCES,
  type Confidence,
  type DeviceKind,
  type EdgeKind,
  type LineageEdge,
  type LineageGraph,
  type LineageNode,
  type NodeKind,
} from '@/lib/app/lineage/types';

/** The bands down the map, top to bottom. */
export const FAMILIES = [
  'jazz',
  'funk-soul',
  'rock',
  'latin-african',
  'metal-experimental',
] as const;
export type Family = (typeof FAMILIES)[number];

export const FAMILY_LABELS: Record<Family, string> = {
  jazz: 'Jazz',
  'funk-soul': 'Funk and soul',
  rock: 'Rock',
  'latin-african': 'Latin and African',
  'metal-experimental': 'Metal and experimental',
};

/**
 * The family each of the model's genres belongs to. A drummer's band is the
 * family of their heaviest genre. Every genre in the model must be here — a
 * test reads the files and holds it.
 */
export const GENRE_FAMILY: Record<string, Family> = {
  'style:afro-cuban': 'latin-african',
  'style:afrobeat': 'latin-african',
  'style:americana': 'rock',
  'style:big-band-swing': 'jazz',
  'style:blues': 'funk-soul',
  'style:blues-rock': 'rock',
  'style:blues-shuffle': 'funk-soul',
  'style:broken-beat': 'jazz',
  'style:cha-cha-cha': 'latin-african',
  'style:cuban-son': 'latin-african',
  'style:drone-doom': 'metal-experimental',
  'style:dub': 'funk-soul',
  'style:experimental-rock': 'metal-experimental',
  'style:funk': 'funk-soul',
  'style:gospel': 'funk-soul',
  'style:half-time-shuffle': 'funk-soul',
  'style:hard-rock': 'rock',
  'style:hip-hop-breakbeat': 'funk-soul',
  'style:jazz': 'jazz',
  'style:jazz-fusion': 'jazz',
  'style:jazz-waltz': 'jazz',
  'style:latin-jazz': 'latin-african',
  'style:mambo': 'latin-african',
  'style:math-rock': 'metal-experimental',
  'style:merseybeat': 'rock',
  'style:metal': 'metal-experimental',
  'style:middle-eastern': 'latin-african',
  'style:mozambique': 'latin-african',
  'style:new-orleans-second-line': 'jazz',
  'style:new-wave': 'rock',
  'style:pop-rock-session': 'rock',
  'style:post-bop': 'jazz',
  'style:progressive-rock': 'metal-experimental',
  'style:psychedelic-rock': 'rock',
  'style:punk': 'rock',
  'style:reggae': 'funk-soul',
  'style:rnb-soul': 'funk-soul',
  'style:rock': 'rock',
  'style:rock-and-roll': 'rock',
  'style:rudimental': 'jazz',
  'style:salsa': 'latin-african',
  'style:skiffle': 'rock',
  'style:songo': 'latin-african',
  'style:thrash-metal': 'metal-experimental',
  'style:uk-jazz': 'jazz',
  'style:west-african': 'latin-african',
};

/** The edge kinds the map draws. `style` joins genres, which are not on it. */
export const MAP_EDGE_KINDS = [
  'influence',
  'teacher',
  'succession',
  'peer',
  'family',
  'recording',
] as const satisfies readonly EdgeKind[];
export type MapEdgeKind = (typeof MAP_EDGE_KINDS)[number];

export const EDGE_KIND_LABELS: Record<MapEdgeKind, string> = {
  influence: 'Influence',
  teacher: 'Teacher',
  succession: 'Took the chair',
  peer: 'Played together',
  family: 'Family',
  recording: 'Same record',
};

/** A device as a drummer says it. Only the first two are polyrhythms. */
export const DEVICE_LABELS: Record<DeviceKind, string> = {
  'cross-rhythm': 'Cross-rhythm',
  hemiola: 'Hemiola',
  grouping: 'Groupings',
  polymeter: 'Polymeter',
  'metric-modulation': 'Metric modulation',
  displacement: 'Displacement',
  timeline: 'Timeline (clave, bell)',
  'ostinato-independence': 'Ostinato independence',
  polytempo: 'Polytempo',
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  verified: 'Verified',
  widely_reported: 'Widely reported',
  likely: 'Likely',
  inferred: 'Inferred',
  speculative: 'Speculative',
  needs_verification: 'Needs checking',
};

function rank(confidence: Confidence | null): number {
  return confidence === null ? CONFIDENCES.length : CONFIDENCES.indexOf(confidence);
}

/** Drawn dashed: a claim weaker than `likely`, or one that gives no confidence. */
export function isTentative(confidence: Confidence | null): boolean {
  return rank(confidence) > CONFIDENCES.indexOf('likely');
}

/** Whether a claim is at least as sure as `floor`; `null` lets everything through. */
export function meetsConfidence(confidence: Confidence | null, floor: Confidence | null): boolean {
  return floor === null || rank(confidence) <= CONFIDENCES.indexOf(floor);
}

/** Every edge drawn on the map: not a genre's, and between two placed people. */
export function isMapEdge(edge: LineageEdge): edge is LineageEdge & { kind: MapEdgeKind } {
  return MAP_EDGE_KINDS.some((k) => k === edge.kind);
}

/* ---- tracing ----------------------------------------------------------- */

/**
 * The edge kinds that are lineage: something learned. Taking someone's chair
 * has a direction but passes nothing on, so it is "around them", not here —
 * the map's trace and a drummer's page agree on that.
 */
export const LINEAGE_EDGE_KINDS = ['influence', 'teacher'] as const satisfies readonly EdgeKind[];

/** Whether an edge says one person learned from another. */
export function isLineageEdge(edge: LineageEdge): boolean {
  return edge.directed && LINEAGE_EDGE_KINDS.some((k) => k === edge.kind);
}

export interface Trace {
  ancestors: Set<string>;
  descendants: Set<string>;
  /** The influence and teacher edges on a path into or out of the traced node. */
  edges: Set<string>;
}

/**
 * Everyone a node learned from, however far back, and everyone who learned
 * from it, however far on — through influence and teacher edges only. Peers,
 * family and shared records have no direction, and a chair taken passes
 * nothing on, so they lead nowhere here.
 */
export function traceLineage(edges: readonly LineageEdge[], id: string): Trace {
  const directed = edges.filter(isLineageEdge);
  const walk = (start: string, next: (e: LineageEdge) => [string, string]): Set<string> => {
    const seen = new Set<string>();
    const queue = [start];
    while (queue.length > 0) {
      const at = queue.shift();
      for (const e of directed) {
        const [here, there] = next(e);
        if (here === at && there !== id && !seen.has(there)) {
          seen.add(there);
          queue.push(there);
        }
      }
    }
    return seen;
  };
  const ancestors = walk(id, (e) => [e.to, e.from]);
  const descendants = walk(id, (e) => [e.from, e.to]);
  const up = new Set([id, ...ancestors]);
  const down = new Set([id, ...descendants]);
  const onPath = directed.filter(
    (e) => (up.has(e.from) && up.has(e.to)) || (down.has(e.from) && down.has(e.to))
  );
  return { ancestors, descendants, edges: new Set(onPath.map((e) => e.id)) };
}

/* ---- the layout --------------------------------------------------------- */

export interface PlacedNode {
  id: string;
  slug: string;
  label: string;
  kind: NodeKind;
  modelled: boolean;
  styleKey: string | null;
  /** The kinds of rhythmic device the record names, for the map's filter. */
  devices: DeviceKind[];
  family: Family;
  /** The year the column stands for: the record's, or one inferred from the edges. */
  year: number | null;
  /** True when `year` came from the edges, not from a record. */
  inferred: boolean;
  x: number;
  y: number;
}

export interface Band {
  family: Family;
  label: string;
  top: number;
  height: number;
}

export interface Tick {
  year: number;
  x: number;
}

export interface LineageLayout {
  width: number;
  height: number;
  nodes: PlacedNode[];
  /** The edges between placed nodes, genre edges left out. */
  edges: (LineageEdge & { kind: MapEdgeKind })[];
  bands: Band[];
  /** A tick per decade along the top. */
  ticks: Tick[];
  /** Where nodes with no year to show go, if any do. */
  unknownX: number | null;
}

/** Pixels per year, and the sizes the rows are packed with. */
export const LAYOUT = {
  pxPerYear: 14,
  left: 150,
  top: 40,
  right: 160,
  rowHeight: 30,
  bandPadding: 14,
  labelGap: 16,
  charWidth: 6.6,
} as const;

/** What a label is taken to need, for packing: the dot, the gap and the text. */
function labelWidth(label: string): number {
  return 14 + label.length * LAYOUT.charWidth;
}

/** How far before or after a neighbour a stub is put when its year is inferred. */
const STEP_YEARS = 10;

/**
 * A year for every person who can have one. A record's start year is kept;
 * a stub's is inferred from its edges, repeatedly, so a chain of stubs fills
 * in from the people at either end. Each edge to someone with a year is a
 * hint — an ancestor a decade before, a descendant a decade after, a peer
 * beside — and the stub goes at the middle hint, so one late admirer cannot
 * drag a 1960s drummer into the 2020s.
 */
function inferYears(
  people: readonly LineageNode[],
  edges: readonly LineageEdge[]
): Map<string, { year: number; inferred: boolean }> {
  const years = new Map<string, { year: number; inferred: boolean }>();
  for (const n of people) {
    if (n.activeFrom !== null) years.set(n.id, { year: n.activeFrom, inferred: false });
  }
  for (let pass = 0; pass < people.length; pass++) {
    const found: [string, number][] = [];
    for (const n of people) {
      if (years.has(n.id)) continue;
      const hints: number[] = [];
      for (const e of edges) {
        const other = e.from === n.id ? e.to : e.to === n.id ? e.from : null;
        const known = other === null ? undefined : years.get(other)?.year;
        if (known === undefined) continue;
        if (!e.directed) hints.push(known);
        else hints.push(e.from === n.id ? known - STEP_YEARS : known + STEP_YEARS);
      }
      if (hints.length === 0) continue;
      hints.sort((a, b) => a - b);
      found.push([n.id, hints[Math.floor((hints.length - 1) / 2)]]);
    }
    if (found.length === 0) break;
    /* All at once, so the order people are listed in cannot change a year. */
    for (const [id, year] of found) years.set(id, { year, inferred: true });
  }
  return years;
}

/** The family a record's heaviest known genre belongs to, if it has one. */
function genreFamily(node: LineageNode): Family | null {
  for (const g of node.genres) {
    const family = GENRE_FAMILY[g];
    if (family) return family;
  }
  return null;
}

/**
 * A band for every person: their genre's, or — for a stub, which has no
 * genres — the one most of their neighbours are in, ties to the band higher
 * up. Repeated so a stub reached only through other stubs still gets one.
 */
function assignFamilies(
  people: readonly LineageNode[],
  edges: readonly LineageEdge[]
): Map<string, Family> {
  const families = new Map<string, Family>();
  for (const n of people) {
    const family = genreFamily(n);
    if (family) families.set(n.id, family);
  }
  for (let pass = 0; pass < people.length; pass++) {
    const found: [string, Family][] = [];
    for (const n of people) {
      if (families.has(n.id)) continue;
      const votes = new Map<Family, number>();
      for (const e of edges) {
        const other = e.from === n.id ? e.to : e.to === n.id ? e.from : null;
        const family = other === null ? undefined : families.get(other);
        if (family) votes.set(family, (votes.get(family) ?? 0) + 1);
      }
      let best: Family | null = null;
      for (const family of FAMILIES) {
        if ((votes.get(family) ?? 0) > (best ? (votes.get(best) ?? 0) : 0)) best = family;
      }
      if (best) found.push([n.id, best]);
    }
    if (found.length === 0) break;
    for (const [id, family] of found) families.set(id, family);
  }
  return families;
}

/**
 * Lay out every person in the graph: each drummer with a record, and everyone
 * else a link to another person names. Deterministic: the same graph gives
 * the same map.
 */
export function layoutLineage(graph: LineageGraph): LineageLayout {
  /* A stub is on the map for its links to people; with none, it has no place. */
  const notGenre = new Set(graph.nodes.filter((n) => n.kind !== 'style').map((n) => n.id));
  const edges = graph.edges
    .filter(isMapEdge)
    .filter((e) => notGenre.has(e.from) && notGenre.has(e.to));
  const linked = new Set(edges.flatMap((e) => [e.from, e.to]));
  const people = graph.nodes.filter((n) => notGenre.has(n.id) && (n.modelled || linked.has(n.id)));

  const years = inferYears(people, edges);
  const families = assignFamilies(people, edges);

  const known = [...years.values()].map((y) => y.year);
  const first = known.length > 0 ? Math.floor(Math.min(...known) / 10) * 10 : 1950;
  const last = known.length > 0 ? Math.ceil((Math.max(...known) + 1) / 10) * 10 : 2020;
  const xOf = (year: number) => LAYOUT.left + (year - first) * LAYOUT.pxPerYear;
  const anyUnknown = people.some((n) => !years.has(n.id));
  const unknownX = anyUnknown ? xOf(last) + 2 * STEP_YEARS * LAYOUT.pxPerYear : null;

  /* Pack each band: left to right, each person into the first row whose last
     label ends before they start. */
  const nodes: PlacedNode[] = [];
  const bands: Band[] = [];
  let top = LAYOUT.top;
  for (const family of FAMILIES) {
    const members = people
      .filter((n) => (families.get(n.id) ?? FAMILIES[0]) === family)
      .map((n) => {
        const y = years.get(n.id);
        return { n, year: y?.year ?? null, inferred: y?.inferred ?? false };
      })
      .map((m) => ({ ...m, x: m.year === null ? (unknownX ?? 0) : xOf(m.year) }))
      .sort(
        (a, b) => a.x - b.x || a.n.label.localeCompare(b.n.label) || a.n.id.localeCompare(b.n.id)
      );
    const rowEnds: number[] = [];
    const rows = members.map((m) => {
      let row = rowEnds.findIndex((end) => end + LAYOUT.labelGap <= m.x);
      if (row === -1) row = rowEnds.push(0) - 1;
      rowEnds[row] = m.x + labelWidth(m.n.label);
      return row;
    });
    const height = Math.max(1, rowEnds.length) * LAYOUT.rowHeight + 2 * LAYOUT.bandPadding;
    members.forEach((m, i) => {
      nodes.push({
        id: m.n.id,
        slug: m.n.slug,
        label: m.n.label,
        kind: m.n.kind,
        modelled: m.n.modelled,
        styleKey: m.n.styleKey,
        devices: [...new Set(m.n.devices.map((d) => d.kind))],
        family,
        year: m.year,
        inferred: m.inferred,
        x: m.x,
        y: top + LAYOUT.bandPadding + rows[i] * LAYOUT.rowHeight + LAYOUT.rowHeight / 2,
      });
    });
    bands.push({ family, label: FAMILY_LABELS[family], top, height });
    top += height;
  }

  const ticks: Tick[] = [];
  for (let year = first; year <= last; year += 10) ticks.push({ year, x: xOf(year) });
  const widest = Math.max(xOf(last), ...nodes.map((n) => n.x + labelWidth(n.label)));

  return {
    width: Math.ceil(widest + LAYOUT.right),
    height: top + LAYOUT.top / 2,
    nodes,
    edges,
    bands,
    ticks,
    unknownX,
  };
}

/**
 * The curve an edge is drawn as: out of one dot and into the other, bending
 * through the middle. Two people in one column bow out to the right, so the
 * line is not hidden under the labels between them.
 */
export function edgePath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  if (Math.abs(a.x - b.x) < 1) {
    const bow = 40 + Math.min(120, Math.abs(a.y - b.y) / 4);
    return `M ${a.x} ${a.y} C ${a.x + bow} ${a.y}, ${b.x + bow} ${b.y}, ${b.x} ${b.y}`;
  }
  const mid = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
}
