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

/** Whether every word of the folded query is a word, or the start of one, in folded `text`. */
function matches(words: string[], folded: string): boolean {
  const have = ` ${folded}`;
  return words.every((w) => have.includes(` ${w}`));
}

/** How well a folded name fits: whole match, then a start, then anywhere. Lower is better. */
function rank(query: string, folded: string): number {
  const t = folded.replace(/^the /, '');
  const q = query.replace(/^the /, '');
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  return 2;
}

function person(d: IndexDrummer): IndexPerson {
  return { slug: d.slug, label: d.label, candidate: d.candidate };
}

/** A song as the search reads it: one per artist and title, however many records hold it. */
interface FoldedSong {
  song: SongRow;
  drummerIds: string[];
  title: string;
  artistTitle: string;
}

/** Every name in an index, folded once. */
interface FoldedIndex {
  drummers: { d: IndexDrummer; label: string }[];
  bands: { d: IndexDrummer; name: string; folded: string }[];
  songs: FoldedSong[];
}

/* The index is built once and kept (data.ts), so its folding is too. */
const foldedIndexes = new WeakMap<CatalogueIndex, FoldedIndex>();

function foldIndex(index: CatalogueIndex): FoldedIndex {
  const known = foldedIndexes.get(index);
  if (known) return known;
  const songs = new Map<string, FoldedSong>();
  for (const s of index.songs) {
    const title = fold(s.title);
    const artistTitle = `${fold(s.artist)} ${title}`;
    const same = songs.get(artistTitle);
    if (!same) {
      songs.set(artistTitle, { song: s, drummerIds: [...s.drummerIds], title, artistTitle });
      continue;
    }
    // the same song on another record: one hit, everyone who drums on it, scored if either is
    for (const id of s.drummerIds) if (!same.drummerIds.includes(id)) same.drummerIds.push(id);
    if (!same.song.scored && s.scored) same.song = s;
  }
  const folded: FoldedIndex = {
    drummers: index.drummers.map((d) => ({ d, label: fold(d.label) })),
    bands: index.drummers.flatMap((d) => d.bands.map((name) => ({ d, name, folded: fold(name) }))),
    songs: [...songs.values()],
  };
  foldedIndexes.set(index, folded);
  return folded;
}

/**
 * Search the index. Drummers match on their name; bands on the band's name,
 * with every drummer who played in it; songs on the title, or the band and the
 * title, once each however many records hold them. Built drummers come before
 * candidates, and scored songs before unscored, within each fit.
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

  const folded = foldIndex(index);
  const bySlug = new Map(index.drummers.map((d) => [`drummer:${d.slug}`, d]));

  const drummers = folded.drummers
    .filter((x) => matches(words, x.label))
    .sort(
      (a, b) =>
        rank(q, a.label) - rank(q, b.label) ||
        Number(a.d.candidate) - Number(b.d.candidate) ||
        a.d.label.localeCompare(b.d.label)
    )
    .slice(0, limit)
    .map((x) => person(x.d));

  const bands = new Map<string, { name: string; folded: string; drummers: IndexDrummer[] }>();
  for (const b of folded.bands) {
    if (!matches(words, b.folded)) continue;
    const entry = bands.get(b.folded) ?? { name: b.name, folded: b.folded, drummers: [] };
    if (!entry.drummers.includes(b.d)) entry.drummers.push(b.d);
    bands.set(b.folded, entry);
  }
  const bandHits = [...bands.values()]
    .sort((a, b) => rank(q, a.folded) - rank(q, b.folded) || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((b) => ({
      name: b.name,
      drummers: b.drummers
        .sort((x, y) => Number(x.candidate) - Number(y.candidate) || x.label.localeCompare(y.label))
        .map(person),
    }));

  // every word in the title is also in the band and the title, so one test does for both
  const songs = folded.songs
    .filter((x) => matches(words, x.artistTitle))
    .sort(
      (a, b) =>
        rank(q, a.title) - rank(q, b.title) ||
        Number(b.song.scored !== null) - Number(a.song.scored !== null) ||
        a.song.year - b.song.year ||
        a.song.title.localeCompare(b.song.title)
    )
    .slice(0, limit)
    .map(({ song: s, drummerIds }) => ({
      title: s.title,
      artist: s.artist,
      record: s.record,
      year: s.year,
      drummers: drummerIds.flatMap((id) => {
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
