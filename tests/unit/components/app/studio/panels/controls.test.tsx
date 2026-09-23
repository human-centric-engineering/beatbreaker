// @vitest-environment happy-dom

/**
 * The controls more than one panel is built from.
 *
 * `meterHue` and `Slider` are pure/presentational and need nothing beyond
 * React Testing Library. `SampleSlots` reads `useStudio()`, so it is mounted
 * inside a real `StudioProvider` (following `studio-frame.test.tsx`), with
 * only the browser-facing edge of the audio graph faked — the same seam
 * `use-break-console.test.ts` replaces to drive sample loading without a
 * sound card or IndexedDB.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  meterHue,
  SampleSlots,
  Slider,
  VOICE_HINTS,
} from '@/components/app/studio/panels/controls';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';

/** The browser-facing edge of the audio graph, faked so `addSample` /
 *  `removeSample` run their real path through `use-break-console.ts` without
 *  a sound card or IndexedDB. Only `SampleSlots` needs this. */
const fakes = vi.hoisted(() => {
  class FakeAudio {
    ctx: unknown = null;
    samples: unknown = null;
    setKit = vi.fn();
    close = vi.fn();
  }
  class FakePacks {
    usePercSamples = true;
    count = vi.fn(() => 0);
    percCount = vi.fn(() => 0);
  }
  class FakeUser {
    names: Record<string, string> = {};
    private onChange?: () => void;
    constructor(onChange?: () => void) {
      this.onChange = onChange;
    }
    count = vi.fn(() => Object.keys(this.names).length);
    add = vi.fn(async (_engine: unknown, slot: string, file: File) => {
      if (fakes.state.addError) return fakes.state.addError;
      this.names[slot] = file.name;
      this.onChange?.();
      return '';
    });
    remove = vi.fn(async (slot: string) => {
      delete this.names[slot];
      this.onChange?.();
    });
  }
  class FakeMidi {
    ctx: unknown = null;
    disconnect = vi.fn();
    connect = vi.fn(async () => ({ name: '', error: '' }));
  }
  return { state: { addError: '' }, FakeAudio, FakePacks, FakeUser, FakeMidi };
});

vi.mock('@/lib/app/breaks/audio/engine', () => ({
  BreakAudio: fakes.FakeAudio,
  SourceStack: class {},
}));
vi.mock('@/lib/app/breaks/audio/packs', () => ({ PackSource: fakes.FakePacks }));
vi.mock('@/lib/app/breaks/audio/user-kit', () => ({ UserSource: fakes.FakeUser }));
vi.mock('@/lib/app/breaks/audio/midi-out', () => ({ MidiOut: fakes.FakeMidi }));

describe('meterHue', () => {
  it('reads ok above 0.7', () => {
    expect(meterHue(0.8)).toBe('var(--ok)');
    expect(meterHue(1)).toBe('var(--ok)');
  });

  it('reads brass at and below 0.7, down to just above 0.4', () => {
    expect(meterHue(0.7)).toBe('var(--brass)');
    expect(meterHue(0.55)).toBe('var(--brass)');
    expect(meterHue(0.41)).toBe('var(--brass)');
  });

  it('reads bad at and below 0.4', () => {
    expect(meterHue(0.4)).toBe('var(--bad)');
    expect(meterHue(0)).toBe('var(--bad)');
  });
});

