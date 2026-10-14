// @vitest-environment happy-dom

/**
 * `PolyrhythmsCard` (Phase 12, D59) with the Stage beside it: the five
 * shelves, an entry opening with its streams, the count you feel it in, and a
 * shelf made into a ladder session.
 *
 * The real Studio and the real `session-api` over a mocked `apiClient`.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } };
});

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import {
  LADDER_LAYERS,
  PolyrhythmsCard,
  ladderItems,
} from '@/components/app/studio/panels/polyrhythms-card';
import { Stage } from '@/components/app/studio/stage';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { apiClient } from '@/lib/api/client';
import type { CatalogueLibrary } from '@/lib/app/breaks/catalogue/types';
import { testCatalogue, testPolyrhythms } from '@/tests/helpers/catalogue';
import { sessionView } from '@/tests/unit/components/app/practice/fixtures';

let studio: ReturnType<typeof useStudio> | null = null;
function Probe() {
  studio = useStudio();
  return <div data-testid="notice">{studio.notice?.message}</div>;
}

/** The lanes with notes in A, at the layer on show. */
const lanesOnShow = () =>
  (['k', 's', 'h', 'r', 't1', 't3', 'hf', 'p1'] as const).filter((L) =>
    studio!.view.A!.bars.some((b) => b[L].some(Boolean))
  );

function mount(library: CatalogueLibrary = testPolyrhythms(), withStage = false) {
  const base = testCatalogue();
  return render(
    <StudioProvider catalogue={{ ...base, libraries: [...base.libraries, library] }}>
      <PolyrhythmsCard />
      {withStage ? <Stage /> : null}
      <Probe />
    </StudioProvider>
  );
}

const FLOOR_TOM = '3:2, hands — the three on the floor tom';

/** A shelf, opened, to look inside. */
async function openShelf(user: ReturnType<typeof userEvent.setup>, name: string) {
  const c = await card();
  const summary = c.getByText(new RegExp(name));
  await user.click(summary);
  return within(summary.closest('details') as HTMLElement);
}

/** An entry's row: its title, then the credit line. */
const rowOf = (shelf: ReturnType<typeof within>, title: string) =>
  shelf.getByRole('button', { name: (n: string) => n.startsWith(`${title} Cross-rhythm`) });

async function card() {
  return within(
    (await screen.findByRole('heading', { name: 'Polyrhythms' })).closest('.card') as HTMLElement
  );
}

beforeEach(() => {
  localStorage.clear();
  studio = null;
  push.mockClear();
  vi.mocked(apiClient.post).mockReset();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('PolyrhythmsCard', () => {
  it('lists five shelves, and opens an entry with its streams and its note', async () => {
    const user = userEvent.setup();
    mount();
    const c = await card();
    const shelves = (
      c.getByRole('heading', { name: 'Polyrhythms' }).closest('.card') as HTMLElement
    ).querySelectorAll('details.practice-shelf');
    expect(shelves).toHaveLength(5);

    await user.click(rowOf(await openShelf(user, 'Two against three'), FLOOR_TOM));

    expect(studio!.view.A?.name).toBe('3:2, hands — the three on the floor tom');
    expect(studio!.view.A?.poly).toMatchObject({ ratio: '3:2', pulse: ['s'], cross: ['t3'] });
    expect(screen.getByTestId('notice')).toHaveTextContent(/Three even notes on the floor tom/);
  });

  it('makes a shelf a ladder: each entry at its pulse, its cross-rhythm and in full', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(sessionView());
    const user = userEvent.setup();
    const library = testPolyrhythms();
    mount(library);
    const shelf = await openShelf(user, 'Groupings over four');
    await user.click(shelf.getByRole('button', { name: 'Make a ladder session from this shelf' }));

    const body = vi.mocked(apiClient.post).mock.calls[0][1]?.body as {
      name: string;
      items: Array<{ libraryEntryId: string; level: number }>;
    };
    const entries = library.entries.filter((e) => e.group === 'Groupings over four');
    expect(body.name).toBe('Groupings over four');
    expect(body.items).toEqual(
      entries
        .slice(0, 4)
        .flatMap((e) => LADDER_LAYERS.map((level) => ({ libraryEntryId: e.id, level })))
    );
  });

  it('shows nothing for a library with no entries', async () => {
    mount({ ...testPolyrhythms(), entries: [] });
    await screen.findByTestId('notice');
    expect(screen.queryByRole('heading', { name: 'Polyrhythms' })).toBeNull();
  });
});

describe('ladderItems', () => {
  it('fills a session: four entries, three layers each, in shelf order', () => {
    const entries = testPolyrhythms().entries;
    const items = ladderItems(entries);
    expect(items).toHaveLength(12);
    expect(items.map((i) => i.level)).toEqual([1, 2, 5, 1, 2, 5, 1, 2, 5, 1, 2, 5]);
    expect(items[3].target).toEqual({ libraryEntryId: entries[1].id });
  });
});

describe('a polyrhythm on the stage', () => {
  it('names its layers for its streams, and counts it either way round', async () => {
    const user = userEvent.setup();
    mount(testPolyrhythms(), true);
    await user.click(rowOf(await openShelf(user, 'Two against three'), FLOOR_TOM));

    const layers = within(screen.getByRole('radiogroup', { name: 'Difficulty layer' }));
    expect(layers.getAllByRole('radio').map((r) => r.textContent)).toEqual([
      '1Pulse',
      '2Cross-rhythm',
      '3Together',
      '4Accented',
      '5Full figure',
    ]);

    await user.click(layers.getByRole('radio', { name: /Pulse/ }));
    expect(lanesOnShow()).toEqual(['s']);

    const count = within(screen.getByRole('radiogroup', { name: 'Count' }));
    expect(count.getAllByRole('radio').map((r) => r.textContent)).toEqual(['The 2', 'The 3']);
    await user.click(count.getByRole('radio', { name: 'The 3' }));
    expect(studio!.feelCross).toBe(true);
    expect(lanesOnShow()).toEqual(['t3']);
  });

  it('offers no count on a groove', async () => {
    mount(testPolyrhythms(), true);
    await screen.findAllByRole('img', { name: /Drum notation/ });
    expect(screen.queryByRole('radiogroup', { name: 'Count' })).toBeNull();
  });
});
