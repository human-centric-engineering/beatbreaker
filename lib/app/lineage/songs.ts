/**
 * The songs on a drummer's recordings (Phase 15-b, D73), as a page and the
 * index read them.
 *
 * A recording's `tracks` are the songs picked for what the drums do. They come
 * back from `lineage_recording.record` as unchecked JSON, so they are read
 * here through Zod rather than cast; a track that does not read is left out
 * and the rest still show, and so is a transcription. This reader forgives
 * what the model's own schema (`corpus.ts`, held by the tests) refuses: a page
 * shows what it can of a stored row rather than failing on it. A track with `style_key` and `song_key` is
 * **scored**: a style in the catalogue plays it (D74). Anything else is shown
 * as not scored yet (D75).
 */

import { z } from 'zod';

import { type ReferenceLink, parseReferenceLink } from '@/lib/app/breaks/links';
import { drummerId } from '@/lib/app/lineage/corpus';

/** A known human transcription of the song's drums (Songsterr, Drumeo, …). */
export interface SongTranscription {
  site: string;
  url: string | null;
}

/** One row of a drummer's song table. */
export interface SongRow {
  title: string;
  /** The song's credited artist: the band, for a band member. */
  artist: string;
  /** The record it is on, and the record's id. */
  record: string;
  recordingId: string;
  year: number;
  /** One line on what the drums do. */
  drums: string;
  /** Who drums on it, as `drummer:` ids. */
  drummerIds: string[];
  /** The catalogue song that plays it; null is not scored yet. */
  scored: { styleKey: string; songKey: string } | null;
  spotify: ReferenceLink | null;
  youtube: ReferenceLink | null;
  transcriptions: SongTranscription[];
}

/** A recording as the table holds it: its columns and its whole record. */
export interface StoredRecording {
  id: string;
  title: string;
  artist: string;
  year: number;
  record: unknown;
}

const text = z.string().trim().min(1);

const transcriptionSchema = z.object({ site: text, url: z.string().optional() });

/** The transcriptions that read; one that does not costs only itself. */
const transcriptionsSchema = z
  .array(z.unknown())
  .optional()
  .catch(undefined)
  .transform((items) =>
    (items ?? []).flatMap((i) => {
      const read = transcriptionSchema.safeParse(i);
      return read.success ? [read.data] : [];
    })
  );

const trackSchema = z.object({
  title: text,
  artist: text.optional(),
  year: z.number().int().optional(),
  drummer_ids: z.array(drummerId).min(1),
  drums: z.object({ description: text }),
  transcriptions: transcriptionsSchema,
  spotify: z.string().optional().catch(undefined),
  youtube: z.string().optional().catch(undefined),
  style_key: z.string().optional().catch(undefined),
  song_key: z.string().optional().catch(undefined),
});

const tracksOf = z.object({ tracks: z.array(z.unknown()).catch([]).optional() }).catch({});

/** A stored link, or null when it is not one `parseReferenceLink` takes. */
function link(url: string | undefined, provider: ReferenceLink['provider']): ReferenceLink | null {
  if (!url) return null;
  const parsed = parseReferenceLink(url);
  return parsed?.provider === provider ? parsed : null;
}

/** The songs on one recording, each that reads. */
export function readSongs(recording: StoredRecording): SongRow[] {
  const raw = tracksOf.parse(recording.record).tracks ?? [];
  return raw.flatMap((item) => {
    const read = trackSchema.safeParse(item);
    if (!read.success) return [];
    const t = read.data;
    return [
      {
        title: t.title,
        artist: t.artist ?? recording.artist,
        record: recording.title,
        recordingId: recording.id,
        year: t.year ?? recording.year,
        drums: t.drums.description,
        drummerIds: t.drummer_ids,
        scored: t.style_key && t.song_key ? { styleKey: t.style_key, songKey: t.song_key } : null,
        spotify: link(t.spotify, 'spotify'),
        youtube: link(t.youtube, 'youtube'),
        transcriptions: t.transcriptions.map((x) => ({
          site: x.site,
          // only an address a page may link to
          url: x.url && /^https:\/\//i.test(x.url) ? x.url : null,
        })),
      },
    ];
  });
}

/** Scored first, then one that plays here, then the earlier record. */
function better(a: SongRow, b: SongRow): boolean {
  if ((a.scored !== null) !== (b.scored !== null)) return a.scored !== null;
  const playable = (s: SongRow) => s.youtube !== null || s.spotify !== null;
  if (playable(a) !== playable(b)) return playable(a);
  return a.year < b.year;
}

/**
 * A drummer's song table: every song they drum on, across their recordings,
 * once each (a song on an album and a live record is one row, the scored or
 * playable one), oldest first, the scored ones first within a year.
 */
export function songsFor(drummer: string, recordings: StoredRecording[]): SongRow[] {
  const bySong = new Map<string, SongRow>();
  for (const s of recordings.flatMap(readSongs)) {
    if (!s.drummerIds.includes(drummer)) continue;
    const key = `${s.artist.toLowerCase()}\u0000${s.title.toLowerCase()}`;
    const kept = bySong.get(key);
    if (!kept || better(s, kept)) bySong.set(key, s);
  }
  return [...bySong.values()].sort(
    (a, b) =>
      a.year - b.year ||
      Number(b.scored !== null) - Number(a.scored !== null) ||
      a.title.localeCompare(b.title)
  );
}

/** What a transcription site is called on the page. */
const TRANSCRIPTION_SITES: Record<string, string> = {
  songsterr: 'Songsterr',
  drumeo: 'Drumeo',
  hudson: 'Hudson Music',
  modern_drummer: 'Modern Drummer',
  book: 'a book',
  other: 'elsewhere',
};

/**
 * A site's name for the page: its own name for a known site, the stored name
 * for any other. An own-key lookup, so a site called `constructor` is a name,
 * not a function from the object's prototype.
 */
export function transcriptionSiteName(site: string): string {
  return Object.hasOwn(TRANSCRIPTION_SITES, site) ? TRANSCRIPTION_SITES[site] : site;
}
