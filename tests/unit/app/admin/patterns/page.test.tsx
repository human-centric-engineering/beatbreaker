// @vitest-environment happy-dom

/**
 * `/admin/patterns` — the moderation queue (Phase 6, task 6.11).
 *
 * Rendered on the server from `moderationQueue`, which has its own tests in
 * `tests/unit/lib/app/breaks/community/reports.test.ts`. This file is about
 * the PAGE's own composition: the empty state, reason labels, the owner's
 * username/email, and the flag state banner.
 *
 * No auth-redirect test: the admin guard is `app/admin/layout.tsx`, which has
 * its own.
 *
 * @see app/admin/patterns/page.tsx
 */

import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/reports', () => ({
  moderationQueue: vi.fn(),
  REPORT_REASON_LABELS: {
    spam: 'Spam',
    'not-theirs': "Someone else's work passed off as theirs",
    offensive: 'Offensive title or description',
    'bad-link': 'Bad or misleading link',
    other: 'Something else',
  },
  REPORT_REASONS: ['spam', 'not-theirs', 'offensive', 'bad-link', 'other'],
}));
vi.mock('@/lib/feature-flags', () => ({ isFeatureEnabled: vi.fn() }));
vi.mock('@/components/app/admin/patterns/moderation-actions', () => ({
  ModerationActions: ({ breakId, links }: { breakId: string; links: number }) => (
    <div data-testid="moderation-actions" data-break-id={breakId} data-links={links} />
  ),
}));

import AdminPatternsPage from '@/app/admin/patterns/page';
import { moderationQueue } from '@/lib/app/breaks/community/reports';
import { isFeatureEnabled } from '@/lib/feature-flags';

function item(overrides: Record<string, unknown> = {}) {
  return {
    breakId: 'cbrk00000000000000000001',
    title: 'Cold Carpet',
    slug: 'cold000001',
    visibility: 'published',
    owner: { username: 'ghostnotes', email: 'owner@example.com' },
    links: 1,
    reports: [
      {
        id: 'r1',
        reason: 'spam',
        note: null,
        createdAt: '2026-09-20T00:00:00.000Z',
        reporterGone: false,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

it('says there are no open reports when the queue is empty', async () => {
  vi.mocked(moderationQueue).mockResolvedValue([]);
  vi.mocked(isFeatureEnabled).mockResolvedValue(true);

  render(await AdminPatternsPage());

  expect(screen.getByText('No open reports.')).toBeInTheDocument();
  expect(screen.queryByTestId('moderation-actions')).not.toBeInTheDocument();
});

describe('with an item in the queue', () => {
  it('shows the owner’s username and email, the visibility, and the link count', async () => {
    vi.mocked(moderationQueue).mockResolvedValue([item()]);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    render(await AdminPatternsPage());

    const meta = within(screen.getByTestId('moderation-actions').parentElement!);
    expect(meta.getByText(/@ghostnotes/)).toBeInTheDocument();
    expect(meta.getByText(/owner@example.com/)).toBeInTheDocument();
    expect(meta.getByText(/published/)).toBeInTheDocument();
    const actions = screen.getByTestId('moderation-actions');
    expect(actions).toHaveAttribute('data-break-id', 'cbrk00000000000000000001');
    expect(actions).toHaveAttribute('data-links', '1');
  });

  it('shows "no username" for an owner who has not chosen one', async () => {
    vi.mocked(moderationQueue).mockResolvedValue([
      item({ owner: { username: null, email: 'owner@example.com' } }),
    ]);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    render(await AdminPatternsPage());

    expect(screen.getByText(/no username/)).toBeInTheDocument();
  });

  it('shows each report’s human-readable reason label, not the raw code', async () => {
    vi.mocked(moderationQueue).mockResolvedValue([
      item({
        reports: [
          {
            id: 'r1',
            reason: 'bad-link',
            note: 'dead link',
            createdAt: '2026-09-20T00:00:00.000Z',
            reporterGone: false,
          },
        ],
      }),
    ]);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    render(await AdminPatternsPage());

    expect(screen.getByText('Bad or misleading link')).toBeInTheDocument();
    expect(screen.queryByText('bad-link')).not.toBeInTheDocument();
    expect(screen.getByText(/dead link/)).toBeInTheDocument();
  });

  it('links the title to its public page when it has a slug', async () => {
    vi.mocked(moderationQueue).mockResolvedValue([item()]);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    render(await AdminPatternsPage());

    const link = screen.getByRole('link', { name: 'Cold Carpet' });
    expect(link).toHaveAttribute('href', '/p/cold000001');
  });

  it('shows the title as plain text for a pattern with no slug', async () => {
    vi.mocked(moderationQueue).mockResolvedValue([item({ slug: null })]);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    render(await AdminPatternsPage());

    expect(screen.queryByRole('link', { name: 'Cold Carpet' })).not.toBeInTheDocument();
    expect(screen.getByText('Cold Carpet')).toBeInTheDocument();
  });
});

describe('the publishing flag banner', () => {
  it('says publishing is on', async () => {
    vi.mocked(moderationQueue).mockResolvedValue([]);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    render(await AdminPatternsPage());

    expect(screen.getByText('on')).toBeInTheDocument();
  });

  it('says publishing is off', async () => {
    vi.mocked(moderationQueue).mockResolvedValue([]);
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);

    render(await AdminPatternsPage());

    expect(screen.getByText('off')).toBeInTheDocument();
  });
});
