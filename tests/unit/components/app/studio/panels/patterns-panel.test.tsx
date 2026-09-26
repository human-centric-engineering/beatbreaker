// @vitest-environment happy-dom

/**
 * The Patterns drawer (task 4.8), mounted in the real provider over a stubbed
 * `apiClient`.
 *
 * Done-when: one list request per open, the open pattern highlighted, and a
 * pin that round-trips. Also covered: the shelves and Recent ask the server
 * for nothing; _All_'s search goes to the server; the libraries filter on the
 * page; the Practice drawer shows the Practising shelf.
 *
 * `say()` only sets `Studio.toast`, which the frame shows; a probe reads it.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import type { InitialPattern } from '@/components/app/breaks/use-break-console';
import { PatternsPanel } from '@/components/app/studio/panels/patterns-panel';
import { Stage } from '@/components/app/studio/stage';
import { PracticePanel } from '@/components/app/studio/panels/practice-panel';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { apiClient } from '@/lib/api/client';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import type { HistoryItem } from '@/lib/validations/history';
import type { PracticeShelvesView } from '@/lib/validations/pins';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

const catalogue = testCatalogue();
const ENTRIES = catalogue.libraries[0].entries;
const ENTRY = ENTRIES[0];
const FUNK = catalogue.styles.funk.params.label;
const MINE = 'cbrk00000000000000000001';
const OTHER = 'cbrk00000000000000000002';

function sections(seed: number) {
  const funk = testStyle('funk');
  const A = generatePattern({ style: funk, meter: '4/4', seed, bars: 2, density: 50, ghosts: 50 });
  return {
    bpm: 90,
    swing: 0,
    level: 3,
    arrangement: ['A', 'B'] as ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  };
}

const COLD_CARPET: InitialPattern = {
  id: MINE,
  title: 'Cold Carpet',
  payload: breakPayload(sections(8)),
  mine: true,
};

/** What `GET /api/v1/breaks` answers — a list row, never the document. */
const row = (id: string, title: string) => ({
  id,
  title,
  style: 'funk',
  meter: '4/4',
  bpm: 90,
  level: 3,
  shared: false,
  updatedAt: '2026-09-24T10:00:00.000Z',
});

const NONE: PracticeShelvesView = { practising: [], later: [] };

const onPractising = (): PracticeShelvesView => ({
  practising: [
    {
      id: 'cpin00000000000000000001',
      shelf: 'practising',
      position: 0,
      target: {
        kind: 'entry',
        id: ENTRY.id,
        title: ENTRY.title,
        libraryKey: 'famous',
        artist: ENTRY.artist,
        bpm: ENTRY.bpm,
        meter: ENTRY.meter,
      },
    },
  ],
  later: [],
});

function ToastProbe() {
  return <div data-testid="toast">{useStudio().toast}</div>;
}

function mount({
  initial,
  pins,
  history,
  panel = <PatternsPanel />,
}: {
  initial?: InitialPattern;
  pins?: PracticeShelvesView;
  history?: HistoryItem[];
  panel?: React.ReactNode;
}) {
  return render(
    <StudioProvider catalogue={catalogue} initial={initial} pins={pins} history={history}>
      {panel}
      <ToastProbe />
    </StudioProvider>
  );
}

/** Every `GET /api/v1/breaks` made, with its params. */
const listCalls = () =>
  vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/api/v1/breaks');

const panel = () => within(screen.getByRole('tabpanel'));
/** The open buttons of the rows showing — not their ★. */
const rows = () =>
  panel()
    .queryAllByRole('button')
    .filter((b) => b.classList.contains('item') && !b.classList.contains('pin'));

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/studio');
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset().mockResolvedValue({});
  vi.mocked(apiClient.patch).mockReset().mockResolvedValue({});
  vi.mocked(apiClient.delete).mockReset().mockResolvedValue({});
});

describe('PatternsPanel — tabs', () => {
  it('opens on the Practising shelf when something is on it, and asks the server for nothing', async () => {
    mount({ pins: onPractising() });

    expect(screen.getByRole('tab', { name: /^Practising/ }).getAttribute('aria-selected')).toBe(
      'true'
    );
    // the count sits in the tab
    expect(screen.getByRole('tab', { name: /^Practising/ }).textContent).toBe('Practising 1');
    expect(rows().map((r) => r.textContent)).toEqual([`${ENTRY.title}${ENTRY.artist}${ENTRY.bpm}`]);
    expect(apiClient.get).not.toHaveBeenCalled(); // test-review:accept no_arg_called — shelves came with the page
  });

  it('falls back to the libraries when there is nothing on a shelf or in the history', () => {
    mount({ pins: NONE });
    expect(screen.getByRole('tab', { name: 'Libraries' }).getAttribute('aria-selected')).toBe(
      'true'
    );
  });

  it('remembers the tab in this browser, and ignores a stored value it does not know', async () => {
    const user = userEvent.setup();
    const { unmount } = mount({ pins: NONE });
    await user.click(screen.getByRole('tab', { name: /^Later/ }));
    unmount();

    mount({ pins: NONE });
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /^Later/ }).getAttribute('aria-selected')).toBe('true')
    );
    expect(screen.getByText(/Nothing on Later yet/)).toBeTruthy();
  });

  it('shows a tab that is not one of its own as the fallback', () => {
    localStorage.setItem('bb.patternsTab', JSON.stringify('community'));
    mount({ pins: NONE });
    expect(screen.getByRole('tab', { name: 'Libraries' }).getAttribute('aria-selected')).toBe(
      'true'
    );
  });
});

