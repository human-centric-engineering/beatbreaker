// @vitest-environment happy-dom

/**
 * Help in the Studio is one line at rest and the rest behind an ⓘ (Phase 5,
 * E14).
 *
 * A drawer is narrow. A paragraph of good writing inside one pushes the
 * controls under it off the bottom of a phone, so the explanation moved into
 * popovers. What keeps it there is this: open every drawer the way a person
 * does and count the words of every hint on screen.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioFrame } from '@/components/app/shell/studio-frame';
import { TOOLS } from '@/components/app/shell/tool-rail';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';

vi.mock('@/components/app/breaks/breaks.css', () => ({}));
vi.mock('@/components/app/shell/studio.css', () => ({}));
vi.mock('@/components/layouts/header-actions', () => ({ HeaderActions: () => null }));
vi.mock('@/lib/consent', () => ({ useConsent: () => ({ openPreferences: vi.fn() }) }));

/** Longer than this and it is a paragraph, which belongs behind the ⓘ. */
const MAX_WORDS = 15;

const words = (el: Element) => (el.textContent ?? '').trim().split(/\s+/).filter(Boolean).length;

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

const renderStudio = async () => {
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <StudioFrame />
    </StudioProvider>
  );
  await screen.findAllByRole('img', { name: /Drum notation/ });
};

describe('help in the Studio', () => {
  it('keeps every hint on the stage and in every drawer to one short line', async () => {
    const user = userEvent.setup();
    await renderStudio();

    const long: string[] = [];
    const check = (where: string) => {
      /* A `.blurb` is a style's or a kit's own description, from the catalogue:
         content about what you picked, not help on how to use the control. */
      for (const hint of document.querySelectorAll('.hint:not(.blurb)')) {
        if (words(hint) > MAX_WORDS) long.push(`${where}: ${hint.textContent?.trim()}`);
      }
    };
    check('stage');

    const rail = within(screen.getByRole('navigation', { name: 'Tools' }));
    for (const tool of TOOLS) {
      await user.click(rail.getByRole('button', { name: tool.label }));
      check(tool.label);
    }
    /* Not vacuous: a drawer was open each time, and it had hints to count. */
    expect(document.querySelectorAll('.hint').length).toBeGreaterThan(0);
    expect(long).toEqual([]);
  });

  it('opens an ⓘ from the keyboard, and closes it on Escape', async () => {
    const user = userEvent.setup();
    await renderStudio();
    await user.click(
      within(screen.getByRole('navigation', { name: 'Tools' })).getByRole('button', {
        name: 'Practise',
      })
    );

    const help = screen.getByRole('button', { name: 'About Mixer' });
    help.focus();
    await user.keyboard('{Enter}');
    /* The drawer is a dialog too, so the popover is found by what it says. */
    expect(await screen.findByText(/Mute a limb to play it yourself/)).toBeTruthy();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByText(/Mute a limb/)).toBeNull());
    expect(document.activeElement).toBe(help);
  });
});
