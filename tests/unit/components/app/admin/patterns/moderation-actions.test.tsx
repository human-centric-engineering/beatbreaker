// @vitest-environment happy-dom

/**
 * ModerationActions (Phase 6, task 6.11) — the three things a moderator can do
 * about a reported pattern, from the admin queue.
 *
 * @see components/app/admin/patterns/moderation-actions.tsx
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

import { ModerationActions } from '@/components/app/admin/patterns/moderation-actions';
import { APIClientError, apiClient } from '@/lib/api/client';

const BREAK_ID = 'cbrk00000000000000000001';

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset();
  refresh.mockClear();
});

it('offers Strip links only when the pattern has links', () => {
  render(<ModerationActions breakId={BREAK_ID} links={0} />);
  expect(screen.queryByRole('button', { name: 'Strip links' })).not.toBeInTheDocument();

  render(<ModerationActions breakId={BREAK_ID} links={2} />);
  expect(screen.getByRole('button', { name: 'Strip links' })).toBeInTheDocument();
});

describe('Unpublish', () => {
  it('asks in place before posting anything', async () => {
    const user = userEvent.setup();
    render(<ModerationActions breakId={BREAK_ID} links={0} />);

    await user.click(screen.getByRole('button', { name: 'Unpublish' }));

    expect(screen.getByText('Unpublish and email the owner?')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the first click only confirms
  });

  it('cancels back without posting', async () => {
    const user = userEvent.setup();
    render(<ModerationActions breakId={BREAK_ID} links={0} />);
    await user.click(screen.getByRole('button', { name: 'Unpublish' }));

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled(); // test-review:accept no_arg_called — cancelled
  });

  it('posts unpublish once confirmed, then refreshes the page', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({});
    render(<ModerationActions breakId={BREAK_ID} links={0} />);
    await user.click(screen.getByRole('button', { name: 'Unpublish' }));

    await user.click(screen.getByRole('button', { name: 'Yes, unpublish' }));

    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/admin/patterns/${BREAK_ID}`, {
      body: { action: 'unpublish' },
    });
    expect(await screen.findByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

it('posts strip-links directly, with no confirmation step', async () => {
  const user = userEvent.setup();
  vi.mocked(apiClient.post).mockResolvedValue({});
  render(<ModerationActions breakId={BREAK_ID} links={3} />);

  await user.click(screen.getByRole('button', { name: 'Strip links' }));

  expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/admin/patterns/${BREAK_ID}`, {
    body: { action: 'strip-links' },
  });
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('posts dismiss directly, with no confirmation step', async () => {
  const user = userEvent.setup();
  vi.mocked(apiClient.post).mockResolvedValue({});
  render(<ModerationActions breakId={BREAK_ID} links={0} />);

  await user.click(screen.getByRole('button', { name: 'Dismiss' }));

  expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/admin/patterns/${BREAK_ID}`, {
    body: { action: 'dismiss' },
  });
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('shows the server’s refusal and does not refresh when the request fails', async () => {
  const user = userEvent.setup();
  vi.mocked(apiClient.post).mockRejectedValue(
    new APIClientError('That pattern is gone.', 'NOT_FOUND', 404)
  );
  render(<ModerationActions breakId={BREAK_ID} links={0} />);

  await user.click(screen.getByRole('button', { name: 'Dismiss' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('That pattern is gone.');
  expect(refresh).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a failed action must not refresh as if it worked
});
