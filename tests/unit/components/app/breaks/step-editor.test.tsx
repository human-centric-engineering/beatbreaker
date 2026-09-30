// @vitest-environment happy-dom

/**
 * `StepEditor`'s flash: cells BeatBuddy just changed are lit, and a second
 * change to the same cells swaps to the twin keyframes so the animation
 * restarts without remounting the buttons.
 *
 * @see components/app/breaks/step-editor.tsx
 */

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StepEditor } from '@/components/app/breaks/step-editor';
import { generatePattern } from '@/lib/app/breaks/generate';
import { testStyle } from '@/tests/helpers/catalogue';

const pattern = generatePattern({
  style: testStyle('funk'),
  meter: '4/4',
  seed: 7,
  bars: 1,
  density: 50,
  ghosts: 50,
});

function mount(flashSeq: number) {
  return (
    <StepEditor
      view={pattern}
      stored={pattern}
      cursor={null}
      onCycle={vi.fn()}
      flash={new Set(['0:k:0'])}
      flashSeq={flashSeq}
    />
  );
}

const cell = (c: HTMLElement) =>
  c.querySelector('[data-bar="0"][data-lane="k"][data-slot="0"]') as HTMLButtonElement;

describe('StepEditor flash', () => {
  it('lights the changed cell and alternates the keyframes as the flash moves on, keeping the button', () => {
    const { container, rerender } = render(mount(1));
    const button = cell(container);
    expect(button.classList.contains('flash')).toBe(true);
    expect(button.classList.contains('flash-odd')).toBe(true);

    rerender(mount(2));
    expect(cell(container)).toBe(button);
    expect(button.classList.contains('flash')).toBe(true);
    expect(button.classList.contains('flash-odd')).toBe(false);
  });

  it('leaves other cells unlit', () => {
    const { container } = render(mount(1));
    expect(container.querySelectorAll('.cell.flash')).toHaveLength(1);
  });
});
