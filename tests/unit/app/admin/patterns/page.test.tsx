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
  profileQueue: vi.fn(),
  REPORT_REASON_LABELS: {
    spam: 'Spam',
    'not-theirs': "Someone else's work passed off as theirs",
    offensive: 'Offensive title or description',
    'bad-link': 'Bad or misleading link',
    other: 'Something else',
  },
  REPORT_REASONS: ['spam', 'not-theirs', 'offensive', 'bad-link', 'other'],
  PROFILE_REPORT_REASON_LABELS: {
    spam: 'Spam',
    offensive: 'Offensive username or bio',
    'bad-link': 'Bad or misleading link',
    other: 'Something else',
  },
  PROFILE_REPORT_REASONS: ['spam', 'offensive', 'bad-link', 'other'],
  speedQueue: vi.fn(),
  SPEED_REPORT_REASON_LABELS: {
    'wrong-speed': "Speed doesn't look right",
    'bad-link': 'Bad or misleading link',
    other: 'Something else',
  },
  SPEED_REPORT_REASONS: ['wrong-speed', 'bad-link', 'other'],
}));
vi.mock('@/lib/feature-flags', () => ({ isFeatureEnabled: vi.fn() }));
vi.mock('@/components/app/admin/patterns/moderation-actions', () => ({
  ModerationActions: ({ breakId, links }: { breakId: string; links: number }) => (
    <div data-testid="moderation-actions" data-break-id={breakId} data-links={links} />
  ),
}));
vi.mock('@/components/app/admin/patterns/speed-moderation-actions', () => ({
  SpeedModerationActions: ({ recordId, listed }: { recordId: string; listed: boolean }) => (
    <div data-testid="speed-moderation-actions" data-record-id={recordId} data-listed={listed} />
  ),
}));
vi.mock('@/components/app/admin/patterns/profile-moderation-actions', () => ({
  ProfileModerationActions: ({ subjectId, links }: { subjectId: string; links: number }) => (
    <div data-testid="profile-moderation-actions" data-subject-id={subjectId} data-links={links} />
  ),
}));

import AdminPatternsPage from '@/app/admin/patterns/page';
import { moderationQueue, profileQueue, speedQueue } from '@/lib/app/breaks/community/reports';
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

