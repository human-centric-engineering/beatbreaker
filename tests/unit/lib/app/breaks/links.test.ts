/**
 * Reference links (D11): what is accepted, what it is rebuilt as, and what is
 * refused.
 *
 * The refusals are the point. A link is typed by a person and ends up in an
 * `href` and, from Phase 6, an `<iframe src>` on a public page — so every test
 * below that expects `null` is a string that must never reach either.
 *
 * @see lib/app/breaks/links.ts
 */

import { describe, expect, it } from 'vitest';

import { MAX_LINKS, parseReferenceLink, readStoredLinks } from '@/lib/app/breaks/links';

const YT = 'dQw4w9WgXcQ';
const SPOTIFY = '4uLU6hMCjMI75M1A2tKUQC';

describe('parseReferenceLink — accepted, and rebuilt', () => {
  it('keeps a YouTube start time, because the break is at 5:21 and that is the point', () => {
    expect(parseReferenceLink(`https://www.youtube.com/watch?v=${YT}&t=321s`)).toEqual({
      provider: 'youtube',
      kind: 'video',
      id: YT,
      startSeconds: 321,
      canonicalUrl: `https://www.youtube.com/watch?v=${YT}&t=321s`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${YT}?start=321`,
    });
  });

  it.each([
    ['321', 321],
    ['321s', 321],
    ['5m21s', 321],
    ['1h2m3s', 3723],
  ])('reads t=%s as %i seconds', (t, seconds) => {
    expect(parseReferenceLink(`https://youtu.be/${YT}?t=${t}`)?.startSeconds).toBe(seconds);
  });

  it.each([['0'], ['abc'], ['-5'], ['999999h']])(
    'ignores a start time of %s rather than refusing the link',
    (t) => {
      const link = parseReferenceLink(`https://youtu.be/${YT}?t=${t}`);
      expect(link?.id).toBe(YT);
      expect(link).not.toHaveProperty('startSeconds');
      expect(link?.canonicalUrl).toBe(`https://www.youtube.com/watch?v=${YT}`);
    }
  );

  it.each([
    [`https://youtu.be/${YT}`],
    [`https://youtube.com/watch?v=${YT}`],
    [`https://m.youtube.com/watch?v=${YT}`],
    [`https://www.youtube.com/shorts/${YT}`],
    [`https://www.youtube.com/embed/${YT}`],
    [`https://www.youtube.com/live/${YT}`],
  ])('reads %s as the same video', (input) => {
    expect(parseReferenceLink(input)?.canonicalUrl).toBe(`https://www.youtube.com/watch?v=${YT}`);
  });

  it('drops everything the id did not come from — tracking, playlists, a stray fragment', () => {
    const link = parseReferenceLink(
      `https://www.youtube.com/watch?v=${YT}&list=PLxyz&si=track&utm_source=x#comments`
    );
    expect(link?.canonicalUrl).toBe(`https://www.youtube.com/watch?v=${YT}`);
    expect(link?.embedUrl).toBe(`https://www.youtube-nocookie.com/embed/${YT}`);
  });

  it('files YouTube Music under song, not video', () => {
    expect(parseReferenceLink(`https://music.youtube.com/watch?v=${YT}`)).toMatchObject({
      provider: 'youtube',
      kind: 'song',
      canonicalUrl: `https://music.youtube.com/watch?v=${YT}`,
    });
  });

  it('reads a Vimeo video', () => {
    expect(parseReferenceLink('https://vimeo.com/76979871')).toEqual({
      provider: 'vimeo',
      kind: 'video',
      id: '76979871',
      canonicalUrl: 'https://vimeo.com/76979871',
      embedUrl: 'https://player.vimeo.com/video/76979871',
    });
  });

  it.each([['track'], ['album'], ['playlist']])('reads a Spotify %s as a song link', (type) => {
    expect(parseReferenceLink(`https://open.spotify.com/${type}/${SPOTIFY}?si=abc`)).toEqual({
      provider: 'spotify',
      kind: 'song',
      id: `${type}/${SPOTIFY}`,
      canonicalUrl: `https://open.spotify.com/${type}/${SPOTIFY}`,
      embedUrl: `https://open.spotify.com/embed/${type}/${SPOTIFY}`,
    });
  });

  it('drops the locale prefix Spotify puts on shared links', () => {
    expect(
      parseReferenceLink(`https://open.spotify.com/intl-de/track/${SPOTIFY}`)?.canonicalUrl
    ).toBe(`https://open.spotify.com/track/${SPOTIFY}`);
  });

  it('forgives surrounding whitespace and an upper-case host, as a paste has', () => {
    expect(parseReferenceLink(`  https://WWW.YouTube.com/watch?v=${YT}\n`)?.id).toBe(YT);
  });
});

describe('parseReferenceLink — refused', () => {
  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['a data: URL', 'data:text/html,<script>alert(1)</script>'],
    ['plain http', `http://www.youtube.com/watch?v=${YT}`],
    ['a look-alike host (suffix)', `https://youtube.com.example.net/watch?v=${YT}`],
    ['a look-alike host (prefix)', `https://evil-youtube.com/watch?v=${YT}`],
    ['a subdomain not on the list', `https://gaming.youtube.com/watch?v=${YT}`],
    ['a userinfo trick', `https://www.youtube.com@example.net/watch?v=${YT}`],
    ['credentials on an allowed host', `https://user:pw@www.youtube.com/watch?v=${YT}`],
    ['a non-default port', `https://www.youtube.com:8443/watch?v=${YT}`],
    ['a YouTube id of the wrong shape', 'https://www.youtube.com/watch?v=short'],
    ['a YouTube id with a path smuggled after it', `https://youtu.be/${YT}/../../x`],
    ['a YouTube page that is not a video', 'https://www.youtube.com/@somechannel'],
    ['a Vimeo id that is not a number', 'https://vimeo.com/channels/staffpicks'],
    [
      'a Spotify artist (not a track, album or playlist)',
      `https://open.spotify.com/artist/${SPOTIFY}`,
    ],
    ['a Spotify id of the wrong shape', 'https://open.spotify.com/track/abc'],
    ['an embed host typed directly', `https://www.youtube-nocookie.com/embed/${YT}`],
    ['not a URL at all', 'funky drummer'],
    ['an empty string', ''],
  ])('refuses %s', (_name, input) => {
    expect(parseReferenceLink(input)).toBeNull();
  });
});

