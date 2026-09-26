// @vitest-environment happy-dom

/**
 * `PracticePanel`, mounted on its own.
 *
 * `tests/unit/components/app/shell/studio-frame.test.tsx` already round-trips
 * the tempo trainer's layer-vs-break tempo behaviour (L1↔L5) through the full
 * frame. This file does not repeat that: it covers the metronome toggles, the
 * ramp lock buttons, the ceiling slider, the quick-tempo presets, the
 * match-tempo toggle, and the mixer's fader/mute/reset-to-style behaviour.
 *
 * The panel itself shows no BPM read-out — that lives in the transport, which
 * the frame mounts in the header. `StudioTransport` is a small, CSS-free
 * component of its own (no stylesheet import), so it is mounted alongside the
 * panel here purely to read `.bpmval` back — not to re-test the frame.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PracticePanel } from '@/components/app/studio/panels/practice-panel';
import { StudioTransport } from '@/components/app/shell/studio-transport';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';

const renderPanel = () =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <StudioTransport />
      <PracticePanel />
    </StudioProvider>
  );

const bpm = () => Number(document.querySelector('.bpmval')?.textContent?.match(/\d+/)?.[0]);

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

/** The console's own count-in and tempo, read with no transport mounted. */
function Probe() {
  const c = useStudio();
  return <output data-testid="probe">{`${c.countIn}|${c.bpm}`}</output>;
}