function profileItem(overrides: Record<string, unknown> = {}) {
  return {
    subjectId: 'cusr0000000000000000001',
    username: 'ghostnotes',
    email: 'owner@example.com',
    bio: null,
    links: 1,
    reports: [
      {
        id: 'pr1',
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
  vi.mocked(profileQueue).mockResolvedValue([]);
  vi.mocked(speedQueue).mockResolvedValue([]);
});

it('says there are no open reports when the queue is empty', async () => {
  vi.mocked(moderationQueue).mockResolvedValue([]);
  vi.mocked(isFeatureEnabled).mockResolvedValue(true);

  render(await AdminPatternsPage());

  expect(screen.getByText('No open reports.')).toBeInTheDocument();
  expect(screen.queryByTestId('moderation-actions')).not.toBeInTheDocument();
});

describe('Reported profiles (7B, task 7B.6)', () => {
  beforeEach(() => {
    vi.mocked(moderationQueue).mockResolvedValue([]);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  });

  it('says there are no open reports on profiles when the queue is empty', async () => {
    vi.mocked(profileQueue).mockResolvedValue([]);

    render(await AdminPatternsPage());

    expect(screen.getByText('No open reports on profiles.')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-moderation-actions')).not.toBeInTheDocument();
  });

  it('lists a reported profile with its labelled reasons', async () => {
    vi.mocked(profileQueue).mockResolvedValue([
      profileItem({
        reports: [
          {
            id: 'pr1',
            reason: 'bad-link',
            note: 'dead link',
            createdAt: '2026-09-20T00:00:00.000Z',
            reporterGone: false,
          },
        ],
      }),
    ]);

    render(await AdminPatternsPage());

    const meta = within(screen.getByTestId('profile-moderation-actions').parentElement!);
    expect(meta.getByText('@ghostnotes')).toBeInTheDocument();
    expect(meta.getByText(/owner@example.com/)).toBeInTheDocument();
    expect(screen.getByText('Bad or misleading link')).toBeInTheDocument();
    expect(screen.queryByText('bad-link')).not.toBeInTheDocument();
    expect(screen.getByText(/dead link/)).toBeInTheDocument();
    const actions = screen.getByTestId('profile-moderation-actions');
    expect(actions).toHaveAttribute('data-subject-id', 'cusr0000000000000000001');
    expect(actions).toHaveAttribute('data-links', '1');
  });

  it('shows the bio, counts links in the singular and plural, and shows an unknown reason as its code', async () => {
    vi.mocked(profileQueue).mockResolvedValue([
      profileItem({
        bio: 'Funk, mostly.',
        links: 1,
        reports: [
          {
            id: 'pr1',
            reason: 'retired-reason',
            note: null,
            createdAt: '2026-09-20T00:00:00.000Z',
            reporterGone: true,
          },
        ],
      }),
      profileItem({ subjectId: 'cusr0000000000000000002', username: 'rimshot', links: 3 }),
    ]);

    render(await AdminPatternsPage());

    expect(screen.getByText('Funk, mostly.')).toBeInTheDocument();
    expect(screen.getByText(/owner@example.com · 1 link$/)).toBeInTheDocument();
    expect(screen.getByText(/owner@example.com · 3 links$/)).toBeInTheDocument();
    expect(screen.getByText('retired-reason')).toBeInTheDocument();
  });

  it('shows "no username" for a subject who has dropped theirs', async () => {
    vi.mocked(profileQueue).mockResolvedValue([profileItem({ username: null })]);

    render(await AdminPatternsPage());

    expect(screen.getByText('no username')).toBeInTheDocument();
  });
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

  it('counts links in the plural and shows an unknown reason as its code', async () => {
    vi.mocked(moderationQueue).mockResolvedValue([
      item({
        links: 2,
        reports: [
          {
            id: 'r1',
            reason: 'retired-reason',
            note: null,
            createdAt: '2026-09-20T00:00:00.000Z',
            reporterGone: false,
          },
        ],
      }),
    ]);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    render(await AdminPatternsPage());

    const meta = within(screen.getByTestId('moderation-actions').parentElement!);
    expect(meta.getByText(/2 links/)).toBeInTheDocument();
    expect(screen.getByText('retired-reason')).toBeInTheDocument();
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

describe('Reported speeds (7C)', () => {
  const speed = (overrides: Record<string, unknown> = {}) => ({
    recordId: 'cspd00000000000000000001',
    title: 'Cold Sweat',
    slug: null,
    level: 5,
    bpm: 180,
    recordedAt: '2026-09-20T00:00:00.000Z',
    videoUrl: null,
    listed: true,
    drummer: { username: 'fastfeet', email: 'fast@example.com' },
    reports: [
      {
        id: 'sr1',
        reason: 'wrong-speed',
        note: 'Nobody plays that at 180',
        createdAt: '2026-09-21T00:00:00.000Z',
        reporterGone: false,
      },
    ],
    ...overrides,
  });

  it('says there are no open reports on speeds when the queue is empty', async () => {
    vi.mocked(moderationQueue).mockResolvedValue([]);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    render(await AdminPatternsPage());
    expect(screen.getByText('No open reports on speeds.')).toBeInTheDocument();
  });

  it('lists a reported speed with its drummer, its labelled reason and its actions', async () => {
    vi.mocked(moderationQueue).mockResolvedValue([]);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(speedQueue).mockResolvedValue([
      speed({ videoUrl: 'https://www.tiktok.com/@fastfeet/video/7300000000000000000' }),
    ]);
    render(await AdminPatternsPage());

    const section = screen.getByRole('region', { name: 'Reported speeds' });
    expect(section).toHaveTextContent('180 bpm at layer 5 on Cold Sweat');
    expect(section).toHaveTextContent('@fastfeet');
    expect(section).toHaveTextContent('fast@example.com');
    expect(section).toHaveTextContent('listed');
    expect(section).toHaveTextContent("Speed doesn't look right");
    expect(section).toHaveTextContent('Nobody plays that at 180');
    expect(within(section).getByRole('link', { name: 'Video on TikTok' })).toHaveAttribute(
      'href',
      'https://www.tiktok.com/@fastfeet/video/7300000000000000000'
    );
    const actions = within(section).getByTestId('speed-moderation-actions');
    expect(actions).toHaveAttribute('data-record-id', 'cspd00000000000000000001');
    expect(actions).toHaveAttribute('data-listed', 'true');
  });

  it('links a speed on a published pattern to its page, and says when it is already off the table', async () => {
    vi.mocked(moderationQueue).mockResolvedValue([]);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(speedQueue).mockResolvedValue([
      speed({
        title: 'Cold Carpet',
        slug: 'cold000001',
        listed: false,
        drummer: { username: null, email: 'x@example.com' },
      }),
    ]);
    render(await AdminPatternsPage());

    const section = screen.getByRole('region', { name: 'Reported speeds' });
    expect(within(section).getByRole('link', { name: 'Cold Carpet' })).toHaveAttribute(
      'href',
      '/p/cold000001'
    );
    expect(section).toHaveTextContent('not listed');
    expect(section).toHaveTextContent('no username');
  });
});
