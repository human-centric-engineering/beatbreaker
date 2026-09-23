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
import { StudioProvider } from '@/components/app/studio/studio-provider';

const renderPanel = () =>
  render(
    <StudioProvider>
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

describe('PracticePanel', () => {
  it('toggles the metronome click on and off', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Practice rig');

    const clickBtn = screen.getByRole('button', { name: /^Click (on|off)$/ });
    const startedOn = clickBtn.textContent === 'Click on';
    await user.click(clickBtn);
    expect(clickBtn.textContent).toBe(startedOn ? 'Click off' : 'Click on');
    expect(clickBtn.className.includes('on')).toBe(!startedOn);
  });

  it('toggles the click subdivision between quarters and eighths', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Practice rig');

    const subBtn = screen.getByRole('button', { name: /^(Quarters|Eighths)$/ });
    const startedQuarters = subBtn.textContent === 'Quarters';
    await user.click(subBtn);
    expect(subBtn.textContent).toBe(startedQuarters ? 'Eighths' : 'Quarters');
  });

  it('moves the ramp lock between off and each step size', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Tempo trainer');

    const off = screen.getByRole('button', { name: 'Ramp off' });
    const plus1 = screen.getByRole('button', { name: '+1' });
    const plus2 = screen.getByRole('button', { name: '+2' });
    const plus5 = screen.getByRole('button', { name: '+5' });

    // ramp ships off
    expect(off.className).toMatch(/\bon\b/);

    await user.click(plus2);
    expect(off.className).not.toMatch(/\bon\b/);
    expect(plus2.className).toMatch(/\bon\b/);
    expect(plus1.className).not.toMatch(/\bon\b/);
    expect(plus5.className).not.toMatch(/\bon\b/);

    await user.click(off);
    expect(off.className).toMatch(/\bon\b/);
    expect(plus2.className).not.toMatch(/\bon\b/);
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

    const toggle = screen.getByRole('button', { name: 'Off' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true');
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
    expect(muteBtn.textContent).toBe('Muted');

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
