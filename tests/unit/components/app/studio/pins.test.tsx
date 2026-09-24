// @vitest-environment happy-dom

/**
 * The ★ — practice shelves in the Studio (task 4.6, D17).
 *
 * The real frame, provider and `usePins` over a stubbed `apiClient`. What is
 * pinned is what the server says after each change: the tests answer the
 * read-back `GET /api/v1/pins` and check the star follows it, rather than
 * trusting the click.
 *
 * Covered: the shelves arrive with the page (a ★ is right with no request);
 * a library row pins its entry; the stage's ★ pins the saved pattern, or the
 * library entry the stage was opened from, and is disabled on a scratch
 * pattern; unpinning; a failed pin says so.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/app/breaks/breaks.css', () => ({}));
vi.mock('@/components/app/shell/studio.css', () => ({}));
vi.mock('@/components/layouts/header-actions', () => ({ HeaderActions: () => null }));
vi.mock('@/lib/consent', () => ({ useConsent: () => ({ openPreferences: vi.fn() }) }));
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import type { InitialPattern } from '@/components/app/breaks/use-break-console';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { APIClientError, apiClient } from '@/lib/api/client';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import type { PracticeShelvesView } from '@/lib/validations/pins';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

const catalogue = testCatalogue();
const ENTRY = catalogue.libraries[0].entries[0];
const BREAK_ID = 'cbrk00000000000000000001';

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
    id: BREAK_ID,
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
  };
}

const NONE: PracticeShelvesView = { practising: [], later: [] };

function shelves(
  pins: Array<{ shelf: 'practising' | 'later'; kind: 'break' | 'entry'; id: string }>
): PracticeShelvesView {
  const out: PracticeShelvesView = { practising: [], later: [] };
  pins.forEach((p, i) => {
    const target =
      p.kind === 'break'
        ? { kind: 'break' as const, id: p.id, title: 'Cold Carpet', mine: true }
        : { kind: 'entry' as const, id: p.id, title: ENTRY.title, libraryKey: 'famous' };
    out[p.shelf].push({
      id: `cpin${String(i).padStart(20, '0')}`,
      shelf: p.shelf,
      position: 0,
      target,
    });
  });
  return out;
}

function ToastProbe() {
  return <div data-testid="toast">{useStudio().toast}</div>;
}

async function open({ initial, pins }: { initial?: InitialPattern; pins?: PracticeShelvesView }) {
  render(
    <StudioProvider catalogue={catalogue} initial={initial} pins={pins}>
      <StudioFrame />
      <ToastProbe />
    </StudioProvider>
  );
  await waitFor(() => expect(document.querySelector('.studio-title')?.textContent).not.toBe('…'));
}

const stageStar = () => document.querySelector('.title-row .pin') as HTMLButtonElement;

async function openPatterns(user: ReturnType<typeof userEvent.setup>, tab: string) {
  const rail = within(screen.getByRole('navigation', { name: 'Tools' }));
  await user.click(rail.getByRole('button', { name: 'Patterns' }));
  await user.click(screen.getByRole('tab', { name: new RegExp(`^${tab}`) }));
}
const openLibrary = (user: ReturnType<typeof userEvent.setup>) => openPatterns(user, 'Libraries');

async function pick(user: ReturnType<typeof userEvent.setup>, star: HTMLElement, shelf: string) {
  await user.click(star);
  await user.click(await screen.findByRole('menuitemradio', { name: shelf }));
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/studio');
  vi.mocked(apiClient.get).mockReset().mockResolvedValue(NONE);
  vi.mocked(apiClient.post).mockReset().mockResolvedValue({});
  vi.mocked(apiClient.delete).mockReset().mockResolvedValue({});
  vi.mocked(apiClient.patch).mockReset().mockResolvedValue({});
});

describe('the shelves arrive with the page', () => {
  it('shows a pinned library entry as pinned, without asking the server', async () => {
    const user = userEvent.setup();
    await open({ pins: shelves([{ shelf: 'later', kind: 'entry', id: ENTRY.id }]) });
    await openLibrary(user);

    expect(screen.getByRole('button', { name: `${ENTRY.title} — on Later` }).textContent).toBe('★');
    expect(apiClient.get).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the point is no request
  });
});

describe('a library row', () => {
  it('pins its entry to the shelf chosen, and shows what the server read back', async () => {
    const user = userEvent.setup();
    await open({});
    await openLibrary(user);
    vi.mocked(apiClient.get).mockResolvedValue(
      shelves([{ shelf: 'practising', kind: 'entry', id: ENTRY.id }])
    );

    await pick(user, screen.getByRole('button', { name: `Pin ${ENTRY.title}` }), 'Practising');

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/pins', {
      body: { shelf: 'practising', libraryEntryId: ENTRY.id },
    });
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/pins');
    expect(
      await screen.findByRole('button', { name: `${ENTRY.title} — on Practising` })
    ).toBeTruthy();
    expect(screen.getByTestId('toast').textContent).toBe('Pinned to Practising');
  });

  it('unpins with a DELETE of that pin', async () => {
    const user = userEvent.setup();
    const pins = shelves([{ shelf: 'later', kind: 'entry', id: ENTRY.id }]);
    await open({ pins });
    await openLibrary(user);

    await pick(
      user,
      screen.getByRole('button', { name: `${ENTRY.title} — on Later` }),
      'Not pinned'
    );

    expect(apiClient.delete).toHaveBeenCalledWith(`/api/v1/pins/${pins.later[0].id}`);
    expect(await screen.findByRole('button', { name: `Pin ${ENTRY.title}` })).toBeTruthy();
  });

  it('says when a pin did not take, and shows what the server has', async () => {
    const user = userEvent.setup();
    await open({});
    await openLibrary(user);
    vi.mocked(apiClient.post).mockRejectedValue(new APIClientError('nope', 'NOT_FOUND', 404));

    await pick(user, screen.getByRole('button', { name: `Pin ${ENTRY.title}` }), 'Later');

    await waitFor(() =>
      expect(screen.getByTestId('toast').textContent).toBe('Could not pin that — try again')
    );
    expect(screen.getByRole('button', { name: `Pin ${ENTRY.title}` }).textContent).toBe('☆');
  });
});

describe('when the server does not answer', () => {
  it('says an unpin did not take, and leaves the ★ as it was', async () => {
    const user = userEvent.setup();
    const pins = shelves([{ shelf: 'later', kind: 'entry', id: ENTRY.id }]);
    await open({ pins });
    await openLibrary(user);
    vi.mocked(apiClient.delete).mockRejectedValue(new Error('offline'));
    vi.mocked(apiClient.get).mockResolvedValue(pins);

    await pick(
      user,
      screen.getByRole('button', { name: `${ENTRY.title} — on Later` }),
      'Not pinned'
    );

    await waitFor(() =>
      expect(screen.getByTestId('toast').textContent).toBe('Could not unpin that — try again')
    );
    expect(screen.getByRole('button', { name: `${ENTRY.title} — on Later` })).toBeTruthy();
  });

  it('keeps the shelves it has when the read-back fails, rather than emptying them', async () => {
    const user = userEvent.setup();
    await open({ pins: shelves([{ shelf: 'later', kind: 'entry', id: ENTRY.id }]) });
    await openLibrary(user);
    vi.mocked(apiClient.get).mockRejectedValue('network down');

    await pick(
      user,
      screen.getByRole('button', { name: `${ENTRY.title} — on Later` }),
      'Practising'
    );

    // the POST went; what the server now has is unknown, so nothing is invented
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/pins', {
      body: { shelf: 'practising', libraryEntryId: ENTRY.id },
    });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: `${ENTRY.title} — on Later` })).toBeTruthy();
  });

  it('refuses a read-back that is not the shape it expects', async () => {
    const user = userEvent.setup();
    await open({ pins: shelves([{ shelf: 'later', kind: 'entry', id: ENTRY.id }]) });
    await openLibrary(user);
    vi.mocked(apiClient.get).mockResolvedValue({ practising: 'nope' });

    await pick(
      user,
      screen.getByRole('button', { name: `${ENTRY.title} — on Later` }),
      'Practising'
    );

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: `${ENTRY.title} — on Later` })).toBeTruthy();
  });
});

describe('the stage', () => {
  it('cannot pin a scratch pattern, and says to save it', async () => {
    await open({});
    expect(stageStar().disabled).toBe(true);
    expect(stageStar().getAttribute('aria-label')).toBe('Save this pattern to pin it');
  });

  it('pins the saved pattern on it', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/studio/${BREAK_ID}`);
    await open({ initial: saved() });
    vi.mocked(apiClient.get).mockResolvedValue(
      shelves([{ shelf: 'later', kind: 'break', id: BREAK_ID }])
    );

    await pick(user, stageStar(), 'Later');

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/pins', {
      body: { shelf: 'later', breakId: BREAK_ID },
    });
    await waitFor(() =>
      expect(stageStar().getAttribute('aria-label')).toBe('Cold Carpet — on Later')
    );
  });

  it('pins the library entry it was opened from — the same pin as that row', async () => {
    const user = userEvent.setup();
    await open({});
    await openLibrary(user);
    await user.click(screen.getByRole('button', { name: new RegExp(`^${ENTRY.title}`) }));
    await waitFor(() => expect(stageStar().disabled).toBe(false));

    await pick(user, stageStar(), 'Practising');

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/pins', {
      body: { shelf: 'practising', libraryEntryId: ENTRY.id },
    });
  });

  it('forgets the entry when a new pattern is rolled over it', async () => {
    const user = userEvent.setup();
    await open({});
    await openLibrary(user);
    await user.click(screen.getByRole('button', { name: new RegExp(`^${ENTRY.title}`) }));
    await waitFor(() => expect(stageStar().disabled).toBe(false));

    await user.keyboard('n');

    await waitFor(() => expect(stageStar().disabled).toBe(true));
  });
});
