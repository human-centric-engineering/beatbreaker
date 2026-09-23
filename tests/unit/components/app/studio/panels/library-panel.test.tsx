// @vitest-environment happy-dom

/**
 * `LibraryPanel`, mounted on its own.
 *
 * `tests/unit/components/app/shell/studio-frame.test.tsx` already covers
 * loading a famous break and the full save → load → delete round trip through
 * the frame. This file does not repeat those: it covers the empty-state hint
 * (no favourites saved), deleting down to empty, and the `loadFav` failure
 * branch for a favourite whose saved code can no longer be read.
 *
 * `LibraryPanel` renders no toast itself — `say()` only sets `Studio.toast`,
 * which `StudioFrame` displays. A small probe reads it back here.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LibraryPanel } from '@/components/app/studio/panels/library-panel';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';

function ToastProbe() {
  const c = useStudio();
  return <div role="status">{c.toast}</div>;
}

const renderPanel = () =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <LibraryPanel />
      <ToastProbe />
    </StudioProvider>
  );

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('LibraryPanel', () => {
  it('shows the empty-state hint when nothing is saved', async () => {
    renderPanel();
    expect(await screen.findByText(/Nothing saved yet\./)).toBeTruthy();
    expect(document.querySelector('.favrow')).toBeNull();
  });

  it('saves a break, then deletes it back down to the empty state', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(/Nothing saved yet\./);

    await user.click(screen.getByRole('button', { name: '＋ Save current' }));
    expect(document.querySelectorAll('.favrow').length).toBe(1);
    expect(screen.queryByText(/Nothing saved yet\./)).toBeNull();

    const deleteBtn = screen.getByRole('button', { name: /^Delete / });
    await user.click(deleteBtn);

    expect(document.querySelector('.favrow')).toBeNull();
    expect(await screen.findByText(/Nothing saved yet\./)).toBeTruthy();
  });

  it('says a saved break could not be read when its code is corrupt', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'bb.favs',
      JSON.stringify([
        { name: 'Broken save', bpm: 100, style: 'funk', level: 1, code: 'not-a-real-code' },
      ])
    );
    renderPanel();

    // the delete button's aria-label also carries the break's name
    // ("Delete Broken save"), so reach for the row's own load button by class
    await screen.findByText('Broken save');
    const row = document.querySelector<HTMLButtonElement>('.favrow .item:not(.kill)');
    await user.click(row as HTMLButtonElement);

    expect(await screen.findByText('That saved break could not be read')).toBeTruthy();
  });
});
