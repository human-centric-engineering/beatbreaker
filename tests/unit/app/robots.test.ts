import { afterEach, describe, expect, it, vi } from 'vitest';

import robots from '@/app/robots';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('robots.txt', () => {
  it('keeps crawlers out of the break console as well as the platform’s private pages', () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    expect(rule.disallow).toEqual(
      expect.arrayContaining(['/studio', '/breaks', '/dashboard/', '/api/'])
    );
  });

  it('points at the sitemap on the configured origin', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://beatbreaker.example');
    expect(robots().sitemap).toBe('https://beatbreaker.example/sitemap.xml');
  });

  it('falls back to localhost when no origin is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(robots().sitemap).toBe('http://localhost:3000/sitemap.xml');
  });
});
