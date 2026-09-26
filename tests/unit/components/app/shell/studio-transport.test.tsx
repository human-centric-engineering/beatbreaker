// @vitest-environment happy-dom

/**
 * The transport, in both shapes it is drawn in.
 *
 * Mounted inside a real `StudioProvider`, following `studio-frame.test.tsx`.
 * The one seam replaced is the browser-facing edge of the audio graph
 * (`BreakAudio` / `PackSource` / `YourSampleSource` / `MidiOut`) — the same fakes
 * `use-break-console.test.ts` uses to drive play/stop without a sound card.
 * Everything above that seam — the provider, the real scheduler in
 * `lib/app/breaks/audio/transport.ts`, and the transport/LED components
 * themselves — is real, so `playing` and `position` are genuine state the
 * scheduler produced, not something the test injected.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PhoneTransport,
  StudioTransport,
  TransportLeds,
} from '@/components/app/shell/studio-transport';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { activeLanes } from '@/lib/app/breaks/lanes';
import type { LaneKey } from '@/lib/app/breaks/types';
import { testCatalogue } from '@/tests/helpers/catalogue';

/**
 * The scheduler's own clock, faked exactly as far as it has to be: a plain
 * `{ currentTime }` object, mutated by the test rather than a real
 * `AudioContext`. `Transport` (the real class) reads it on every tick, so
 * moving it forward is what makes a step actually get painted.
 */
const fakes = vi.hoisted(() => {
  const ctx = { currentTime: 0 };
  class FakeAudio {
    ctx: typeof ctx | null = null;
    samples: unknown = null;
    setKit = vi.fn();
    resume = vi.fn();
    hit = vi.fn();
    demo = vi.fn(() => true);
    click = vi.fn();
    kick = vi.fn();
    snare = vi.fn();
    hat = vi.fn();
    ride = vi.fn();
    crash = vi.fn();
    tom = vi.fn();
    perc = vi.fn();
    init = vi.fn(() => {
      this.ctx = ctx;
      return ctx;
    });
    close = vi.fn(() => {
      this.ctx = null;
    });
  }
  class FakePacks {
    usePercSamples = true;
    count = vi.fn(() => 0);
    percCount = vi.fn(() => 0);
  }
  class FakeYours {
    count = vi.fn(() => 0);
  }
  class FakeMidi {
    ctx: unknown = null;
    hit = vi.fn();
    disconnect = vi.fn();
    connect = vi.fn(async () => ({ name: '', error: '' }));
  }
  return { ctx, FakeAudio, FakePacks, FakeYours, FakeMidi };
});

vi.mock('@/lib/app/breaks/audio/engine', () => ({
  BreakAudio: fakes.FakeAudio,
  SourceStack: class {},
}));
vi.mock('@/lib/app/breaks/audio/packs', () => ({ PackSource: fakes.FakePacks }));
vi.mock('@/lib/app/breaks/audio/your-samples', () => ({ YourSampleSource: fakes.FakeYours }));
vi.mock('@/lib/app/breaks/audio/midi-out', () => ({ MidiOut: fakes.FakeMidi }));

interface DebugState {
  lanes: LaneKey[] | null;
  position: { bar?: Record<LaneKey, number[]>; slot: number; count?: boolean } | null;
}

/** Exposes the context the components under test read, so the assertions can
 *  check the DOM against the *same* state rather than re-deriving it from a
 *  mock's own return value. */
function DebugSpy() {
  const c = useStudio();
  return (
    <pre data-testid="debug">
      {JSON.stringify({
        lanes: c.view.A?.lanes ?? null,
        position: c.position,
      } satisfies DebugState)}
    </pre>
  );
}

const renderTransport = (children: React.ReactNode) =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      {children}
      <DebugSpy />
    </StudioProvider>
  );

/** The break is generated in an effect; wait for it before interacting. Gated on
 *  the spy's own view of the state rather than on the lamps, which live in the
 *  footer — the transport may be rendered here with no lamps beside it at all. */
