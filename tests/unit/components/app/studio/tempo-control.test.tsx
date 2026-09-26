// @vitest-environment happy-dom

/**
 * Tempo (Phase 5, E4 and E5): typed, stepped, held, and the quick tempos
 * measured from the pattern's own tempo rather than the style's slowest.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PracticePanel } from '@/components/app/studio/panels/practice-panel';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { HOLD_DELAY_MS, HOLD_EVERY_MS, TempoControl } from '@/components/app/studio/tempo-control';
import { maxBpm } from '@/lib/app/breaks/audio/transport';
import { testCatalogue } from '@/tests/helpers/catalogue';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.useRealTimers();
});

/** The console's tempo, meter and layer, with a way to change the layer. */
function Probe() {
  const c = useStudio();
  return (
    <>
      <output data-testid="probe">{`${c.bpm}|${c.meter}|${c.level}`}</output>
      {[1, 5].map((n) => (
        <button key={n} type="button" onClick={() => c.setLevel(n)}>
          {`layer ${n}`}
        </button>
      ))}
    </>
  );
}

const probe = () => {
  const [bpm, meter, level] = screen.getByTestId('probe').textContent.split('|');
  return { bpm: Number(bpm), meter, level: Number(level) };
};

async function mount(children: React.ReactNode = <TempoControl slider />) {
  render(
    <StudioProvider catalogue={testCatalogue()}>
      {children}
      <Probe />
    </StudioProvider>
  );
  await screen.findByRole('textbox', { name: 'Tempo in bpm' });
}

const field = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Tempo in bpm' });

describe('TempoControl', () => {
  it('takes a typed tempo on Enter, and clamps 300 to the meter’s ceiling', async () => {
    const user = userEvent.setup();
    await mount();
    const { meter } = probe();
    expect(maxBpm(meter)).toBe(190);

    await user.click(field());
    await user.keyboard('{Control>}a{/Control}112{Enter}');
    expect(probe().bpm).toBe(112);
    expect(field().value).toBe('112');

    await user.click(field());
    await user.keyboard('{Control>}a{/Control}300{Enter}');
    expect(probe().bpm).toBe(190);
    expect(field().value).toBe('190');
    expect(screen.getByRole<HTMLInputElement>('slider', { name: 'Tempo' }).max).toBe('190');
  });

  it('keeps digits only, and Escape leaves the tempo as it was', async () => {
    const user = userEvent.setup();
    await mount();
    const before = probe().bpm;

    await user.click(field());
    await user.keyboard('{Control>}a{/Control}1x2');
    expect(field().value).toBe('12');
    await user.keyboard('{Escape}');
    expect(probe().bpm).toBe(before);
    expect(field().value).toBe(String(before));
  });

  it('steps by one on a tap, and from the keyboard', async () => {
    const user = userEvent.setup();
    await mount();
    const before = probe().bpm;

    await user.click(screen.getByRole('button', { name: 'Faster' }));
    expect(probe().bpm).toBe(before + 1);
    await user.click(screen.getByRole('button', { name: 'Slower' }));
    await user.click(screen.getByRole('button', { name: 'Slower' }));
    expect(probe().bpm).toBe(before - 1);

    screen.getByRole('button', { name: 'Faster' }).focus();
    await user.keyboard('{Enter}');
    expect(probe().bpm).toBe(before);
  });

  it('repeats while + is held, and stops when it is let go', async () => {
    await mount();
    vi.useFakeTimers();
    const before = probe().bpm;
    const plus = screen.getByRole('button', { name: 'Faster' });

    fireEvent.pointerDown(plus, { button: 0 });
    expect(probe().bpm).toBe(before + 1);
    /* Nothing more until the hold delay has passed… */
    await act(() => vi.advanceTimersByTimeAsync(HOLD_DELAY_MS - 1));
    expect(probe().bpm).toBe(before + 1);
    /* …then one step per interval, reading the tempo as it climbs. */
    await act(() => vi.advanceTimersByTimeAsync(1 + HOLD_EVERY_MS * 4));
    expect(probe().bpm).toBe(before + 6);

    fireEvent.pointerUp(plus);
    await act(() => vi.advanceTimersByTimeAsync(HOLD_EVERY_MS * 10));
    expect(probe().bpm).toBe(before + 6);
    /* The click that follows a press is not a second step. */
    fireEvent.click(plus, { detail: 1 });
    expect(probe().bpm).toBe(before + 6);

    /* Held at the ceiling it stops there, and one − comes straight back off it. */
    fireEvent.pointerDown(plus, { button: 0 });
    await act(() => vi.advanceTimersByTimeAsync(HOLD_DELAY_MS + HOLD_EVERY_MS * 200));
    fireEvent.pointerUp(plus);
    expect(probe().bpm).toBe(190);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Slower' }), { button: 0 });
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Slower' }));
    expect(probe().bpm).toBe(189);
  });
});

describe('quick tempo', () => {
  async function quick(user: ReturnType<typeof userEvent.setup>, name: string) {
    await user.click(screen.getByRole('button', { name }));
  }

  it('is a percentage of the pattern’s own tempo, and 100% is back where it was', async () => {
    const user = userEvent.setup();
    await mount(<PracticePanel />);
    await user.click(screen.getByRole('button', { name: 'Faster' }));
    const written = probe().bpm;

    await quick(user, '75%');
    expect(probe().bpm).toBe(Math.round(written * 0.75));
    await quick(user, '60%');
    expect(probe().bpm).toBe(Math.round(written * 0.6));
    await quick(user, 'Back to 100%');
    expect(probe().bpm).toBe(written);
  });

  it('with the match on, is a percentage of the layer’s tempo, and leaves the break’s alone', async () => {
    const user = userEvent.setup();
    await mount(<PracticePanel />);
    const written = probe().bpm;
    await user.click(screen.getByRole('button', { name: 'Match tempo' }));

    await user.click(screen.getByRole('button', { name: 'layer 1' }));
    const skeleton = probe().bpm;
    expect(skeleton).toBeLessThan(written);

    await quick(user, '90%');
    expect(probe().bpm).toBe(Math.round(skeleton * 0.9));
    await quick(user, 'Back to 100%');
    expect(probe().bpm).toBe(skeleton);

    /* A quick tempo is not a new tempo for the break: the full break is still
       where it was written. */
    await quick(user, '60%');
    await user.click(screen.getByRole('button', { name: 'layer 5' }));
    expect(probe().bpm).toBe(written);
  });
});
