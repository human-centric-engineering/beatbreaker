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

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { UNDO_MS } from '@/components/app/studio/use-notice';
import { RECORD_MS } from '@/components/app/studio/use-practice-history';
import { APIClientError, apiClient } from '@/lib/api/client';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { FULL_LAYER } from '@/lib/app/breaks/layers';
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
    <div
      data-testid="probe"
      data-level={c.level}
      data-bpm={c.bpm}
      data-notes={JSON.stringify(c.patterns.A?.bars ?? null)}
    >
      {c.notice?.message}
    </div>
  );
}

async function open({
  initial,
  history,
  openEntry,
}: {
  initial?: InitialPattern;
  history?: HistoryItem[];
  openEntry?: string;
}) {
  render(
    <StudioProvider catalogue={catalogue} initial={initial} history={history} openEntry={openEntry}>
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
      .filter(
        (b) =>
          b.classList.contains('item') &&
          !b.classList.contains('pin') &&
          !b.classList.contains('del')
      );
    expect(rows.map((r) => r.textContent)).toEqual([
      'Cold CarpetYour patternFull break · 90',
      `${ENTRY_A.title}${ENTRY_A.artist}Groove · 72`,
    ]);
    expect(rows[0].getAttribute('aria-current')).toBe('true');

    await user.click(rows[1]);

    await waitFor(() => expect(title()).toBe(ENTRY_A.title));
    expect(place()).toEqual({ level: 2, bpm: 72 });
  });
});

describe('the Back trail holds unsaved rolls (5.13, D24)', () => {
  // the header's Back: a drawer can have a button whose name starts with "Back" too
  const headerBack = () => document.querySelector<HTMLButtonElement>('.studio-back')!;
  const stage = () => {
    const el = screen.getByTestId('probe');
    return { title: title(), notes: el.dataset.notes, ...place() };
  };

  it('roll, N, N, Back, Back → the first roll, intact; Forward returns', async () => {
    const user = userEvent.setup();
    await open({});
    await user.keyboard('2');
    await waitFor(() => expect(place().level).toBe(2));
    const first = stage();

    await user.keyboard('n');
    await waitFor(() => expect(stage().notes).not.toBe(first.notes));
    const second = stage();
    await user.keyboard('n');
    await waitFor(() => expect(stage().notes).not.toBe(second.notes));

    expect(headerBack().getAttribute('aria-label')).toMatch(/^Back to Unsaved · \d\d:\d\d$/);
    await user.click(headerBack());
    await waitFor(() => expect(stage()).toEqual(second));
    await user.click(headerBack());
    await waitFor(() => expect(stage()).toEqual(first));
    expect(first.level).toBe(2);

    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    await waitFor(() => expect(stage()).toEqual(second));
    // all in the page: nothing about an unsaved roll goes to the server
    expect(recorded()).toEqual([]);
  });

  it('puts an unsaved roll on the trail when a famous break is opened, and Back returns to it', async () => {
    const user = userEvent.setup();
    await open({});
    const roll = stage();
    await openLibrary(user);

    await user.click(screen.getByRole('button', { name: new RegExp(`^${ENTRY_A.title}`) }));
    await waitFor(() => expect(title()).toBe(ENTRY_A.title));

    await user.click(headerBack());
    await waitFor(() => expect(stage()).toEqual(roll));
  });

  it('shows a trail entry in Recent as "Unsaved · hh:mm", and saving it makes it an ordinary item', async () => {
    const user = userEvent.setup();
    const SAVED = 'cbrk00000000000000000009';
    const post = vi.mocked(apiClient.post).getMockImplementation()!;
    vi.mocked(apiClient.post).mockImplementation(((
      url: string,
      options?: { body?: Record<string, unknown> }
    ) => {
      if (url === '/api/v1/history' && options?.body?.breakId === SAVED) {
        return Promise.resolve(
          visit({ kind: 'break', id: SAVED, title: String(title()), mine: true }, 5, 90)
        );
      }
      return post(url, options);
    }) as never);
    await open({});
    const first = stage();
    await user.keyboard('n');
    await waitFor(() => expect(stage().notes).not.toBe(first.notes));
    await user.click(headerBack());
    await waitFor(() => expect(stage()).toEqual(first));

    await openPatterns(user, 'Recent');
    const items = () =>
      within(screen.getByRole('tabpanel'))
        .getAllByRole('button')
        .filter((b) => b.querySelector('.nm'));
    // both rolls are on the trail, the one on the stage marked
    expect(items().map((b) => b.querySelector('b')?.textContent)).toEqual([
      expect.stringMatching(/^Unsaved · \d\d:\d\d$/),
      expect.stringMatching(/^Unsaved · \d\d:\d\d$/),
    ]);
    expect(items()[1].getAttribute('aria-current')).toBe('true');

    await user.keyboard('s');

    await waitFor(() => expect(window.location.pathname).toBe(`/studio/${SAVED}`));
    await waitFor(() =>
      expect(items().map((b) => b.querySelector('b')?.textContent)).toEqual([
        first.title,
        expect.stringMatching(/^Unsaved · /),
      ])
    );
    expect(items()[0].textContent).toContain('Your pattern');
  });
});

