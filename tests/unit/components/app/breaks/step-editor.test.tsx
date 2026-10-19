// @vitest-environment happy-dom

/**
 * `StepEditor`'s flash: cells BeatBuddy just changed are lit, and a second
 * change to the same cells swaps to the twin keyframes so the animation
 * restarts without remounting the buttons.
 *
 * @see components/app/breaks/step-editor.tsx
 */

import { fireEvent, render } from '@testing-library/react';
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
      onSet={vi.fn()}
      section="A"
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

describe('StepEditor follows the playhead', () => {
  /* happy-dom lays nothing out: the wrap is given a phone's 300px, the
     pinned names 80px of it, and each step a 30px cell after them. */
  function laidOut() {
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      const el = this as HTMLElement;
      const wrap = el.closest<HTMLElement>('.gridwrap');
      if (el.classList.contains('gridwrap')) return new DOMRect(0, 0, 300, 400);
      const slot = Number(el.dataset.slot ?? 0);
      const x = 80 + slot * 30 - (wrap?.scrollLeft ?? 0);
      return new DOMRect(x, 0, 28, 28);
    });
    const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(80);
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
    return {
      scrollTo,
      restore: () => {
        rect.mockRestore();
        width.mockRestore();
        delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo;
      },
    };
  }
  const at = (cursor: number | null) => (
    <StepEditor
      view={pattern}
      stored={pattern}
      cursor={cursor}
      onCycle={vi.fn()}
      onSet={vi.fn()}
      section="A"
    />
  );

  it('leaves the grid where it is while the step playing is in view', () => {
    const { scrollTo, restore } = laidOut();
    try {
      render(at(3));
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('brings a step off the right edge round to just after the pinned names', () => {
    const { scrollTo, restore } = laidOut();
    try {
      const { rerender } = render(at(3));
      // step 9 is at 80 + 270 = 350: past the 300px the wrap shows
      rerender(at(9));
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo.mock.calls[0][0].left).toBe(350 - 80 - 12);
    } finally {
      restore();
    }
  });

  it('lets a scroll of your own stand for a while, so you can look ahead', () => {
    const { scrollTo, restore } = laidOut();
    try {
      const { container, rerender } = render(at(3));
      fireEvent.wheel(container.querySelector('.gridwrap') as HTMLElement);
      rerender(at(9));
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });
});
