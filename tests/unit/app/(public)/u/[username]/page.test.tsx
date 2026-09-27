// @vitest-environment happy-dom

/**
 * `/u/[username]` — a drummer's public page (Phase 6, task 6.8). An unknown
 * username 404s; only what `getPublicProfile` returns (username, bio) is
 * shown — never an account name or email (D3).
 *
 * @see app/(public)/u/[username]/page.tsx
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/app/breaks/community/public')>();
  return { ...actual, getPublicProfile: vi.fn(), listPublished: vi.fn() };
});
vi.mock('@/lib/app/breaks/catalogue/data', () => ({ studioCatalogue: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import DrummerPage, { generateMetadata } from '@/app/(public)/u/[username]/page';
import { getPublicProfile, listPublished } from '@/lib/app/breaks/community/public';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { testCatalogue } from '@/tests/helpers/catalogue';

const params = (username = 'ghostnotes') => Promise.resolve({ username });
const searchParams = (raw: Record<string, string | string[] | undefined> = {}) =>
  Promise.resolve(raw);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(studioCatalogue).mockResolvedValue(testCatalogue());
  vi.mocked(listPublished).mockResolvedValue({ patterns: [], nextCursor: null });
});

describe('generateMetadata', () => {
  it('is "Not found" and noindex for an unknown username', async () => {
    vi.mocked(getPublicProfile).mockResolvedValue(null);
    const meta = await generateMetadata({ params: params(), searchParams: searchParams() });
    expect(meta.title).toBe('Not found');
    expect(meta.robots).toEqual({ index: false });
  });

  it('titles the page @username', async () => {
    vi.mocked(getPublicProfile).mockResolvedValue({ username: 'ghostnotes', bio: null });
    const meta = await generateMetadata({ params: params(), searchParams: searchParams() });
    expect(meta.title).toBe('@ghostnotes');
  });
});

describe('DrummerPage', () => {
  it('is not found for an unknown username', async () => {
    vi.mocked(getPublicProfile).mockResolvedValue(null);
    await expect(DrummerPage({ params: params(), searchParams: searchParams() })).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
  });

  it('shows the username, the bio, and asks for that user’s own published patterns', async () => {
    vi.mocked(getPublicProfile).mockResolvedValue({ username: 'ghostnotes', bio: 'Plays funk.' });
    const el = await DrummerPage({ params: params(), searchParams: searchParams() });
    render(el);
    expect(screen.getByText('@ghostnotes')).toBeInTheDocument();
    expect(screen.getByText('Plays funk.')).toBeInTheDocument();
    expect(listPublished).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'ghostnotes', sort: 'newest' })
    );
  });

  it('shows "Nothing published yet" when the drummer has nothing published', async () => {
    vi.mocked(getPublicProfile).mockResolvedValue({ username: 'ghostnotes', bio: null });
    const el = await DrummerPage({ params: params(), searchParams: searchParams() });
    render(el);
    expect(screen.getByText('Nothing published yet.')).toBeInTheDocument();
  });

  it('passes the cursor query param through to listPublished', async () => {
    vi.mocked(getPublicProfile).mockResolvedValue({ username: 'ghostnotes', bio: null });
    await DrummerPage({ params: params(), searchParams: searchParams({ cursor: 'MjQ' }) });
    expect(listPublished).toHaveBeenCalledWith(expect.objectContaining({ cursor: 'MjQ' }));
  });
});