describe('Clear history, with an Undo (5.9)', () => {
  /* The clear is held back for UNDO_MS. Fake timers that still run on their
     own, so everything else in the Studio keeps time and the test can jump. */
  const deletes = () =>
    vi.mocked(apiClient.delete).mock.calls.filter(([url]) => url === '/api/v1/history');

  async function clearIt() {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open({ initial: COLD_CARPET, history: [visit(mineTarget, 5, 90)] });
    await waitFor(() => expect(recorded()).toHaveLength(1));
    await openPatterns(user, 'Recent');
    await user.click(screen.getByRole('button', { name: 'Clear history' }));
    return user;
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('empties the list at once, and sends the clear only when the Undo has gone', async () => {
    await clearIt();
    expect(screen.getByText(/What you open shows up here/)).toBeTruthy();
    expect(screen.getByTestId('probe').textContent).toBe('History cleared');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
    expect(deletes()).toHaveLength(0);

    await act(() => vi.advanceTimersByTimeAsync(UNDO_MS - 100));
    expect(deletes()).toHaveLength(0);
    await act(() => vi.advanceTimersByTimeAsync(200));
    await waitFor(() => expect(deletes()).toHaveLength(1));
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('puts it all back on Undo, and never sends the clear', async () => {
    const user = await clearIt();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: /^Cold Carpet/ })).toBeTruthy();

    await act(() => vi.advanceTimersByTimeAsync(UNDO_MS * 2));
    expect(deletes()).toHaveLength(0);
  });

  it('sends a visit recorded while the Undo is up after the clear, so it is kept', async () => {
    const user = await clearIt();
    await user.keyboard('2');
    await act(() => vi.advanceTimersByTimeAsync(RECORD_MS + 100));
    /* Due, but held behind the clear. */
    expect(recorded()).toHaveLength(1);

    await act(() => vi.advanceTimersByTimeAsync(UNDO_MS));
    await waitFor(() => expect(recorded()).toHaveLength(2));
    expect(recorded()[1]).toMatchObject({ breakId: MINE, level: 2 });
    const del = vi.mocked(apiClient.delete).mock.invocationCallOrder.at(-1)!;
    const post = vi.mocked(apiClient.post).mock.invocationCallOrder.at(-1)!;
    expect(del).toBeLessThan(post);
    expect(screen.getByRole('button', { name: /^Cold Carpet/ })).toBeTruthy();
  });

  it('brings the list back and says so, until dismissed, when the clear is refused', async () => {
    vi.mocked(apiClient.delete).mockRejectedValue(new Error('down'));
    const user = await clearIt();
    await act(() => vi.advanceTimersByTimeAsync(UNDO_MS + 100));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Could not clear your history — try again')
    );
    expect(screen.getByRole('button', { name: /^Cold Carpet/ })).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(screen.getByRole('alert').textContent).toBe('Could not clear your history — try again');
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.getByRole('alert').textContent).toBe('');
  });

  /** Hold the next POST /api/v1/history until the test lets it answer. */
  function holdNextVisit() {
    let answer = () => {};
    const record = vi.mocked(apiClient.post).getMockImplementation()!;
    vi.mocked(apiClient.post).mockImplementationOnce(((url: string, options: never) => {
      const reply = record(url, options);
      return new Promise((resolve) => {
        answer = () => resolve(reply);
      });
    }) as never);
    return () => answer();
  }

  async function clearWithVisitInFlight() {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const answer = holdNextVisit();
    const view = render(
      <StudioProvider
        catalogue={catalogue}
        initial={COLD_CARPET}
        history={[visit(theirTarget, 3, 80)]}
      >
        <StudioFrame />
      </StudioProvider>
    );
    /* Cold Carpet's arrival is sent and not yet answered. */
    await waitFor(() => expect(recorded()).toHaveLength(1));
    await openPatterns(user, 'Recent');
    await user.click(screen.getByRole('button', { name: 'Clear history' }));
    return { user, answer, view };
  }

  it('keeps a visit that was on its way off the cleared list, and brings it back on Undo', async () => {
    const { user, answer } = await clearWithVisitInFlight();
    answer();
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(screen.getByText(/What you open shows up here/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Cold Carpet/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    const rows = screen
      .getAllByRole('button', { name: /^(Cold Carpet|Their Groove)/ })
      .map((b) => b.textContent);
    expect(rows[0]).toMatch(/^Cold Carpet/);
    expect(rows[1]).toMatch(/^Their Groove/);
  });

  it('sends a held clear at once when the Studio goes, not behind a visit still in flight', async () => {
    const { view } = await clearWithVisitInFlight();
    view.unmount();
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(deletes()).toHaveLength(1);
    expect(deletes()[0][1]).toEqual({ options: { keepalive: true } });
  });

  it('sends a held clear when the Studio goes, as the list said it had', async () => {
    const { unmount } = await (async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const view = render(
        <StudioProvider
          catalogue={catalogue}
          initial={COLD_CARPET}
          history={[visit(mineTarget, 5, 90)]}
        >
          <StudioFrame />
        </StudioProvider>
      );
      await waitFor(() => expect(recorded()).toHaveLength(1));
      await openPatterns(user, 'Recent');
      await user.click(screen.getByRole('button', { name: 'Clear history' }));
      return view;
    })();
    expect(deletes()).toHaveLength(0);
    unmount();
    await waitFor(() => expect(deletes()).toHaveLength(1));
    expect(deletes()[0][1]).toEqual({ options: { keepalive: true } });
  });
});