describe('PracticePanel', () => {
  /* Below 1024px the header transport is not there, so these are the only
     count-in and Tap a phone has (E3). Mounted without it, as on a phone. */
  it('sets the count-in and taps the tempo with no header transport', async () => {
    const user = userEvent.setup();
    render(
      <StudioProvider catalogue={testCatalogue()}>
        <PracticePanel />
        <Probe />
      </StudioProvider>
    );
    await screen.findByText('Click and tempo');
    const probe = () => screen.getByTestId('probe').textContent.split('|').map(Number);

    const count = within(screen.getByRole('radiogroup', { name: 'Count-in' }));
    expect(count.getAllByRole('radio').map((b) => b.textContent)).toEqual([
      'off',
      '1 bar',
      '2 bars',
    ]);
    await user.click(count.getByRole('radio', { name: '2 bars' }));
    expect(count.getByRole('radio', { name: '2 bars' })).toHaveAttribute('aria-checked', 'true');
    expect(probe()[0]).toBe(2);

    /* Two taps half a second apart is 120 bpm. */
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(10_000);
    await user.click(screen.getByRole('button', { name: 'Tap tempo' }));
    now.mockReturnValue(10_500);
    await user.click(screen.getByRole('button', { name: 'Tap tempo' }));
    now.mockRestore();
    expect(probe()[1]).toBe(120);
  });

  it('toggles the metronome click, with a label that stays put', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Click and tempo');

    const clickBtn = screen.getByRole('button', { name: 'Click' });
    const startedOn = clickBtn.getAttribute('aria-pressed') === 'true';
    await user.click(clickBtn);
    expect(clickBtn).toHaveAttribute('aria-pressed', String(!startedOn));
    expect(clickBtn.className.includes('on')).toBe(!startedOn);
    expect(clickBtn.textContent).toBe('Click');
  });

  it('chooses the click subdivision between quarters and eighths', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Click and tempo');

    const plays = within(screen.getByRole('radiogroup', { name: 'Click plays' }));
    expect(plays.getByRole('radio', { name: 'Quarters' })).toHaveAttribute('aria-checked', 'true');
    await user.click(plays.getByRole('radio', { name: 'Eighths' }));
    expect(plays.getByRole('radio', { name: 'Eighths' })).toHaveAttribute('aria-checked', 'true');
    expect(plays.getByRole('radio', { name: 'Quarters' })).toHaveAttribute('aria-checked', 'false');
  });

  it('moves the tempo trainer between off and each step size, and says which', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Tempo trainer');

    const ramp = within(screen.getByRole('radiogroup', { name: 'Tempo trainer' }));
    const off = ramp.getByRole('radio', { name: 'Off' });
    const plus1 = ramp.getByRole('radio', { name: '+1' });
    const plus2 = ramp.getByRole('radio', { name: '+2' });
    const plus5 = ramp.getByRole('radio', { name: '+5' });

    // ramp ships off
    expect(off).toHaveAttribute('aria-checked', 'true');

    await user.click(plus2);
    expect(off).toHaveAttribute('aria-checked', 'false');
    expect(plus2).toHaveAttribute('aria-checked', 'true');
    expect(plus1).toHaveAttribute('aria-checked', 'false');
    expect(plus5).toHaveAttribute('aria-checked', 'false');

    /* One tab stop for the group, and the arrows move the choice. */
    expect(plus2).toHaveAttribute('tabindex', '0');
    expect(off).toHaveAttribute('tabindex', '-1');
    plus2.focus();
    await user.keyboard('{ArrowRight}');
    expect(plus5).toHaveAttribute('aria-checked', 'true');
    expect(plus5).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(off).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{End}');
    expect(plus5).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Home}');
    expect(off).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(plus5).toHaveAttribute('aria-checked', 'true');
  });

  it('moves the ceiling slider', async () => {
    renderPanel();
    await screen.findByText('Tempo trainer');

    const ceiling = screen.getByLabelText<HTMLInputElement>('Ceiling');
    const before = ceiling.value;
    fireEvent.change(ceiling, { target: { value: '150' } });
    expect(screen.getByLabelText<HTMLInputElement>('Ceiling').value).toBe('150');
    expect(ceiling.value).not.toBe(before);
  });

  it('sets the tempo from a quick-tempo preset, relative to the style', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Quick tempo');

    await user.click(screen.getByRole('button', { name: '75%' }));
    // funk's own range starts at 88, so 75% of it is a lower, specific number
    const seventyFive = bpm();
    expect(seventyFive).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Back to 100%' }));
    expect(bpm()).toBeGreaterThan(seventyFive);
  });

  it('toggles match-tempo-to-layer', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Match tempo to layer');

    const toggle = screen.getByRole('button', { name: 'Match tempo' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle.textContent).toBe('Match tempo');
  });

  it('shows one mixer row per active lane, and drags a fader', async () => {
    renderPanel();
    const muteButtons = await screen.findAllByRole('button', { name: /^Mute / });
    // funk carries the base five lanes: kick, snare, hats, ride, crash
    expect(muteButtons.length).toBe(5);

    const firstFader = document.querySelectorAll<HTMLInputElement>(
      '.mixrow input[type="range"]'
    )[0];
    expect(firstFader).toBeTruthy();
    fireEvent.change(firstFader, { target: { value: '40' } });
    expect(firstFader.value).toBe('40');
  });

  it('mutes and unmutes a lane', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Mixer');

    const muteBtn = within(document.querySelectorAll('.mixrow')[0] as HTMLElement).getByRole(
      'button',
      { name: /^Mute /u }
    );
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(muteBtn.textContent).toBe('Mute');

    await user.click(muteBtn);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(muteBtn.textContent).toBe('Mute');

    await user.click(muteBtn);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(muteBtn.textContent).toBe('Mute');
  });

  it('shows "Back to the style" once a fader is moved, and hides it again after resetting', async () => {
    renderPanel();
    await screen.findByText('Mixer');

    expect(screen.queryByRole('button', { name: 'Back to the style' })).toBeNull();

    const fader = document.querySelectorAll<HTMLInputElement>('.mixrow input[type="range"]')[0];
    fireEvent.change(fader, { target: { value: '40' } });

    const back = await screen.findByRole('button', { name: 'Back to the style' });
    fireEvent.click(back);

    expect(screen.queryByRole('button', { name: 'Back to the style' })).toBeNull();
    // and the fader itself is back where the style put it
    expect(
      document.querySelectorAll<HTMLInputElement>('.mixrow input[type="range"]')[0].value
    ).not.toBe('40');
  });
});
