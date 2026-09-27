// @vitest-environment happy-dom

/**
 * ShareCard (Phase 6, task 6.4): _Share with a link_, the link itself, and
 * _Stop sharing_ — the only thing on the stage that can change who may open a
 * saved pattern.
 *
 * The provider is real; the API is mocked at `apiClient`, keeping the real
 * `APIClientError` the way `details-form.test.tsx` does.
 *
 * @see components/app/studio/share-card.tsx
 */

import { render, screen } from '@testing-library/react';
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
  return { ...actual, apiClient: { patch: vi.fn(), post: vi.fn(), get: vi.fn() } };
});

import type { InitialPattern, PatternSharing } from '@/components/app/breaks/use-break-console';
import { ShareCard } from '@/components/app/studio/share-card';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { apiClient } from '@/lib/api/client';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

const ID = 'cbrk00000000000000000001';

function saved(mine: boolean, sharing?: PatternSharing): InitialPattern {
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
    mine,
    sharing,
  };
}

function ToastProbe() {
  return <div role="status">{useStudio().notice?.message}</div>;
}

async function mount(initial?: InitialPattern) {
  render(
    <StudioProvider catalogue={testCatalogue()} initial={initial}>
      <ShareCard />
      <ToastProbe />
    </StudioProvider>
  );
  await screen.findByRole('heading', { name: 'Share with a link' });
}

const clipboardWrite = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  localStorage.clear();
  vi.mocked(apiClient.patch).mockReset();
  vi.mocked(apiClient.post).mockReset();
  clipboardWrite.mockClear().mockResolvedValue(undefined);
});

describe('ShareCard — scratch pattern', () => {
  it('asks for a save first — there is no row a link could name', async () => {
    await mount();
    expect(screen.getByText('Save the pattern to share it with a link.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share with a link' })).not.toBeInTheDocument();
  });
});

describe('ShareCard — a saved pattern of yours', () => {
  it('starts private, with nothing to show but the offer to share', async () => {
    await mount(saved(true));
    expect(screen.getByText('Only you can open it.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share with a link' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shares with a link: PATCHes visibility, then shows the address and Stop sharing', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      visibility: 'link',
      slug: 'freshslug1',
    });
    await mount(saved(true));

    await user.click(screen.getByRole('button', { name: 'Share with a link' }));

    expect(apiClient.patch).toHaveBeenCalledWith(`/api/v1/breaks/${ID}`, {
      body: { visibility: 'link' },
    });
    const link = await screen.findByRole('link', { name: '/p/freshslug1' });
    expect(link).toHaveAttribute('href', '/p/freshslug1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop sharing' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share with a link' })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Anyone with this link can read and play the pattern. It won't appear in the community library."
      )
    ).toBeInTheDocument();
  });

  it('copies the absolute URL, not the bare path', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: clipboardWrite } });
    await mount(saved(true, { visibility: 'link', slug: 'kept000001', basedOn: null }));

    await user.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(clipboardWrite).toHaveBeenCalledWith(`${window.location.origin}/p/kept000001`);
    expect(await screen.findByRole('status')).toHaveTextContent('Link copied');
  });

  it('stops sharing: PATCHes private and the card goes back to the private state', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      visibility: 'private',
      slug: 'kept000001',
    });
    await mount(saved(true, { visibility: 'link', slug: 'kept000001', basedOn: null }));

    await user.click(screen.getByRole('button', { name: 'Stop sharing' }));

    expect(apiClient.patch).toHaveBeenCalledWith(`/api/v1/breaks/${ID}`, {
      body: { visibility: 'private' },
    });
    expect(await screen.findByText('Only you can open it.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share with a link' })).toBeInTheDocument();
    // the address is not shown once private, even though the row keeps the slug
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('reads a published pattern as published, with no way to unshare it here', async () => {
    await mount(saved(true, { visibility: 'published', slug: 'pub0000001', basedOn: null }));
    expect(
      screen.getByText('Published in the community library, under your username.')
    ).toBeInTheDocument();
    // publishing/unpublishing is not this card's job — "Stop sharing" would
    // PATCH visibility: 'private', which is not what unpublishing means
    expect(screen.getByRole('button', { name: 'Stop sharing' })).toBeInTheDocument();
  });

  it('offers Publish… on a private pattern, and opens the publish dialog', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({ username: 'ghostnotes' });
    await mount(saved(true));

    await user.click(screen.getByRole('button', { name: 'Publish…' }));

    expect(
      await screen.findByRole('heading', { name: /Publish “Cold Carpet” to the community library/ })
    ).toBeInTheDocument();
  });

  it('offers Publish… on a link-shared pattern too', async () => {
    await mount(saved(true, { visibility: 'link', slug: 'kept000001', basedOn: null }));
    expect(screen.getByRole('button', { name: 'Publish…' })).toBeInTheDocument();
  });

  it('unpublishes: PATCHes visibility: link, and the toast says the link still works', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ visibility: 'link', slug: 'pub0000001' });
    await mount(saved(true, { visibility: 'published', slug: 'pub0000001', basedOn: null }));

    await user.click(screen.getByRole('button', { name: 'Unpublish' }));

    expect(apiClient.patch).toHaveBeenCalledWith(`/api/v1/breaks/${ID}`, {
      body: { visibility: 'link' },
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Unpublished — anyone with the link can still open it'
    );
    // no longer published — the card falls back to the plain link-share copy
    expect(
      screen.getByText(
        "Anyone with this link can read and play the pattern. It won't appear in the community library."
      )
    ).toBeInTheDocument();
  });

  it('shows no Publish… button and no Unpublish button for someone else’s pattern', async () => {
    await mount(saved(false, { visibility: 'published', slug: 'pub0000001', basedOn: null }));
    expect(screen.queryByRole('button', { name: 'Publish…' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
  });
});

describe('ShareCard — someone else’s pattern', () => {
  it('offers no share button at all', async () => {
    await mount(saved(false));
    expect(
      screen.getByText("Someone else's pattern. Save a copy to share one of your own.")
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share with a link' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stop sharing' })).not.toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing here can PATCH
  });

  it('still shows the link it was opened from, read-only', async () => {
    await mount(saved(false, { visibility: 'link', slug: 'sharedslug1', basedOn: null }));
    const link = screen.getByRole('link', { name: '/p/sharedslug1' });
    expect(link).toHaveAttribute('href', '/p/sharedslug1');
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stop sharing' })).not.toBeInTheDocument();
  });
});
