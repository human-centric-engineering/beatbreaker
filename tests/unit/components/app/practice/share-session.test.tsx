// @vitest-environment happy-dom

/**
 * _Share_ in the session editor (Phase 7D, D32).
 *
 * The real component and the real `session-api` over a mocked `apiClient`.
 * `Harness` mirrors how `SessionEditor` actually wires it — a parent that
 * holds the session and folds `onChange`'s state back in — so a share or
 * unshare is proven by what re-renders inside the still-open dialog, not
 * just by what `onChange` was called with.
 *
 * @see components/app/practice/share-session.tsx
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { post: vi.fn(), delete: vi.fn() } };
});

import { ShareSession } from '@/components/app/practice/share-session';
import { APIClientError, apiClient } from '@/lib/api/client';
import type { ShareState, SessionView } from '@/lib/validations/practice-sessions';
import { item, SESSION_ID, sessionView } from '@/tests/unit/components/app/practice/fixtures';

function Harness({ initial, dirty = false }: { initial: SessionView; dirty?: boolean }) {
  const [session, setSession] = useState(initial);
  return (
    <ShareSession
      session={session}
      dirty={dirty}
      onChange={(state: ShareState) => setSession((s) => ({ ...s, ...state }))}
    />
  );
}

const clipboardWrite = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.delete).mockReset();
  clipboardWrite.mockClear().mockResolvedValue(undefined);
});

describe('ShareSession — not yet shared', () => {
  it('shares: posts to the share endpoint and the dialog shows the new link in place', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({ visibility: 'link', slug: 'shared001' });
    render(<Harness initial={sessionView({ visibility: 'private', slug: null })} />);

    await user.click(screen.getByRole('button', { name: 'Share' }));
    await user.click(await screen.findByRole('button', { name: 'Share with a link' }));

    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/practice-sessions/${SESSION_ID}/share`, {
      body: {},
    });
    const link = await screen.findByRole('link', { name: '/s/shared001' });
    expect(link).toHaveAttribute('href', '/s/shared001');
    expect(screen.getByRole('button', { name: 'Stop sharing' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share with a link' })).not.toBeInTheDocument();
  });

  it('disables sharing while there are unsaved edits, and never calls the endpoint', async () => {
    const user = userEvent.setup();
    render(<Harness initial={sessionView({ visibility: 'private', slug: null })} dirty />);

    await user.click(screen.getByRole('button', { name: 'Share' }));

    const shareButton = await screen.findByRole('button', { name: 'Share with a link' });
    expect(shareButton).toBeDisabled();
    expect(screen.getByText(/Save your changes first/)).toBeInTheDocument();
    await user.click(shareButton).catch(() => undefined);
    expect(apiClient.post).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the button is disabled
  });

  it('on a 409, lists the blocked patterns — your own private one links to the Studio', async () => {
    const user = userEvent.setup();
    const session = sessionView({
      visibility: 'private',
      slug: null,
      items: [
        item(1, {
          position: 0,
          target: {
            kind: 'break',
            id: 'cbrk00000000000000000099',
            title: 'Mine',
            meter: '4/4',
            bpm: 90,
            mine: true,
            slug: null,
          },
        }),
        item(2, { position: 1, target: null, title: 'Gone pattern' }),
      ],
    });
    vi.mocked(apiClient.post).mockRejectedValue(
      new APIClientError('Share these first', 'ITEMS_NOT_SHARED', 409, {
        items: [
          { position: 0, title: 'Mine', reason: 'private' },
          { position: 1, title: 'Gone pattern', reason: 'gone' },
        ],
      })
    );
    render(<Harness initial={session} />);

    await user.click(screen.getByRole('button', { name: 'Share' }));
    await user.click(await screen.findByRole('button', { name: 'Share with a link' }));

    const studioLink = await screen.findByRole('link', { name: 'Share it from the Studio' });
    expect(studioLink).toHaveAttribute('href', '/studio/cbrk00000000000000000099');
    expect(screen.getByText(/no longer shared by its owner/)).toBeInTheDocument();
    // not a plain error banner — the blocked list replaces it
    expect(screen.queryByText('Share these first')).not.toBeInTheDocument();
  });

  it('shows the server’s own message for a non-blocking failure', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockRejectedValue(
      new APIClientError('Session not found', 'NOT_FOUND', 404)
    );
    render(<Harness initial={sessionView({ visibility: 'private', slug: null })} />);

    await user.click(screen.getByRole('button', { name: 'Share' }));
    await user.click(await screen.findByRole('button', { name: 'Share with a link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Session not found');
  });

  it('falls back to a generic message on a network error', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockRejectedValue(
      new APIClientError('fetch failed', 'NETWORK_ERROR')
    );
    render(<Harness initial={sessionView({ visibility: 'private', slug: null })} />);

    await user.click(screen.getByRole('button', { name: 'Share' }));
    await user.click(await screen.findByRole('button', { name: 'Share with a link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That did not work. Try again.');
  });
});

describe('ShareSession — already shared', () => {
  it('copies the absolute URL, not the bare path', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: clipboardWrite } });
    render(<Harness initial={sessionView({ visibility: 'link', slug: 'shared001' })} />);

    await user.click(screen.getByRole('button', { name: 'Shared' }));
    await user.click(await screen.findByRole('button', { name: 'Copy link' }));

    expect(clipboardWrite).toHaveBeenCalledWith(`${window.location.origin}/s/shared001`);
    expect(await screen.findByRole('status')).toHaveTextContent('Link copied.');
  });

  it('stops sharing: deletes the share and the dialog falls back to the offer', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.delete).mockResolvedValue({ visibility: 'private', slug: null });
    render(<Harness initial={sessionView({ visibility: 'link', slug: 'shared001' })} />);

    await user.click(screen.getByRole('button', { name: 'Shared' }));
    await user.click(await screen.findByRole('button', { name: 'Stop sharing' }));

    expect(apiClient.delete).toHaveBeenCalledWith(`/api/v1/practice-sessions/${SESSION_ID}/share`);
    expect(await screen.findByRole('button', { name: 'Share with a link' })).toBeInTheDocument();
  });
});