describe('readStoredLinks', () => {
  it('passes a clean stored list through as it was', () => {
    const stored = [
      { kind: 'video', url: `https://www.youtube.com/watch?v=${YT}&t=321s`, label: 'The break' },
      { kind: 'song', url: `https://open.spotify.com/track/${SPOTIFY}` },
    ];
    expect(readStoredLinks(stored)).toEqual(stored);
  });

  it('drops an entry that no longer passes, and keeps the rest', () => {
    expect(
      readStoredLinks([
        { kind: 'video', url: 'javascript:alert(1)' },
        { url: 'https://vimeo.com/76979871' },
        null,
        42,
        { url: 7 },
      ])
    ).toEqual([{ kind: 'video', url: 'https://vimeo.com/76979871' }]);
  });

  it('takes the kind from the URL, not from what the row claims', () => {
    expect(
      readStoredLinks([{ kind: 'video', url: `https://open.spotify.com/track/${SPOTIFY}` }])
    ).toEqual([{ kind: 'song', url: `https://open.spotify.com/track/${SPOTIFY}` }]);
  });

  it(`reads no more than ${MAX_LINKS}, whatever the row holds`, () => {
    const many = Array.from({ length: 9 }, () => ({ url: 'https://vimeo.com/76979871' }));
    expect(readStoredLinks(many)).toHaveLength(MAX_LINKS);
  });

  it.each([[null], [undefined], ['[]'], [{}]])('reads %j as no links', (raw) => {
    expect(readStoredLinks(raw)).toEqual([]);
  });

  it('drops a blank label rather than storing an empty one', () => {
    expect(readStoredLinks([{ url: 'https://vimeo.com/76979871', label: '   ' }])).toEqual([
      { kind: 'video', url: 'https://vimeo.com/76979871' },
    ]);
  });
});
