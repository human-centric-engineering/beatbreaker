// @vitest-environment happy-dom

/**
 * The Studio with a document in it — the provider, the frame, the header and
 * the unsaved-changes prompt together, as a person meets them.
 *
 * `use-pattern-document.test.ts` holds the timing rules. This holds the
 * wiring: which actions let a pattern go and which only edit it, what the
 * header says, what S does, and that the prompt's three answers each do what
 * they say. The API is mocked at `apiClient`; the console, the frame and the
 * dialog are real.
 *
 * @see components/app/studio/studio-provider.tsx
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/app/breaks/breaks.css', () => ({}));
vi.mock('@/components/app/shell/studio.css', () => ({}));
vi.mock('@/components/layouts/header-actions', () => ({ HeaderActions: () => null }));
vi.mock('@/lib/consent', () => ({ useConsent: () => ({ openPreferences: vi.fn() }) }));
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { patch: vi.fn(), post: vi.fn() } };
});

import type { InitialPattern } from '@/components/app/breaks/use-break-console';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { apiClient } from '@/lib/api/client';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

const ID = 'cbrk00000000000000000001';
const catalogue = testCatalogue();

function saved(mine: boolean): InitialPattern {
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
  };
}

async function open(initial?: InitialPattern) {
  render(
    <StudioProvider catalogue={catalogue} initial={initial}>
      <StudioFrame />
    </StudioProvider>
  );
  // the stage has a pattern once the header has a title
  await waitFor(() => expect(document.querySelector('.studio-title')?.textContent).not.toBe('…'));
}

const title = () => document.querySelector('.studio-title')?.textContent;
const saveState = () => document.querySelector('.studio-save-state')?.textContent;

beforeEach(() => {
  localStorage.clear();
  vi.mocked(apiClient.patch).mockReset().mockResolvedValue({});
  vi.mocked(apiClient.post).mockReset().mockResolvedValue({ id: 'cbrk00000000000000000002' });
  window.history.replaceState(null, '', '/studio');
});

describe('the header', () => {
  it('says a fresh pattern is not saved, and offers Save', async () => {
    await open();
    expect(saveState()).toBe('Not saved');
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('says a saved pattern of yours is saved, with no Save button — it autosaves', async () => {
    window.history.replaceState(null, '', `/studio/${ID}`);
    await open(saved(true));
    await waitFor(() => expect(saveState()).toBe('Saved'));
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('offers to save a copy of someone else’s pattern', async () => {
    await open(saved(false));
    expect(saveState()).toBe('Someone else’s pattern');
    expect(screen.getByRole('button', { name: 'Save a copy' })).toBeTruthy();
  });
});

describe('saving', () => {
  it('saves a scratch pattern on S, under its name, and moves to its address', async () => {
    const user = userEvent.setup();
    await open();
    await user.keyboard('s');
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(vi.mocked(apiClient.post).mock.calls[0][1]?.body).toMatchObject({ title: title() });
    await waitFor(() => expect(window.location.pathname).toBe('/studio/cbrk00000000000000000002'));
    await waitFor(() => expect(saveState()).toBe('Saved'));
  });

  it('takes Ctrl+S from the browser’s Save Page', async () => {
    const user = userEvent.setup();
    await open();
    await user.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
  });
});

describe('what lets a pattern go, and what only edits it', () => {
  it('N on a saved pattern starts a new scratch one at /studio, and leaves the saved one alone', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/studio/${ID}`);
    await open(saved(true));
    await waitFor(() => expect(saveState()).toBe('Saved'));

    await user.keyboard('n');

    await waitFor(() => expect(window.location.pathname).toBe('/studio'));
    expect(saveState()).toBe('Not saved');
    expect(title()).not.toBe('Cold Carpet');
    // it had no edits, so nothing was saved on the way out — and the roll never went to its row
    await act(async () => new Promise((r) => setTimeout(r, 50)));
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the roll must not overwrite the saved row
  });

  it('a tempo change is an edit to the saved pattern, not a new one', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/studio/${ID}`);
    await open(saved(true));
    await waitFor(() => expect(saveState()).toBe('Saved'));
    await user.keyboard(']');
    await waitFor(() => expect(saveState()).toBe('Unsaved'));
    expect(window.location.pathname).toBe(`/studio/${ID}`);
  });
});

describe('the unsaved-changes prompt', () => {
  /** Someone else's pattern, edited — the case letting go would lose. */
  async function editedCopy() {
    const user = userEvent.setup();
    await open(saved(false));
    await user.keyboard(']');
    await user.keyboard('n');
    await screen.findByRole('alertdialog');
    return user;
  }

  it('asks before N replaces an edited copy of someone else’s pattern, naming it', async () => {
    await editedCopy();
    expect(screen.getByRole('alertdialog').textContent).toContain(
      'Save your changes to “Cold Carpet”?'
    );
    // nothing has been replaced while it asks
    expect(title()).toBe('Cold Carpet');
  });

  it('Cancel keeps the pattern and the edits', async () => {
    const user = await editedCopy();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(title()).toBe('Cold Carpet');
    expect(apiClient.post).not.toHaveBeenCalled(); // test-review:accept no_arg_called — Cancel saves nothing
  });

  it('Don’t save replaces it and saves nothing', async () => {
    const user = await editedCopy();
    await user.click(screen.getByRole('button', { name: 'Don’t save' }));
    await waitFor(() => expect(title()).not.toBe('Cold Carpet'));
    expect(apiClient.post).not.toHaveBeenCalled(); // test-review:accept no_arg_called — Don't save saves nothing
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — and never PATCHes theirs
  });

  it('Save keeps a copy of your own with the edits, then replaces it', async () => {
    const user = await editedCopy();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(title()).not.toBe('Cold Carpet'));
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const body = vi.mocked(apiClient.post).mock.calls[0][1]?.body as {
      title: string;
      doc: { bpm: number };
    };
    expect(body.title).toBe('Cold Carpet');
    expect(body.doc.bpm).toBe(92); // 90, and the one edit
  });

  it('stays open when the save fails, so the edits are still here', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('boom'));
    const user = await editedCopy();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(title()).toBe('Cold Carpet');
  });
});
