// @vitest-environment happy-dom

/**
 * ProfileModerationActions (Phase 7B, task 7B.6) — what a moderator can do
 * about a reported profile: strip its channel links, or dismiss the reports.
 * Neither emails anyone, so neither asks twice.
 *
 * @see components/app/admin/patterns/profile-moderation-actions.tsx
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { post: vi.fn() } };
});

import { ProfileModerationActions } from '@/components/app/admin/patterns/profile-moderation-actions';
import { APIClientError, apiClient } from '@/lib/api/client';

const SUBJECT_ID = 'cusr0000000000000000001';

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset();
  refresh.mockClear();
});

it('offers Strip links only when the profile has links', () => {
  render(<ProfileModerationActions subjectId={SUBJECT_ID} links={0} />);
  expect(screen.queryByRole('button', { name: 'Strip links' })).not.toBeInTheDocument();

  render(<ProfileModerationActions subjectId={SUBJECT_ID} links={2} />);
  expect(screen.getByRole('button', { name: 'Strip links' })).toBeInTheDocument();
});

describe('posting an action', () => {
  it('posts strip-links to the drummer’s own admin route, then refreshes the page', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({});
    render(<ProfileModerationActions subjectId={SUBJECT_ID} links={3} />);

    await user.click(screen.getByRole('button', { name: 'Strip links' }));

    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/admin/drummers/${SUBJECT_ID}`, {
      body: { action: 'strip-links' },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('posts dismiss directly, with no confirmation step', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({});
    render(<ProfileModerationActions subjectId={SUBJECT_ID} links={0} />);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/admin/drummers/${SUBJECT_ID}`, {
      body: { action: 'dismiss' },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

it('shows the server’s refusal and does not refresh when the request fails', async () => {
  const user = userEvent.setup();
  vi.mocked(apiClient.post).mockRejectedValue(
    new APIClientError('That profile is gone.', 'NOT_FOUND', 404)
  );
  render(<ProfileModerationActions subjectId={SUBJECT_ID} links={0} />);

  await user.click(screen.getByRole('button', { name: 'Dismiss' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('That profile is gone.');
  expect(refresh).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a failed action must not refresh as if it worked
});

it('shows a generic message for a failure that is not an APIClientError', async () => {
  const user = userEvent.setup();
  vi.mocked(apiClient.post).mockRejectedValue(new Error('boom'));
  render(<ProfileModerationActions subjectId={SUBJECT_ID} links={0} />);

  await user.click(screen.getByRole('button', { name: 'Dismiss' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('That did not go through.');
});
