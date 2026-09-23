// @vitest-environment happy-dom

/**
 * `ExportPanel`, mounted on its own.
 *
 * `tests/unit/components/app/shell/studio-frame.test.tsx` already round-trips
 * a break through the share code (copy → paste → load). This file does not
 * repeat that: it covers the copy-rejected branch, a garbage pasted code, the
 * MIDI base64 copy, and opening/closing a MIDI output port.
 *
 * `ExportPanel` itself renders no toast — `say()` only sets `Studio.toast`,
 * which `StudioFrame` displays. A small probe reads it back here without
 * mounting the frame (and its CSS/header/consent dependencies) just to show
 * one line of text.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExportPanel } from '@/components/app/studio/panels/export-panel';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { encodeBreak } from '@/lib/app/breaks/share';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

function ToastProbe() {
  const c = useStudio();
  return <div role="status">{c.toast}</div>;
}

const renderPanel = () =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <ExportPanel />
      <ToastProbe />
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

    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(await screen.findByText('Link copied')).toBeTruthy();
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

  it('copies a plausible base64 MIDI file', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Copy MIDI (base64)' }));
    expect(await screen.findByText('MIDI copied')).toBeTruthy();
    expect(written[0]?.length).toBeGreaterThan(0);
    expect(written[0]).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('says there is no Web MIDI when the browser has none', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'MIDI out…' }));
    expect(await screen.findByText('This browser has no Web MIDI')).toBeTruthy();
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

    const midiBtn = screen.getByRole('button', { name: 'MIDI out…' });
    await user.click(midiBtn);

    const opened = await screen.findByRole('button', { name: 'MIDI out: Test Port' });
    expect(opened.className).toMatch(/\bon\b/);
    expect(screen.getByText(/Playback is also driving/)).toBeTruthy();

    await user.click(opened);
    expect(await screen.findByText('MIDI out closed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'MIDI out…' })).toBeTruthy();
    expect(screen.queryByText(/Playback is also driving/)).toBeNull();
  });
});
