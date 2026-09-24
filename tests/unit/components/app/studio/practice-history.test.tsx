// @vitest-environment happy-dom

/**
 * The practice history in the Studio (task 4.7, D18): recording what is
 * opened, Back and Forward through it, and Recent in the drawer.
 *
 * The real frame, provider, console and `usePracticeHistory` over a stubbed
 * `apiClient`. The stub answers `POST /api/v1/history` the way the server
 * does — the visit, moved to the top — so the list the Studio holds after each
 * step is the one it built from real answers, not one the test handed it.
 *
 * What each step is checked for is where it lands: the pattern's title, the
 * layer and the tempo. That is the point of the feature — going back to the
 * break you were drilling at L2 and 72 BPM puts you at L2 and 72 BPM.
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
import { RECORD_MS } from '@/components/app/studio/use-practice-history';
import { APIClientError, apiClient } from '@/lib/api/client';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import type { HistoryItem } from '@/lib/validations/history';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

const catalogue = testCatalogue();
const [ENTRY_A, ENTRY_B] = catalogue.libraries[0].entries;
const MINE = 'cbrk00000000000000000001';
const THEIRS = 'cbrk00000000000000000002';

function pattern(id: string, title: string, mine: boolean, seed: number): InitialPattern {
  const funk = testStyle('funk');
  const A = generatePattern({ style: funk, meter: '4/4', seed, bars: 2, density: 50, ghosts: 50 });
  return {
    id,
    title,
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

const COLD_CARPET = pattern(MINE, 'Cold Carpet', true, 8);
const THEIR_GROOVE = pattern(THEIRS, 'Their Groove', false, 21);

/** A visit as the server shows it. */
function visit(target: HistoryItem['target'], level: number, bpm: number): HistoryItem {
  return { id: `cvis-${target.id}`, level, bpm, target };
}
const mineTarget = { kind: 'break' as const, id: MINE, title: 'Cold Carpet', mine: true };
const theirTarget = { kind: 'break' as const, id: THEIRS, title: 'Their Groove', mine: false };
const entryTarget = (e: typeof ENTRY_A) => ({
  kind: 'entry' as const,
  id: e.id,
  title: e.title,
  artist: e.artist,
});

/** POST /api/v1/history bodies, in order. */
const recorded = () =>
  vi
    .mocked(apiClient.post)
    .mock.calls.filter(([url]) => url === '/api/v1/history')
    .map(([, options]) => options?.body as Record<string, unknown>);

function Probe() {
  const c = useStudio();
  return (
    <div data-testid="probe" data-level={c.level} data-bpm={c.bpm}>
      {c.toast}
    </div>
  );
}

async function open({ initial, history }: { initial?: InitialPattern; history?: HistoryItem[] }) {
  render(
    <StudioProvider catalogue={catalogue} initial={initial} history={history}>
      <StudioFrame />
      <Probe />
    </StudioProvider>
  );
  await waitFor(() => expect(document.querySelector('.studio-title')?.textContent).not.toBe('…'));
}

const title = () => document.querySelector('.studio-title')?.textContent;
const place = () => {
  const el = screen.getByTestId('probe');
  return { level: Number(el.dataset.level), bpm: Number(el.dataset.bpm) };
};
const back = () => screen.getByRole('button', { name: /^Back/ });