describe("opening an entry by its address — /studio?entry= (Home's Continue, task 4.9)", () => {
  it('opens it where the history left it, and records it as that entry', async () => {
    await open({
      history: [visit(entryTarget(ENTRY_A), 2, 72)],
      openEntry: ENTRY_A.id,
    });

    await waitFor(() => expect(title()).toBe(ENTRY_A.title));
    expect(place()).toEqual({ level: 2, bpm: 72 });
    // on the stage as the entry, not as a scratch copy with no identity
    await waitFor(() =>
      expect(recorded().at(-1)).toEqual({ libraryEntryId: ENTRY_A.id, level: 2, bpm: 72 })
    );
  });

  it('opens one never visited as the full break at its own tempo — what Home’s card says', async () => {
    // not the Studio's default tempo, so arriving on the default would fail this
    expect(ENTRY_B.bpm).not.toBe(94);
    await open({ openEntry: ENTRY_B.id });

    await waitFor(() => expect(title()).toBe(ENTRY_B.title));
    // the Studio's default layer is 3, so a load that ignored the card would land there
    expect(place()).toEqual({ level: FULL_LAYER, bpm: ENTRY_B.bpm });
  });

  it('says so when the catalogue no longer holds it, and leaves the Studio usable', async () => {
    await open({ openEntry: 'cgone0000000000000000001' });

    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe('That pattern is no longer there')
    );
    expect(title()).not.toBe('…');
  });
});
