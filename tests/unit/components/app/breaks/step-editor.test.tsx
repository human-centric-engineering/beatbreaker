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

describe('StepEditor scrolls with the music', () => {
  /* happy-dom lays nothing out: the wrap is given a phone's 300px, the
     pinned names 80px of it, and each step a 30px cell after them, in a grid
     1000px wide. The cells in view are 220px, so the playhead rides at 66px
     into them: 146px from the wrap's edge. */
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
    const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(1000);
    const clientWidth = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'],
    });
    return {
      scrollTo,
      restore: () => {
        vi.useRealTimers();
        rect.mockRestore();
        width.mockRestore();
        scrollWidth.mockRestore();
        clientWidth.mockRestore();
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
  const wrapOf = (c: HTMLElement) => c.querySelector('.gridwrap') as HTMLElement;

  it('stands still while the playhead walks in to a third of the way across', () => {
    const { scrollTo, restore } = laidOut();
    try {
      const { container, rerender } = render(at(0));
      // step 2 is at 140px: short of 146
      rerender(at(2));
      vi.advanceTimersByTime(500);
      expect(wrapOf(container).scrollLeft).toBe(0);
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('then glides the grid under it, step by step, landing it at the same place', () => {
    const { scrollTo, restore } = laidOut();
    try {
      const { container, rerender } = render(at(2));
      vi.advanceTimersByTime(125);
      // step 3 is at 170px: 24px past where the playhead rides
      rerender(at(3));
      vi.advanceTimersByTime(40);
      const midway = wrapOf(container).scrollLeft;
      expect(midway).toBeGreaterThan(0);
      expect(midway).toBeLessThan(24);
      // the glide lasts a step, as long as the last one played (125ms), to the frame
      vi.advanceTimersByTime(100);
      expect(wrapOf(container).scrollLeft).toBe(24);
      // the next step is one cell further: 30px more, the playhead held
      rerender(at(4));
      vi.advanceTimersByTime(160);
      expect(wrapOf(container).scrollLeft).toBe(54);
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('sweeps back to the top when the loop comes round, a frame at a time', () => {
    const { scrollTo, restore } = laidOut();
    try {
      const { container, rerender } = render(at(8));
      vi.advanceTimersByTime(500);
      expect(wrapOf(container).scrollLeft).toBeGreaterThan(0);
      rerender(at(0));
      vi.advanceTimersByTime(100);
      // partway back, and eased: further than an even sweep would be by now
      const back = wrapOf(container).scrollLeft;
      expect(back).toBeGreaterThan(0);
      vi.advanceTimersByTime(300);
      expect(wrapOf(container).scrollLeft).toBe(0);
      // the browser's smooth scroll is never asked: a frame can stop this one
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('takes the next step’s glide on from wherever the sweep had got to', () => {
    const { restore } = laidOut();
    try {
      const { container, rerender } = render(at(9));
      vi.advanceTimersByTime(500);
      rerender(at(0));
      vi.advanceTimersByTime(60);
      const midSweep = wrapOf(container).scrollLeft;
      expect(midSweep).toBeGreaterThan(0);
      // the next step lands the grid at 0 (step 1 is short of the hold) from mid-sweep
      rerender(at(1));
      vi.advanceTimersByTime(17);
      expect(wrapOf(container).scrollLeft).toBeLessThan(midSweep);
      vi.advanceTimersByTime(500);
      expect(wrapOf(container).scrollLeft).toBe(0);
    } finally {
      restore();
    }
  });

  it('glides as long as a slow step lasts, rather than jumping and holding', () => {
    const { restore } = laidOut();
    try {
      const { container, rerender } = render(at(2));
      // a step of 800ms: an eighth at 37.5 bpm
      vi.advanceTimersByTime(800);
      rerender(at(3));
      vi.advanceTimersByTime(400);
      // half the step gone, the grid is about half of its 24px along
      const half = wrapOf(container).scrollLeft;
      expect(half).toBeGreaterThan(8);
      expect(half).toBeLessThan(16);
      vi.advanceTimersByTime(420);
      expect(wrapOf(container).scrollLeft).toBe(24);
    } finally {
      restore();
    }
  });

  it('lets a scroll of your own stand for a while, so you can look ahead', () => {
    const { scrollTo, restore } = laidOut();
    try {
      const { container, rerender } = render(at(2));
      fireEvent.wheel(wrapOf(container));
      rerender(at(9));
      vi.advanceTimersByTime(500);
      expect(wrapOf(container).scrollLeft).toBe(0);
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });
});

describe('StepEditor brushes', () => {
  it('writes the lit brush on a tap, marks the lane, and goes back to the usual hit', () => {
    const onSet = vi.fn();
    const { container, getByRole } = render(
      <StepEditor
        view={pattern}
        stored={pattern}
        cursor={null}
        onCycle={vi.fn()}
        onSet={onSet}
        section="A"
      />
    );
    const hit = getByRole('radio', { name: 'Snare brush: hit' });
    expect(hit).toHaveAttribute('aria-checked', 'true');

    const brush = getByRole('radio', { name: 'Snare brush: cross-stick' });
    fireEvent.click(brush);
    expect(brush).toHaveAttribute('aria-checked', 'true');
    expect(hit).toHaveAttribute('aria-checked', 'false');
    expect(container.querySelectorAll('.gridlabel .brushmark')).toHaveLength(1);

    const empty = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.cell[data-lane="s"][data-on="0"]')
    )[0];
    fireEvent.click(empty, { detail: 1 });
    expect(onSet).toHaveBeenLastCalledWith(
      'A',
      Number(empty.dataset.bar),
      's',
      Number(empty.dataset.slot),
      4,
      'start'
    );

    fireEvent.click(hit);
    expect(hit).toHaveAttribute('aria-checked', 'true');
    expect(container.querySelector('.gridlabel .brushmark')).toBeNull();
    fireEvent.click(empty, { detail: 1 });
    expect(onSet).toHaveBeenLastCalledWith(
      'A',
      Number(empty.dataset.bar),
      's',
      Number(empty.dataset.slot),
      2,
      'start'
    );
  });

  it('moves round a lane with the arrows, as a radio group does', () => {
    const { getByRole } = render(
      <StepEditor
        view={pattern}
        stored={pattern}
        cursor={null}
        onCycle={vi.fn()}
        onSet={vi.fn()}
        section="A"
      />
    );
    const hit = getByRole('radio', { name: 'Kick brush: hit' });
    expect(hit).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(hit, { key: 'ArrowRight' });
    expect(getByRole('radio', { name: 'Kick brush: accent' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    // round from the last back to the first
    fireEvent.keyDown(getByRole('radio', { name: 'Kick brush: accent' }), { key: 'ArrowRight' });
    expect(hit).toHaveAttribute('aria-checked', 'true');
  });
});
