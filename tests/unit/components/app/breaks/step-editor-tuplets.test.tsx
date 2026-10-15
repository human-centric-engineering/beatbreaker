// @vitest-environment happy-dom

/**
 * `StepEditor`'s tuplets (12-d): a span is drawn as the cells of its beat
 * merged and cut into its notes; a tap sets one note; the value picker on a
 * grid cell offers to cut its beat into a tuplet, and on a tuplet's note to
 * give the beat back.
 *
 * @see components/app/breaks/step-editor.tsx
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { LONG_PRESS_MS, StepEditor } from '@/components/app/breaks/step-editor';
import { emptyBar } from '@/lib/app/breaks/pattern';
import type { Pattern } from '@/lib/app/breaks/types';

function pattern(): Pattern {
  const bar = emptyBar(16);
  bar.k[0] = 1;
  return {
    name: 'fives',
    style: 'funk',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 'h'],
    perc: {},
    backbeats: [],
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    tuplets: [{ bar: 0, start: 4, span: 4, n: 5, notes: { s: [3, 0, 2, 0, 0] } }],
    bars: [bar],
  };
}

function mount(onTuplet = vi.fn(), canTuplet = true) {
  const pat = pattern();
  render(
    <StepEditor
      view={pat}
      stored={pat}
      cursor={null}
      onCycle={vi.fn()}
      onSet={vi.fn()}
      onTuplet={onTuplet}
      canTuplet={() => canTuplet}
      section="A"
    />
  );
  return onTuplet;
}

describe('StepEditor tuplets', () => {
  it('draws the beat a span covers as its five notes, in place of four cells', () => {
    const { container } = render(
      <StepEditor
        view={pattern()}
        stored={pattern()}
        cursor={null}
        onCycle={vi.fn()}
        onSet={vi.fn()}
        section="A"
      />
    );
    const block = container.querySelector('.tuplet[data-n="5"]') as HTMLElement;
    expect(block.querySelectorAll('.tcell')).toHaveLength(5);
    // the snare row has its other twelve cells on the grid, and none under the span
    expect(container.querySelectorAll('[data-lane="s"][data-slot]')).toHaveLength(12);
    expect(container.querySelector('[data-lane="s"][data-slot="5"]')).toBeNull();
    // the kick, which the span does not play, keeps all sixteen
    expect(container.querySelectorAll('[data-lane="k"][data-slot]')).toHaveLength(16);
  });

  it('sets a note with a tap, and clears a set one', async () => {
    const user = userEvent.setup();
    const onTuplet = mount();
    await user.click(
      screen.getByRole('button', { name: /Snare, bar 1, 5 in the beat, note 2: empty/ })
    );
    expect(onTuplet).toHaveBeenLastCalledWith(0, 's', 4, { kind: 'note', j: 1, value: 2 });
    await user.click(screen.getByRole('button', { name: /note 3: hit/ }));
    expect(onTuplet).toHaveBeenLastCalledWith(0, 's', 4, { kind: 'note', j: 2, value: 0 });
  });

  it('offers to cut a grid cell’s beat into a tuplet, where the layer shows them', async () => {
    const user = userEvent.setup();
    const onTuplet = mount();
    const cell = screen.getByRole('button', { name: /^Hi-hat, bar 1 step 9: empty/ });
    fireEvent.contextMenu(cell);
    await user.click(screen.getByRole('menuitem', { name: '3' }));
    expect(onTuplet).toHaveBeenLastCalledWith(0, 'h', 8, { kind: 'make', n: 3 });
  });

  it('does not offer one where the layer would not show it', () => {
    mount(vi.fn(), false);
    fireEvent.contextMenu(screen.getByRole('button', { name: /^Hi-hat, bar 1 step 9: empty/ }));
    expect(screen.queryByRole('group', { name: /tuplet/i })).toBeNull();
  });

  it('gives a tuplet’s beat back to the grid from its note’s picker', async () => {
    const user = userEvent.setup();
    const onTuplet = mount();
    fireEvent.contextMenu(screen.getByRole('button', { name: /note 1: accent/ }));
    await user.click(screen.getByRole('menuitem', { name: /Back to the grid/ }));
    expect(onTuplet).toHaveBeenLastCalledWith(0, 's', 4, { kind: 'unmake' });
  });

  it('holds a tuplet the layer leaves out, so its cells cannot be written under it', () => {
    const stored = pattern();
    const view = { ...pattern(), tuplets: undefined };
    const { container } = render(
      <StepEditor
        view={view}
        stored={stored}
        cursor={null}
        onCycle={vi.fn()}
        onSet={vi.fn()}
        section="A"
      />
    );
    expect(
      screen.getByRole('img', { name: /5 in the beat, played at a higher layer/ })
    ).toBeTruthy();
    expect(container.querySelector('[data-lane="s"][data-slot="5"]')).toBeNull();
    expect(container.querySelectorAll('[data-lane="s"][data-slot]')).toHaveLength(12);
  });

  it('opens a note’s picker on a long press, as a touch screen has no right click', () => {
    vi.useFakeTimers();
    try {
      const onTuplet = mount();
      const note = screen.getByRole('button', { name: /note 1: accent/ });
      fireEvent.pointerDown(note, { button: 0 });
      act(() => {
        vi.advanceTimersByTime(LONG_PRESS_MS);
      });
      fireEvent.pointerUp(note);
      // the click that ends the hold is not a tap
      fireEvent.click(note);
      expect(onTuplet).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('menuitem', { name: /Back to the grid/ }));
      expect(onTuplet).toHaveBeenLastCalledWith(0, 's', 4, { kind: 'unmake' });
    } finally {
      vi.useRealTimers();
    }
  });
});
