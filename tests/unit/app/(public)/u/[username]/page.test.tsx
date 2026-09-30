// @vitest-environment happy-dom

/**
 * `/u/[username]` — a drummer's public page (Phase 6, task 6.8; Phase 7B). An
 * unknown username 404s; only what `getPublicDrummer` returns (username, bio,
 * and the About-you fields switched on) is shown — never an account name or
 * email (D3). A signed-in reader who is not the profile's own owner is
 * offered Report; the owner and a signed-out visitor are not.
 *
 * @see app/(public)/u/[username]/page.tsx
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/app/breaks/community/public')>();
  return { ...actual, getPublicDrummer: vi.fn(), listPublished: vi.fn() };
});
vi.mock('@/lib/app/breaks/catalogue/data', () => ({ studioCatalogue: vi.fn() }));
vi.mock('@/lib/auth/utils', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/app/breaks/community/profile', () => ({ usernameOf: vi.fn() }));
vi.mock('@/lib/app/breaks/community/speed-tables', () => ({ listedBestsFor: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import DrummerPage, { generateMetadata } from '@/app/(public)/u/[username]/page';
import { getPublicDrummer, listPublished } from '@/lib/app/breaks/community/public';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { getServerSession } from '@/lib/auth/utils';
import { usernameOf } from '@/lib/app/breaks/community/profile';
import { listedBestsFor } from '@/lib/app/breaks/community/speed-tables';
import { testCatalogue } from '@/tests/helpers/catalogue';
import { createMockAuthSession } from '@/tests/helpers/auth';

const params = (username = 'ghostnotes') => Promise.resolve({ username });
const searchParams = (raw: Record<string, string | string[] | undefined> = {}) =>
  Promise.resolve(raw);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(studioCatalogue).mockResolvedValue(testCatalogue());
  vi.mocked(listPublished).mockResolvedValue({ patterns: [], nextCursor: null });
  vi.mocked(getServerSession).mockResolvedValue(null);
  vi.mocked(listedBestsFor).mockResolvedValue([]);
});

describe('generateMetadata', () => {
  it('is "Not found" and noindex for an unknown username', async () => {
    vi.mocked(getPublicDrummer).mockResolvedValue(null);
    const meta = await generateMetadata({ params: params(), searchParams: searchParams() });
    expect(meta.title).toBe('Not found');
    expect(meta.robots).toEqual({ index: false });
  });

  it('titles the page @username', async () => {
    vi.mocked(getPublicDrummer).mockResolvedValue({ username: 'ghostnotes', bio: null });
    const meta = await generateMetadata({ params: params(), searchParams: searchParams() });
    expect(meta.title).toBe('@ghostnotes');
  });

  it('uses the bio as the description when the drummer has one', async () => {
    vi.mocked(getPublicDrummer).mockResolvedValue({ username: 'ghostnotes', bio: 'Plays funk.' });
    const meta = await generateMetadata({ params: params(), searchParams: searchParams() });
    expect(meta.description).toBe('Plays funk.');
  });

  it('falls back to a generic description when there is no bio', async () => {
    vi.mocked(getPublicDrummer).mockResolvedValue({ username: 'ghostnotes', bio: null });
    const meta = await generateMetadata({ params: params(), searchParams: searchParams() });
    expect(meta.description).toBe('Drum patterns published by @ghostnotes on BeatBreaker.');
  });
});

describe('DrummerPage', () => {
  it('is not found for an unknown username', async () => {
    vi.mocked(getPublicDrummer).mockResolvedValue(null);
    await expect(DrummerPage({ params: params(), searchParams: searchParams() })).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
  });

  it('shows the username, the bio, and asks for that user’s own published patterns', async () => {
    vi.mocked(getPublicDrummer).mockResolvedValue({ username: 'ghostnotes', bio: 'Plays funk.' });
    const el = await DrummerPage({ params: params(), searchParams: searchParams() });
    render(el);
    expect(screen.getByText('@ghostnotes')).toBeInTheDocument();
    expect(screen.getByText('Plays funk.')).toBeInTheDocument();
    expect(listPublished).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'ghostnotes', sort: 'newest' })
    );
  });

  it('shows "Nothing published yet" when the drummer has nothing published', async () => {
    vi.mocked(getPublicDrummer).mockResolvedValue({ username: 'ghostnotes', bio: null });
    const el = await DrummerPage({ params: params(), searchParams: searchParams() });
    render(el);
    expect(screen.getByText('Nothing published yet.')).toBeInTheDocument();
  });

  it('passes the cursor query param through to listPublished', async () => {
    vi.mocked(getPublicDrummer).mockResolvedValue({ username: 'ghostnotes', bio: null });
    await DrummerPage({ params: params(), searchParams: searchParams({ cursor: 'MjQ' }) });
    expect(listPublished).toHaveBeenCalledWith(expect.objectContaining({ cursor: 'MjQ' }));
  });

  it('renders each published pattern with its catalogue style label — falling back to the raw key for a style the catalogue does not carry — and a "More patterns" link when there is a next page', async () => {
    vi.mocked(getPublicDrummer).mockResolvedValue({ username: 'ghostnotes', bio: null });
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

  describe('the About-you facts (7B)', () => {
    it('shows nothing extra when getPublicDrummer returns no About-you fields', async () => {
      vi.mocked(getPublicDrummer).mockResolvedValue({ username: 'ghostnotes', bio: null });
      const el = await DrummerPage({ params: params(), searchParams: searchParams() });
      render(el);
      expect(screen.queryByText('Here for')).not.toBeInTheDocument();
      expect(screen.queryByText('Plays at')).not.toBeInTheDocument();
      expect(screen.queryByText('Styles')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Channels')).not.toBeInTheDocument();
    });

    it('shows purposes, ability and styles (with per-style ability) only when present', async () => {
      vi.mocked(getPublicDrummer).mockResolvedValue({
        username: 'ghostnotes',
        bio: null,
        purposes: ['learning', 'teaching'],
        ability: 'advanced',
        styles: ['funk', 'rock'],
        styleAbility: { funk: 'professional' },
      });
      const el = await DrummerPage({ params: params(), searchParams: searchParams() });
      render(el);

      expect(screen.getByText('Here for')).toBeInTheDocument();
      expect(screen.getByText('Learning to play · Teaching drums')).toBeInTheDocument();
      expect(screen.getByText('Plays at')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
      expect(screen.getByText('Styles')).toBeInTheDocument();
      // funk has a per-style ability; rock falls back to the catalogue label alone
      expect(screen.getByText(/Funk 16ths \(professional\)/)).toBeInTheDocument();
      expect(screen.getByText(/, Rock/)).toBeInTheDocument();
    });

    it('shows the channel links when present', async () => {
      vi.mocked(getPublicDrummer).mockResolvedValue({
        username: 'ghostnotes',
        bio: null,
        channels: [
          {
            kind: 'youtube',
            url: 'https://www.youtube.com/@ghostnotes',
            drumming: true,
            display: '@ghostnotes',
          },
        ],
      });
      const el = await DrummerPage({ params: params(), searchParams: searchParams() });
      render(el);
      expect(screen.getByRole('link', { name: /YouTube/ })).toHaveAttribute(
        'href',
        'https://www.youtube.com/@ghostnotes'
      );
    });
  });

  describe('Report (7B, task 7B.5)', () => {
    beforeEach(() => {
      vi.mocked(getPublicDrummer).mockResolvedValue({ username: 'ghostnotes', bio: null });
    });

    it('is hidden from a signed-out visitor', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const el = await DrummerPage({ params: params(), searchParams: searchParams() });
      render(el);
      expect(screen.queryByRole('button', { name: 'Report' })).not.toBeInTheDocument();
    });

    it('is offered to a signed-in reader who is not the profile’s own owner', async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
      vi.mocked(usernameOf).mockResolvedValue('someone-else');
      const el = await DrummerPage({ params: params(), searchParams: searchParams() });
      render(el);
      expect(screen.getByRole('button', { name: 'Report' })).toBeInTheDocument();
    });

    it('is hidden from the profile’s own owner', async () => {
      vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
      vi.mocked(usernameOf).mockResolvedValue('ghostnotes');
      const el = await DrummerPage({ params: params(), searchParams: searchParams() });
      render(el);
      expect(screen.queryByRole('button', { name: 'Report' })).not.toBeInTheDocument();
    });
  });
});

describe('listed bests (7C)', () => {
  it('shows no Speeds section when the drummer has nothing listed', async () => {
    vi.mocked(getPublicDrummer).mockResolvedValue({ username: 'ghostnotes', bio: null });
    render(await DrummerPage({ params: params(), searchParams: searchParams() }));
    expect(listedBestsFor).toHaveBeenCalledWith('ghostnotes');
    expect(screen.queryByRole('region', { name: 'Speeds' })).not.toBeInTheDocument();
  });

  it('lists each best, linking a published pattern to its table and naming a famous break plainly', async () => {
    vi.mocked(getPublicDrummer).mockResolvedValue({ username: 'ghostnotes', bio: null });
    vi.mocked(listedBestsFor).mockResolvedValue([
      {
        title: 'Cold Carpet',
        slug: 'cold000001',
        level: 2,
        bpm: 118,
        recordedAt: '2026-09-02T10:00:00.000Z',
        video: {
          platform: 'tiktok',
          url: 'https://www.tiktok.com/@ghostnotes/video/7300000000000000000',
          embedUrl: null,
        },
      },
      {
        title: 'Cold Sweat',
        slug: null,
        level: 5,
        bpm: 104,
        recordedAt: '2026-09-01T10:00:00.000Z',
        video: null,
      },
    ]);
    render(await DrummerPage({ params: params(), searchParams: searchParams() }));

    const section = screen.getByRole('region', { name: 'Speeds' });
    expect(section).toHaveTextContent('118 bpm');
    expect(section).toHaveTextContent('Groove');
    expect(screen.getByRole('link', { name: 'Cold Carpet' })).toHaveAttribute(
      'href',
      '/p/cold000001#speeds'
    );
    expect(screen.queryByRole('link', { name: 'Cold Sweat' })).not.toBeInTheDocument();
    const video = screen.getByRole('link', { name: 'video' });
    expect(video).toHaveAttribute(
      'href',
      'https://www.tiktok.com/@ghostnotes/video/7300000000000000000'
    );
    expect(video).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');
    expect(section).toHaveTextContent(/self-reported/);
  });
});
