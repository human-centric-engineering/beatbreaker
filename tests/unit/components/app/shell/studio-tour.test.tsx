// @vitest-environment happy-dom

/**
 * The first-run tour (task 8.6), over the real Studio.
 *
 * The provider and the frame are real, so each step's selector is held to the
 * control the frame actually draws — at both widths, because the transport and
 * the tools are drawn in a different place on a phone. What is under test is
 * that the tour opens once, on a first visit, and never after either way out;
 * that it holds focus and gives it back; and that the Studio's keys are off
 * while it is up.
 *
 * @see components/app/shell/studio-tour.tsx
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/app/breaks/breaks.css', () => ({}));
vi.mock('@/components/app/shell/studio.css', () => ({}));
vi.mock('@/components/layouts/header-actions', () => ({ HeaderActions: () => null }));
vi.mock('@/lib/consent', () => ({ useConsent: () => ({ openPreferences: vi.fn() }) }));

import { StudioFrame } from '@/components/app/shell/studio-frame';
import { TOUR_STEPS, StudioTour, tourAnchor } from '@/components/app/shell/studio-tour';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { TOUR_SEEN } from '@/lib/app/breaks/browser-keys';
import { testCatalogue } from '@/tests/helpers/catalogue';

function atWidth(wide: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const mount = () =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <StudioFrame />
      <StudioTour />
    </StudioProvider>
  );

const tour = () => screen.findByRole('dialog', { name: 'Play' });

/** The layer the Studio is on, read from its radio group. */
const layer = () =>
  within(screen.getByRole('radiogroup', { name: 'Difficulty layer' }))
    .getAllByRole('radio')
    .findIndex((r) => r.getAttribute('aria-checked') === 'true') + 1;

beforeEach(() => {
  localStorage.clear();
  atWidth(true);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the first-run tour', () => {
  it('opens on step 1 of 3, at Play, on a first visit', async () => {
    mount();
    const step = await tour();
    expect(step).toHaveAttribute('aria-modal', 'true');
    expect(within(step).getByText('1 of 3')).toBeInTheDocument();
    expect(step).toHaveAccessibleDescription(/Space does the same/);
    expect(within(step).getByRole('button', { name: 'Next' })).toHaveFocus();
  });

  it('points each step at the control the wide frame draws', async () => {
    mount();
    await tour();
    const [play, layers, tools] = TOUR_STEPS.map((s) => tourAnchor(s, true));
    expect(play).toHaveAccessibleName('Play or stop');
    expect(play?.closest('.studio-header')).toBeTruthy();
    expect(layers).toHaveAccessibleName('Difficulty layer');
    expect(tools).toBe(screen.getByRole('navigation', { name: 'Tools' }));
  });

  it('on a phone, points at the phone transport and the Tools menu instead', async () => {
    atWidth(false);
    mount();
    const step = await tour();
    expect(step).toHaveAccessibleDescription(/tap − or \+/);
    const [play, , tools] = TOUR_STEPS.map((s) => tourAnchor(s, false));
    expect(play).toHaveAccessibleName('Play or stop');
    expect(play?.closest('.studio-footer')).toBeTruthy();
    expect(tools).toBe(screen.getByRole('button', { name: 'Tools' }));

    const user = userEvent.setup();
    await user.click(within(step).getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Tools' })).toHaveAccessibleDescription(
      /Every tool is in this menu/
    );
  });

  it('walks Play, Layers, Tools, and Done closes it for good', async () => {
    const user = userEvent.setup();
    const { unmount } = mount();
    await tour();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Layers' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    const last = screen.getByRole('dialog', { name: 'Tools' });
    expect(within(last).getByRole('link', { name: 'More in Help' })).toHaveAttribute(
      'href',
      '/help'
    );
    await user.click(within(last).getByRole('button', { name: 'Done' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(TOUR_SEEN.key)).toBe('true');

    unmount();
    mount();
    await screen.findAllByRole('img', { name: /Drum notation/ });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  /* Not asserted here: that focus goes back to where it was. happy-dom
     reports <body> as focused for the whole of the Studio's first commits,
     whatever the test focused, so it can't say where "back" is. It is on the
     owner's browser checklist in controls.md. */
  it('Skip closes it for good', async () => {
    const user = userEvent.setup();
    const { unmount } = mount();
    const step = await tour();
    await user.click(within(step).getByRole('button', { name: 'Skip' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(TOUR_SEEN.key)).toBe('true');

    unmount();
    mount();
    await screen.findAllByRole('img', { name: /Drum notation/ });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape is Skip', async () => {
    const user = userEvent.setup();
    mount();
    await tour();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(TOUR_SEEN.key)).toBe('true');
  });

  it('holds focus in the card', async () => {
    const user = userEvent.setup();
    mount();
    const step = await tour();
    const skip = within(step).getByRole('button', { name: 'Skip' });
    const next = within(step).getByRole('button', { name: 'Next' });

    await user.tab();
    expect(skip).toHaveFocus();
    await user.tab({ shift: true });
    expect(next).toHaveFocus();
  });

  it('keeps the Studio’s keys off while it is up', async () => {
    const user = userEvent.setup();
    mount();
    await tour();
    const before = layer();
    await user.keyboard(before === 3 ? '2' : '3');
    expect(layer()).toBe(before);

    await user.keyboard('{Escape}');
    await user.keyboard(before === 3 ? '2' : '3');
    await waitFor(() => expect(layer()).toBe(before === 3 ? 2 : 3));
  });

  /* Where a browser blocks site data, reading `window.localStorage` throws.
     The tour has to treat that as seen and leave the Studio standing. */
  it('leaves the Studio up, with no tour, in a browser that blocks storage', async () => {
    const blocked = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    try {
      render(
        <StudioProvider catalogue={testCatalogue()}>
          <StudioTour />
          <p>Studio</p>
        </StudioProvider>
      );
      /* The provider's own reads are not the tour's; what is held is that the
         tour neither throws nor opens once a break is drawn. */
      await waitFor(() => expect(blocked).toHaveBeenCalled());
      expect(screen.getByText('Studio')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).toBeNull();
    } finally {
      blocked.mockRestore();
    }
  });

  it('takes Escape for itself, leaving a drawer that was open under it', async () => {
    const user = userEvent.setup();
    render(
      <StudioProvider catalogue={testCatalogue()} openDrawer={{ tool: 'gen' }}>
        <StudioFrame />
        <StudioTour />
      </StudioProvider>
    );
    await tour();
    expect(screen.getByRole('dialog', { name: 'Generate' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Play' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Generate' })).toBeInTheDocument();
  });

  it('does not open in a browser that has seen it', async () => {
    localStorage.setItem(TOUR_SEEN.key, 'true');
    mount();
    await screen.findAllByRole('img', { name: /Drum notation/ });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
