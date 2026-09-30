import { z } from 'zod';

/**
 * Channel links on a drummer's profile (Phase 7B): where people can watch or
 * hear them play.
 *
 * Validated like reference links (`lib/app/breaks/links.ts`), because they
 * are typed by a person and end up in an `href` on a public page:
 *
 * - **https only, exact hosts only.** A look-alike host, a userinfo trick and
 *   a non-default port are refused. The one subdomain rule is Bandcamp's,
 *   whose artist pages are `name.bandcamp.com`: exactly one label, held to
 *   Bandcamp's own name shape.
 * - **The handle or channel id is extracted** and checked against the
 *   platform's shape. Nothing else from the typed string survives.
 * - **What is stored is the URL rebuilt from the handle**, never the string
 *   typed, so tracking parameters and anything in the query or path are gone.
 * - **A personal website** is any other `https` host with a dot in it. Its
 *   path is kept and its query and fragment are dropped. It is shown as its
 *   bare host, so the page never displays text the owner chose to look like
 *   another site's address.
 *
 * The platform is decided from the URL, never taken from the client, so a
 * link cannot be labelled as something it is not. Links never embed: they are
 * outbound links, so nothing here touches the CSP's frame list.
 *
 * Pure and synchronous: it runs in the settings form and in the API schema,
 * and the two must refuse the same things.
 */

export const CHANNEL_KINDS = [
  'youtube',
  'instagram',
  'tiktok',
  'x',
  'facebook',
  'twitch',
  'soundcloud',
  'bandcamp',
  'website',
] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];

/** What each kind is called on the page and in the form. */
export const CHANNEL_LABELS: Record<ChannelKind, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  facebook: 'Facebook',
  twitch: 'Twitch',
  soundcloud: 'SoundCloud',
  bandcamp: 'Bandcamp',
  website: 'Website',
};

/** How many channels a profile may list (D33). */
export const MAX_CHANNELS = 8;

/** Said wherever a channel link is refused, so the refusal names what would work. */
export const CHANNEL_RULE =
  'Use an https link to your page on YouTube, Instagram, TikTok, X, Facebook, Twitch, SoundCloud or Bandcamp, or to your own website.';

export interface ChannelLink {
  kind: ChannelKind;
  /** The handle or channel id; the website's host. */
  handle: string;
  /** The link as stored and as opened. */
  url: string;
  /** What the page shows: `@handle`, or a website's bare host. */
  display: string;
}

/** Longer than any real channel address; bounds what the parser looks at. */
const MAX_URL = 300;

/* Paths on each platform that are pages of the platform, not a person's. */
const INSTAGRAM_RESERVED = new Set(['p', 'reel', 'reels', 'explore', 'accounts', 'stories', 'tv']);
const X_RESERVED = new Set([
  'home',
  'i',
  'search',
  'settings',
  'intent',
  'share',
  'explore',
  'login',
]);
const FACEBOOK_RESERVED = new Set([
  'watch',
  'groups',
  'events',
  'marketplace',
  'sharer',
  'sharer.php',
  'login',
  'login.php',
  'pages',
  'story.php',
  'photo.php',
]);
const TWITCH_RESERVED = new Set(['directory', 'videos', 'settings', 'search', 'downloads', 'p']);
const SOUNDCLOUD_RESERVED = new Set(['discover', 'search', 'you', 'upload', 'stream', 'pages']);

const YT_HANDLE = /^[A-Za-z0-9._-]{3,30}$/;
const YT_CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const TIKTOK_HANDLE = /^[A-Za-z0-9._]{2,24}$/;
const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const FACEBOOK_NAME = /^[A-Za-z0-9.]{5,50}$/;
const FACEBOOK_ID = /^[0-9]{5,20}$/;
const TWITCH_NAME = /^[A-Za-z0-9_]{4,25}$/;
const SOUNDCLOUD_NAME = /^[a-z0-9_-]{3,25}$/;
const BANDCAMP_NAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
/** A DNS label; the website's host must be two or more of these. */
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function hostOf(url: URL, hosts: string[]): boolean {
  return hosts.includes(url.hostname.toLowerCase());
}

function link(kind: ChannelKind, handle: string, url: string, display?: string): ChannelLink {
  return { kind, handle, url, display: display ?? `@${handle}` };
}

/** A path of exactly one segment, and that segment — or null. */
function single(segments: string[]): string | null {
  return segments.length === 1 ? segments[0] : null;
}

/**
 * The platforms' own domains. A URL on one of them that the platform's rule
 * refused is not a website — otherwise `music.youtube.com/…` or a post on
 * Instagram would slip in as one.
 */
const PLATFORM_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'tiktok.com',
  'x.com',
  'twitter.com',
  'facebook.com',
  'fb.com',
  'twitch.tv',
  'soundcloud.com',
  'bandcamp.com',
];

function website(url: URL): ChannelLink | null {
  const host = url.hostname.toLowerCase();
  if (PLATFORM_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return null;
  const labels = host.split('.');
  // an IP literal, `localhost` or a bare word is not somebody's website
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l))) return null;
  if (/^[0-9]+$/.test(labels[labels.length - 1])) return null;
  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');
  // `URL` has already percent-encoded the path; anything left that is not a
  // plain path character is refused rather than rebuilt
  if (!/^[A-Za-z0-9._~%/-]*$/.test(path)) return null;
  return link('website', host, `https://${host}${path}`, host.replace(/^www\./, ''));
}

