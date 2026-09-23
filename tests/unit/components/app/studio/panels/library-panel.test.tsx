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

  /* The three fallbacks in the row markup. Each one only fires for content the
     seed does not produce, which is exactly the content a fork or an admin
     edit will produce first. */

  it('shows the meter only when it is not 4/4', async () => {
    /* Every entry carries a meter now that they are rows — the old
       `LibraryItem.meter` was set only for the exceptions. Printing it
       unconditionally would put "· 4/4" on forty of the forty-seven rows,
       which is a visible change this phase promised not to make. */
    renderPanel();

    const funky = await screen.findByText('Funky Drummer');
    const funkyRow = funky.closest('button') as HTMLButtonElement;
    expect(funkyRow.textContent).toContain('94');
    expect(funkyRow.textContent).not.toContain('4/4');

    /* And an entry that IS in another meter still says so — without this half,
       the assertion above would pass on a row that printed no meter ever. */
    const odd = document.querySelector('.bpm[class]');
    expect(odd).toBeTruthy();
    const anyOdd = [...document.querySelectorAll('.bpm')].some((el) =>
      /·\s\d+\/\d+/.test(el.textContent ?? '')
    );
    expect(anyOdd).toBe(true);
  });

  it('says only the title when an entry has no note', async () => {
    const user = userEvent.setup();
    const catalogue = testCatalogue();
    const library = catalogue.libraries[0];
    const noNote = library.entries.find((e) => !e.note);
    expect(noNote, 'the seed has entries without a note; this test needs one').toBeTruthy();

    renderPanel();
    await user.click(
      (await screen.findByText(noNote!.title)).closest('button') as HTMLButtonElement
    );

    /* "Title — undefined" is what the other branch of that ternary produces if
       somebody simplifies it, and it reaches the reader as a toast. */
    expect(await screen.findByText(`${noNote!.title} loaded`)).toBeTruthy();
  });

  it('falls back to the saved style key when the style is no longer in the catalogue', async () => {
    /* A favourite saved before a style was deleted. The row must still name
       something — an empty span would read as a bug in the row rather than as
       a style that has gone. */
    localStorage.setItem(
      'bb.favs',
      JSON.stringify([{ name: 'Orphan', bpm: 100, style: 'nosuchstyle', level: 3, code: 'x' }])
    );
    renderPanel();

    expect(await screen.findByText(/nosuchstyle · L3/)).toBeTruthy();
  });
});