describe('PatternsPanel — All', () => {
  it('lists your patterns with one request, and marks the one on the stage', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue([
      row(MINE, 'Cold Carpet'),
      row(OTHER, 'Warm Floor'),
    ]);
    mount({ initial: COLD_CARPET, pins: NONE });

    await user.click(screen.getByRole('tab', { name: 'All' }));

    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(listCalls()).toEqual([
      [
        '/api/v1/breaks',
        {
          params: { sort: 'updated', limit: 100, q: undefined, style: undefined, meter: undefined },
        },
      ],
    ]);
    const [cold, warm] = rows();
    expect(cold.textContent).toBe(`Cold Carpet${FUNK} · L390`);
    expect(cold.getAttribute('aria-current')).toBe('true');
    expect(warm.getAttribute('aria-current')).toBeNull();
  });

  it('opens a row in place — fetched, then on the stage and highlighted', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation((url: string) =>
      Promise.resolve(
        url === '/api/v1/breaks'
          ? [row(MINE, 'Cold Carpet'), row(OTHER, 'Warm Floor')]
          : {
              id: OTHER,
              title: 'Warm Floor',
              mine: true,
              doc: breakPayload(sections(21)),
            }
      )
    );
    mount({ initial: COLD_CARPET, pins: NONE });
    await user.click(screen.getByRole('tab', { name: 'All' }));
    await waitFor(() => expect(rows()).toHaveLength(2));

    await user.click(rows()[1]);

    expect(apiClient.get).toHaveBeenCalledWith(`/api/v1/breaks/${OTHER}`);
    await waitFor(() => expect(rows()[1].getAttribute('aria-current')).toBe('true'));
    expect(rows()[0].getAttribute('aria-current')).toBeNull();
    expect(window.location.pathname).toBe(`/studio/${OTHER}`);
    // still one list request: opening a row does not read the list again
    expect(listCalls()).toHaveLength(1);
  });

  it('brings a row’s description and links with it when it opens in place (task 4.11)', async () => {
    const user = userEvent.setup();
    const track = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC';
    vi.mocked(apiClient.get).mockImplementation((url: string) =>
      Promise.resolve(
        url === '/api/v1/breaks'
          ? [row(MINE, 'Cold Carpet'), row(OTHER, 'Warm Floor')]
          : {
              id: OTHER,
              title: 'Warm Floor',
              mine: true,
              doc: breakPayload(sections(21)),
              description: 'From the record',
              links: [{ kind: 'song', url: track }],
            }
      )
    );
    mount({
      initial: COLD_CARPET,
      pins: NONE,
      panel: (
        <>
          <PatternsPanel />
          <Stage />
        </>
      ),
    });
    await user.click(screen.getByRole('tab', { name: 'All' }));
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(screen.queryByRole('link', { name: /opens in a new tab/ })).toBeNull();

    await user.click(rows()[1]);

    const chip = await screen.findByRole('link', { name: 'Song (opens in a new tab)' });
    expect(chip).toHaveAttribute('href', track);
  });

  it('sends a search to the server once the typing stops, not per keystroke', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue([row(MINE, 'Cold Carpet')]);
    mount({ pins: NONE });
    await user.click(screen.getByRole('tab', { name: 'All' }));
    await waitFor(() => expect(listCalls()).toHaveLength(1));

    await user.type(screen.getByRole('searchbox', { name: 'Search your patterns' }), 'cold');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Time signature' }), '7/8');

    await waitFor(() => expect(listCalls()).toHaveLength(2));
    expect(listCalls()[1][1]).toEqual({
      params: { sort: 'updated', limit: 100, q: 'cold', style: undefined, meter: '7/8' },
    });
  });

  it('says when nothing of yours matches, and when nothing is saved at all', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue([]);
    mount({ pins: NONE });
    await user.click(screen.getByRole('tab', { name: 'All' }));
    expect(await screen.findByText(/Nothing saved to your account yet/)).toBeTruthy();

    await user.type(screen.getByRole('searchbox', { name: 'Search your patterns' }), 'x');
    expect(await screen.findByText('Nothing of yours matches.')).toBeTruthy();
  });

  it('says the list could not be read, and reads it again on asking', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([row(MINE, 'Cold Carpet')]);
    mount({ pins: NONE });
    await user.click(screen.getByRole('tab', { name: 'All' }));

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(listCalls()).toHaveLength(2);
  });
});

