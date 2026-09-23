import type { PackedPattern } from '@/lib/app/breaks/schema';
import type { ResolvedKit } from '@/lib/app/breaks/kit';
import type { ResolvedStyle } from '@/lib/app/breaks/types';

/**
 * The catalogue, as every client receives it.
 *
 * One shape for the server component that reads the database directly, for
 * `/api/v1/catalogue/*`, and for the Studio's provider — so a native client
 * (D14) works from the same types the web app does, and a change to what a
 * picker needs shows up as a type error in all three places at once.
 *
 * **Structural constants are deliberately not here.** Meters, lanes and slots
 * are what the wire format is built on — a saved pattern means nothing without
 * them — so they stay in code and are served read-only from `…/meters`.
 */

/** A style as the catalogue serves it: resolved, plus the shelf it sits on. */
export interface CatalogueStyle extends ResolvedStyle {
  /** Heading it files under in the picker. */
  group: string;
}

/** A kit as the catalogue serves it. Identical to what playback takes. */
export type CatalogueKit = ResolvedKit;

/**
 * One pattern in a library.
 *
 * `doc` is a packed pattern — one section, the shape a share code carries per
 * section — so showing an entry needs the wire format and nothing else. Before
 * Phase 2 an entry was a set of bar strings that only the app's own parser
 * could read, which made "a client that is not this one" a rewrite.
 */
export interface CatalogueEntry {
  id: string;
  /** Heading within the library. */
  group: string;
  title: string;
  artist: string;
  note: string | null;
  bpm: number;
  styleKey: string;
  /** The style version it was written against, where that is still known. */
  styleVersionId: string | null;
  meter: string;
  doc: PackedPattern;
}

/** A named, ordered list of patterns. */
export interface CatalogueLibrary {
  key: string;
  title: string;
  description: string;
  entries: CatalogueEntry[];
}

/**
 * Everything the Studio's pickers are built from.
 *
 * Styles and kits are keyed maps because every consumer looks one up by key —
 * the pattern records a key, not an index. The group lists carry the order,
 * which a map cannot.
 */
export interface StudioCatalogue {
  styles: Record<string, CatalogueStyle>;
  /** `[heading, keys]`, in the order the picker shows them. */
  styleGroups: Array<[string, string[]]>;
  kits: Record<string, CatalogueKit>;
  kitGroups: Array<{ label: string; keys: string[] }>;
  libraries: CatalogueLibrary[];
}

/**
 * The library, grouped for the picker: `[heading, entries]` in library order.
 *
 * A view rather than a shape the API returns — the grouping is presentation and
 * the order is already in the rows, so deriving it keeps one source of truth.
 */
export function libraryGroups(
  library: CatalogueLibrary | undefined
): Array<[string, CatalogueEntry[]]> {
  const out = new Map<string, CatalogueEntry[]>();
  for (const entry of library?.entries ?? []) {
    const list = out.get(entry.group);
    if (list) list.push(entry);
    else out.set(entry.group, [entry]);
  }
  return [...out.entries()];
}

/**
 * The shared percussion recordings, and which pack's folder they sit in.
 *
 * Percussion is deliberately not per kit — a tambourine over the Studio '70s
 * set should be a tambourine — so exactly one kit row carries a `perc` map and
 * every kit reaches it. Finding it by looking rather than by a hard-coded key
 * is what lets a fork ship a different percussion set as data.
 *
 * The first one wins if two carry it, which is the catalogue's own order and
 * therefore something an admin can decide.
 */
export function percussionSource(
  kits: Record<string, CatalogueKit>
): { pack: string; slots: NonNullable<CatalogueKit['samples']['perc']> } | null {
  for (const kit of Object.values(kits)) {
    const perc = kit.samples.perc;
    const pack = kit.pack;
    if (perc && pack && Object.keys(perc).length) return { pack, slots: perc };
  }
  return null;
}