describe('Slider', () => {
  it('gives two sliders that share a label distinct ids, so each label points at its own input', () => {
    // Arrange: the kit panel has a master Room and a per-voice Room — exactly
    // the collision the `useId` comment describes.
    render(
      <>
        <Slider label="Room" value={10} onChange={() => {}} />
        <Slider label="Room" value={20} onChange={() => {}} />
      </>
    );

    // Act
    const inputs = screen.getAllByLabelText<HTMLInputElement>('Room');

    // Assert: two distinct inputs, each carrying its own value — a shared id
    // would have `getAllByLabelText` resolve both labels to the first input.
    expect(inputs).toHaveLength(2);
    expect(inputs[0].id).not.toBe(inputs[1].id);
    expect(inputs[0].value).toBe('10');
    expect(inputs[1].value).toBe('20');
  });

  it('calls onChange with the new value as a number', () => {
    const onChange = vi.fn();
    render(<Slider label="Tone" value={5} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Tone'), { target: { value: '42' } });

    expect(onChange).toHaveBeenCalledWith(42);
  });

  it('fires onCommit when the drag ends (pointer-up) or a key is released', () => {
    const onCommit = vi.fn();
    render(<Slider label="Tone" value={5} onChange={() => {}} onCommit={onCommit} />);
    const input = screen.getByLabelText('Tone');

    fireEvent.pointerUp(input);
    expect(onCommit).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(input);
    expect(onCommit).toHaveBeenCalledTimes(2);
  });

  it('reads out the plain value and suffix when there is no format', () => {
    render(<Slider label="Level" value={50} onChange={() => {}} suffix="%" />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('lets format override the readout — hertz, seconds, a multiplier', () => {
    render(<Slider label="Freq" value={440} onChange={() => {}} format={(n) => `${n} Hz`} />);
    expect(screen.getByText('440 Hz')).toBeInTheDocument();
    // the plain "440%" readout must not also be there
    expect(screen.queryByText('440')).not.toBeInTheDocument();
  });

  it('renders the hint when given one, and nothing when not', () => {
    const { container, rerender } = render(
      <Slider label="Room" value={1} onChange={() => {}} hint="Reverb send" />
    );
    expect(screen.getByText('Reverb send')).toBeInTheDocument();

    rerender(<Slider label="Room" value={1} onChange={() => {}} />);
    expect(container.querySelector('.hint')).toBeNull();
  });
});

describe('VOICE_HINTS', () => {
  it('has a non-empty hint for every engine the kit panel names', () => {
    expect(Object.keys(VOICE_HINTS).sort()).toEqual(['aux', 'pack', 'synth', 'user'].sort());
    for (const hint of Object.values(VOICE_HINTS)) {
      expect(typeof hint).toBe('string');
      expect(hint.length).toBeGreaterThan(0);
    }
  });
});

describe('SampleSlots', () => {
  /** Surfaces the toast `say()` raised, so the confirmation/error message the
   *  slot produced is checked against what actually happened, not asserted
   *  blind. */
  function ToastSpy() {
    const c = useStudio();
    return <pre data-testid="toast">{c.toast}</pre>;
  }

  const renderSlots = () =>
    render(
      <StudioProvider catalogue={testCatalogue()}>
        <SampleSlots />
        <ToastSpy />
      </StudioProvider>
    );

  const selectFile = (input: HTMLInputElement, file: File | null) => {
    const list = file
      ? ({
          0: file,
          length: 1,
          item: () => file,
          [Symbol.iterator]: function* () {
            yield file;
          },
        } as unknown as FileList)
      : ({
          length: 0,
          item: () => null,
          [Symbol.iterator]: function* () {},
        } as unknown as FileList);
    Object.defineProperty(input, 'files', { value: list, configurable: true });
    fireEvent.change(input);
  };

  beforeEach(() => {
    fakes.state.addError = '';
  });

  it('says an empty slot has nothing loaded, and offers to Load rather than Replace', () => {
    renderSlots();

    const kickSlot = screen.getByText('Kick').closest('.slot') as HTMLElement;
    expect(within(kickSlot).getByText('—')).toBeInTheDocument();
    expect(within(kickSlot).getByText('Load')).toBeInTheDocument();
    expect(within(kickSlot).queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument();
  });

  it('fills a slot with a chosen file, and offers Replace and a way to clear it', async () => {
    renderSlots();
    const kickSlot = screen.getByText('Kick').closest('.slot') as HTMLElement;
    const input = kickSlot.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'kick.wav', { type: 'audio/wav' });

    selectFile(input, file);

    await waitFor(() => expect(within(kickSlot).getByText('kick.wav')).toBeInTheDocument());
    expect(within(kickSlot).getByText('Replace')).toBeInTheDocument();
    expect(within(kickSlot).getByRole('button', { name: 'Clear Kick' })).toBeInTheDocument();
    // the input is cleared after a pick, so choosing the same file again still fires a change
    expect(input.value).toBe('');
    await waitFor(() => expect(screen.getByTestId('toast').textContent).toBe('Kick: kick.wav'));
  });

  it('says what went wrong instead of the filename when the file cannot be used', async () => {
    fakes.state.addError = 'Could not decode that file — try WAV, MP3, FLAC or M4A';
    renderSlots();
    const kickSlot = screen.getByText('Kick').closest('.slot') as HTMLElement;
    const input = kickSlot.querySelector('input[type="file"]') as HTMLInputElement;

    selectFile(input, new File(['data'], 'kick.mov', { type: 'video/quicktime' }));

    await waitFor(() =>
      expect(screen.getByTestId('toast').textContent).toBe(
        'Could not decode that file — try WAV, MP3, FLAC or M4A'
      )
    );
    // and the slot itself stays empty — a failed decode never reaches the store
    expect(within(kickSlot).getByText('—')).toBeInTheDocument();
  });

  it('does nothing when the file picker is dismissed with no file chosen', () => {
    renderSlots();
    const kickSlot = screen.getByText('Kick').closest('.slot') as HTMLElement;
    const input = kickSlot.querySelector('input[type="file"]') as HTMLInputElement;

    selectFile(input, null);

    expect(within(kickSlot).getByText('—')).toBeInTheDocument();
    expect(screen.getByTestId('toast').textContent).toBe('');
  });

  it('removes a loaded sample and falls back to the empty state', async () => {
    const user = userEvent.setup();
    renderSlots();
    const kickSlot = screen.getByText('Kick').closest('.slot') as HTMLElement;
    const input = kickSlot.querySelector('input[type="file"]') as HTMLInputElement;
    selectFile(input, new File(['data'], 'kick.wav', { type: 'audio/wav' }));
    await waitFor(() => expect(within(kickSlot).getByText('kick.wav')).toBeInTheDocument());

    await user.click(within(kickSlot).getByRole('button', { name: 'Clear Kick' }));

    await waitFor(() => expect(within(kickSlot).getByText('—')).toBeInTheDocument());
    expect(within(kickSlot).getByText('Load')).toBeInTheDocument();
    expect(within(kickSlot).queryByRole('button', { name: 'Clear Kick' })).not.toBeInTheDocument();
  });

  it('marks the optional slots as optional', () => {
    renderSlots();
    const ghostSlot = screen.getByText('Ghost snare').closest('.slot') as HTMLElement;
    expect(within(ghostSlot).getByText('optional')).toBeInTheDocument();

    const kickSlot = screen.getByText('Kick').closest('.slot') as HTMLElement;
    expect(within(kickSlot).queryByText('optional')).not.toBeInTheDocument();
  });
});
