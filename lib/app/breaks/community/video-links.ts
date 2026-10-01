import { parseReferenceLink } from '@/lib/app/breaks/links';

/**
 * The video link on a speed record (Phase 7C, D29): someone playing the
 * pattern at the speed they claim.
 *
 * Validated like reference links (`lib/app/breaks/links.ts`) and channel
 * links (`channels.ts`), because it is typed by a person and ends up in an
 * `href` on a public page, and for two of the platforms in an `<iframe src>`:
 *
 * - **YouTube and Vimeo videos go through `parseReferenceLink`**, which is
 *   what builds their click-to-load embed. A song link — YouTube Music,
 *   Spotify — is not a video of anyone playing, so it is refused.
 * - **Instagram posts and reels, TikTok videos and X posts are outbound links
 *   only.** They never embed, so the CSP's frame list does not grow. Each is
 *   held to the platform's own shape (exact hosts, the id extracted) and
 *   rebuilt from the id, so nothing else in the typed string survives.
 *
 * The platform is decided from the URL, never taken from the client. Pure and
 * synchronous: it runs in the Practise drawer and in the API schema, and the
 * two must refuse the same things.
 */

export const VIDEO_PLATFORMS = ['youtube', 'vimeo', 'instagram', 'tiktok', 'x'] as const;
export type VideoPlatform = (typeof VIDEO_PLATFORMS)[number];

/** What each platform is called beside the link. */
export const VIDEO_PLATFORM_LABELS: Record<VideoPlatform, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
};

/** Said wherever a video link is refused, so the refusal names what would work. */
export const VIDEO_RULE = 'Use an https link to a video on YouTube, Vimeo, Instagram, TikTok or X.';

export interface VideoLink {
  platform: VideoPlatform;
  /** The link as stored and as opened in a new tab. */
  url: string;
  /** Built from the id alone, for YouTube and Vimeo. Null for an outbound-only link. */
  embedUrl: string | null;
}

/** Longer than any real video address; bounds what the parser looks at. */
const MAX_URL = 300;

const INSTAGRAM_HOSTS = ['instagram.com', 'www.instagram.com'];
const INSTAGRAM_KINDS = new Set(['p', 'reel', 'reels']);
const INSTAGRAM_CODE = /^[A-Za-z0-9_-]{5,40}$/;
const TIKTOK_HOSTS = ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'];
const TIKTOK_HANDLE = /^[A-Za-z0-9._]{2,24}$/;
const TIKTOK_ID = /^[0-9]{10,25}$/;
const X_HOSTS = [
  'x.com',
  'www.x.com',
  'mobile.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
];
const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const X_ID = /^[0-9]{1,20}$/;

/**
 * Read a video link someone typed. `null` for anything that is not a video on
 * one of the five platforms — the caller says {@link VIDEO_RULE}.
 */
export function parseVideoLink(input: string): VideoLink | null {
  const raw = input.trim();
  if (raw.length > MAX_URL) return null;

  const ref = parseReferenceLink(raw);
  if (ref) {
    if (ref.kind !== 'video' || ref.provider === 'spotify') return null;
    return { platform: ref.provider, url: ref.canonicalUrl, embedUrl: ref.embedUrl };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  if (INSTAGRAM_HOSTS.includes(host)) {
    const [kind, code] = segments;
    if (segments.length !== 2 || !INSTAGRAM_KINDS.has(kind) || !INSTAGRAM_CODE.test(code)) {
      return null;
    }
    const path = kind === 'p' ? 'p' : 'reel';
    return {
      platform: 'instagram',
      url: `https://www.instagram.com/${path}/${code}/`,
      embedUrl: null,
    };
  }

  if (TIKTOK_HOSTS.includes(host)) {
    const [first, video, id] = segments;
    if (segments.length !== 3 || !first.startsWith('@') || video !== 'video') return null;
    const handle = first.slice(1);
    if (!TIKTOK_HANDLE.test(handle) || !TIKTOK_ID.test(id)) return null;
    return {
      platform: 'tiktok',
      url: `https://www.tiktok.com/@${handle}/video/${id}`,
      embedUrl: null,
    };
  }

  if (X_HOSTS.includes(host)) {
    const [handle, status, id] = segments;
    if (segments.length !== 3 || status !== 'status') return null;
    if (!X_HANDLE.test(handle) || !X_ID.test(id)) return null;
    return { platform: 'x', url: `https://x.com/${handle}/status/${id}`, embedUrl: null };
  }

  return null;
}

/**
 * A stored video URL read back — re-parsed, as every stored link is, so one
 * that no longer passes is no link at all rather than a broken one.
 */
export function readStoredVideo(raw: string | null): VideoLink | null {
  return raw ? parseVideoLink(raw) : null;
}
