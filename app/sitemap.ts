import type { MetadataRoute } from 'next';

import { publishedForSitemap } from '@/lib/app/breaks/community/public';
import { logger } from '@/lib/logging';

/**
 * Sitemap Configuration
 *
 * Generates a sitemap for search engine discovery.
 * Lists all public pages with their last modified dates and change frequencies.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 *
 * Phase 3.5: Landing Page & Marketing
 *
 * FORK (BeatBreaker, Phase 6): plus the community library — `/explore`, every
 * published pattern's `/p/` page and every drummer with something published.
 * Link shares are never here: they are `noindex`, reachable only by whoever
 * has the link. If the database cannot be read the static pages still go out.
 */
/*
 * FORK (BeatBreaker, Phase 6): a sitemap is cached at build time unless told
 * otherwise, which would freeze it without the patterns published since — or,
 * in a build with no database, without any. Regenerated at most hourly.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Public pages - add new public pages here
  const publicPages = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/explore', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/help', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  const pages: MetadataRoute.Sitemap = publicPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  try {
    const { patterns, usernames } = await publishedForSitemap();
    for (const p of patterns) {
      pages.push({
        url: `${baseUrl}/p/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
    for (const username of usernames) {
      pages.push({ url: `${baseUrl}/u/${username}`, changeFrequency: 'weekly', priority: 0.4 });
    }
  } catch (error) {
    logger.error('Sitemap: could not read the community library', error);
  }

  return pages;
}
