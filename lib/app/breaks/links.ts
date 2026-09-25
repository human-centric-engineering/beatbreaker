import { z } from 'zod';

/**
 * Reference links on a pattern (D11): the video it came from, the song it is
 * in, the lesson that teaches it.
 *
 * A link is typed by a person and, from Phase 6, shown on a public page, so it
 * is untrusted input headed for an `href` and an `<iframe src>`. The rules:
 *
 * - **https only, exact hosts only.** `youtube.com.example.net`, a userinfo
 *   trick (`https://youtube.com@example.net`) and a non-default port are all
 *   refused, because `URL` resolves each of them to a host that is not on the
 *   list. There is no suffix matching anywhere.
 * - **The id is extracted and checked against the provider's own id shape.**
 *   Nothing else from the typed string survives except a YouTube start time.
 * - **What is stored is the URL rebuilt from the id**, never the string the
 *   user typed, so tracking parameters, a `&list=` that hijacks the embed, and
 *   anything smuggled in a path segment are gone before the row is written.
 *
 * Pure and synchronous: it runs in the details form and in the API schema, and
 * the two must refuse the same things.
 */

export type LinkProvider = 'youtube' | 'vimeo' | 'spotify';
/** What the link is to — decides the chip: ▶ Video or ♫ Song. */
export type LinkKind = 'video' | 'song';

export interface ReferenceLink {
  provider: LinkProvider;
  kind: LinkKind;
  id: string;
  /** Where in the video the break starts — the point of most YouTube links. */
  startSeconds?: number;
  /** The link as stored and as opened in a new tab. */
  canonicalUrl: string;
  /** Built from the id alone; the only thing an `<iframe src>` may be given. */
  embedUrl: string;
}

/** How many links a pattern may carry. */
export const MAX_LINKS = 4;

/** Said wherever a link is refused, so the refusal names what would work. */
export const LINK_RULE =
  'Use an https link to a YouTube or Vimeo video, or a Spotify track, album or playlist.';

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com']);
const VIMEO_ID = /^[0-9]{1,12}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const SPOTIFY_TYPES = new Set(['track', 'album', 'playlist']);

/** Longer than any real video; stops a `t=` from being an arbitrary integer. */
const MAX_START = 24 * 60 * 60;

/**
 * A YouTube `t=` value: `321`, `321s`, `5m21s`, `1h2m3s`. Anything else, or
 * zero, is no start time — the link still parses, it just starts at the top.
 */
function parseStart(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const m = /^(?:(\d{1,2})h)?(?:(\d{1,4})m)?(?:(\d{1,6})s?)?$/.exec(raw);
  if (!m || (!m[1] && !m[2] && !m[3])) return undefined;
  const seconds = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return seconds > 0 && seconds <= MAX_START ? seconds : undefined;
}

function youtube(id: string, start: number | undefined, kind: LinkKind): ReferenceLink {
  const t = start ? `&t=${start}s` : '';
  return {
    provider: 'youtube',
    kind,
    id,
    ...(start ? { startSeconds: start } : {}),
    canonicalUrl:
      kind === 'song'
        ? `https://music.youtube.com/watch?v=${id}${t}`
        : `https://www.youtube.com/watch?v=${id}${t}`,
    // the no-cookie host: nothing is set in the visitor's browser until they press play
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ''}`,
  };
}

/**
 * Read a link someone typed. `null` for anything not on the list — the caller
 * says {@link LINK_RULE}.
 */
export function parseReferenceLink(input: string): ReferenceLink | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  if (YOUTUBE_HOSTS.has(host) || host === 'music.youtube.com') {
    const kind: LinkKind = host === 'music.youtube.com' ? 'song' : 'video';
    let id: string | null = null;
    if (segments[0] === 'watch' && segments.length === 1) id = url.searchParams.get('v');
    else if (['shorts', 'embed', 'live'].includes(segments[0] ?? '') && segments.length === 2)
      id = segments[1];
    if (!id || !YOUTUBE_ID.test(id)) return null;
    return youtube(
      id,
      parseStart(url.searchParams.get('t') ?? url.searchParams.get('start')),
      kind
    );
  }

  if (host === 'youtu.be') {
    const id = segments.length === 1 ? segments[0] : null;
    if (!id || !YOUTUBE_ID.test(id)) return null;
    return youtube(id, parseStart(url.searchParams.get('t')), 'video');
  }

  if (VIMEO_HOSTS.has(host)) {
    const id = segments.length === 1 ? segments[0] : null;
    if (!id || !VIMEO_ID.test(id)) return null;
    return {
      provider: 'vimeo',
      kind: 'video',
      id,
      canonicalUrl: `https://vimeo.com/${id}`,
      embedUrl: `https://player.vimeo.com/video/${id}`,
    };
  }

  if (host === 'open.spotify.com') {
    // Spotify prefixes a locale on shared links: /intl-de/track/…
    const rest = segments[0]?.startsWith('intl-') ? segments.slice(1) : segments;
    const [type, id] = rest;
    if (rest.length !== 2 || !SPOTIFY_TYPES.has(type) || !SPOTIFY_ID.test(id)) return null;
    return {
      provider: 'spotify',
      kind: 'song',
      id: `${type}/${id}`,
      canonicalUrl: `https://open.spotify.com/${type}/${id}`,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}`,
    };
  }

  return null;
}

/** One link as a `Break.links` entry holds it. */
export interface StoredLink {
  kind: LinkKind;
  url: string;
  label?: string;
}

const storedEntry = z.object({ url: z.string(), label: z.string().optional() });

/**
 * A {@link StoredLink} as the API answers it, for a client reading one back —
 * checked, not cast. The API has already re-parsed each link; a client that
 * puts one in an `href` still goes through {@link parseReferenceLink}.
 */
export const storedLinkSchema = z.object({
  kind: z.enum(['video', 'song']),
  url: z.string(),
  label: z.string().optional(),
});

/**
 * `Break.links` read back from the database. A row is external data (H9), so
 * each entry is re-parsed, and one that no longer passes — a provider dropped
 * from the list, a hand-edited row — is left out rather than failing the read:
 * the pattern must still open.
 */
export function readStoredLinks(raw: unknown): StoredLink[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredLink[] = [];
  for (const entry of raw.slice(0, MAX_LINKS)) {
    const read = storedEntry.safeParse(entry);
    if (!read.success) continue;
    const parsed = parseReferenceLink(read.data.url);
    if (!parsed) continue;
    const label = read.data.label?.trim().slice(0, 60);
    out.push({ kind: parsed.kind, url: parsed.canonicalUrl, ...(label ? { label } : {}) });
  }
  return out;
}
