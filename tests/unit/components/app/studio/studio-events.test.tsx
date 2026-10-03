// @vitest-environment happy-dom

/**
 * `pattern_opened` (task 8.8) from the real Studio: a saved pattern of yours
 * put on the stage, by its address or from inside the Studio, carrying the
 * whole days since it was created — and nothing for someone else's.
 *
 * The real provider, frame and console over a stubbed `apiClient`, with a
 * recording analytics context (`tests/helpers/analytics.tsx`).
 *
 * @see components/app/studio/studio-provider.tsx
 */

import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
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
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { apiClient } from '@/lib/api/client';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import type { HistoryItem } from '@/lib/validations/history';
import { expectNoContent, recordEvents } from '@/tests/helpers/analytics';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

const catalogue = testCatalogue();
const MINE = 'cbrk00000000000000000001';
const THEIRS = 'cbrk00000000000000000002';
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY - 60_000).toISOString();

function pattern(id: string, title: string, mine: boolean, createdAt?: string): InitialPattern {
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
    id,
    title,
    mine,
    payload: breakPayload({
      bpm: 90,
      swing: 0,
      level: 5,
      arrangement: ['A', 'B'],
      A,
      B: deriveB(A, funk.params),
    }),
    ...(createdAt ? { createdAt } : {}),
  };
}

const visit = (id: string, title: string, mine: boolean): HistoryItem => ({
  id: `cvis-${id}`,
  level: 5,
  bpm: 90,
  target: { kind: 'break', id, title, mine },
});

async function open(
  wrapper: ({ children }: { children: ReactNode }) => ReactNode,
  { initial, history }: { initial?: InitialPattern; history?: HistoryItem[] }
) {
  const Wrapper = wrapper;
  const view = render(
    <Wrapper>
      <StudioProvider catalogue={catalogue} initial={initial} history={history}>
        <StudioFrame />
      </StudioProvider>
    </Wrapper>
  );
  await waitFor(() => expect(document.querySelector('.studio-title')?.textContent).not.toBe('…'));
  return view;
}

const back = () => document.querySelector<HTMLButtonElement>('.studio-back')!;

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/studio');
  vi.mocked(apiClient.patch).mockReset().mockResolvedValue({});
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post)
    .mockReset()
    .mockImplementation(((url: string, options?: { body?: Record<string, unknown> }) => {
      if (url !== '/api/v1/history') return Promise.resolve({});
      const id = String(options?.body?.breakId);
      return Promise.resolve(visit(id, 'x', id === MINE));
    }) as never);
});

describe('pattern_opened (task 8.8)', () => {
  it('counts your pattern opened by its address once, with the whole days since it was made', async () => {
    const rec = recordEvents();
    const view = await open(rec.wrapper, {
      initial: pattern(MINE, 'Cold Carpet', true, daysAgo(3)),
    });
    view.rerender(
      <rec.wrapper>
        <StudioProvider
          catalogue={catalogue}
          initial={pattern(MINE, 'Cold Carpet', true, daysAgo(3))}
        >
          <StudioFrame />
        </StudioProvider>
      </rec.wrapper>
    );
    await waitFor(() => expect(rec.names()).toEqual(['pattern_opened']));
    expect(rec.tracked[0].props).toEqual({ days_since_created: 3 });
    expectNoContent(rec.tracked, [MINE, 'Cold Carpet']);
  });

  it('counts nothing for someone else’s pattern opened by its address', async () => {
    const rec = recordEvents();
    await open(rec.wrapper, { initial: pattern(THEIRS, 'Their Groove', false, daysAgo(9)) });
    expect(rec.names()).toEqual([]);
  });

  it('counts your pattern opened from inside the Studio, with its age from the API', async () => {
    const user = userEvent.setup();
    const rec = recordEvents();
    const mine = pattern(MINE, 'Cold Carpet', true);
    vi.mocked(apiClient.get).mockResolvedValue({
      id: MINE,
      title: 'Cold Carpet',
      mine: true,
      doc: mine.payload,
      createdAt: daysAgo(1),
    });
    await open(rec.wrapper, { history: [visit(MINE, 'Cold Carpet', true)] });
    expect(rec.names()).toEqual([]);

    await user.click(back());

    await waitFor(() =>
      expect(document.querySelector('.studio-title')?.textContent).toBe('Cold Carpet')
    );
    expect(rec.tracked).toEqual([{ event: 'pattern_opened', props: { days_since_created: 1 } }]);
  });

  it('counts nothing for someone else’s pattern opened from inside the Studio', async () => {
    const user = userEvent.setup();
    const rec = recordEvents();
    const theirs = pattern(THEIRS, 'Their Groove', false);
    vi.mocked(apiClient.get).mockResolvedValue({
      id: THEIRS,
      title: 'Their Groove',
      mine: false,
      doc: theirs.payload,
      createdAt: daysAgo(4),
    });
    await open(rec.wrapper, { history: [visit(THEIRS, 'Their Groove', false)] });

    await user.click(back());

    await waitFor(() =>
      expect(document.querySelector('.studio-title')?.textContent).toBe('Their Groove')
    );
    expect(rec.names()).toEqual([]);
  });
});
