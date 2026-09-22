// @vitest-environment happy-dom

/**
 * `KitPanel`, mounted on its own.
 *
 * `tests/unit/components/app/shell/studio-frame.test.tsx` already covers the
 * kit-tuning round trip (Room slider, disabled-until-tuned) and the
 * synth-vs-pack knob difference through the full frame. This file does not
 * repeat those: it covers the `user` engine (sample slots, its own param
 * set), the `kitStatus` line's branches, the master-chain read-outs, the
 * audition button with no Web Audio, and reset-this-voice.
 *
 * `KitPanel` renders no toast itself — `say()` only sets `Studio.toast`,
 * which `StudioFrame` displays. A small probe reads it back here.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KitPanel } from '@/components/app/studio/panels/kit-panel';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';

function ToastProbe() {
  const c = useStudio();
  return <div role="status">{c.toast}</div>;
}

const renderPanel = () =>
  render(
    <StudioProvider>
      <KitPanel />
      <ToastProbe />
    </StudioProvider>
  );

const voiceCard = () => within(screen.getByRole('heading', { name: 'Voice' }).closest('.card')!);
const kitCard = () =>
  within(
    screen
      .getAllByRole('heading', { name: 'Kit' })
      .find((h) => h.closest('.card'))!
      .closest('.card')!
  );
const kitPicker = () => kitCard().getByLabelText('Kit');

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('KitPanel', () => {
  it('shows no kit-status line for a synthesised kit', async () => {
    renderPanel();
    await screen.findByLabelText('Kit');
    // 'studio70' is the default and is synthesised — no decoding to report
    expect(screen.queryByText(/samples loaded/)).toBeNull();
    expect(screen.queryByText(/recorded lanes/)).toBeNull();
  });

  it('says the recordings are still decoding for a pack kit with nothing loaded yet', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.selectOptions(kitPicker(), 'virtuosity');
    expect(await screen.findByText('Decoding the recordings…')).toBeTruthy();
  });

  it('says no samples are loaded yet for the user-samples kit with nothing loaded', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.selectOptions(kitPicker(), 'user');
    expect(await screen.findByText('No samples loaded yet')).toBeTruthy();
  });

  it('shows the sample-slot loader only for the user-samples engine', async () => {
    const user = userEvent.setup();
    renderPanel();
    expect(screen.queryByText('Samples')).toBeNull();

    await user.selectOptions(kitPicker(), 'user');
    expect(await screen.findByText('Samples')).toBeTruthy();
    // and the voice knobs switch to the recording's own set: speed, level, room
    // — the hi-hat (the default voice) no longer offers a filter to sweep
    expect(voiceCard().getByLabelText('Speed')).toBeTruthy();
    expect(voiceCard().getByLabelText('Level')).toBeTruthy();
    expect(voiceCard().queryByLabelText('Bright')).toBeNull();
  });

  it('reads the master-chain sliders back in their own units', async () => {
    renderPanel();
    await screen.findByLabelText('Kit');

    const room = kitCard().getByLabelText<HTMLInputElement>('Room');
    fireEvent.change(room, { target: { value: '61' } });
    expect(kitCard().getByText('61%')).toBeTruthy();

    const drive = kitCard().getByLabelText<HTMLInputElement>('Drive');
    fireEvent.change(drive, { target: { value: '180' } });
    expect(kitCard().getByText('1.80×')).toBeTruthy();

    const top = kitCard().getByLabelText<HTMLInputElement>('Top end');
    fireEvent.change(top, { target: { value: '9000' } });
    expect(kitCard().getByText('9.0k')).toBeTruthy();
  });

  it('says there is no Web Audio when auditioning the kit in a browser without it', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: '▸ Play the kit' }));
    expect(await screen.findByText('No Web Audio in this browser')).toBeTruthy();
  });

  it('switches the voice knobs and hint per voice, including the toms/perc "aux" hint', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByLabelText('Kit');

    const seg = within(screen.getByRole('group', { name: 'Voice to tune' }));
    const hearIt = () => screen.getByRole('button', { name: '▸ Hear it' });

    // the hi-hat (default) is a synthesised voice: Size/Closed/Open/Bright/Room
    expect(voiceCard().getByLabelText('Size')).toBeTruthy();
    expect(voiceCard().getByLabelText('Bright')).toBeTruthy();
    expect(screen.getByText(/Cymbals are built from an inharmonic partial cluster/)).toBeTruthy();
    // hearing the hi-hat schedules a second, delayed "open" hit — let it land
    await user.click(hearIt());
    await new Promise((r) => setTimeout(r, 350));
    // and committing a knob drag (pointer up) plays it back too
    fireEvent.pointerUp(voiceCard().getByLabelText('Size'));

    // toms and percussion are synthesised on every kit, so they get the
    // "aux" hint rather than the engine's own — even on a synthesised kit
    await user.click(seg.getByRole('button', { name: 'Toms' }));
    expect(voiceCard().getByLabelText('Floor')).toBeTruthy();
    expect(screen.getByText(/Toms and percussion are synthesised on every kit/)).toBeTruthy();

    await user.click(seg.getByRole('button', { name: 'Perc' }));
    expect(voiceCard().getByLabelText('Pitch')).toBeTruthy();
    expect(screen.getByText(/Toms and percussion are synthesised on every kit/)).toBeTruthy();

    // the snare's "Hear it" plays a ghost variant, with no second hit
    await user.click(seg.getByRole('button', { name: 'Snare' }));
    await user.click(hearIt());

    // the ride's "Hear it" schedules a second, delayed "bell" hit
    await user.click(seg.getByRole('button', { name: 'Ride' }));
    await user.click(hearIt());
    await new Promise((r) => setTimeout(r, 350));

    // back to a kit-engine voice: the synth hint returns
    await user.click(seg.getByRole('button', { name: 'Kick' }));
    expect(voiceCard().getByLabelText('Tune')).toBeTruthy();
    expect(screen.getByText(/Cymbals are built from an inharmonic partial cluster/)).toBeTruthy();
    // committing a knob drag away from the hi-hat plays it back with no variant
    fireEvent.pointerUp(voiceCard().getByLabelText('Tune'));
  });

  it('resets one voice back to the kit default after tuning it', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByLabelText('Kit');

    // the default voice is the hi-hat; its "tune" knob is labelled "Size"
    const size = voiceCard().getByLabelText<HTMLInputElement>('Size');
    const shipped = size.value;
    const changed = (Number(shipped) + 0.1).toFixed(2);
    fireEvent.change(size, { target: { value: changed } });
    expect(voiceCard().getByLabelText<HTMLInputElement>('Size').value).toBe(changed);

    await user.click(screen.getByRole('button', { name: 'Reset this voice' }));
    expect(voiceCard().getByLabelText<HTMLInputElement>('Size').value).toBe(shipped);
  });
});
