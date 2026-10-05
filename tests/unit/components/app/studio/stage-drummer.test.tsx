// @vitest-environment happy-dom

/**
 * The Stage's "Show" choice — Chart vs Drummer 3D — backed by
 * `useStoredSetting(STAGE_VIEW)` (`bb.stageView`).
 *
 * Modelled on `stage.test.tsx` and `stage-playhead.test.tsx`: `<Stage/>` is
 * mounted for real against a real `StudioProvider` and the seed catalogue,
 * so the chart it would otherwise show is the real generated pattern. Only
 * `DrummerView` itself is mocked — it has its own full test file
 * (`drummer/drummer-view.test.tsx`) — so this file proves what `Stage` is
 * actually responsible for: which pieces of itself it swaps out when the
 * Show choice flips, and which ones it does not.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Stage } from '@/components/app/studio/stage';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';

vi.mock('@/components/app/studio/drummer/drummer-view', () => ({
  DrummerView: () => <div data-testid="drummer-view-stub">the 3D drummer</div>,
}));

const renderStage = () =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <Stage />
    </StudioProvider>
  );

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('Stage — Show: Chart vs Drummer 3D', () => {
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
    expect(screen.queryByTestId('drummer-view-stub')).not.toBeInTheDocument();
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
