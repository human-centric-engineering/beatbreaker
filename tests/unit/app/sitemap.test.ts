/**
 * `app/sitemap.ts` — the static marketing pages plus, from Phase 6, the
 * community library: `/explore`, every published pattern's `/p/` page and
 * every drummer with something published. Link shares never appear (they
 * are `noindex`), and a database failure must not take the static pages
 * down with it.
 *
 * @see app/sitemap.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/public', () => ({ publishedForSitemap: vi.fn() }));
vi.mock('@/lib/logging', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import sitemap from '@/app/sitemap';
import { publishedForSitemap } from '@/lib/app/breaks/community/public';
import { logger } from '@/lib/logging';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sitemap', () => {
  it('always includes the static /explore page', async () => {
    vi.mocked(publishedForSitemap).mockResolvedValue({ patterns: [], usernames: [] });
    const rows = await sitemap();
    expect(rows.some((r) => r.url.endsWith('/explore'))).toBe(true);
  });

  it('adds a /p/<slug> row for every published pattern', async () => {
    const updatedAt = new Date('2026-02-01T00:00:00Z');
    vi.mocked(publishedForSitemap).mockResolvedValue({
      patterns: [
        { slug: 'cold000001', updatedAt },
        { slug: 'warm000002', updatedAt },
      ],
      usernames: [],
    });
    const rows = await sitemap();
    expect(rows.some((r) => r.url.endsWith('/p/cold000001') && r.lastModified === updatedAt)).toBe(
      true
    );
    expect(rows.some((r) => r.url.endsWith('/p/warm000002'))).toBe(true);
  });

  it('adds a /u/<name> row for every drummer with something published', async () => {
    vi.mocked(publishedForSitemap).mockResolvedValue({
      patterns: [],
      usernames: ['ghostnotes', 'snaredrummer'],
    });
    const rows = await sitemap();
    expect(rows.some((r) => r.url.endsWith('/u/ghostnotes'))).toBe(true);
    expect(rows.some((r) => r.url.endsWith('/u/snaredrummer'))).toBe(true);
  });

  it('falls back to http://localhost:3000 when NEXT_PUBLIC_APP_URL is not set', async () => {
    // tests/setup.ts sets NEXT_PUBLIC_APP_URL for every other test in the suite —
    // unset it here to exercise the `||` fallback the source falls back to.
    const original = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    try {
      vi.mocked(publishedForSitemap).mockResolvedValue({ patterns: [], usernames: [] });
      const rows = await sitemap();
      expect(rows.some((r) => r.url === 'http://localhost:3000/explore')).toBe(true);
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = original;
    }
  });

  it('still returns the static pages, and logs, when the community library cannot be read', async () => {
    vi.mocked(publishedForSitemap).mockRejectedValue(new Error('db down'));
    const rows = await sitemap();
    expect(rows.some((r) => r.url.endsWith('/explore'))).toBe(true);
    expect(rows.some((r) => r.url.includes('/p/'))).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'Sitemap: could not read the community library',
      expect.any(Error)
    );
  });
});