const waitForReady = () => waitFor(() => expect(readDebug().lanes).toBeTruthy());

const readDebug = (): DebugState => JSON.parse(screen.getByTestId('debug').textContent ?? '{}');

beforeEach(() => {
  localStorage.clear();
  fakes.ctx.currentTime = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('StudioTransport', () => {
  it('toggles play and stop, and aria-pressed follows the playing state', async () => {
    const user = userEvent.setup();
    renderTransport(<StudioTransport />);
    await waitForReady();

    const playBtn = screen.getByRole('button', { name: 'Play or stop' });
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');
    expect(playBtn.textContent).toContain('Play');

    await user.click(playBtn);
    expect(playBtn).toHaveAttribute('aria-pressed', 'true');
    expect(playBtn.textContent).toContain('Stop');

    await user.click(playBtn);
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');
    expect(playBtn.textContent).toContain('Play');
  });

  it('cycles the count-in 1 → 2 → off → 1, and says so in words', async () => {
    const user = userEvent.setup();
    renderTransport(<StudioTransport />);
    await waitForReady();

    /* It was a bare digit named only by a tooltip (E3). */
    const countBtn = () => screen.getByRole('button', { name: /^Count-in:/ });
    // the saved default is 1 bar
    expect(countBtn()).toHaveAccessibleName('Count-in: 1 bar');
    expect(countBtn().textContent).toBe('Count-in 1');
    await user.click(countBtn());
    expect(countBtn()).toHaveAccessibleName('Count-in: 2 bars');
    await user.click(countBtn());
    expect(countBtn()).toHaveAccessibleName('Count-in: off');
    expect(countBtn().textContent).toBe('Count-in off');
    await user.click(countBtn());
    expect(countBtn()).toHaveAccessibleName('Count-in: 1 bar');
  });

  it('moves the tempo with the range input and the read-out follows', async () => {
    renderTransport(<StudioTransport />);
    await waitForReady();

    expect(document.querySelector<HTMLInputElement>('.tempo-num')?.value).toContain('94');
    const range = screen.getByLabelText('Tempo');
    fireEvent.change(range, { target: { value: '150' } });
    expect(document.querySelector<HTMLInputElement>('.tempo-num')?.value).toContain('150');
  });

  describe('tap tempo', () => {
    /** A controllable `performance.now()`. `mockReturnValueOnce` chains break
     *  under React's own scheduler calls (which also read `performance.now`);
     *  a single mutable clock does not, because every reader — ours and
     *  React's — sees the same value until the test moves it on. */
    function useFakeClock() {
      const clock = { now: 0 };
      vi.spyOn(performance, 'now').mockImplementation(() => clock.now);
      return clock;
    }

    it('sets the tempo from the mean of four taps', async () => {
      const user = userEvent.setup();
      const clock = useFakeClock();
      renderTransport(<StudioTransport />);
      await waitForReady();
      const tapBtn = screen.getByRole('button', { name: 'Tap tempo' });

      for (const t of [0, 600, 1200, 1800]) {
        clock.now = t;
        await user.click(tapBtn);
      }
      // three 600ms gaps -> mean 600ms -> 60000 / 600 = 100bpm
      expect(document.querySelector<HTMLInputElement>('.tempo-num')?.value).toContain('100');
    });

    it('discards a tap more than 2400ms after the last one, rather than averaging it in', async () => {
      const user = userEvent.setup();
      const clock = useFakeClock();
      renderTransport(<StudioTransport />);
      await waitForReady();
      const tapBtn = screen.getByRole('button', { name: 'Tap tempo' });

      clock.now = 0;
      await user.click(tapBtn);
      clock.now = 500;
      await user.click(tapBtn);
      // 500ms gap -> 60000 / 500 = 120bpm
      expect(document.querySelector<HTMLInputElement>('.tempo-num')?.value).toContain('120');

      clock.now = 4000; // 3500ms after the last tap: both prior taps age out of the 2400ms window
      await user.click(tapBtn);
      // only the new tap survives the filter, so there is nothing to average and the tempo holds
      expect(document.querySelector<HTMLInputElement>('.tempo-num')?.value).toContain('120');
    });

    it('does nothing on a single tap', async () => {
      const user = userEvent.setup();
      const clock = useFakeClock();
      renderTransport(<StudioTransport />);
      await waitForReady();

      clock.now = 0;
      await user.click(screen.getByRole('button', { name: 'Tap tempo' }));
      expect(document.querySelector<HTMLInputElement>('.tempo-num')?.value).toContain('94');
    });

    it('rejects a mean under 120ms as noise, not a tempo', async () => {
      const user = userEvent.setup();
      const clock = useFakeClock();
      renderTransport(<StudioTransport />);
      await waitForReady();
      const tapBtn = screen.getByRole('button', { name: 'Tap tempo' });

      for (const t of [0, 100, 200, 300]) {
        clock.now = t;
        await user.click(tapBtn);
      }
      // 100ms mean is below the 120ms floor, so the tempo never moved off the default
      expect(document.querySelector<HTMLInputElement>('.tempo-num')?.value).toContain('94');
    });
  });

  it('lights the lamp for the lane that actually fired on the current step', async () => {
    const user = userEvent.setup();
    /* The lamps sit in the footer now, beside the read-out, so they are rendered
       alongside the transport rather than inside it. */
    renderTransport(
      <>
        <StudioTransport />
        <TransportLeds />
      </>
    );
    await waitForReady();

    // drop the count-in so the first scheduled step is a bar, not a click
    const countBtn = screen.getByRole('button', { name: /^Count-in:/ });
    await user.click(countBtn); // 1 -> 2
    await user.click(countBtn); // 2 -> off

    await user.click(screen.getByRole('button', { name: 'Play or stop' }));
    // push the fake clock well past the first scheduled step so the engine's
    // own paint loop (a real requestAnimationFrame chain) drains the queue
    fakes.ctx.currentTime = 5;

    await waitFor(() => expect(readDebug().position?.bar).toBeTruthy());

    const { lanes, position } = readDebug();
    const bar = position?.bar;
    const slot = position?.slot ?? -1;
    if (!lanes || !bar) throw new Error('expected a live position by now');
    const order = activeLanes(lanes);

    const ledEls = [...document.querySelectorAll('.led')];
    expect(ledEls).toHaveLength(order.length);
    order.forEach((lane, i) => {
      expect(ledEls[i].classList.contains('fire')).toBe(!!bar[lane][slot]);
    });
    // a real break always has something on the downbeat — otherwise every
    // lamp reading dark would pass the loop above for the wrong reason
    expect(order.some((lane) => !!bar[lane][slot])).toBe(true);
  });
});

describe('PhoneTransport', () => {
  it('toggles play and stop under one name, with aria-pressed following', async () => {
    const user = userEvent.setup();
    renderTransport(<PhoneTransport />);

    const playBtn = screen.getByRole('button', { name: 'Play or stop' });
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(playBtn);
    expect(playBtn).toHaveAttribute('aria-pressed', 'true');

    await user.click(playBtn);
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('steps the tempo down and up by one with the − and + buttons', async () => {
    const user = userEvent.setup();
    renderTransport(<PhoneTransport />);

    expect(document.querySelector<HTMLInputElement>('.tempo-num')?.value).toBe('94');
    await user.click(screen.getByRole('button', { name: 'Slower' }));
    expect(document.querySelector<HTMLInputElement>('.tempo-num')?.value).toBe('93');

    await user.click(screen.getByRole('button', { name: 'Faster' }));
    await user.click(screen.getByRole('button', { name: 'Faster' }));
    expect(document.querySelector<HTMLInputElement>('.tempo-num')?.value).toBe('95');
  });

  it('has no slider on the phone: the footer is the stepper and the number', () => {
    renderTransport(<PhoneTransport />);
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Tempo in bpm' })).toBeTruthy();
  });
});
