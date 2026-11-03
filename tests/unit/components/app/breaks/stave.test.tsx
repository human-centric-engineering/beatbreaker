// @vitest-environment happy-dom

/**
 * `Stave`'s imperative playhead handle. `stage-playhead.test.tsx` drives it
 * through the Stage while a section plays; this covers the handle's own edges —
 * an anchor-less move, `clear()`, and a call that lands after the staff has
 * unmounted, which the transport can do on its last tick.
 *
 * The engraving is real: a generated pattern through the real engraver.
 *
 * @see components/app/breaks/stave.tsx
 */

import { fireEvent, render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Stave, type StaveHandle } from '@/components/app/breaks/stave';
import { barBoxes } from '@/lib/app/breaks/bar-loop';
import { engrave } from '@/lib/app/breaks/engrave';
import { generatePattern } from '@/lib/app/breaks/generate';
import { testStyle } from '@/tests/helpers/catalogue';

function engraving() {
  const A = generatePattern({
    style: testStyle('funk'),
    meter: '4/4',
    seed: 7,
    bars: 1,
    density: 50,
    ghosts: 50,
  });
  return engrave(A, null, { scale: 1, perSystem: 1 });
}

function mount() {
  const ref = createRef<StaveHandle>();
  const view = render(<Stave ref={ref} engraving={engraving()} />);
  const head = () => view.container.querySelector('rect.playhead') as SVGRectElement;
  return { ref, view, head };
}

describe('Stave playhead', () => {
  it('moves over an anchor, and a move with no anchor hides it', () => {
    const { ref, head } = mount();

    ref.current!.moveTo({ x: 12, y: 4, w: 9, h: 30 });
    expect(['x', 'y', 'width', 'height'].map((a) => head().getAttribute(a))).toEqual([
      '12',
      '4',
      '9',
      '30',
    ]);

    ref.current!.moveTo(undefined);
    expect(head().getAttribute('width')).toBe('0');
    // only the width goes; the rest stays where it was
    expect(head().getAttribute('x')).toBe('12');
  });

  it('clear() hides it', () => {
    const { ref, head } = mount();
    ref.current!.moveTo({ x: 12, y: 4, w: 9, h: 30 });

    ref.current!.clear();

    expect(head().getAttribute('width')).toBe('0');
  });

  it('ignores a move or clear that arrives after it unmounts', () => {
    const { ref, view } = mount();
    const handle = ref.current!;
    view.unmount();

    expect(() => handle.moveTo({ x: 1, y: 1, w: 1, h: 1 })).not.toThrow();
    expect(() => handle.clear()).not.toThrow();
  });
});

describe('Stave flash', () => {
  it('remounts the lit steps when the flash moves on, so the same steps flash again', () => {
    const eng = engraving();
    const { container, rerender } = render(<Stave engraving={eng} flash={[0]} flashSeq={1} />);
    const first = container.querySelector('rect.flash');
    expect(first).not.toBeNull();

    rerender(<Stave engraving={eng} flash={[0]} flashSeq={1} />);
    expect(container.querySelector('rect.flash')).toBe(first);

    rerender(<Stave engraving={eng} flash={[0]} flashSeq={2} />);
    expect(container.querySelector('rect.flash')).not.toBe(first);
  });
});

describe('Stave — a loop over bars (16-b-vi)', () => {
  /* Four bars, two to a line, drawn at the engraving's own size. */
  function fourBars() {
    const A = generatePattern({
      style: testStyle('funk'),
      meter: '4/4',
      seed: 7,
      bars: 4,
      density: 50,
      ghosts: 50,
    });
    return engrave(A, null, { scale: 1, perSystem: 2 });
  }

  function drawn(onLoop?: (from: number, to: number) => void, loop?: { from: number; to: number }) {
    const eng = fourBars();
    const view = render(<Stave engraving={eng} onLoop={onLoop} loop={loop} />);
    const svg = view.container.querySelector('svg') as SVGSVGElement;
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: eng.width, height: eng.height }) as DOMRect;
    const boxes = barBoxes(eng.map, eng.steps, 4);
    /** The middle of a bar, on the page. */
    const mid = (b: number) => ({
      clientX: boxes[b]!.x + boxes[b]!.w / 2,
      clientY: boxes[b]!.y + boxes[b]!.h / 2,
    });
    const bands = () => view.container.querySelectorAll('rect.loop-band');
    return { svg, mid, bands, boxes };
  }

  const mouse = { pointerType: 'mouse', button: 0, pointerId: 1 };

  it('draws a band behind each bar a loop plays', () => {
    const { bands, boxes } = drawn(undefined, { from: 1, to: 2 });
    expect(bands()).toHaveLength(2);
    expect(bands()[0].getAttribute('x')).toBe(String(boxes[1]!.x));
  });

  it('loops the bars a mouse drags across, onto the next line', () => {
    const onLoop = vi.fn();
    const { svg, mid } = drawn(onLoop);
    fireEvent.pointerDown(svg, { ...mouse, ...mid(1) });
    fireEvent.pointerMove(svg, { ...mouse, ...mid(2) });
    fireEvent.pointerUp(svg, { ...mouse, ...mid(2) });
    expect(onLoop).toHaveBeenCalledWith(1, 2);
  });

  it('keeps the last bar a drag was over when it ends between bars', () => {
    const onLoop = vi.fn();
    const { svg, mid, boxes } = drawn(onLoop);
    fireEvent.pointerDown(svg, { ...mouse, ...mid(0) });
    fireEvent.pointerMove(svg, { ...mouse, ...mid(1) });
    // off the bars, below the last line
    fireEvent.pointerMove(svg, { ...mouse, clientX: 1, clientY: boxes[3]!.y + boxes[3]!.h + 40 });
    fireEvent.pointerUp(svg, mouse);
    expect(onLoop).toHaveBeenCalledWith(0, 1);
  });

  it('takes the press from the browser, so a drag selects no text', () => {
    const { svg, mid } = drawn(vi.fn());
    const press = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, ...mid(0) });
    Object.assign(press, { pointerType: 'mouse', button: 0, pointerId: 1 });
    svg.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);
  });

  it('loops one bar for a drag inside it, backwards as well as forwards', () => {
    const onLoop = vi.fn();
    const { svg, mid } = drawn(onLoop);
    const at = mid(3);
    fireEvent.pointerDown(svg, { ...mouse, ...at });
    fireEvent.pointerMove(svg, { ...mouse, clientX: at.clientX - 10, clientY: at.clientY });
    fireEvent.pointerUp(svg, mouse);
    expect(onLoop).toHaveBeenCalledWith(3, 3);
  });

  it('loops nothing for a click, or a finger', () => {
    const onLoop = vi.fn();
    const { svg, mid } = drawn(onLoop);
    fireEvent.pointerDown(svg, { ...mouse, ...mid(0) });
    fireEvent.pointerUp(svg, { ...mouse, ...mid(0) });
    const touch = { ...mouse, pointerType: 'touch' };
    fireEvent.pointerDown(svg, { ...touch, ...mid(0) });
    fireEvent.pointerMove(svg, { ...touch, ...mid(1) });
    fireEvent.pointerUp(svg, touch);
    expect(onLoop).not.toHaveBeenCalled();
  });
});
