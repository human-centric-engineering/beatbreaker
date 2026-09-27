// @vitest-environment happy-dom

/**
 * `/explore` — the community library (Phase 6, task 6.8). Public (D2).
 *
 * `readPublicListQuery` runs for real: the point of the test is that the
 * page's filter form and the public API agree on how a query string becomes
 * a filter. `listPublished` is mocked at its own seam.
 *
 * @see app/(public)/explore/page.tsx
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/app/breaks/community/public')>();
  return { ...actual, listPublished: vi.fn() };
});
vi.mock('@/lib/app/breaks/catalogue/data', () => ({ studioCatalogue: vi.fn() }));

import ExplorePage from '@/app/(public)/explore/page';
import { listPublished } from '@/lib/app/breaks/community/public';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { testCatalogue } from '@/tests/helpers/catalogue';

const searchParams = (params: Record<string, string | string[] | undefined> = {}) =>
  Promise.resolve(params);

function card(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cbrk00000000000000000001',
    slug: 'cold000001',
    title: 'Cold Carpet',
    description: null,
    style: 'funk',
    meter: '4/4',
    bpm: 90,
    level: 5,
    difficulty: 2,
    linkKinds: [],
    publishedAt: '2026-01-01T00:00:00.000Z',
    author: 'ghostnotes',
    saves: 3,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(studioCatalogue).mockResolvedValue(testCatalogue());
});

describe('ExplorePage', () => {
  it('parses the query string through the shared schema and passes the filters to listPublished', async () => {
    vi.mocked(listPublished).mockResolvedValue({ patterns: [], nextCursor: null });
    await ExplorePage({ searchParams: searchParams({ style: 'funk', sort: 'saved' }) });
    expect(listPublished).toHaveBeenCalledWith(
      expect.objectContaining({ style: 'funk', sort: 'saved' })
    );
  });

  it('drops a field that fails validation but keeps the rest', async () => {
    vi.mocked(listPublished).mockResolvedValue({ patterns: [], nextCursor: null });
    await ExplorePage({ searchParams: searchParams({ meter: 'nonsense', style: 'funk' }) });
    const call = vi.mocked(listPublished).mock.calls[0][0];
    expect(call.style).toBe('funk');
    expect(call.meter).toBeUndefined();
  });

  it('shows the empty-state copy when nothing matches', async () => {
    vi.mocked(listPublished).mockResolvedValue({ patterns: [], nextCursor: null });
    const el = await ExplorePage({ searchParams: searchParams() });
    render(el);
    expect(screen.getByText(/Nothing matches those filters yet/)).toBeInTheDocument();
  });

  it('shows pattern cards and hides the empty-state copy when there are results', async () => {
    vi.mocked(listPublished).mockResolvedValue({ patterns: [card()], nextCursor: null });
    const el = await ExplorePage({ searchParams: searchParams() });
    render(el);
    expect(screen.queryByText(/Nothing matches those filters yet/)).not.toBeInTheDocument();
    expect(screen.getByText('Cold Carpet')).toBeInTheDocument();
  });

  it('shows a "More patterns" link only when there is a next cursor', async () => {
    vi.mocked(listPublished).mockResolvedValue({ patterns: [card()], nextCursor: 'MTA' });
    const el = await ExplorePage({ searchParams: searchParams() });
    render(el);
    const more = screen.getByRole('link', { name: 'More patterns' });
    expect(more).toHaveAttribute('href', expect.stringContaining('cursor=MTA'));
  });

  it('has no "More patterns" link when there is no next page', async () => {
    vi.mocked(listPublished).mockResolvedValue({ patterns: [card()], nextCursor: null });
    const el = await ExplorePage({ searchParams: searchParams() });
    render(el);
    expect(screen.queryByRole('link', { name: 'More patterns' })).not.toBeInTheDocument();
  });
});
