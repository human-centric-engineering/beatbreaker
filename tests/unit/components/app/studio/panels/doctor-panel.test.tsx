// @vitest-environment happy-dom

/**
 * `DoctorPanel`, mounted on its own.
 *
 * `tests/unit/components/app/shell/studio-frame.test.tsx` already covers
 * "clears a section without losing it" (clear → undo) through the full
 * frame's own drawer-opening path. This file does not repeat that journey —
 * it reaches `DoctorPanel`'s own undo/redo enabling logic directly (fresh:
 * both disabled; after a move: undo enabled, redo still not; after undo:
 * redo enabled too) and the clear-section feedback text.
 *
 * `DoctorPanel` renders no toast itself — `say()` only sets `Studio.toast`,
 * which `StudioFrame` displays. A small probe reads it back here, and
 * `<Stage/>` is mounted alongside to read the grid so "clear" is proven by
 * what is drawn, not just by the toast.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DoctorPanel } from '@/components/app/studio/panels/doctor-panel';
import { Stage } from '@/components/app/studio/stage';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';

function ToastProbe() {
  const c = useStudio();
  return <div role="status">{c.toast}</div>;
}

const renderPanel = () =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <Stage />
      <DoctorPanel />
      <ToastProbe />
    </StudioProvider>
  );

const NOTES = ".cell:not([data-on='0'])";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('DoctorPanel', () => {
  it('ships with undo and redo both disabled', async () => {
    renderPanel();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    expect(screen.getByRole('button', { name: '↶ Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '↷ Redo' })).toBeDisabled();
  });

  it('enables undo after a doctor move, and redo after undoing it', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    // ghosts only survive the layer reduction from L4 up, so view the full
    // break or an added ghost note would be invisible in the grid
    await user.click(screen.getByRole('button', { name: 'L5' }));
    const before = document.querySelectorAll(NOTES).length;

    await user.click(screen.getByRole('button', { name: 'Add ghost notes' }));
    expect(screen.getByRole('button', { name: '↶ Undo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '↷ Redo' })).toBeDisabled();
    // ghost notes were actually added to the chart, not just to history
    expect(document.querySelectorAll(NOTES).length).toBeGreaterThan(before);

    await user.click(screen.getByRole('button', { name: '↶ Undo' }));
    expect(screen.getByRole('button', { name: '↷ Redo' })).toBeEnabled();
    expect(document.querySelectorAll(NOTES).length).toBe(before);
  });

  it('clears the section being edited and says so, with undo bringing it back', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const before = document.querySelectorAll(NOTES).length;
    expect(before).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Clear section' }));
    expect(document.querySelectorAll(NOTES).length).toBe(0);
    expect(await screen.findByText('Section A cleared — undo brings it back')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '↶ Undo' }));
    expect(document.querySelectorAll(NOTES).length).toBe(before);
  });
});
