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

import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { Stave, type StaveHandle } from '@/components/app/breaks/stave';
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
