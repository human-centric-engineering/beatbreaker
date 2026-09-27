/**
 * A drift guard between `lib/app/breaks/links.ts` (which builds an
 * `embedUrl` for each provider) and `lib/app/csp.ts` (which allowlists exactly
 * the origins those embeds are served from). If a provider's embed host ever
 * changes in one file without the other, this fails — an `<iframe src>`
 * blocked by the CSP is a silent broken embed, not an error anyone sees.
 *
 * @see lib/app/breaks/links.ts
 * @see lib/app/csp.ts
 */

import { describe, expect, it } from 'vitest';

import { parseReferenceLink } from '@/lib/app/breaks/links';
import { appFrameSrc } from '@/lib/app/csp';

describe('reference link embed origins vs. the CSP frame-src allowlist', () => {
  it.each([
    ['youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['vimeo', 'https://vimeo.com/76979871'],
    ['spotify', 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'],
  ])('the %s embed origin is allowed to frame', (_provider, url) => {
    const link = parseReferenceLink(url);
    expect(link).not.toBeNull();
    const origin = new URL(link!.embedUrl).origin;
    expect(appFrameSrc).toContain(origin);
  });
});
