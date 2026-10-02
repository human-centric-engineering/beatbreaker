// @vitest-environment happy-dom

/**
 * Deleting a pattern (task 5.11, D22), in the real provider over a stubbed
 * `apiClient`.
 *
 * Done-when: an Undo within six seconds sends no request and the row comes
 * back; otherwise one `DELETE`, and the pattern is gone from Practising,
 * Later and Recent; there is no Delete on library entries or other people's
 * patterns; the pattern on the stage survives as scratch.
 *
 * Fake timers stand in for the six seconds. `say()` sets `Studio.notice`,
 * which a probe shows along with its Undo.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import type { InitialPattern } from '@/components/app/breaks/use-break-console';
import { DetailsForm } from '@/components/app/studio/details-form';
import { PatternsPanel } from '@/components/app/studio/panels/patterns-panel';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { UNDO_MS } from '@/components/app/studio/use-notice';
import { APIClientError, apiClient } from '@/lib/api/client';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import type { HistoryItem } from '@/lib/validations/history';
import type { PracticeShelvesView, Shelf } from '@/lib/validations/pins';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

const catalogue = testCatalogue();
const ENTRY = catalogue.libraries[0].entries[0];
const MINE = 'cbrk00000000000000000001';
const THEIRS = 'cbrk00000000000000000002';

function payload(seed: number) {
  const funk = testStyle('funk');
  const A = generatePattern({ style: funk, meter: '4/4', seed, bars: 2, density: 50, ghosts: 50 });
  return breakPayload({
    bpm: 90,
    swing: 0,
    level: 3,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  });
}

const COLD_CARPET: InitialPattern = {
  id: MINE,
  title: 'Cold Carpet',
  payload: payload(8),
  mine: true,
};

const NONE: PracticeShelvesView = { practising: [], later: [] };

function pinOf(shelf: Shelf, id: string, title: string, mine: boolean) {
  return {
    id: `cpin-${id}`,
    shelf,
    position: 0,
    target: { kind: 'break' as const, id, title, mine, style: 'funk', bpm: 90, meter: '4/4' },
  };
}

function visitOf(id: string, title: string, mine: boolean): HistoryItem {
  return { id: `cvis-${id}`, level: 3, bpm: 90, target: { kind: 'break', id, title, mine } };
}

function Probe() {
  const c = useStudio();
  return (
    <div data-testid="probe" data-doc={c.doc.id ?? 'scratch'} data-title={c.patterns.A?.name}>
      <span data-testid="toast">{c.notice?.message}</span>
      {c.notice?.action ? (
        <button type="button" onClick={c.notice.action.run}>
          {c.notice.action.label}
        </button>
      ) : null}
    </div>
  );
}

function mount({
  initial,
  pins = NONE,
  history,
  details = false,
}: {
  initial?: InitialPattern;
  pins?: PracticeShelvesView;
  history?: HistoryItem[];
  details?: boolean;
}) {
  return render(
    <StudioProvider catalogue={catalogue} initial={initial} pins={pins} history={history}>
      {details ? <DetailsForm /> : <PatternsPanel />}
      <Probe />
    </StudioProvider>
  );
}

const deletes = () => vi.mocked(apiClient.delete).mock.calls.map(([url]) => url);
const panel = () => within(screen.getByRole('tabpanel'));
const deleteButtons = () => screen.queryAllByRole('button', { name: /^Delete / });

let user: ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  localStorage.clear();
  window.history.replaceState(null, '', '/studio');
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  vi.mocked(apiClient.get).mockReset().mockResolvedValue(NONE);
  vi.mocked(apiClient.post).mockReset().mockResolvedValue({});
  vi.mocked(apiClient.patch).mockReset().mockResolvedValue({});
  vi.mocked(apiClient.delete).mockReset().mockResolvedValue({ id: MINE, deleted: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Delete on a row (5.11)', () => {
  it('takes the row away at once, and an Undo within six seconds sends nothing and brings it back', async () => {
    mount({ pins: { practising: [pinOf('practising', MINE, 'Cold Carpet', true)], later: [] } });

    await user.click(screen.getByRole('button', { name: 'Delete Cold Carpet' }));

    expect(panel().queryByText('Cold Carpet')).toBeNull();
    expect(screen.getByTestId('toast').textContent).toBe('Deleted “Cold Carpet”');

    await act(async () => {
      vi.advanceTimersByTime(UNDO_MS - 500);
    });
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await act(async () => {
      vi.advanceTimersByTime(UNDO_MS * 2);
    });

    expect(deletes()).toEqual([]);
    expect(panel().getByText('Cold Carpet')).toBeTruthy();
  });

  it.each(['practising', 'later'] as const)(
    'sends one DELETE when the Undo has gone, and the pattern is off %s and Recent',
    async (shelf) => {
      const pins = { ...NONE, [shelf]: [pinOf(shelf, MINE, 'Cold Carpet', true)] };
      mount({ pins, history: [visitOf(MINE, 'Cold Carpet', true)] });
      await user.click(screen.getByRole('tab', { name: /^Recent/ }));
      expect(panel().getByText('Cold Carpet')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Delete Cold Carpet' }));
      await act(async () => {
        vi.advanceTimersByTime(UNDO_MS);
      });

      await waitFor(() => expect(deletes()).toEqual([`/api/v1/breaks/${MINE}`]));
      // the shelves are read back from the server, which has dropped the pin
      await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/v1/pins'));
      expect(panel().queryByText('Cold Carpet')).toBeNull();
      await user.click(
        screen.getByRole('tab', { name: shelf === 'practising' ? /^Practising/ : /^Later/ })
      );
      expect(panel().queryByText('Cold Carpet')).toBeNull();
    }
  );

  it('puts the row back and says so when the server refuses the delete', async () => {
    vi.mocked(apiClient.delete).mockRejectedValue(
      new APIClientError('Server error', 'INTERNAL_ERROR', 500)
    );
    mount({ pins: { practising: [pinOf('practising', MINE, 'Cold Carpet', true)], later: [] } });

    await user.click(screen.getByRole('button', { name: 'Delete Cold Carpet' }));
    await act(async () => {
      vi.advanceTimersByTime(UNDO_MS);
    });

    await waitFor(() =>
      expect(screen.getByTestId('toast').textContent).toBe(
        'Could not delete “Cold Carpet” — it is still in your patterns'
      )
    );
    expect(panel().getByText('Cold Carpet')).toBeTruthy();
  });

  it('offers no Delete on a library entry or on someone else’s pattern', () => {
    mount({
      pins: {
        practising: [
          {
            id: 'cpin-entry',
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
          pinOf('practising', THEIRS, 'Their Groove', false),
        ],
        later: [],
      },
    });

    expect(panel().getByText('Their Groove')).toBeTruthy();
    expect(deleteButtons()).toEqual([]);
  });
});

describe('Delete on the open pattern (5.11)', () => {
  it('leaves its notes on the stage as unsaved, and sends the DELETE when the Undo has gone', async () => {
    mount({ initial: COLD_CARPET, details: true });
    await waitFor(() => expect(screen.getByTestId('probe').dataset.doc).toBe(MINE));

    await user.click(screen.getByRole('button', { name: 'Delete pattern' }));

    const probe = screen.getByTestId('probe');
    expect(probe.dataset.doc).toBe('scratch');
    expect(probe.dataset.title).toBe('Cold Carpet');
    expect(window.location.pathname).toBe('/studio');

    await act(async () => {
      vi.advanceTimersByTime(UNDO_MS);
    });
    await waitFor(() => expect(deletes()).toEqual([`/api/v1/breaks/${MINE}`]));
    expect(screen.getByTestId('probe').dataset.title).toBe('Cold Carpet');
  });

  it('is the saved pattern again after an Undo', async () => {
    mount({ initial: COLD_CARPET, details: true });
    await waitFor(() => expect(screen.getByTestId('probe').dataset.doc).toBe(MINE));

    await user.click(screen.getByRole('button', { name: 'Delete pattern' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByTestId('probe').dataset.doc).toBe(MINE);
    expect(window.location.pathname).toBe(`/studio/${MINE}`);
    await act(async () => {
      vi.advanceTimersByTime(UNDO_MS * 2);
    });
    expect(deletes()).toEqual([]);
  });

  it('has no Delete on someone else’s pattern', async () => {
    mount({ initial: { ...COLD_CARPET, id: THEIRS, mine: false }, details: true });
    await waitFor(() => expect(screen.getByTestId('probe').dataset.doc).toBe(THEIRS));
    expect(screen.queryByRole('button', { name: 'Delete pattern' })).toBeNull();
  });
});
