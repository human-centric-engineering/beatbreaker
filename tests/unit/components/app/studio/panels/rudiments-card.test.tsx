// @vitest-environment happy-dom

/**
 * `RudimentsCard`, mounted on its own.
 *
 * `generate-panel.test.tsx` covers the card inside the drawer: six shelves,
 * a row opening its rudiment and closing the drawer. This file reaches what
 * that one does not — a card with no drawer to close, the notice for an entry
 * with no note, and a library that is there but empty.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RudimentsCard } from '@/components/app/studio/panels/rudiments-card';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import type { CatalogueLibrary } from '@/lib/app/breaks/catalogue/types';
import { testCatalogue, testRudiments } from '@/tests/helpers/catalogue';

function OnStage() {
  const c = useStudio();
  return (
    <>
      <div data-testid="on-stage">{c.view.A?.name}</div>
      <div data-testid="notice">{c.notice?.message}</div>
    </>
  );
}

function mount(rudiments: CatalogueLibrary) {
  const base = testCatalogue();
  return render(
    <StudioProvider catalogue={{ ...base, libraries: [...base.libraries, rudiments] }}>
      <RudimentsCard />
      <OnStage />
    </StudioProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('RudimentsCard', () => {
  it('opens a rudiment with no drawer to close, and gives its note as it loads', async () => {
    const user = userEvent.setup();
    const library = testRudiments();
    const entry = library.entries.find((e) => e.title === 'Single Paradiddle');
    mount(library);

    const card = (await screen.findByRole('heading', { name: 'Rudiments' })).closest('.card');
    await user.click(within(card as HTMLElement).getByText(/Diddle rudiments/));
    await user.click(
      within(card as HTMLElement).getByRole('button', { name: /Single Paradiddle PAS #16/ })
    );

    expect(screen.getByTestId('on-stage')).toHaveTextContent('Single Paradiddle');
    expect(entry?.note).toBeTruthy();
    expect(screen.getByTestId('notice')).toHaveTextContent(`Single Paradiddle — ${entry?.note}`);
  });

  it('says only that it loaded, for an entry with no note', async () => {
    const user = userEvent.setup();
    const library = testRudiments();
    const first = { ...library.entries[0], note: null };
    mount({ ...library, entries: [first] });

    const card = (await screen.findByRole('heading', { name: 'Rudiments' })).closest('.card');
    await user.click(within(card as HTMLElement).getByText(new RegExp(first.group)));
    await user.click(
      within(card as HTMLElement).getByRole('button', {
        name: (name) => name.startsWith(`${first.title} ${first.artist}`),
      })
    );

    expect(screen.getByTestId('notice')).toHaveTextContent(`${first.title} loaded`);
  });

  it('shows nothing for a library with no entries', async () => {
    mount({ ...testRudiments(), entries: [] });
    await screen.findByTestId('on-stage');
    expect(screen.queryByRole('heading', { name: 'Rudiments' })).toBeNull();
  });
});
