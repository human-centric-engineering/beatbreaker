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
 * FORK NOTE — this file reads `lib/app/credential-paths.ts` for real on
 * purpose: it is BeatBreaker's pin of what that seam declares. Adding a route
 * there should add a row to the `logs %s as %s` table; removing one of the
 * four share routes should fail a row here, because its slug would then reach
 * the logs in full.
 *
 * @see lib/app/credential-paths.ts
 * @see lib/app/breaks/community/slug.ts
 */

import { describe, it, expect } from 'vitest';
import { appCredentialPaths } from '@/lib/app/credential-paths';
import {
  collapseDynamicSegments,
  credentialPathProblem,
  scrubUrlsInText,
} from '@/lib/logging/redact-path';
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

  it('leaves a parameterised route name whole, closing bracket included', () => {
    // Sentry names a transaction by its route, so a declared pattern must not
    // read its own placeholder as a slug (this once came out `/s/[param]]`).
    expect(scrubUrlsInText('GET /s/[slug]')).toBe('GET /s/[slug]');
    expect(scrubUrlsInText('GET /api/v1/public/patterns/[slug]')).toBe(
      'GET /api/v1/public/patterns/[slug]'
    );
    expect(scrubUrlsInText(`GET /s/${slug}.`)).toBe('GET /s/[param].');
  });

  it('leaves the app’s other routes their words', () => {
    expect(collapseDynamicSegments('/studio')).toBe('/studio');
    expect(collapseDynamicSegments('/practice')).toBe('/practice');
    expect(collapseDynamicSegments('/drummers/bernard-purdie')).toBe('/drummers/bernard-purdie');
    expect(collapseDynamicSegments('/api/v1/public/patterns')).toBe('/api/v1/public/patterns');
  });
});
