// @vitest-environment happy-dom

/**
 * `GeneratePanel`, mounted on its own.
 *
 * `tests/unit/components/app/shell/studio-frame.test.tsx` already covers the
 * critic score/checks, and the lane picker showing the style's roster before
 * you take it over (the Toms checkbox, `.lanepick[data-locked]`). This file
 * does not repeat those: it reaches the panel's own computed read-outs (the
 * hi-hat dynamics string, the off-grid feel string and when it does or does
 * not render), the perc-lane rosters, the lock chips, the "Build B from A"
 * button, and the not-yet-ported kit option.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GeneratePanel } from '@/components/app/studio/panels/generate-panel';
import { Stage } from '@/components/app/studio/stage';
import { StudioProvider } from '@/components/app/studio/studio-provider';

const renderPanel = () =>
  render(
    <StudioProvider>
      <GeneratePanel />
    </StudioProvider>
  );

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('GeneratePanel', () => {
  it('reads the hi-hat dynamics as machine-even at 0, and as a shaped read-out otherwise', async () => {
    renderPanel();
    // funk ships with hats at 100, so the shaped read-out is what is on screen first
    const hatsSlider = await screen.findByLabelText('Hi-hat dynamics');
    expect(screen.getByText(/written accents on top/)).toBeTruthy();

    fireEvent.change(hatsSlider, { target: { value: '0' } });
    expect(
      screen.getByText('every hat the same weight — machine-even, accents and wobble off')
    ).toBeTruthy();
  });

  it('has no off-grid feel for a style with none, and shows it for one that has it', async () => {
    renderPanel();
    await screen.findByLabelText('Style');

    // funk has no `feel`
    expect(screen.queryByLabelText('Off-grid feel')).toBeNull();

    await userEvent.setup().selectOptions(screen.getByLabelText('Style'), 'reggae');

    // reggae has a feel, and feel ships at 100 (not straight), so the shaped
    // read-out — not the straight-line one — is what should be on screen
    const feelSlider = screen.getByLabelText<HTMLInputElement>('Off-grid feel');
    expect(screen.queryByText('straight — every hit lands on the grid')).toBeNull();
    expect(
      screen.getByText(/^kick [-+]?\d+ ms · snare [-+]?\d+ ms · off-16th hats [-+]?\d+ ms$/)
    ).toBeTruthy();

    fireEvent.change(feelSlider, { target: { value: '0' } });
    expect(screen.getByText('straight — every hit lands on the grid')).toBeTruthy();
  });

  it('shows the extras a style carries by default, and the plain-kit hint when it carries none', async () => {
    renderPanel();
    await screen.findByLabelText('Style');

    // funk carries nothing beyond the base five lanes
    expect(screen.getByText(/^Kick, snare, hats, ride and crash\./)).toBeTruthy();

    // gospel ships with toms AND a percussion slot (tambourine)
    await userEvent.setup().selectOptions(screen.getByLabelText('Style'), 'gospel');
    expect(
      screen.getByText(/^On top of the kit: High tom, Mid tom, Floor tom, Tambourine\./)
    ).toBeTruthy();
  });

  it('lets you pick a percussion instrument for Perc 1 and Perc 2 once you take the lanes over', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByLabelText('Style');

    await user.click(screen.getByRole('button', { name: 'Following the style' }));
    expect(document.querySelector('.lanepick')?.getAttribute('data-locked')).toBe('0');

    const perc1 = screen.getByLabelText<HTMLSelectElement>('Perc 1');
    const perc2 = screen.getByLabelText<HTMLSelectElement>('Perc 2');
    // the roster on offer is the full percussion table, not just the default two
    expect(within(perc1).getByRole('option', { name: 'Cowbell' })).toBeTruthy();
    expect(within(perc2).getByRole('option', { name: 'Woodblock' })).toBeTruthy();

    await user.selectOptions(perc1, 'cowbell');
    expect(perc1.value).toBe('cowbell');
    expect(screen.getByText(/^On top of the kit: Cowbell\./)).toBeTruthy();
  });

  it('marks the lock chips on when clicked', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByLabelText('Style');

    for (const name of ['Tempo', 'Kick', 'Snare', 'Hats']) {
      const btn = screen.getByRole('button', { name });
      expect(btn.className).not.toMatch(/\bon\b/);
      await user.click(btn);
      expect(btn.className).toMatch(/\bon\b/);
    }
  });

  it('marks a not-yet-ported kit as disabled, with a note in its label', async () => {
    renderPanel();
    await screen.findByLabelText('Kit');

    const option = screen.getByRole('option', { name: /TR-909 — not ported yet/ });
    expect(option).toBeDisabled();
  });

  it('recomputes B from the current A when "Build B from A" is pressed', async () => {
    const user = userEvent.setup();
    render(
      <StudioProvider>
        <Stage />
        <GeneratePanel />
      </StudioProvider>
    );
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const gridOf = () =>
      [...document.querySelectorAll('.cell')].map((c) => c.getAttribute('data-on')).join('');

    // switch to B-only so the grid we are reading is B's, not A's
    await user.click(
      within(screen.getByRole('group', { name: 'Edit which section' })).getByRole('button', {
        name: 'Edit B',
      })
    );
    const originalB = gridOf();

    // regenerate A alone — B is now stale, still derived from the old A
    await user.click(screen.getByRole('button', { name: 'New A only' }));
    expect(gridOf()).toBe(originalB);

    // now ask for B to be rebuilt from the new A
    await user.click(screen.getByRole('button', { name: 'Build B from A' }));
    expect(gridOf()).not.toBe(originalB);
  });
});
