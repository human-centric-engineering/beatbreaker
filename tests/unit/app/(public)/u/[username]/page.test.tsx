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

  it('uses the bio as the description when the drummer has one', async () => {
    vi.mocked(getPublicProfile).mockResolvedValue({ username: 'ghostnotes', bio: 'Plays funk.' });
    const meta = await generateMetadata({ params: params(), searchParams: searchParams() });
    expect(meta.description).toBe('Plays funk.');
  });

  it('falls back to a generic description when there is no bio', async () => {
    vi.mocked(getPublicProfile).mockResolvedValue({ username: 'ghostnotes', bio: null });
    const meta = await generateMetadata({ params: params(), searchParams: searchParams() });
    expect(meta.description).toBe('Drum patterns published by @ghostnotes on BeatBreaker.');
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

  it('renders each published pattern with its catalogue style label — falling back to the raw key for a style the catalogue does not carry — and a "More patterns" link when there is a next page', async () => {
    vi.mocked(getPublicProfile).mockResolvedValue({ username: 'ghostnotes', bio: null });
    const known = {
      id: 'cbrk00000000000000000001',
      slug: 'funkpattern1',
      title: 'Funk One',
      description: null,
      style: 'funk',
      meter: '4/4',
      bpm: 96,
      level: 5,
      difficulty: null,
      linkKinds: [],
      publishedAt: '2026-01-01T00:00:00.000Z',
      author: 'ghostnotes',
      saves: 0,
    };
    const unknownStyle = {
      ...known,
      slug: 'mysterygroove',
      title: 'Mystery Groove',
      style: 'not-a-real-style',
    };
    vi.mocked(listPublished).mockResolvedValue({
      patterns: [known, unknownStyle],
      nextCursor: 'MjQ',
    });

    const el = await DrummerPage({ params: params(), searchParams: searchParams() });
    render(el);

    expect(screen.getByText('Funk One')).toBeInTheDocument();
    expect(screen.getByText('Mystery Groove')).toBeInTheDocument();
    // the catalogue resolves a known style to its label...
    expect(screen.getByText(/Funk 16ths/)).toBeInTheDocument();
    // ...and falls back to the raw style key when the catalogue has nothing for it
    expect(screen.getByText(/not-a-real-style/)).toBeInTheDocument();

    const more = screen.getByRole('link', { name: /more patterns/i });
    expect(more).toHaveAttribute('href', '/u/ghostnotes?cursor=MjQ');
  });
});
