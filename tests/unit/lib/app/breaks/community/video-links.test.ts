/**
 * The video link on a speed record (Phase 7C, D29): someone playing the
 * pattern at the speed they claim.
 *
 * Every `null` below is a string that must never reach an `href`, or — for
 * YouTube and Vimeo — an `<iframe src>`, on a public table.
 *
 * @see lib/app/breaks/community/video-links.ts
 */

import { describe, expect, it } from 'vitest';

import {
  parseVideoLink,
  readStoredVideo,
  VIDEO_RULE,
} from '@/lib/app/breaks/community/video-links';

describe('parseVideoLink — accepted, and rebuilt', () => {
  it.each([
    [
      'YouTube watch',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'youtube',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    [
      'YouTube shorts',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'youtube',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    [
      'youtu.be',
      'https://youtu.be/dQw4w9WgXcQ',
      'youtube',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    [
      'Vimeo',
      'https://vimeo.com/76979871',
      'vimeo',
      'https://vimeo.com/76979871',
      'https://player.vimeo.com/video/76979871',
    ],
  ])('%s canonicalises with an embed url', (_name, input, platform, url, embedUrl) => {
    expect(parseVideoLink(input)).toEqual({ platform, url, embedUrl });
  });

  it.each([
    ['/p/', 'https://www.instagram.com/p/Cabc12345/', 'https://www.instagram.com/p/Cabc12345/'],
    [
      '/reel/',
      'https://www.instagram.com/reel/Cabc12345/',
      'https://www.instagram.com/reel/Cabc12345/',
    ],
    [
      '/reels/ (rebuilt as /reel/)',
      'https://instagram.com/reels/Cabc12345',
      'https://www.instagram.com/reel/Cabc12345/',
    ],
  ])('Instagram %s is outbound-only, with a trailing slash', (_name, input, url) => {
    expect(parseVideoLink(input)).toEqual({ platform: 'instagram', url, embedUrl: null });
  });

  it('a TikTok video is outbound-only', () => {
    expect(parseVideoLink('https://www.tiktok.com/@jo.drums/video/7123456789012345678')).toEqual({
      platform: 'tiktok',
      url: 'https://www.tiktok.com/@jo.drums/video/7123456789012345678',
      embedUrl: null,
    });
  });

  it.each([
    ['x.com', 'https://x.com/jodrums/status/1234567890123456789'],
    ['twitter.com, rebuilt to x.com', 'https://twitter.com/jodrums/status/1234567890123456789'],
  ])('%s is outbound-only', (_name, input) => {
    expect(parseVideoLink(input)).toEqual({
      platform: 'x',
      url: 'https://x.com/jodrums/status/1234567890123456789',
      embedUrl: null,
    });
  });

  it('drops tracking parameters wherever the platform would otherwise carry them', () => {
    expect(
      parseVideoLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxyz&si=abc123')
    ).toEqual({
      platform: 'youtube',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
    expect(parseVideoLink('https://vimeo.com/76979871?share=copy')?.url).toBe(
      'https://vimeo.com/76979871'
    );
    expect(
      parseVideoLink('https://www.instagram.com/p/Cabc12345/?utm_source=ig&igshid=x')?.url
    ).toBe('https://www.instagram.com/p/Cabc12345/');
    expect(
      parseVideoLink('https://www.tiktok.com/@jo.drums/video/7123456789012345678?lang=en')?.url
    ).toBe('https://www.tiktok.com/@jo.drums/video/7123456789012345678');
    expect(parseVideoLink('https://x.com/jodrums/status/1234567890123456789?s=20')?.url).toBe(
      'https://x.com/jodrums/status/1234567890123456789'
    );
  });
});

describe('parseVideoLink — refused', () => {
  it.each([
    ['a song, YouTube Music', 'https://music.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['a song, Spotify', 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh'],
    ['plain http', 'http://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['userinfo trick', 'https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ'],
    ['a port', 'https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ'],
    ['look-alike host, YouTube', 'https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ'],
    ['look-alike host, Instagram', 'https://www.instagram.com.evil.example/p/Cabc12345/'],
    ['an off-list host', 'https://example.com/video/1'],
    ['a TikTok short link', 'https://vm.tiktok.com/ZM123456/'],
    ['TikTok without /video/', 'https://www.tiktok.com/@jo.drums/photo/7123456789012345678'],
    ['TikTok without @', 'https://www.tiktok.com/jo.drums/video/7123456789012345678'],
    ['an Instagram TV link', 'https://www.instagram.com/tv/Cabc12345/'],
    ['an X path that is not a status', 'https://x.com/jodrums/likes'],
    ['a Vimeo id that is not numeric', 'https://vimeo.com/not-a-number'],
    ['too long', `https://vimeo.com/${'1'.repeat(300)}`],
  ])('%s', (_name, input) => {
    expect(parseVideoLink(input)).toBeNull();
  });

  it('is longer than VIDEO_RULE would ever need to name a working platform', () => {
    // sanity: the refusal message names every accepted platform
    expect(VIDEO_RULE).toContain('YouTube');
    expect(VIDEO_RULE).toContain('TikTok');
  });
});

describe('readStoredVideo', () => {
  it('is null for no stored link', () => {
    expect(readStoredVideo(null)).toBeNull();
  });

  it('re-parses a stored link and is null when it no longer passes', () => {
    expect(readStoredVideo('https://www.instagram.com/p/Cabc12345/')).toEqual({
      platform: 'instagram',
      url: 'https://www.instagram.com/p/Cabc12345/',
      embedUrl: null,
    });
    expect(readStoredVideo('not a url at all')).toBeNull();
    expect(readStoredVideo('https://vm.tiktok.com/ZM123456/')).toBeNull();
  });
});
