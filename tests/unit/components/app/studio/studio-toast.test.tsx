// @vitest-environment happy-dom

/**
 * The Studio's line of feedback (Phase 5, E9): how long each kind stays, and
 * what is on it. `useNotice` holds it; `StudioToast` draws it.
 */

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { StudioToast } from '@/components/app/studio/studio-toast';
import { TOAST_MS, UNDO_MS, type Say } from '@/components/app/studio/use-notice';
import { testCatalogue } from '@/tests/helpers/catalogue';

let say: Say = () => {};
function Mouth() {
  say = useStudio().say;
  return null;
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <Mouth />
      <StudioToast />
    </StudioProvider>
  );
});

afterEach(() => {
  vi.useRealTimers();
});

const status = () => screen.getByRole('status').textContent;
const alert = () => screen.getByRole('alert').textContent;
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe('StudioToast', () => {
  it('shows a confirmation politely, and takes it down after a moment', async () => {
    act(() => say('Link copied'));
    expect(status()).toBe('Link copied');
    expect(alert()).toBe('');
    expect(screen.queryByRole('button')).toBeNull();
    await wait(TOAST_MS + 50);
    expect(status()).toBe('');
  });

  it('keeps an error up until it is dismissed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    act(() => say('That did not save', { error: true }));
    expect(alert()).toBe('That did not save');
    expect(status()).toBe('');
    expect(document.querySelector('.toast')).toHaveClass('show', 'error');

    await wait(5000);
    expect(alert()).toBe('That did not save');

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(alert()).toBe('');
    expect(document.querySelector('.toast')).not.toHaveClass('show');
  });

  it('gives the same message, said again, its full time over', async () => {
    act(() => say('Could not pin that — try again'));
    await wait(TOAST_MS - 400);
    act(() => say('Could not pin that — try again'));
    await wait(TOAST_MS - 400);
    /* Past where the first one would have gone. */
    expect(status()).toBe('Could not pin that — try again');
    await wait(500);
    expect(status()).toBe('');
  });

  it('holds an Undo for its own time, and runs it once when pressed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const undo = vi.fn();
    act(() => say('History cleared', { action: { label: 'Undo', run: undo } }));
    await wait(TOAST_MS + 50);
    expect(status()).toBe('History cleared');

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(status()).toBe('');
  });

  it('lets an Undo go when its time is up', async () => {
    act(() => say('History cleared', { action: { label: 'Undo', run: () => {} } }));
    await wait(UNDO_MS + 50);
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });
});
