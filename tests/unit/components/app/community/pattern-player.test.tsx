// @vitest-environment happy-dom

/**
 * `PatternPlayer` — the read-only player on `/p/[slug]` (Phase 6, task 6.6):
 * play, tempo and layer over the Studio's real transport and audio engine,
 * without the editor.
 *
 * The Web Audio engine (`BreakAudio`/`PackSource`) is replaced with a fake
 * shaped like `use-break-console.test.ts`'s and `studio-transport.test.tsx`'s:
 * `init()` hands back a plain `{ currentTime }` clock instead of a real
 * `AudioContext`, gated by `fakes.state.hasAudio` so both "Web Audio
 * available" and "no Web Audio" (happy-dom's actual, real state) are
 * reachable from the same fixture. `Transport` itself is never mocked — start,
 * stop, the scheduler's snapshot read and the kit-selection fallback are the
 * genuine implementation running against the fake engine.
 *
 * @see components/app/community/pattern-player.tsx
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fakes = vi.hoisted(() => {
  const ctx = { currentTime: 0 };
  const state = { hasAudio: true };
  class FakeAudio {
    ctx: typeof ctx | null = null;
    samples: unknown = null;
    percussion: unknown = null;
    setKit = vi.fn();
    setPanView = vi.fn();
    // the lane channel (Phase 9): plays the voice, as the engine does
    playIn = vi.fn((_lane: string, _level: number, _t: number, play: () => void) => play());
    resume = vi.fn();
    reseed = vi.fn();
    close = vi.fn();
    click = vi.fn();
    kick = vi.fn();
    snare = vi.fn();
    hat = vi.fn();
    ride = vi.fn();
    crash = vi.fn();
    tom = vi.fn();
    perc = vi.fn();
    init = vi.fn(() => {
      if (!state.hasAudio) return null;
      this.ctx = ctx;
      return ctx;
    });
    constructor() {
      made.audio.push(this);
    }
  }
  class FakePacks {}
  const made: { audio: FakeAudio[] } = { audio: [] };
  return { ctx, state, made, FakeAudio, FakePacks };
});

vi.mock('@/lib/app/breaks/audio/engine', () => ({
  BreakAudio: fakes.FakeAudio,
  SourceStack: class {},
}));
vi.mock('@/lib/app/breaks/audio/packs', () => ({ PackSource: fakes.FakePacks }));

import { PatternPlayer } from '@/components/app/community/pattern-player';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import { testKits, testStyle } from '@/tests/helpers/catalogue';

function payload() {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 4,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  return breakPayload({
    bpm: 96,
    swing: 10,
    level: 5,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  });
}

/** Render, then wait for the engine the player imports after its first render. */
async function renderReady(kits = testKits()) {
  const view = render(<PatternPlayer payload={payload()} kits={kits} />);
  await waitFor(() => expect(fakes.made.audio).toHaveLength(1));
  return view;
}

beforeEach(() => {
  fakes.made.audio.length = 0;
  fakes.state.hasAudio = true;
  fakes.ctx.currentTime = 0;
  // Matches studio-transport.test.tsx: a synchronous stand-in so the real
  // Transport's paint loop doesn't depend on a genuine animation frame.
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PatternPlayer', () => {
  it('renders the play button, tempo and layer controls', () => {
    render(<PatternPlayer payload={payload()} kits={testKits()} />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/tempo/i)).toBeInTheDocument();
    // Exact match: a /layer/i regex also matches the group's
    // aria-label="Player" ("Player" contains "layer" case-insensitively).
    expect(screen.getByLabelText('Layer')).toBeInTheDocument();
  });

  it('shows the "cannot play audio" status when Web Audio is unavailable, and does not flip to Stop', async () => {
    // happy-dom genuinely has no AudioContext; the fake mirrors that here so
    // the assertion holds even if a future test environment adds one.
    expect(window.AudioContext).toBeUndefined();
    fakes.state.hasAudio = false;
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole('button', { name: /play/i }));

    expect(screen.getByText(/this browser cannot play audio here/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^stop$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('updates the tempo label when the tempo slider changes', () => {
    render(<PatternPlayer payload={payload()} kits={testKits()} />);
    const slider = screen.getByLabelText(/tempo: 96 bpm/i);
    // user-event's `type`/`clear` don't drive range inputs; a direct change
    // event is the realistic way a slider reports a new value to React.
    fireEvent.change(slider, { target: { value: '120' } });
    expect(screen.getByText('Tempo: 120 bpm')).toBeInTheDocument();
    expect(screen.queryByLabelText(/tempo: 96 bpm/i)).toBeNull();
  });

  it('updates the layer label when a different layer is selected', async () => {
    const user = userEvent.setup();
    render(<PatternPlayer payload={payload()} kits={testKits()} />);
    const select = screen.getByLabelText<HTMLSelectElement>('Layer');
    expect(select.value).toBe('5');
    await user.selectOptions(select, '2');
    expect(select.value).toBe('2');
    expect(select.selectedOptions[0].textContent).toMatch(/^2 ·/);
  });

  it('starts the transport on Play, and Stop actually stops it, toggling the button back', async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole('button', { name: /^play$/i }));

    // Real Transport.start() succeeded: it resumed the (fake) audio context,
    // and the UI reflects a genuinely playing transport, not a mock echo.
    expect(fakes.made.audio[0].resume).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /^stop$/i })).toBeInTheDocument();
    expect(screen.queryByText(/cannot play audio/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: /^stop$/i }));

    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^stop$/i })).toBeNull();
  });

  it('keeps playing across a tempo change, and a layer change, without restarting the engine', async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole('button', { name: /^play$/i }));
    expect(screen.getByRole('button', { name: /^stop$/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/tempo/i), { target: { value: '120' } });
    expect(screen.getByText('Tempo: 120 bpm')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText<HTMLSelectElement>('Layer'), '2');
    expect(screen.getByLabelText<HTMLSelectElement>('Layer').value).toBe('2');

    // Still the same running transport — no second engine was constructed to
    // pick up the new tempo/layer snapshot, and it is still playing.
    expect(fakes.made.audio).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^stop$/i })).toBeInTheDocument();
  });

  it('falls back to the first available kit when the default kit is not in the catalogue', async () => {
    const { studio70: _dropped, ...withoutDefault } = testKits();
    const expectedFallback = Object.values(withoutDefault)[0];

    await renderReady(withoutDefault);

    expect(fakes.made.audio[0].setKit).toHaveBeenCalledWith(expectedFallback, expect.anything());
  });

  it('sets no kit at all, rather than crashing, when the catalogue has none', async () => {
    await renderReady({});

    expect(fakes.made.audio[0].setKit).toHaveBeenCalledWith(null, expect.anything());
  });

  it('closes the audio engine when the player unmounts', async () => {
    const { unmount } = await renderReady();
    const engine = fakes.made.audio[0];
    expect(engine.close).not.toHaveBeenCalled();

    unmount();

    expect(engine.close).toHaveBeenCalledTimes(1);
  });
});
