// @vitest-environment happy-dom

/**
 * `CrossRhythmCard` (13-b), in the Edit drawer: a cross-rhythm written from
 * its ratio as a study of the section or a fill at the end of a bar, the
 * toast saying which — or why not. What it writes is `crossRhythm`'s, tested
 * in `tests/unit/lib/app/breaks/cross-rhythm.test.ts`; this is the wiring.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CrossRhythmCard } from '@/components/app/studio/panels/cross-rhythm-card';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';
import { pickOption } from '@/tests/helpers/select-menu';

function Probe() {
  const c = useStudio();
  const pat = c.patterns[c.editing];
  return (
    <>
      <div role="status">{c.notice?.message}</div>
      <div data-testid="ratio">{pat?.poly?.ratio ?? 'none'}</div>
      <div data-testid="spans">{pat?.polySpans?.length ?? 0}</div>
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

const mount = () =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <CrossRhythmCard />
      <Probe />
    </StudioProvider>
  );

describe('CrossRhythmCard', () => {
  it('writes a 3:2 fill at the end of a bar of the groove', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole('button', { name: 'Write the fill' }));
    expect(screen.getByRole('status')).toHaveTextContent(/A 3:2 fills the end of bar 1/);
    expect(screen.getByTestId('spans')).toHaveTextContent('1');
    expect(screen.getByTestId('ratio')).toHaveTextContent('none');
  });

  it('makes the section a 3:2 study, and then says why a fill cannot go in it', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole('button', { name: 'Write a study' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Section A is a 3:2 study/);
    expect(screen.getByTestId('ratio')).toHaveTextContent('3:2');

    await user.click(screen.getByRole('button', { name: 'Write the fill' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      /Not written: this section is already a cross-rhythm study/
    );
  });

  it('names its hands only where the cross-rhythm is on a hand’s lane', async () => {
    const user = userEvent.setup();
    mount();
    expect(await screen.findByRole('combobox', { name: 'Hands' })).toBeTruthy();
    await pickOption(user, screen.getByRole('combobox', { name: 'Cross-rhythm lane' }), 'hf');
    expect(screen.queryByRole('combobox', { name: 'Hands' })).toBeNull();
  });

  it('writes what the menus say: a 5:4 over the bar, the five in the left hand', async () => {
    const user = userEvent.setup();
    mount();
    await pickOption(
      user,
      await screen.findByRole('combobox', { name: 'Cross-rhythm notes' }),
      '5'
    );
    await pickOption(user, screen.getByRole('combobox', { name: 'Pulse notes' }), '4');
    await pickOption(user, screen.getByRole('combobox', { name: 'Cycle' }), 'bar');
    await pickOption(user, screen.getByRole('combobox', { name: 'Pulse lane' }), 'k');
    await pickOption(user, screen.getByRole('combobox', { name: 'Hands' }), 'L');
    await user.click(screen.getByRole('button', { name: 'Write a study' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Section A is a 5:4 study/);
    expect(screen.getByTestId('ratio')).toHaveTextContent('5:4');
  });

  it('fills the end of the bar chosen, and says why a cycle that does not fit is refused', async () => {
    const user = userEvent.setup();
    mount();
    await pickOption(user, await screen.findByRole('combobox', { name: 'Fill bar' }), '1');
    await pickOption(user, screen.getByRole('combobox', { name: 'Hands' }), 'none');
    await user.click(screen.getByRole('button', { name: 'Write the fill' }));
    expect(screen.getByRole('status')).toHaveTextContent(/fills the end of bar 2/);

    // two even notes against three do not fall on the grid over half a bar of sixteenths
    await pickOption(user, screen.getByRole('combobox', { name: 'Cross-rhythm notes' }), '2');
    await pickOption(user, screen.getByRole('combobox', { name: 'Pulse notes' }), '3');
    await user.click(screen.getByRole('button', { name: 'Write the fill' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Not written: 3 even notes do not fall/);
  });
});
