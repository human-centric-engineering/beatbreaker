// @vitest-environment happy-dom

/**
 * SpeedModerationActions (Phase 7C) — what a moderator can do about a
 * reported speed: take it off the tables, or dismiss the reports. Unlisting
 * asks once more in place — it emails the drummer — as unpublishing a
 * pattern does; a record already off the tables offers only Dismiss.
 *
 * @see components/app/admin/patterns/speed-moderation-actions.tsx
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

import { SpeedModerationActions } from '@/components/app/admin/patterns/speed-moderation-actions';
import { APIClientError, apiClient } from '@/lib/api/client';

const RECORD_ID = 'cspd00000000000000000001';

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset();
  refresh.mockClear();
});

it('offers Unlist only when the record is listed', () => {
  render(<SpeedModerationActions recordId={RECORD_ID} listed={false} />);
  expect(screen.queryByRole('button', { name: 'Unlist' })).not.toBeInTheDocument();

  render(<SpeedModerationActions recordId={RECORD_ID} listed />);
  expect(screen.getByRole('button', { name: 'Unlist' })).toBeInTheDocument();
});

describe('unlisting', () => {
  it('asks in place before posting, and refreshes once it goes through', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({});
    render(<SpeedModerationActions recordId={RECORD_ID} listed />);

    await user.click(screen.getByRole('button', { name: 'Unlist' }));

    expect(apiClient.post).not.toHaveBeenCalled(); // test-review:accept no_arg_called — confirming, not yet sent
    expect(screen.getByText('Take it off the table and email the drummer?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Yes, unlist' }));

    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/admin/speeds/${RECORD_ID}`, {
      body: { action: 'unlist' },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('Cancel backs out without posting anything', async () => {
    const user = userEvent.setup();
    render(<SpeedModerationActions recordId={RECORD_ID} listed />);

    await user.click(screen.getByRole('button', { name: 'Unlist' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Unlist' })).toBeInTheDocument();
    expect(
      screen.queryByText('Take it off the table and email the drummer?')
    ).not.toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled(); // test-review:accept no_arg_called — cancelled, not sent
  });
});

it('posts dismiss at once, with no confirmation step', async () => {
  const user = userEvent.setup();
  vi.mocked(apiClient.post).mockResolvedValue({});
  render(<SpeedModerationActions recordId={RECORD_ID} listed />);

  await user.click(screen.getByRole('button', { name: 'Dismiss' }));

  expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/admin/speeds/${RECORD_ID}`, {
    body: { action: 'dismiss' },
  });
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('shows the server’s refusal in an alert', async () => {
  const user = userEvent.setup();
  vi.mocked(apiClient.post).mockRejectedValue(
    new APIClientError('That record is gone.', 'NOT_FOUND', 404)
  );
  render(<SpeedModerationActions recordId={RECORD_ID} listed />);

  await user.click(screen.getByRole('button', { name: 'Dismiss' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('That record is gone.');
  expect(refresh).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a failed action must not refresh as if it worked
});

it('shows a generic message for a failure that is not an APIClientError', async () => {
  const user = userEvent.setup();
  vi.mocked(apiClient.post).mockRejectedValue(new Error('boom'));
  render(<SpeedModerationActions recordId={RECORD_ID} listed={false} />);

  await user.click(screen.getByRole('button', { name: 'Dismiss' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('That did not go through.');
});
