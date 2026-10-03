// @vitest-environment happy-dom

/**
 * `ExportPanel`, mounted on its own.
 *
 * `tests/unit/components/app/shell/studio-frame.test.tsx` already round-trips
 * a break through the share code (copy → paste → load). This file does not
 * repeat that: it covers the copy-rejected branch, a garbage pasted code, the
 * MIDI download, Print, and opening/closing a MIDI output port.
 *
 * `ExportPanel` itself renders no toast — `say()` only sets `Studio.notice`,
 * which `StudioFrame` displays. A small probe reads it back here without
 * mounting the frame (and its CSS/header/consent dependencies) just to show
 * one line of text.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExportPanel } from '@/components/app/studio/panels/export-panel';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { midiFileName } from '@/lib/app/breaks/midi';
import { encodeBreak } from '@/lib/app/breaks/share';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

function ToastProbe() {
  const c = useStudio();
  return <div role="status">{c.notice?.message}</div>;
}

/** The console's own MIDI and title, read at the moment the test asks. */
let studio: ReturnType<typeof useStudio> | null = null;
function StudioProbe() {
  studio = useStudio();
  return null;
}

const renderPanel = () =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <ExportPanel />
      <ToastProbe />
      <StudioProbe />
    </StudioProvider>
  );

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('ExportPanel', () => {
  it('copies the break code and the link separately, each with its own toast', async () => {
    const user = userEvent.setup();
    const written: string[] = [];
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {
        writeText: (t: string) => {
          written.push(t);
          return Promise.resolve();
        },
      },
    });
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Copy break code' }));
    expect(await screen.findByText('Break code copied')).toBeTruthy();
    expect(written[0]?.length).toBeGreaterThan(100);

    await user.click(screen.getByRole('button', { name: 'Copy Studio link' }));
    expect(await screen.findByText('Studio link copied')).toBeTruthy();
    expect(written[1]).toContain(written[0]);
    expect(written[1]).toMatch(/#b=/);
  });

  it('says so when the clipboard write is blocked', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {
        writeText: () => Promise.reject(new Error('denied')),
      },
    });
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Copy break code' }));
    expect(await screen.findByText('Copy blocked — select the text manually')).toBeTruthy();
  });

  it('loads a pasted code that round-trips through the share format', async () => {
    const user = userEvent.setup();
    renderPanel();

    const funk = testStyle('funk');
    const A = generatePattern({
      style: funk,
      meter: '4/4',
      seed: 7,
      bars: 2,
      density: 50,
      ghosts: 50,
    });
    const code = encodeBreak({
      bpm: 100,
      swing: 0,
      level: 5,
      arrangement: ['A', 'B'],
      A,
      B: deriveB(A, funk.params),
    });

    const box = screen.getByLabelText('Load a break code');
    await user.click(box);
    await user.paste(code);
    await user.click(screen.getByRole('button', { name: 'Load it' }));

    expect(await screen.findByText('Break loaded')).toBeTruthy();
  });

  it('rejects a pasted code that is not one of ours', async () => {
    const user = userEvent.setup();
    renderPanel();

    const box = screen.getByLabelText('Load a break code');
    await user.click(box);
    await user.paste('not-a-real-code');
    await user.click(screen.getByRole('button', { name: 'Load it' }));

    expect(await screen.findByText('That is not a BeatBreaker code')).toBeTruthy();
  });

  it('downloads the arrangement as an audio/midi file named after the pattern', async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    const created = vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
      blobs.push(b as Blob);
      return 'blob:midi';
    });
    const revoked = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    /* The hats are humanised with Math.random, so two exports of one pattern
       differ by a velocity here and there; held still, they are the same file. */
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const clicked: HTMLAnchorElement[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clicked.push(this);
    });
    renderPanel();
    await screen.findByRole('button', { name: 'Download .mid' });
    await waitFor(() => expect(studio?.patterns.A).toBeTruthy());

    await user.click(screen.getByRole('button', { name: 'Download .mid' }));

    const title = studio!.patterns.A!.name;
    expect(blobs).toHaveLength(1);
    expect(blobs[0].type).toBe('audio/midi');
    const bytes = [...new Uint8Array(await blobs[0].arrayBuffer())];
    expect(bytes).toEqual(studio!.midi()!.bytes);
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe(midiFileName(title));
    expect(clicked[0].href).toBe('blob:midi');
    expect(await screen.findByText(`Downloaded ${midiFileName(title)}`)).toBeTruthy();
    await waitFor(() => expect(revoked).toHaveBeenCalledWith('blob:midi'));

    created.mockRestore();
    revoked.mockRestore();
    click.mockRestore();
    random.mockRestore();
  });

  it('prints from a button, not a hint', async () => {
    const user = userEvent.setup();
    const print = vi.fn();
    vi.stubGlobal('print', print);
    renderPanel();

    await user.click(await screen.findByRole('button', { name: 'Print chart' }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/⌘P prints/)).toBeNull();
  });

  it('disables MIDI out and says why when the browser has no Web MIDI, before any press', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: 'MIDI out' })).toBeDisabled();
    expect(screen.getByText(/MIDI out isn.t available in this browser/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download .mid' })).toBeEnabled();
  });

  it('opens and closes a MIDI output port when Web MIDI is available', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      ...navigator,
      requestMIDIAccess: () =>
        Promise.resolve({
          outputs: new Map([['id', { name: 'Test Port' }]]),
        }),
    });
    renderPanel();

    const midiBtn = screen.getByRole('button', { name: 'MIDI out' });
    expect(midiBtn).toBeEnabled();
    expect(screen.queryByText(/isn.t available in this browser/)).toBeNull();
    expect(midiBtn).toHaveAttribute('aria-pressed', 'false');
    await user.click(midiBtn);

    expect(await screen.findByText(/Playback is also driving/)).toBeTruthy();
    expect(screen.getByText('Test Port')).toBeTruthy();
    expect(midiBtn).toHaveAttribute('aria-pressed', 'true');
    expect(midiBtn.className).toMatch(/\bon\b/);
    expect(midiBtn.textContent).toBe('MIDI out');

    await user.click(midiBtn);
    expect(await screen.findByText('MIDI out closed')).toBeTruthy();
    expect(midiBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/Playback is also driving/)).toBeNull();
  });
});
