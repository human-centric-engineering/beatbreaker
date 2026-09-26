// @vitest-environment happy-dom

/**
 * The controls more than one panel is built from.
 *
 * `meterHue` and `Slider` are pure/presentational and need nothing beyond
 * React Testing Library. The sample slots that used to live here are in
 * `your-sounds.tsx` now, tested in `your-sounds.test.tsx`.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { meterHue, Slider, VOICE_HINTS } from '@/components/app/studio/panels/controls';

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
