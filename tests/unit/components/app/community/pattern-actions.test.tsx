// @vitest-environment happy-dom

/**
 * What a signed-in reader can do with a shared pattern (task 6.6): save a
 * private copy of their own, credited to this one, or open it in the editor.
 *
 * @see components/app/community/pattern-actions.tsx
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

import { PatternActions } from '@/components/app/community/pattern-actions';
import { APIClientError, apiClient } from '@/lib/api/client';

const ID = 'cbrk00000000000000000001';
const NEW_ID = 'cbrk00000000000000000099';

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset();
  push.mockClear();
});

describe('PatternActions', () => {
  it('saves a copy via the copy route, then opens the new pattern in the Studio', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id: NEW_ID });
    const user = userEvent.setup();
    render(<PatternActions id={ID} />);

    await user.click(screen.getByRole('button', { name: /save a copy/i }));

    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/breaks/${ID}/copy`, { body: {} });
    expect(push).toHaveBeenCalledWith(`/studio/${NEW_ID}`);
    expect(push).not.toHaveBeenCalledWith(`/studio/${ID}`);
  });

  it('shows a network-specific error and does not navigate when the request cannot reach the server', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new APIClientError('offline', 'NETWORK_ERROR'));
    const user = userEvent.setup();
    render(<PatternActions id={ID} />);

    await user.click(screen.getByRole('button', { name: /save a copy/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
    expect(push).not.toHaveBeenCalled();
  });

  it('shows a generic error for any other failure', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new APIClientError('nope', 'VALIDATION_ERROR'));
    const user = userEvent.setup();
    render(<PatternActions id={ID} />);

    await user.click(screen.getByRole('button', { name: /save a copy/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/that did not save/i);
    expect(push).not.toHaveBeenCalled();
  });

  it('opens the ORIGINAL pattern in the editor, not a copy', () => {
    render(<PatternActions id={ID} />);
    expect(screen.getByRole('link', { name: /open in the editor/i })).toHaveAttribute(
      'href',
      `/studio/${ID}`
    );
  });
});