async function openPatterns(user: ReturnType<typeof userEvent.setup>, tab: string) {
  const rail = within(screen.getByRole('navigation', { name: 'Tools' }));
  await user.click(rail.getByRole('button', { name: 'Patterns' }));
  await user.click(screen.getByRole('tab', { name: new RegExp(`^${tab}`) }));
}
const openLibrary = (user: ReturnType<typeof userEvent.setup>) => openPatterns(user, 'Libraries');

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/studio');
  vi.mocked(apiClient.patch).mockReset().mockResolvedValue({});
  vi.mocked(apiClient.delete).mockReset().mockResolvedValue({ cleared: 0 });
  vi.mocked(apiClient.get).mockReset();
  /* The server's answer to a record: the visit, for whichever target it named. */
  const targets: Record<string, HistoryItem['target']> = {
    [MINE]: mineTarget,
    [THEIRS]: theirTarget,
    [ENTRY_A.id]: entryTarget(ENTRY_A),
    [ENTRY_B.id]: entryTarget(ENTRY_B),
  };
  vi.mocked(apiClient.post)
    .mockReset()
    .mockImplementation(((url: string, options?: { body?: Record<string, unknown> }) => {
      if (url !== '/api/v1/history') return Promise.resolve({ id: 'cbrk00000000000000000009' });
      const body = options?.body ?? {};
      const id = String(body.breakId ?? body.libraryEntryId);
      return Promise.resolve(visit(targets[id], Number(body.level), Number(body.bpm)));
    }) as never);
});

describe('recording', () => {
  it('records a famous break when it is opened, at the layer and tempo it lands on', async () => {
    const user = userEvent.setup();
    await open({});
    await openLibrary(user);

    await user.click(screen.getByRole('button', { name: new RegExp(`^${ENTRY_A.title}`) }));

    await waitFor(() => expect(recorded()).toHaveLength(1));
    expect(recorded()[0]).toEqual({ libraryEntryId: ENTRY_A.id, ...place() });
  });

  it('records the saved pattern the page opens on, as its document says', async () => {
    await open({ initial: COLD_CARPET });
    await waitFor(() => expect(recorded()).toHaveLength(1));
    expect(recorded()[0]).toEqual({ breakId: MINE, level: 5, bpm: 90 });
  });

  it('does not record a scratch pattern at all', async () => {
    await open({});
    // long enough for any arrival or settle to have been sent
    await new Promise((r) => setTimeout(r, RECORD_MS + 200));
    expect(recorded()).toEqual([]);
  });

  it(
    'records a new layer once it settles — once, not per key',
    async () => {
      const user = userEvent.setup();
      await open({ initial: COLD_CARPET });
      await waitFor(() => expect(recorded()).toHaveLength(1));

      await user.keyboard('3');
      await user.keyboard('2');

      await waitFor(() => expect(recorded()).toHaveLength(2), { timeout: RECORD_MS + 1500 });
      expect(recorded()[1]).toMatchObject({ breakId: MINE, level: 2 });
      await new Promise((r) => setTimeout(r, 300));
      expect(recorded()).toHaveLength(2);
    },
    RECORD_MS * 3
  );
});

