// @vitest-environment happy-dom

/**
 * What a signed-in reader of a shared session can do (Phase 7D, D32):
 * _Save to my sessions_, which routes to the editor, and _Run it_, which
 * routes to the Studio with the fresh copy's id.
 *
 * The real component and the real `session-api` over a mocked `apiClient`.
 *
 * @see components/app/practice/shared-session-actions.tsx
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { post: vi.fn() } };
});

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { SharedSessionActions } from '@/components/app/practice/shared-session-actions';
import { APIClientError, apiClient } from '@/lib/api/client';
import { sessionView } from '@/tests/unit/components/app/practice/fixtures';

const SLUG = 'shrd000001';
const COPY = sessionView({ id: 'csess0000000000000000100' });

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset();
  push.mockClear();
});

describe('SharedSessionActions', () => {
  it('saves and routes to the new copy’s editor page', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue(COPY);
    render(<SharedSessionActions slug={SLUG} runnable />);

    await user.click(screen.getByRole('button', { name: 'Save to my sessions' }));

    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/public/practice-sessions/${SLUG}/copy`, {
      body: {},
    });
    expect(push).toHaveBeenCalledWith(`/practice/${COPY.id}`);
  });

  it('runs it: saves a copy, then routes to the Studio with that copy’s id', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue(COPY);
    render(<SharedSessionActions slug={SLUG} runnable />);

    await user.click(screen.getByRole('button', { name: 'Run it' }));

    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/public/practice-sessions/${SLUG}/copy`, {
      body: {},
    });
    expect(push).toHaveBeenCalledWith(`/studio?session=${COPY.id}`);
  });

  it('has no Run it button when nothing in the session is available to play', () => {
    render(<SharedSessionActions slug={SLUG} runnable={false} />);
    expect(screen.queryByRole('button', { name: 'Run it' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save to my sessions' })).toBeInTheDocument();
  });

  it('shows the server’s own message and does not navigate when the save fails', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockRejectedValue(
      new APIClientError('Practice session not found', 'NOT_FOUND', 404)
    );
    render(<SharedSessionActions slug={SLUG} runnable />);

    await user.click(screen.getByRole('button', { name: 'Save to my sessions' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Practice session not found');
    expect(push).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the save failed
  });

  it('falls back to a generic message on a network error', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockRejectedValue(
      new APIClientError('fetch failed', 'NETWORK_ERROR')
    );
    render(<SharedSessionActions slug={SLUG} runnable />);

    await user.click(screen.getByRole('button', { name: 'Save to my sessions' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That did not save. Try again.');
  });
});
