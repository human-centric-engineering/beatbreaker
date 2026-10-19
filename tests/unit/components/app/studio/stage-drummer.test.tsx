// @vitest-environment happy-dom

/**
 * The Stage's two views — the chart and the drummer — backed by
 * `useStoredSetting(STAGE_VIEW)` (`bb.stageView`): on a phone, chosen with
 * Show; from a tablet up, the drummer kept small in the chart view's corner
 * and one click from the middle, and the same player kept across the change.
 *
 * Modelled on `stage.test.tsx` and `stage-playhead.test.tsx`: `<Stage/>` is
 * mounted for real against a real `StudioProvider` and the seed catalogue,
 * so the chart it would otherwise show is the real generated pattern. Only
 * `DrummerView` itself is mocked — it has its own full test file
 * (`drummer/drummer-view.test.tsx`) — so this file proves what `Stage` is
 * actually responsible for: which pieces of itself it swaps out when the
 * Show choice flips, and which ones it does not.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Stage } from '@/components/app/studio/stage';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';
import { LAPTOP, PHONE, stubWidth } from '@/tests/helpers/media';

const mounts = vi.hoisted(() => ({ count: 0 }));

vi.mock('@/components/app/studio/drummer/drummer-view', async () => {
  const { useEffect } = await import('react');
  return {
    DrummerView: (p: { pip?: boolean; onExpand?: () => void; onChart?: () => void }) => {
      // counted once a mount, so a view change that remounted the player would show
      useEffect(() => {
        mounts.count++;
      }, []);
      return (
        <div data-testid="drummer-view-stub" data-pip={String(!!p.pip)}>
          the 3D drummer
          {p.pip ? (
            <button type="button" onClick={p.onExpand}>
              Watch the drummer
            </button>
          ) : (
            <button type="button" onClick={p.onChart}>
              Chart view
            </button>
          )}
        </div>
      );
    },
  };
});

const renderStage = () =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <Stage />
    </StudioProvider>
  );

beforeEach(() => {
  localStorage.clear();
  mounts.count = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Stage on a phone — Show: Chart vs Drummer 3D', () => {
  beforeEach(() => stubWidth(PHONE));

  it('shows the chart by default: staves, legend and chart tools, no drummer view', async () => {
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const show = within(screen.getByRole('radiogroup', { name: 'Show' }));
    expect(show.getByRole('radio', { name: 'Chart' })).toHaveAttribute('aria-checked', 'true');
    expect(show.getByRole('radio', { name: 'Drummer 3D' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(document.querySelector('.legend')).not.toBeNull();
    // no corner on a phone: the corner would be most of the chart
    expect(screen.queryByTestId('drummer-view-stub')).not.toBeInTheDocument();
  });

  it('engraves one bar to a line, where a wide screen has two, so a line fits the phone', async () => {
    const widths = async () => {
      const { unmount } = renderStage();
      const sheets = await screen.findAllByRole('img', { name: /Drum notation/ });
      const out = sheets.map((el) => Number(el.getAttribute('width')));
      unmount();
      return out;
    };
    const phone = await widths();
    stubWidth(LAPTOP);
    const laptop = await widths();
    // the default break's sections are two bars or more: half the line on a phone
    expect(phone[0]).toBeLessThan(laptop[0] * 0.7);
  });

  it('fits a line to the phone at the default Size, and scrolls it at a bigger one', async () => {
    // happy-dom lays nothing out: the chart is given a phone's width
    const was = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains('chartwrap') ? 350 : 0;
      },
    });
    try {
      renderStage();
      await screen.findAllByRole('img', { name: /Drum notation/ });
      const widest = () =>
        Math.max(
          ...screen
            .getAllByRole('img', { name: /Drum notation/ })
            .map((el) => Number(el.getAttribute('width')))
        );
      await waitFor(() => expect(widest()).toBeLessThanOrEqual(350));
      expect(widest()).toBeGreaterThan(300);
      fireEvent.change(screen.getByRole('slider', { name: 'Chart size' }), {
        target: { value: '150' },
      });
      expect(widest()).toBeGreaterThan(450);
    } finally {
      if (was) Object.defineProperty(HTMLElement.prototype, 'clientWidth', was);
    }
  });

  it('switches to the drummer, replacing the chart tools/staves/legend with DrummerView', async () => {
    const user = userEvent.setup();
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const show = within(screen.getByRole('radiogroup', { name: 'Show' }));
    await user.click(show.getByRole('radio', { name: 'Drummer 3D' }));

    expect(show.getByRole('radio', { name: 'Drummer 3D' })).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByTestId('drummer-view-stub')).toBeInTheDocument();

    // the chart's legend and its own toolbar are gone; the staves stay only
    // in the print copy (hidden on screen by breaks.css), so Print chart works
    const notation = screen.queryAllByRole('img', { name: /Drum notation/ });
    expect(notation.length).toBeGreaterThan(0);
    for (const stave of notation) expect(stave.closest('.drummer-print')).not.toBeNull();
    expect(document.querySelector('.legend')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Counting guide' })).not.toBeInTheDocument();
  });

  it('keeps the arrangement and the step editor on screen while the drummer shows', async () => {
    const user = userEvent.setup();
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    await user.click(screen.getByRole('radio', { name: 'Drummer 3D' }));
    await screen.findByTestId('drummer-view-stub');

    expect(screen.getByRole('group', { name: 'Arrangement' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Step editor' })).toBeInTheDocument();
    expect(document.querySelectorAll('.cell').length).toBeGreaterThan(0);
  });

  it('switches back to the chart, restoring the staves', async () => {
    const user = userEvent.setup();
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    await user.click(screen.getByRole('radio', { name: 'Drummer 3D' }));
    await screen.findByTestId('drummer-view-stub');

    await user.click(screen.getByRole('radio', { name: 'Chart' }));

    expect(await screen.findAllByRole('img', { name: /Drum notation/ })).not.toHaveLength(0);
    expect(screen.queryByTestId('drummer-view-stub')).not.toBeInTheDocument();
  });

  it('persists the Show choice to localStorage and restores it on a fresh mount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    await user.click(screen.getByRole('radio', { name: 'Drummer 3D' }));
    await screen.findByTestId('drummer-view-stub');
    expect(JSON.parse(localStorage.getItem('bb.stageView') ?? 'null')).toBe('drummer');
    unmount();

    renderStage();
    expect(await screen.findByTestId('drummer-view-stub')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Counting guide' })).not.toBeInTheDocument();
  });
});

describe('Stage from a tablet up — the drummer always on screen', () => {
  beforeEach(() => stubWidth(LAPTOP));

  it('keeps the drummer small in the corner of the chart view, with no Show to choose', async () => {
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    expect(screen.getByTestId('drummer-view-stub')).toHaveAttribute('data-pip', 'true');
    expect(screen.queryByRole('radiogroup', { name: 'Show' })).toBeNull();
    expect(document.querySelector('.stage')).toHaveClass('has-pip');
    // the transport is the docked bar's, under the chart
    expect(document.querySelector('.player-bar.docked')).not.toBeNull();
  });

  it('makes the drummer the main view when the corner is clicked, and keeps the same player', async () => {
    const user = userEvent.setup();
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });
    expect(mounts.count).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Watch the drummer' }));
    expect(screen.getByTestId('drummer-view-stub')).toHaveAttribute('data-pip', 'false');
    expect(JSON.parse(localStorage.getItem('bb.stageView') ?? 'null')).toBe('drummer');
    expect(document.querySelector('.legend')).toBeNull();
    // over the drummer the bar is the player's own: none docked under it
    expect(document.querySelector('.player-bar.docked')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Chart view' }));
    expect(screen.getByTestId('drummer-view-stub')).toHaveAttribute('data-pip', 'true');
    expect(await screen.findAllByRole('img', { name: /Drum notation/ })).not.toHaveLength(0);
    // the player seated at the start is the one still at the kit
    expect(mounts.count).toBe(1);
  });

  it("goes to the drummer from the docked bar's Drummer view", async () => {
    const user = userEvent.setup();
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    await user.click(screen.getByRole('button', { name: 'Drummer view' }));
    expect(screen.getByTestId('drummer-view-stub')).toHaveAttribute('data-pip', 'false');
  });
});
