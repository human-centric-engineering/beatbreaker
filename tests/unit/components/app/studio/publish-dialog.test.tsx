// @vitest-environment happy-dom

/**
 * PublishDialog (Phase 6, task 6.9) — who it will appear as, the "I wrote
 * this" tick, and choosing a username first when there is none yet.
 *
 * The provider is real; the API is mocked at `apiClient`, keeping the real
 * `APIClientError` the way `share-card.test.tsx` does.
 *
 * @see components/app/studio/publish-dialog.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/app/breaks/breaks.css', () => ({}));
vi.mock('@/components/app/studio/use-practice-history', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/components/app/studio/use-practice-history')>();
  return {
    ...actual,
    usePracticeHistory: () => ({
      items: [],
      currentId: null,
      previous: null,
      following: null,
      step: () => {},
      open: () => {},
      clear: () => Promise.resolve(true),
    }),
  };
});
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { get: vi.fn(), put: vi.fn(), post: vi.fn(), patch: vi.fn() } };
});

import type { InitialPattern } from '@/components/app/breaks/use-break-console';
import { PublishDialog } from '@/components/app/studio/publish-dialog';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { APIClientError, apiClient } from '@/lib/api/client';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

const ID = 'cbrk00000000000000000001';

function saved(): InitialPattern {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 8,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  return {
    id: ID,
    title: 'Cold Carpet',
    payload: breakPayload({
      bpm: 90,
      swing: 0,
      level: 5,
      arrangement: ['A', 'B'],
      A,
      B: deriveB(A, funk.params),
    }),
    mine: true,
    sharing: { visibility: 'private', slug: null, basedOn: null },
  };
}

async function mount(initial: InitialPattern = saved()) {
  render(
    <StudioProvider catalogue={testCatalogue()} initial={initial}>
      <PublishDialog open onOpenChange={() => {}} />
    </StudioProvider>
  );
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/v1/drummer-profile'));
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.put).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

describe('with a username already chosen', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({ username: 'ghostnotes' });
  });

  it('shows who it will publish as, and no username field', async () => {
    await mount();
    expect(await screen.findByText(/by @ghostnotes/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
  });

  it('keeps Publish disabled until the tick is checked', async () => {
    const user = userEvent.setup();
    await mount();
    await screen.findByText(/by @ghostnotes/);

    const publish = screen.getByRole('button', { name: 'Publish' });
    expect(publish).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    expect(publish).toBeEnabled();
  });

  it('publishes by POSTing confirm: true, and closes the dialog on success', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    vi.mocked(apiClient.post).mockResolvedValue({ visibility: 'published', slug: 'freshslug1' });
    render(
      <StudioProvider catalogue={testCatalogue()} initial={saved()}>
        <PublishDialog open onOpenChange={onOpenChange} />
      </StudioProvider>
    );
    await screen.findByText(/by @ghostnotes/);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/breaks/${ID}/publish`, {
        body: { confirm: true },
      })
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('keeps the dialog open, showing the server’s refusal, when publishing fails', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    vi.mocked(apiClient.post).mockRejectedValue(
      new APIClientError('Those notes are a duplicate.', 'DUPLICATE', 409)
    );
    render(
      <StudioProvider catalogue={testCatalogue()} initial={saved()}>
        <PublishDialog open onOpenChange={onOpenChange} />
      </StudioProvider>
    );
    await screen.findByText(/by @ghostnotes/);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Those notes are a duplicate.');
    expect(onOpenChange).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a refusal must not close the dialog
  });
});

describe('with no username yet', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue(null);
  });

  it('asks for a username to choose, instead of who it will publish as', async () => {
    await mount();
    expect(await screen.findByText('Choose a username.')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.queryByText(/by @/)).not.toBeInTheDocument();
  });

  it('refuses a bad shape client-side, without any request', async () => {
    const user = userEvent.setup();
    await mount();
    await screen.findByText('Choose a username.');

    await user.type(screen.getByLabelText('Username'), 'ab');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/letters, numbers/);
    expect(apiClient.put).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the shape check short-circuits
    expect(apiClient.post).not.toHaveBeenCalled(); // test-review:accept no_arg_called — never reaches publish
  });

  it('PUTs the chosen username, then publishes', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue({ username: 'ginger_baker', bio: null });
    vi.mocked(apiClient.post).mockResolvedValue({ visibility: 'published', slug: 'freshslug1' });
    await mount();
    await screen.findByText('Choose a username.');

    await user.type(screen.getByLabelText('Username'), 'Ginger_Baker');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/drummer-profile', {
        body: { username: 'Ginger_Baker' },
      })
    );
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/breaks/${ID}/publish`, {
        body: { confirm: true },
      })
    );
  });

  it('shows the server’s words and never calls publish when the name did not save', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockRejectedValue(
      new APIClientError("That one's taken. Try another.", 'CONFLICT', 409)
    );
    await mount();
    await screen.findByText('Choose a username.');

    await user.type(screen.getByLabelText('Username'), 'taken_name');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("That one's taken. Try another.");
    expect(apiClient.post).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the username never saved
  });
});

describe('when the username cannot be read', () => {
  it('says so and offers a retry — never "choose a username", which would rename yours', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ username: 'ghostnotes', bio: '', nextChangeAt: null });
    await mount();

    expect(await screen.findByText(/Couldn.t check your username/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('by @ghostnotes')).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no username was chosen or changed
  });
});
