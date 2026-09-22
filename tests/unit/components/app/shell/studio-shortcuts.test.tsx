// @vitest-environment happy-dom

/**
 * The Studio from the keyboard.
 *
 * `studio-frame.test.tsx` covers one shortcut as part of a journey. This file
 * covers the rest, and — more to the point — the guard around them, which is
 * where the drawers changed things: a tool panel is full of buttons and sliders,
 * and Space on a focused button already presses it. Firing play as well is a
 * second action nobody asked for (Spike A, finding 2).
 *
 * Bound on the document, so the tests dispatch there rather than at a focused
 * element, which is how the handler actually receives them.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';

vi.mock('@/components/app/breaks/breaks.css', () => ({}));
vi.mock('@/components/app/shell/studio.css', () => ({}));
vi.mock('@/components/layouts/header-actions', () => ({ HeaderActions: () => null }));
vi.mock('@/lib/consent', () => ({ useConsent: () => ({ openPreferences: vi.fn() }) }));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

const mount = async () => {
  render(
    <StudioProvider>
      <StudioFrame />
    </StudioProvider>
  );
  await screen.findAllByRole('img', { name: /Drum notation/ });
};

/** Which sections the chart is showing — the view mode, read off what is drawn. */
const staves = () => screen.queryAllByRole('img', { name: /Drum notation/ }).length;
const bpm = () => Number(document.querySelector('.bpmval')?.textContent?.replace(/\D+/g, ''));

describe('Studio shortcuts', () => {
  it('moves the tempo by two either way', async () => {
    await mount();
    const before = bpm();

    fireEvent.keyDown(document, { key: ']' });
    expect(bpm()).toBe(before + 2);

    fireEvent.keyDown(document, { key: '[' });
    fireEvent.keyDown(document, { key: '[' });
    expect(bpm()).toBe(before - 2);
  });

  it('switches which sections are on the chart', async () => {
    await mount();
    // the default is both, so A alone has to be fewer staves than it started with
    const both = staves();
    expect(both).toBeGreaterThan(1);

    fireEvent.keyDown(document, { key: 'a' });
    expect(staves()).toBe(1);

    fireEvent.keyDown(document, { key: 'b' });
    expect(staves()).toBe(1);

    fireEvent.keyDown(document, { key: 'v' });
    expect(staves()).toBe(both);
  });

  it('toggles the counting guide', async () => {
    await mount();
    /* The guide is the row of count labels the engraver draws under each system
       — "1 e and a" — in the mono face, so counting those text nodes is counting
       the guide. Nothing else on the staff is set in it. */
    const guides = () =>
      [...document.querySelectorAll('text')].filter(
        (t) => t.getAttribute('font-family') === 'var(--f-mono)'
      ).length;
    const before = guides();
    // a bar's worth of labels at least, so the drop when it goes is unmistakable
    expect(before).toBeGreaterThan(8);

    fireEvent.keyDown(document, { key: 'g' });
    const off = guides();
    expect(off).toBeLessThan(before);

    fireEvent.keyDown(document, { key: 'g' });
    expect(guides()).toBe(before);
  });

  it('writes a new break on N, in either case', async () => {
    await mount();
    const grid = () =>
      [...document.querySelectorAll('.cell')].map((c) => c.getAttribute('data-on')).join('');

    const first = grid();
    fireEvent.keyDown(document, { key: 'n' });
    const second = grid();
    expect(second).not.toBe(first);

    fireEvent.keyDown(document, { key: 'N' });
    expect(grid()).not.toBe(second);
  });

  it('leaves the shortcuts alone while a modifier is held', async () => {
    await mount();
    const before = bpm();

    // Cmd-] and Alt-] belong to the browser and the OS, not to us
    fireEvent.keyDown(document, { key: ']', metaKey: true });
    fireEvent.keyDown(document, { key: ']', ctrlKey: true });
    fireEvent.keyDown(document, { key: ']', altKey: true });
    expect(bpm()).toBe(before);
  });

  it('undoes and redoes with the platform chord', async () => {
    const user = userEvent.setup();
    await mount();
    const grid = () =>
      [...document.querySelectorAll('.cell')].map((c) => c.getAttribute('data-on')).join('');

    const before = grid();
    // a cell click is an edit, and an edit is what there is to undo
    const cell = document.querySelector<HTMLElement>('.cell');
    await user.click(cell!);
    const edited = grid();
    expect(edited).not.toBe(before);

    fireEvent.keyDown(document, { key: 'z', metaKey: true });
    expect(grid()).toBe(before);

    fireEvent.keyDown(document, { key: 'z', metaKey: true, shiftKey: true });
    expect(grid()).toBe(edited);
  });

  it('does not fire while a button in a drawer has focus', async () => {
    const user = userEvent.setup();
    await mount();
    const before = bpm();

    const rail = within(screen.getByRole('navigation', { name: 'Tools' }));
    await user.click(rail.getByRole('button', { name: 'Practice' }));

    /* Space on a focused button already presses it. The guard is what stops the
       Studio starting playback at the same time — the whole reason drawers made
       this list longer than "skip text fields". */
    const button = screen.getAllByRole('button')[0];
    button.focus();
    fireEvent.keyDown(button, { key: ' ' });
    fireEvent.keyDown(button, { key: ']' });
    expect(bpm()).toBe(before);
  });
});
