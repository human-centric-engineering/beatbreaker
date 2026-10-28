/**
 * Unit Tests: BeatBreaker's declared credential paths
 *
 * A link-only pattern (`/p/<slug>`) or a shared practice session (`/s/<slug>`)
 * is opened by holding its address, and the slug is 10 characters: under the
 * 20-character floor the shape rules use. These run the real seam through
 * `collapseDynamicSegments()` to show each address reaches the logs as
 * `[param]`, below it too, and that the rest of the app's paths keep their
 * words.
 *
 * @see lib/app/credential-paths.ts
 * @see lib/app/breaks/community/slug.ts
 */

import { describe, it, expect } from 'vitest';
import { appCredentialPaths } from '@/lib/app/credential-paths';
import { collapseDynamicSegments, credentialPathProblem } from '@/lib/logging/redact-path';
import { SLUG_LENGTH } from '@/lib/app/breaks/community/slug';

const slug = 'k3m9x2qrtv';

describe('BeatBreaker credential paths', () => {
  it('uses a slug short enough that only a declaration can hide it', () => {
    expect(slug).toHaveLength(SLUG_LENGTH);
    expect(collapseDynamicSegments(`/drummers/${slug}`)).toBe(`/drummers/${slug}`);
  });

  it.each(appCredentialPaths)('%s is a usable declaration', (pattern) => {
    expect(credentialPathProblem(pattern)).toBeNull();
  });

  it.each([
    [`/p/${slug}`, '/p/[param]'],
    [`/p/${slug}/opengraph-image`, '/p/[param]/opengraph-image'],
    [`/s/${slug}`, '/s/[param]'],
    [`/api/v1/public/patterns/${slug}`, '/api/v1/public/patterns/[param]'],
    [`/api/v1/public/patterns/${slug}/variations`, '/api/v1/public/patterns/[param]/variations'],
    [`/api/v1/public/patterns/${slug}/report`, '/api/v1/public/patterns/[param]/report'],
    [`/api/v1/public/practice-sessions/${slug}`, '/api/v1/public/practice-sessions/[param]'],
    [
      `/api/v1/public/practice-sessions/${slug}/copy`,
      '/api/v1/public/practice-sessions/[param]/copy',
    ],
  ])('logs %s as %s', (path, expected) => {
    expect(collapseDynamicSegments(path)).toBe(expected);
  });

  it('leaves the app’s other routes their words', () => {
    expect(collapseDynamicSegments('/studio')).toBe('/studio');
    expect(collapseDynamicSegments('/practice')).toBe('/practice');
    expect(collapseDynamicSegments('/drummers/bernard-purdie')).toBe('/drummers/bernard-purdie');
    expect(collapseDynamicSegments('/api/v1/public/patterns')).toBe('/api/v1/public/patterns');
  });
});