describe('Back and Forward', () => {
  it('is disabled with nothing opened before this', async () => {
    await open({ initial: COLD_CARPET, history: [visit(mineTarget, 5, 90)] });
    expect(back()).toHaveProperty('disabled', true);
  });

  it('goes back to the famous break before, on its layer and at its tempo', async () => {
    const user = userEvent.setup();
    await open({
      initial: COLD_CARPET,
      history: [visit(mineTarget, 5, 90), visit(entryTarget(ENTRY_A), 2, 72)],
    });
    expect(back().getAttribute('aria-label')).toBe(`Back to ${ENTRY_A.title}`);

    await user.click(back());

    await waitFor(() => expect(title()).toBe(ENTRY_A.title));
    expect(place()).toEqual({ level: 2, bpm: 72 });
    // the saved pattern was let go: the address is the Studio's, not its
    expect(window.location.pathname).toBe('/studio');
  });

  it('opens someone else’s pattern in place, where it was left, at its own address', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      id: THEIRS,
      title: 'Their Groove',
      mine: false,
      doc: THEIR_GROOVE.payload,
    });
    await open({
      initial: COLD_CARPET,
      history: [visit(mineTarget, 5, 90), visit(theirTarget, 3, 80)],
    });

    await user.click(back());

    await waitFor(() => expect(title()).toBe('Their Groove'));
    expect(apiClient.get).toHaveBeenCalledWith(`/api/v1/breaks/${THEIRS}`);
    expect(place()).toEqual({ level: 3, bpm: 80 });
    expect(window.location.pathname).toBe(`/studio/${THEIRS}`);
    // someone else's: offered as a copy, never autosaved over
    expect(document.querySelector('.studio-save-state')?.textContent).toBe(
      'Someone else’s pattern'
    );
  });

  it('opens your own pattern as its document says — it autosaved where you left it', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      id: MINE,
      title: 'Cold Carpet',
      mine: true,
      doc: COLD_CARPET.payload,
    });
    await open({ history: [visit(mineTarget, 2, 60)] });

    await user.click(back());

    await waitFor(() => expect(title()).toBe('Cold Carpet'));
    expect(place()).toEqual({ level: 5, bpm: 90 });
    await waitFor(() =>
      expect(document.querySelector('.studio-save-state')?.textContent).toBe('Saved')
    );
    expect(window.location.pathname).toBe(`/studio/${MINE}`);
  });

  it('steps like a browser: Back twice, then Forward once, lands on the one in between', async () => {
    const user = userEvent.setup();
    await open({
      initial: COLD_CARPET,
      history: [
        visit(mineTarget, 5, 90),
        visit(entryTarget(ENTRY_A), 2, 72),
        visit(entryTarget(ENTRY_B), 4, 88),
      ],
    });

    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    await waitFor(() => expect(title()).toBe(ENTRY_A.title));
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    await waitFor(() => expect(title()).toBe(ENTRY_B.title));
    expect(place()).toEqual({ level: 4, bpm: 88 });

    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');

    await waitFor(() => expect(title()).toBe(ENTRY_A.title));
    expect(place()).toEqual({ level: 2, bpm: 72 });
    // every step was recorded, so Recent is in the order they were visited
    await waitFor(() =>
      expect(recorded().map((b) => b.libraryEntryId ?? b.breakId)).toEqual([
        MINE,
        ENTRY_A.id,
        ENTRY_B.id,
        ENTRY_A.id,
      ])
    );
  });

  it('takes a pattern that has gone out of the history, and says so', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockRejectedValue(new APIClientError('Not found', 'NOT_FOUND', 404));
    await open({
      initial: COLD_CARPET,
      history: [
        visit(mineTarget, 5, 90),
        visit(theirTarget, 3, 80),
        visit(entryTarget(ENTRY_A), 2, 72),
      ],
    });

    await user.click(back());

    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/no longer there/));
    expect(title()).toBe('Cold Carpet');
    // Back now goes past it
    expect(back().getAttribute('aria-label')).toBe(`Back to ${ENTRY_A.title}`);
  });
});

describe('Recent', () => {
  it('lists the history, marks what is on the stage, and opens a row where it was left', async () => {
    const user = userEvent.setup();
    await open({
      initial: COLD_CARPET,
      history: [visit(mineTarget, 5, 90), visit(entryTarget(ENTRY_A), 2, 72)],
    });
    await openPatterns(user, 'Recent');

    const recent = within(screen.getByRole('tabpanel'));
    // each row is the open button and its ★ — the ★ is not a row
    const rows = recent
      .getAllByRole('button')
      .filter((b) => b.classList.contains('item') && !b.classList.contains('pin'));
    expect(rows.map((r) => r.textContent)).toEqual([
      'Cold CarpetYour patternL5 · 90',
      `${ENTRY_A.title}${ENTRY_A.artist}L2 · 72`,
    ]);
    expect(rows[0].getAttribute('aria-current')).toBe('true');

    await user.click(rows[1]);

    await waitFor(() => expect(title()).toBe(ENTRY_A.title));
    expect(place()).toEqual({ level: 2, bpm: 72 });
  });

  it('clears', async () => {
    const user = userEvent.setup();
    await open({ initial: COLD_CARPET, history: [visit(mineTarget, 5, 90)] });
    await openPatterns(user, 'Recent');

    await user.click(screen.getByRole('button', { name: 'Clear history' }));

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/history');
    await waitFor(() => expect(screen.getByText(/What you open shows up here/)).toBeTruthy());
  });
});