describe('PatternsPanel — pins', () => {
  it('round-trips a pin: ★ on an All row puts it on Practising, as the server says', async () => {
    const user = userEvent.setup();
    const pinned: PracticeShelvesView = {
      practising: [
        {
          id: 'cpin00000000000000000002',
          shelf: 'practising',
          position: 0,
          target: {
            kind: 'break',
            id: OTHER,
            title: 'Warm Floor',
            mine: true,
            style: 'funk',
            level: 3,
            bpm: 90,
            meter: '4/4',
          },
        },
      ],
      later: [],
    };
    vi.mocked(apiClient.get).mockImplementation((url: string) =>
      Promise.resolve(url === '/api/v1/pins' ? pinned : [row(OTHER, 'Warm Floor')])
    );
    mount({ pins: NONE });
    await user.click(screen.getByRole('tab', { name: 'All' }));
    await waitFor(() => expect(rows()).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: 'Pin Warm Floor' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Practising' }));

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/pins', {
      body: { shelf: 'practising', breakId: OTHER },
    });
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /^Practising/ }).textContent).toBe('Practising 1')
    );
    expect(screen.getByRole('button', { name: 'Warm Floor — on Practising' })).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: /^Practising/ }));
    expect(rows().map((r) => r.textContent)).toEqual([`Warm Floor${FUNK} · L390`]);
  });
});

describe('PatternsPanel — Recent', () => {
  it('lists the history with a ★ on each row, and marks the one on the stage', async () => {
    const user = userEvent.setup();
    mount({
      initial: COLD_CARPET,
      pins: NONE,
      history: [
        {
          id: 'cvis1',
          level: 3,
          bpm: 90,
          target: { kind: 'break', id: MINE, title: 'Cold Carpet', mine: true },
        },
        {
          id: 'cvis2',
          level: 2,
          bpm: 72,
          target: { kind: 'entry', id: ENTRY.id, title: ENTRY.title, artist: ENTRY.artist },
        },
      ],
    });
    await user.click(screen.getByRole('tab', { name: 'Recent' }));

    expect(rows().map((r) => r.getAttribute('aria-current'))).toEqual(['true', null]);
    expect(screen.getByRole('button', { name: `Pin ${ENTRY.title}` })).toBeTruthy();
  });
});

describe('PatternsPanel — Libraries', () => {
  it('filters the famous breaks by search, style and meter, on the page', async () => {
    const user = userEvent.setup();
    mount({ pins: NONE });
    const all = rows().length;
    expect(all).toBe(ENTRIES.length);

    // by artist as well as title
    await user.type(screen.getByRole('searchbox', { name: 'Search the libraries' }), ENTRY.artist);
    expect(rows().length).toBeGreaterThan(0);
    expect(rows().every((r) => r.textContent?.includes(ENTRY.artist))).toBe(true);
    await user.clear(screen.getByRole('searchbox', { name: 'Search the libraries' }));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Time signature' }), '12/8');
    const twelve = ENTRIES.filter((e) => e.meter === '12/8');
    expect(twelve.length).toBeGreaterThan(0);
    expect(rows()).toHaveLength(twelve.length);
    expect(rows().every((r) => r.textContent?.endsWith('· 12/8'))).toBe(true);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Style' }), ENTRY.styleKey);
    expect(rows()).toHaveLength(
      ENTRIES.filter((e) => e.meter === '12/8' && e.styleKey === ENTRY.styleKey).length
    );
    expect(apiClient.get).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the libraries are in the page
  });

  it('says when nothing matches', async () => {
    const user = userEvent.setup();
    mount({ pins: NONE });
    await user.type(
      screen.getByRole('searchbox', { name: 'Search the libraries' }),
      'no such break anywhere'
    );
    expect(screen.getByText('Nothing in the libraries matches.')).toBeTruthy();
  });

  it('loads an entry, says so, and marks it', async () => {
    const user = userEvent.setup();
    const noNote = ENTRIES.find((e) => !e.note);
    expect(noNote, 'the seed has entries without a note; this test needs one').toBeTruthy();
    mount({ pins: NONE });

    await user.click(screen.getByRole('button', { name: new RegExp(`^${noNote!.title}`) }));

    /* "Title — undefined" is what the other branch produces if somebody
       simplifies it, and it reaches the reader as a toast. */
    expect(await screen.findByText(`${noNote!.title} loaded`)).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: new RegExp(`^${noNote!.title}`) })
        .getAttribute('aria-current')
    ).toBe('true');
  });
});

describe('PracticePanel — Practising', () => {
  it('shows the Practising shelf above the rig, and opens from it', async () => {
    const user = userEvent.setup();
    mount({ pins: onPractising(), panel: <PracticePanel /> });

    const card = within(
      screen.getByRole('heading', { name: 'Practising' }).closest('.card') as HTMLElement
    );
    // the row's own button, not its ★ ("Funky Drummer — on Practising")
    const opener = () =>
      card.getAllByRole('button').find((b) => !b.classList.contains('pin')) as HTMLElement;
    await user.click(opener());

    await waitFor(() => expect(opener().getAttribute('aria-current')).toBe('true'));
  });

  it('leaves it out when nothing is on it', () => {
    mount({ pins: NONE, panel: <PracticePanel /> });
    expect(screen.queryByRole('heading', { name: 'Practising' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Practice rig' })).toBeTruthy();
  });
});
