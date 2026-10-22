/**
 * The index of drummers, bands and songs (Phase 15-c), and the search over it.
 *
 * Pure: `getCatalogueIndex` (data.ts) builds the index from the lineage
 * tables, and `GET /api/v1/catalogue/index?q=` and the style picker's
 * fallback (D75) search it. A search folds case, accents and punctuation, so
 * "how soon is now" finds "How Soon Is Now?" and "beyonce" finds "Beyoncé".
 * Every word typed must appear in what it matches.
 */

import { type SongRow } from '@/lib/app/lineage/songs';

/** A drummer on the index: built (a playable style) or a candidate. */
export interface IndexDrummer {
  slug: string;
  label: string;
  candidate: boolean;
  /** The playable style; null for a candidate. */
  styleKey: string | null;
  /** The bands and ensembles the record names, in its order. */
  bands: string[];
}

export interface CatalogueIndex {
  drummers: IndexDrummer[];
  /** Every song on every recording, with who drums on it. */
  songs: SongRow[];
}

/** A person a result names, enough to link to their page. */
export interface IndexPerson {
  slug: string;
  label: string;
  candidate: boolean;
}

export interface IndexSongHit {
  title: string;
  artist: string;
  record: string;
  year: number;
  drummers: IndexPerson[];
  /** The catalogue song that plays it; null is "not scored yet" (D75). */
  scored: { styleKey: string; songKey: string } | null;
}

export interface IndexBandHit {
  name: string;
  drummers: IndexPerson[];
}

export interface IndexResult {
  query: string;
  drummers: IndexPerson[];
  bands: IndexBandHit[];
  songs: IndexSongHit[];
}

/** The most of each kind a search answers with. */
export const INDEX_LIMIT = 20;

/** Lower case, no accents, every run of anything but letters and digits one space. */
export function fold(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Whether every word of the folded query is a word, or the start of one, in `text`. */
function matches(words: string[], text: string): boolean {
  const have = ` ${fold(text)}`;
  return words.every((w) => have.includes(` ${w}`));
}

/** How well a name fits: whole match, then a start, then anywhere. Lower is better. */
function rank(query: string, text: string): number {
  const t = fold(text).replace(/^the /, '');
  const q = query.replace(/^the /, '');
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  return 2;
}

function person(d: IndexDrummer): IndexPerson {
  return { slug: d.slug, label: d.label, candidate: d.candidate };
}

/**
 * Search the index. Drummers match on their name; bands on the band's name,
 * with every drummer who played in it; songs on the title, then on the band
 * that recorded it. Built drummers come before candidates, and scored songs
 * before unscored, within each fit.
 */
export function searchIndex(
  index: CatalogueIndex,
  query: string,
  limit = INDEX_LIMIT
): IndexResult {
  const q = fold(query);
  const words = q.split(' ').filter(Boolean);
  const empty = { query, drummers: [], bands: [], songs: [] };
  if (words.length === 0) return empty;

  const bySlug = new Map(index.drummers.map((d) => [`drummer:${d.slug}`, d]));

  const drummers = index.drummers
    .filter((d) => matches(words, d.label))
    .sort(
      (a, b) =>
        rank(q, a.label) - rank(q, b.label) ||
        Number(a.candidate) - Number(b.candidate) ||
        a.label.localeCompare(b.label)
    )
    .slice(0, limit)
    .map(person);

  const bands = new Map<string, { name: string; drummers: IndexDrummer[] }>();
  for (const d of index.drummers) {
    for (const band of d.bands) {
      if (!matches(words, band)) continue;
      const key = fold(band);
      const entry = bands.get(key) ?? { name: band, drummers: [] };
      if (!entry.drummers.includes(d)) entry.drummers.push(d);
      bands.set(key, entry);
    }
  }
  const bandHits = [...bands.values()]
    .sort((a, b) => rank(q, a.name) - rank(q, b.name) || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((b) => ({
      name: b.name,
      drummers: b.drummers
        .sort((x, y) => Number(x.candidate) - Number(y.candidate) || x.label.localeCompare(y.label))
        .map(person),
    }));

  const songs = index.songs
    .filter((s) => matches(words, s.title) || matches(words, `${s.artist} ${s.title}`))
    .sort(
      (a, b) =>
        rank(q, a.title) - rank(q, b.title) ||
        Number(b.scored !== null) - Number(a.scored !== null) ||
        a.year - b.year ||
        a.title.localeCompare(b.title)
    )
    .slice(0, limit)
    .map((s) => ({
      title: s.title,
      artist: s.artist,
      record: s.record,
      year: s.year,
      drummers: s.drummerIds.flatMap((id) => {
        const d = bySlug.get(id);
        return d ? [person(d)] : [];
      }),
      scored: s.scored,
    }));

  return { query, drummers, bands: bandHits, songs };
}

/**
 * What the picker says of a song it does not play (D75): "The Smiths: How
 * Soon Is Now? is not scored yet".
 */
export function notScoredLine(song: Pick<IndexSongHit, 'artist' | 'title'>): string {
  return `${song.artist}: ${song.title} is not scored yet`;
}
