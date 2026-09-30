/**
 * Channel links (Phase 7B, task 7B.1): what is accepted, what it is rebuilt
 * as, and what is refused.
 *
 * Every `null` below is a string that must never reach an `href` on a public
 * profile page.
 *
 * @see lib/app/breaks/community/channels.ts
 */

import { describe, expect, it } from 'vitest';

import {
  MAX_CHANNELS,
  parseChannelLink,
  readStoredChannels,
} from '@/lib/app/breaks/community/channels';

describe('parseChannelLink — accepted, and rebuilt', () => {
  it.each([
    [
      'https://www.youtube.com/@drumtalk',
      'youtube',
      'https://www.youtube.com/@drumtalk',
      '@drumtalk',
    ],
    [
      'https://m.youtube.com/@drumtalk?si=track',
      'youtube',
      'https://www.youtube.com/@drumtalk',
      '@drumtalk',
    ],
    [
      'https://youtube.com/channel/UC1234567890123456789012',
      'youtube',
      'https://www.youtube.com/channel/UC1234567890123456789012',
      'YouTube channel',
    ],
    [
      'https://instagram.com/jo.drums/',
      'instagram',
      'https://www.instagram.com/jo.drums',
      '@jo.drums',
    ],
    [
      'https://www.tiktok.com/@jo_drums?lang=en',
      'tiktok',
      'https://www.tiktok.com/@jo_drums',
      '@jo_drums',
    ],
    ['https://twitter.com/jodrums', 'x', 'https://x.com/jodrums', '@jodrums'],
    ['https://x.com/jodrums#top', 'x', 'https://x.com/jodrums', '@jodrums'],
    [
      'https://www.facebook.com/jo.drums',
      'facebook',
      'https://www.facebook.com/jo.drums',
      '@jo.drums',
    ],
    [
      'https://www.facebook.com/profile.php?id=100012345678&ref=x',
      'facebook',
      'https://www.facebook.com/profile.php?id=100012345678',
      'Facebook',
    ],
    ['https://twitch.tv/jodrums', 'twitch', 'https://www.twitch.tv/jodrums', '@jodrums'],
    [
      'https://soundcloud.com/jo-drums',
      'soundcloud',
      'https://soundcloud.com/jo-drums',
      '@jo-drums',
    ],
    [
      'https://jodrums.bandcamp.com/album/x',
      'bandcamp',
      'https://jodrums.bandcamp.com',
      'jodrums.bandcamp.com',
    ],
  ])('%s is %s, stored as %s', (input, kind, url, display) => {
    expect(parseChannelLink(input)).toMatchObject({ kind, url, display });
  });

  it('keeps a website’s path, drops its query and fragment, and shows its bare host', () => {
    expect(parseChannelLink('https://www.jo-drums.co.uk/lessons/?utm_source=x#book')).toEqual({
      kind: 'website',
      handle: 'www.jo-drums.co.uk',
      url: 'https://www.jo-drums.co.uk/lessons',
      display: 'jo-drums.co.uk',
    });
    expect(parseChannelLink('https://jodrums.com/')?.url).toBe('https://jodrums.com');
  });
});

describe('parseChannelLink — refused', () => {
  it.each([
    ['plain http', 'http://www.youtube.com/@drumtalk'],
    ['http website', 'http://jodrums.com'],
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html,hi'],
    ['userinfo trick', 'https://youtube.com@evil.example/@drumtalk'],
    ['userinfo on a website', 'https://user:pw@jodrums.com'],
    ['a port', 'https://www.youtube.com:8443/@drumtalk'],
    ['a port on a website', 'https://jodrums.com:8080'],
    ['look-alike host', 'https://www.youtube.com.evil.example/@drumtalk'],
    ['a video, not a channel', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['youtu.be', 'https://youtu.be/dQw4w9WgXcQ'],
    ['YouTube Music', 'https://music.youtube.com/channel/UC1234567890123456789012'],
    ['bad channel id', 'https://www.youtube.com/channel/UCshort'],
    ['an Instagram post', 'https://www.instagram.com/p/Cabc123/'],
    ['Instagram subdomain', 'https://evil.instagram.com/jodrums'],
    ['TikTok without @', 'https://www.tiktok.com/jodrums'],
    ['a TikTok video', 'https://www.tiktok.com/@jo/video/123'],
    ['X reserved path', 'https://x.com/intent'],
    ['X handle too long', 'https://x.com/abcdefghijklmnop'],
    ['Facebook sharer', 'https://www.facebook.com/sharer.php?u=https://evil.example'],
    ['fb.com short link', 'https://fb.com/jodrums'],
    ['bandcamp.com itself', 'https://bandcamp.com/jodrums'],
    ['deeper Bandcamp subdomain', 'https://a.b.bandcamp.com'],
    ['IP address', 'https://127.0.0.1/'],
    ['localhost', 'https://localhost/'],
    ['bare word host', 'https://intranet/'],
    ['not a URL', 'jodrums.com'],
    ['too long', `https://jodrums.com/${'a'.repeat(300)}`],
  ])('%s', (_name, input) => {
    expect(parseChannelLink(input)).toBeNull();
  });
});

describe('readStoredChannels', () => {
  it('re-parses each entry, takes the kind from the URL, and lists drumming channels first', () => {
    expect(
      readStoredChannels([
        { kind: 'website', url: 'https://jodrums.com', drumming: false },
        // the row says website; the URL says Instagram, and the URL wins
        { kind: 'website', url: 'https://www.instagram.com/jodrums', drumming: true },
      ])
    ).toEqual([
      {
        kind: 'instagram',
        url: 'https://www.instagram.com/jodrums',
        drumming: true,
        display: '@jodrums',
      },
      { kind: 'website', url: 'https://jodrums.com', drumming: false, display: 'jodrums.com' },
    ]);
  });

  it('drops an entry that no longer parses and reads a non-array as none', () => {
    expect(
      readStoredChannels([
        { url: 'http://jodrums.com' },
        { nope: 1 },
        'x',
        { url: 'https://x.com/jo' },
      ])
    ).toEqual([{ kind: 'x', url: 'https://x.com/jo', drumming: false, display: '@jo' }]);
    expect(readStoredChannels(null)).toEqual([]);
    expect(readStoredChannels({})).toEqual([]);
  });

  it(`reads at most ${MAX_CHANNELS}`, () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ url: `https://site${i}.com` }));
    expect(readStoredChannels(many)).toHaveLength(MAX_CHANNELS);
  });
});