/**
 * Read a channel link someone typed. `null` for anything that is on a
 * platform's host but is not a person's page there, and for anything that is
 * not `https` — the caller says {@link CHANNEL_RULE}.
 */
export function parseChannelLink(input: string): ChannelLink | null {
  const raw = input.trim();
  if (raw.length > MAX_URL) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  if (hostOf(url, ['youtube.com', 'www.youtube.com', 'm.youtube.com'])) {
    const [first, second] = segments;
    if (segments.length === 1 && first?.startsWith('@')) {
      const handle = first.slice(1);
      if (!YT_HANDLE.test(handle)) return null;
      return link('youtube', handle, `https://www.youtube.com/@${handle}`);
    }
    if (segments.length === 2 && first === 'channel' && YT_CHANNEL_ID.test(second)) {
      return link(
        'youtube',
        second,
        `https://www.youtube.com/channel/${second}`,
        'YouTube channel'
      );
    }
    return null;
  }

  if (hostOf(url, ['instagram.com', 'www.instagram.com'])) {
    const handle = single(segments);
    if (!handle || INSTAGRAM_RESERVED.has(handle.toLowerCase())) return null;
    if (!INSTAGRAM_HANDLE.test(handle)) return null;
    return link('instagram', handle, `https://www.instagram.com/${handle}`);
  }

  if (hostOf(url, ['tiktok.com', 'www.tiktok.com'])) {
    const first = single(segments);
    if (!first?.startsWith('@')) return null;
    const handle = first.slice(1);
    if (!TIKTOK_HANDLE.test(handle)) return null;
    return link('tiktok', handle, `https://www.tiktok.com/@${handle}`);
  }

  if (hostOf(url, ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'])) {
    const handle = single(segments);
    if (!handle || X_RESERVED.has(handle.toLowerCase()) || !X_HANDLE.test(handle)) return null;
    return link('x', handle, `https://x.com/${handle}`);
  }

  if (hostOf(url, ['facebook.com', 'www.facebook.com', 'm.facebook.com'])) {
    if (segments.length === 1 && segments[0] === 'profile.php') {
      const id = url.searchParams.get('id');
      if (!id || !FACEBOOK_ID.test(id)) return null;
      return link('facebook', id, `https://www.facebook.com/profile.php?id=${id}`, 'Facebook');
    }
    const name = single(segments);
    if (!name || FACEBOOK_RESERVED.has(name.toLowerCase()) || !FACEBOOK_NAME.test(name)) {
      return null;
    }
    return link('facebook', name, `https://www.facebook.com/${name}`);
  }

  if (hostOf(url, ['twitch.tv', 'www.twitch.tv', 'm.twitch.tv'])) {
    const name = single(segments);
    if (!name || TWITCH_RESERVED.has(name.toLowerCase()) || !TWITCH_NAME.test(name)) return null;
    return link('twitch', name, `https://www.twitch.tv/${name}`);
  }

  if (hostOf(url, ['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'])) {
    const name = single(segments);
    if (!name || SOUNDCLOUD_RESERVED.has(name) || !SOUNDCLOUD_NAME.test(name)) return null;
    return link('soundcloud', name, `https://soundcloud.com/${name}`);
  }

  if (host === 'bandcamp.com' || host.endsWith('.bandcamp.com')) {
    const labels = host.split('.');
    // exactly `name.bandcamp.com`: not bandcamp.com itself, not a deeper subdomain
    if (labels.length !== 3) return null;
    const name = labels[0];
    if (name === 'www' || !BANDCAMP_NAME.test(name)) return null;
    return link('bandcamp', name, `https://${name}.bandcamp.com`, `${name}.bandcamp.com`);
  }

  return website(url);
}

/**
 * One channel as `DrummerAbout.channels` holds it. A type rather than an
 * interface so that a list of them is a JSON value Prisma will write.
 */
export type StoredChannel = {
  kind: ChannelKind;
  url: string;
  /** A channel about drumming: listed first, with a drum mark. */
  drumming: boolean;
};

/** A {@link StoredChannel} with what the page shows for it. */
export interface ChannelView extends StoredChannel {
  display: string;
}

const storedEntry = z.object({ url: z.string(), drumming: z.boolean().optional() });

/**
 * `DrummerAbout.channels` read back from the database. A row is external data,
 * so each entry is re-parsed, and one that no longer passes — a platform
 * dropped, a hand-edited row — is left out rather than failing the read. The
 * kind is the parser's, never the row's. Drumming channels come first; the
 * rest keep the order they were saved in.
 */
export function readStoredChannels(raw: unknown): ChannelView[] {
  if (!Array.isArray(raw)) return [];
  const out: ChannelView[] = [];
  for (const entry of raw.slice(0, MAX_CHANNELS)) {
    const read = storedEntry.safeParse(entry);
    if (!read.success) continue;
    const parsed = parseChannelLink(read.data.url);
    if (!parsed) continue;
    out.push({
      kind: parsed.kind,
      url: parsed.url,
      drumming: read.data.drumming ?? false,
      display: parsed.display,
    });
  }
  return sortChannels(out);
}

/** Drumming channels first; otherwise the order the owner gave them. */
export function sortChannels<T extends { drumming: boolean }>(channels: T[]): T[] {
  return [...channels.filter((c) => c.drumming), ...channels.filter((c) => !c.drumming)];
}
