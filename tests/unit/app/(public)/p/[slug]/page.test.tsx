// @vitest-environment happy-dom

/**
 * `/p/[slug]` — one shared or published pattern, public (Phase 6, task 6.6).
 *
 * The data layer (`getPublicPattern`, `openableIdForSlug`) is mocked at its
 * own seam — it has its own tests in `tests/unit/lib/app/breaks/community/`.
 * This file is about the PAGE's own composition: the not-found gate, the
 * signed-out vs signed-in branch, and `generateMetadata`'s robots/title rules.
 *
 * `PatternPlayer` and `PublicChart` are shallow-mocked: rendering them for
 * real pulls in the audio engine and the engraver, which have their own
 * component tests elsewhere.
 *
 * @see app/(public)/p/[slug]/page.tsx
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/public', async (importOriginal) => ({
  // the constants the query schema reads are real; the reads are mocked
  ...(await importOriginal<typeof import('@/lib/app/breaks/community/public')>()),
  getPublicPattern: vi.fn(),
  listVariations: vi.fn(),
  openableIdForSlug: vi.fn(),
}));
vi.mock('@/lib/app/breaks/community/reports', () => ({ ownsSlug: vi.fn() }));
vi.mock('@/lib/app/breaks/community/profile', () => ({ usernameOf: vi.fn() }));
vi.mock('@/lib/app/breaks/community/speed-tables', () => ({
  patternTableTarget: vi.fn(),
  readSpeedTable: vi.fn(),
}));
vi.mock('@/lib/app/breaks/catalogue/data', () => ({ studioCatalogue: vi.fn() }));
vi.mock('@/lib/auth/utils', () => ({ getServerSession: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('@/components/app/community/pattern-player', () => ({
  PatternPlayer: () => <div data-testid="pattern-player" />,
}));
vi.mock('@/components/app/community/public-chart', () => ({
  PublicChart: () => <div data-testid="public-chart" />,
}));
vi.mock('@/components/app/community/reference-embeds', () => ({
  ReferenceEmbeds: () => <div data-testid="reference-embeds" />,
}));
vi.mock('@/components/app/community/pattern-actions', () => ({
  PatternActions: ({ id, children }: { id: string; children?: React.ReactNode }) => (
    <div data-testid="pattern-actions" data-id={id}>
      {children}
    </div>
  ),
}));
vi.mock('@/components/app/community/report-button', () => ({
  ReportButton: ({ slug, speedId }: { slug?: string; speedId?: string }) => (
    <button
      type="button"
      data-testid={speedId ? 'speed-report-button' : 'report-button'}
      data-slug={slug}
      data-speed-id={speedId}
    >
      Report
    </button>
  ),
}));

import PublicPatternPage, { generateMetadata } from '@/app/(public)/p/[slug]/page';
import {
  getPublicPattern,
  listVariations,
  openableIdForSlug,
} from '@/lib/app/breaks/community/public';
import { usernameOf } from '@/lib/app/breaks/community/profile';
import { ownsSlug } from '@/lib/app/breaks/community/reports';
import { patternTableTarget, readSpeedTable } from '@/lib/app/breaks/community/speed-tables';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { getServerSession } from '@/lib/auth/utils';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import { createMockAuthSession } from '@/tests/helpers/auth';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

const SLUG = 'cold000001';

function doc() {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 3,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  return breakPayload({
    bpm: 90,
    swing: 10,
    level: 5,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  });
}

function pattern(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cbrk00000000000000000001',
    slug: SLUG,
    title: 'Cold Carpet',
    description: null,
    style: 'funk',
    meter: '4/4',
    bpm: 90,
    level: 5,
    difficulty: 2,
    publishedAt: '2026-01-01T00:00:00.000Z',
    author: null,
    saves: 0,
    visibility: 'link' as const,
    links: [],
    doc: doc(),
    basedOn: null,
    critique: { score: 80, verdict: 'Solid', playable: true },
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const params = (slug = SLUG) => Promise.resolve({ slug });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(studioCatalogue).mockResolvedValue(testCatalogue());
  vi.mocked(ownsSlug).mockResolvedValue(false);
  vi.mocked(usernameOf).mockResolvedValue(null);
  vi.mocked(patternTableTarget).mockResolvedValue(null);
  vi.mocked(readSpeedTable).mockResolvedValue({ rows: [], total: 0, nextCursor: null });
});

describe('generateMetadata', () => {
  it('is noindex,nofollow for a link share', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern({ visibility: 'link' }));
    const meta = await generateMetadata({ params: params() });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it('leaves robots unset for a published pattern', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern({ visibility: 'published' }));
    const meta = await generateMetadata({ params: params() });
    expect(meta.robots).toBeUndefined();
  });

  it('includes @username in the title when there is an author', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern({ author: 'ghostnotes' }));
    const meta = await generateMetadata({ params: params() });
    expect(meta.title).toEqual(expect.stringContaining('@ghostnotes'));
  });

  it('names the pattern "not found" and refuses indexing for a miss', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(null);
    const meta = await generateMetadata({ params: params() });
    expect(meta.title).toBe('Pattern not found');
    expect(meta.robots).toEqual({ index: false });
  });
});

describe('PublicPatternPage', () => {
  it('calls notFound for a missing pattern', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(null);
    await expect(PublicPatternPage({ params: params() })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('calls notFound for a slug the schema refuses, without asking the data layer', async () => {
    await expect(PublicPatternPage({ params: params('has/slash') })).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
    expect(getPublicPattern).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('shows the sign-up strip and no PatternActions when signed out', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern());
    vi.mocked(getServerSession).mockResolvedValue(null);
    const el = await PublicPatternPage({ params: params() });
    render(el);

    expect(screen.queryByTestId('pattern-actions')).not.toBeInTheDocument();
    const signup = screen.getByRole('link', { name: 'Create a free account' });
    expect(signup).toHaveAttribute(
      'href',
      `/signup?callbackUrl=${encodeURIComponent(`/p/${SLUG}`)}`
    );
    const login = screen.getByRole('link', { name: 'Sign in' });
    expect(login).toHaveAttribute('href', `/login?callbackUrl=${encodeURIComponent(`/p/${SLUG}`)}`);
    // openableIdForSlug is never asked for a visitor who cannot open anything by id
    expect(openableIdForSlug).not.toHaveBeenCalled(); // test-review:accept no_arg_called — signed-out short-circuit
  });

  it('passes the openable id to PatternActions when signed in', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern());
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    vi.mocked(openableIdForSlug).mockResolvedValue('cbrk00000000000000000099');
    const el = await PublicPatternPage({ params: params() });
    render(el);

    expect(openableIdForSlug).toHaveBeenCalledWith(SLUG);
    const actions = screen.getByTestId('pattern-actions');
    expect(actions).toHaveAttribute('data-id', 'cbrk00000000000000000099');
    expect(screen.queryByRole('link', { name: 'Create a free account' })).not.toBeInTheDocument();
  });

  it('falls back to the sign-up strip when signed in but the pattern is not openable by id', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern());
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    vi.mocked(openableIdForSlug).mockResolvedValue(null);
    const el = await PublicPatternPage({ params: params() });
    render(el);
    expect(screen.queryByTestId('pattern-actions')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create a free account' })).toBeInTheDocument();
  });

  it('shows Report inside PatternActions for a signed-in reader who does not own the pattern', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern());
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    vi.mocked(openableIdForSlug).mockResolvedValue('cbrk00000000000000000099');
    vi.mocked(ownsSlug).mockResolvedValue(false);
    const el = await PublicPatternPage({ params: params() });
    render(el);

    expect(ownsSlug).toHaveBeenCalledWith(SLUG, createMockAuthSession().user.id);
    const button = screen.getByTestId('report-button');
    expect(button).toHaveAttribute('data-slug', SLUG);
    // it is rendered as a child of PatternActions, not beside it
    expect(screen.getByTestId('pattern-actions')).toContainElement(button);
  });

  it('shows no Report button for the pattern’s own owner', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern());
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    vi.mocked(openableIdForSlug).mockResolvedValue('cbrk00000000000000000099');
    vi.mocked(ownsSlug).mockResolvedValue(true);
    const el = await PublicPatternPage({ params: params() });
    render(el);

    expect(screen.queryByTestId('report-button')).not.toBeInTheDocument();
  });

  it('shows the credit line for a copy', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(
      pattern({ basedOn: { title: 'The original', username: 'ghostnotes', slug: 'orig000001' } })
    );
    vi.mocked(getServerSession).mockResolvedValue(null);
    const el = await PublicPatternPage({ params: params() });
    render(el);
    expect(screen.getByText(/Variation of/)).toBeInTheDocument();
    expect(screen.getByText(/“The original”/)).toBeInTheDocument();
    expect(screen.getByText(/@ghostnotes/)).toBeInTheDocument();
  });
});

describe('variations (7A)', () => {
  const card = (slug: string, title: string) => ({
    id: `cbrk0000000000000000${slug.slice(-4)}`,
    slug,
    title,
    description: null,
    style: 'funk',
    meter: '4/4',
    bpm: 96,
    level: 5,
    difficulty: 2,
    linkKinds: [],
    publishedAt: '2026-02-01T00:00:00.000Z',
    author: 'ghostnotes',
    saves: 0,
  });

  it('lists a published pattern’s published variations, newest first by default', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern({ visibility: 'published' }));
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(listVariations).mockResolvedValue({
      patterns: [card('warm000001', 'Warm Carpet')],
      nextCursor: null,
    });
    render(await PublicPatternPage({ params: params() }));

    expect(listVariations).toHaveBeenCalledWith(SLUG, { sort: 'newest', limit: 24 });
    const section = screen.getByRole('region', { name: 'Variations' });
    expect(section).toHaveTextContent('Warm Carpet');
    expect(screen.getByRole('link', { name: /Warm Carpet/ })).toHaveAttribute(
      'href',
      '/p/warm000001'
    );
    expect(screen.queryByRole('link', { name: 'More variations' })).not.toBeInTheDocument();
  });

  it('reads the sort and cursor from the address, and links the next page', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern({ visibility: 'published' }));
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(listVariations).mockResolvedValue({
      patterns: [card('warm000001', 'Warm Carpet')],
      nextCursor: 'MjQ',
    });
    render(
      await PublicPatternPage({
        params: params(),
        searchParams: Promise.resolve({ sort: 'saved', cursor: 'MjQ' }),
      })
    );

    expect(listVariations).toHaveBeenCalledWith(SLUG, {
      sort: 'saved',
      limit: 24,
      cursor: 'MjQ',
    });
    expect(screen.getByRole('link', { name: 'More variations' })).toHaveAttribute(
      'href',
      `/p/${SLUG}?sort=saved&cursor=MjQ#variations`
    );
  });

  it('falls back to the first page, newest, for a sort that does not read', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern({ visibility: 'published' }));
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(listVariations).mockResolvedValue({ patterns: [], nextCursor: null });
    render(
      await PublicPatternPage({
        params: params(),
        searchParams: Promise.resolve({ sort: 'loudest' }),
      })
    );

    expect(listVariations).toHaveBeenCalledWith(SLUG, { sort: 'newest', limit: 24 });
    expect(screen.getByText(/Nobody has published a variation/)).toBeInTheDocument();
  });

  it('has no Variations section on a link share: its copies are not variations', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern({ visibility: 'link' }));
    vi.mocked(getServerSession).mockResolvedValue(null);
    render(await PublicPatternPage({ params: params() }));

    expect(listVariations).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a link share has no list to read
    expect(screen.queryByRole('region', { name: 'Variations' })).not.toBeInTheDocument();
  });
});

describe('speeds (7C)', () => {
  const TARGET = { target: { breakId: 'cbrk00000000000000000001' }, hash: 'h'.repeat(64) };
  const row = (id: string, username: string, bpm: number, video = false) => ({
    id,
    position: 1,
    username,
    bpm,
    recordedAt: '2026-09-01T10:00:00.000Z',
    video: video
      ? {
          platform: 'youtube' as const,
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        }
      : null,
  });

  it('reads the table at the full break by default and lists its rows, with the video badge', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern({ visibility: 'published' }));
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(listVariations).mockResolvedValue({ patterns: [], nextCursor: null });
    vi.mocked(patternTableTarget).mockResolvedValue(TARGET);
    vi.mocked(readSpeedTable).mockResolvedValue({
      rows: [row('cspd00000000000000000001', 'fastfeet', 132, true)],
      total: 1,
      nextCursor: null,
    });
    render(await PublicPatternPage({ params: params() }));

    expect(patternTableTarget).toHaveBeenCalledWith(SLUG);
    expect(readSpeedTable).toHaveBeenCalledWith(TARGET, { level: 5, video: false, limit: 25 });
    const section = screen.getByRole('region', { name: 'Speeds' });
    expect(section).toHaveTextContent('@fastfeet');
    expect(section).toHaveTextContent('132 bpm');
    expect(section).toHaveTextContent('video');
    expect(section).toHaveTextContent(/self-reported/);
    // signed out: nobody to report as
    expect(screen.queryByTestId('speed-report-button')).not.toBeInTheDocument();
  });

  it('reads the layer, the video filter and the page from the address', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern({ visibility: 'published' }));
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(listVariations).mockResolvedValue({ patterns: [], nextCursor: null });
    vi.mocked(patternTableTarget).mockResolvedValue(TARGET);
    await PublicPatternPage({
      params: params(),
      searchParams: Promise.resolve({ speeds: '2', video: '1', speedsCursor: 'MjU' }),
    });
    expect(readSpeedTable).toHaveBeenCalledWith(TARGET, {
      level: 2,
      video: true,
      limit: 25,
      cursor: 'MjU',
    });
  });

  it('falls back to the full break, every row, for a layer that does not read', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern({ visibility: 'published' }));
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(listVariations).mockResolvedValue({ patterns: [], nextCursor: null });
    vi.mocked(patternTableTarget).mockResolvedValue(TARGET);
    await PublicPatternPage({ params: params(), searchParams: Promise.resolve({ speeds: '9' }) });
    expect(readSpeedTable).toHaveBeenCalledWith(TARGET, { level: 5, video: false, limit: 25 });
  });

  it('has no table for a link share', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern({ visibility: 'link' }));
    vi.mocked(getServerSession).mockResolvedValue(null);
    render(await PublicPatternPage({ params: params() }));
    expect(patternTableTarget).not.toHaveBeenCalled(); // test-review:accept no_arg_called — link shares have no table
    expect(screen.queryByRole('region', { name: 'Speeds' })).not.toBeInTheDocument();
  });

  it("offers a signed-in reader Report on other drummers' rows and not on their own", async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(pattern({ visibility: 'published' }));
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    vi.mocked(openableIdForSlug).mockResolvedValue('cbrk00000000000000000099');
    vi.mocked(usernameOf).mockResolvedValue('fastfeet');
    vi.mocked(listVariations).mockResolvedValue({ patterns: [], nextCursor: null });
    vi.mocked(patternTableTarget).mockResolvedValue(TARGET);
    vi.mocked(readSpeedTable).mockResolvedValue({
      rows: [
        row('cspd00000000000000000001', 'fastfeet', 132),
        { ...row('cspd00000000000000000002', 'slowhands', 120), position: 2 },
      ],
      total: 2,
      nextCursor: null,
    });
    render(await PublicPatternPage({ params: params() }));

    const reports = screen.getAllByTestId('speed-report-button');
    expect(reports).toHaveLength(1);
    expect(reports[0]).toHaveAttribute('data-speed-id', 'cspd00000000000000000002');
  });
});
