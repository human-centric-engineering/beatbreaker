// @vitest-environment happy-dom

/**
 * `/s/[slug]` — one shared practice session, public (Phase 7D, D32).
 *
 * `getPublicSession` and `ownSharedSessionId` are mocked at their own
 * seam — the clamping, PII-scrubbing and credit are covered by
 * `tests/unit/lib/app/breaks/saved/session-sharing.test.ts`. This file is
 * about the PAGE's own composition: the not-found gate, the three branches
 * at the foot of the page (signed-out, owner, other signed-in reader), the
 * "no longer shared" row, and `generateMetadata`'s `noindex`.
 *
 * @see app/(public)/s/[slug]/page.tsx
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/saved/session-sharing', () => ({
  getPublicSession: vi.fn(),
  ownSharedSessionId: vi.fn(),
}));
vi.mock('@/lib/auth/utils', () => ({ getServerSession: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  useRouter: () => ({ push: vi.fn() }),
}));

import SharedSessionPage, { generateMetadata } from '@/app/(public)/s/[slug]/page';
import { getPublicSession, ownSharedSessionId } from '@/lib/app/breaks/saved/session-sharing';
import { getServerSession } from '@/lib/auth/utils';
import { createMockAuthSession } from '@/tests/helpers/auth';
import type { PublicSession } from '@/lib/validations/practice-sessions';

const SLUG = 'shrd000001';

function session(over: Partial<PublicSession> = {}): PublicSession {
  return {
    slug: SLUG,
    name: 'Warm-up',
    description: null,
    totalMinutes: 15,
    countIn: 1,
    author: 'ghostnotes',
    items: [
      {
        available: true,
        position: 0,
        title: 'Cold Carpet',
        link: { kind: 'pattern', slug: 'cold000001' },
        level: 3,
        minutes: 15,
        targetBpm: 120,
        startBpm: 96,
        climbPct: 67,
        climbShape: 'steady',
        climbSteps: 4,
      },
    ],
    ...over,
  };
}

const params = (slug = SLUG) => Promise.resolve({ slug });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateMetadata', () => {
  it('is noindex,nofollow for a shared session', async () => {
    vi.mocked(getPublicSession).mockResolvedValue(session());
    const meta = await generateMetadata({ params: params() });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it('names it "not found" and refuses indexing for a miss', async () => {
    vi.mocked(getPublicSession).mockResolvedValue(null);
    const meta = await generateMetadata({ params: params() });
    expect(meta.title).toBe('Practice session not found');
    expect(meta.robots).toEqual({ index: false });
  });
});

describe('SharedSessionPage', () => {
  it('calls notFound for a missing session', async () => {
    vi.mocked(getPublicSession).mockResolvedValue(null);
    await expect(SharedSessionPage({ params: params() })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('calls notFound for a slug the schema refuses, without asking the data layer', async () => {
    await expect(SharedSessionPage({ params: params('has/a/slash') })).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
    expect(getPublicSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('shows the sign-up strip when signed out, and no owner or reader actions', async () => {
    vi.mocked(getPublicSession).mockResolvedValue(session());
    vi.mocked(getServerSession).mockResolvedValue(null);

    const el = await SharedSessionPage({ params: params() });
    render(el);

    expect(screen.getByRole('link', { name: 'Create a free account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save to my sessions' })).not.toBeInTheDocument();
    expect(screen.queryByText('This is your session.')).not.toBeInTheDocument();
    // a visitor with no account cannot own anything, so the lookup never runs
    expect(ownSharedSessionId).not.toHaveBeenCalled(); // test-review:accept no_arg_called — signed-out short-circuit
  });

  it('shows "No longer shared" for an item its owner has since made private, with no title', async () => {
    vi.mocked(getPublicSession).mockResolvedValue(
      session({
        items: [{ available: false, position: 0, minutes: 10 }],
      })
    );
    vi.mocked(getServerSession).mockResolvedValue(null);

    const el = await SharedSessionPage({ params: params() });
    render(el);

    expect(screen.getByText('No longer shared')).toBeInTheDocument();
    expect(screen.queryByText('Cold Carpet')).not.toBeInTheDocument();
  });

  it('offers Edit it and Run it to the session’s own owner', async () => {
    vi.mocked(getPublicSession).mockResolvedValue(session());
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    vi.mocked(ownSharedSessionId).mockResolvedValue('csess0000000000000000099');

    const el = await SharedSessionPage({ params: params() });
    render(el);

    expect(ownSharedSessionId).toHaveBeenCalledWith(SLUG, createMockAuthSession().user.id);
    expect(screen.getByText('This is your session.')).toBeInTheDocument();
    const edit = screen.getByRole('link', { name: 'Edit it' });
    expect(edit).toHaveAttribute('href', '/practice/csess0000000000000000099');
    const run = screen.getByRole('link', { name: 'Run it' });
    expect(run).toHaveAttribute('href', '/studio?session=csess0000000000000000099');
    expect(screen.queryByRole('button', { name: 'Save to my sessions' })).not.toBeInTheDocument();
  });

  it('keeps Run it for the owner when every pattern has gone private since', async () => {
    vi.mocked(getPublicSession).mockResolvedValue(
      session({ items: [{ available: false, position: 0, minutes: 10 }] })
    );
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    vi.mocked(ownSharedSessionId).mockResolvedValue('csess0000000000000000099');

    const el = await SharedSessionPage({ params: params() });
    render(el);

    const run = screen.getByRole('link', { name: 'Run it' });
    expect(run).toHaveAttribute('href', '/studio?session=csess0000000000000000099');
  });

  it('offers SharedSessionActions to a signed-in reader who is not the owner', async () => {
    vi.mocked(getPublicSession).mockResolvedValue(session());
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    vi.mocked(ownSharedSessionId).mockResolvedValue(null);

    const el = await SharedSessionPage({ params: params() });
    render(el);

    expect(screen.getByRole('button', { name: 'Save to my sessions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run it' })).toBeInTheDocument();
    expect(screen.queryByText('This is your session.')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create a free account' })).not.toBeInTheDocument();
  });

  it('has no Run it for a reader when nothing in the session is available to play', async () => {
    vi.mocked(getPublicSession).mockResolvedValue(
      session({ items: [{ available: false, position: 0, minutes: 10 }] })
    );
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    vi.mocked(ownSharedSessionId).mockResolvedValue(null);

    const el = await SharedSessionPage({ params: params() });
    render(el);

    expect(screen.queryByRole('button', { name: 'Run it' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save to my sessions' })).toBeInTheDocument();
  });
});
