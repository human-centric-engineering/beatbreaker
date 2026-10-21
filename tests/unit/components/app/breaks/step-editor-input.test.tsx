// @vitest-environment happy-dom

/**
 * Setting a cell in the step grid (task 5.15, E2), and its size (5.14, E1).
 *
 * Done-when: a tap on an empty snare cell gives the default hit; a long press
 * opens the picker and choosing cross-stick sets it in one step; a drag
 * across four cells sets four (one undo step: the first is `start`, the rest
 * `continue`, and the console test holds the undo to that). The CSS rules for
 * both pointers, and the zoom read through its schema.
 *
 * @see components/app/breaks/step-editor.tsx
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LONG_PRESS_MS, StepEditor, defaultHit } from '@/components/app/breaks/step-editor';
import { GRID_SIZE } from '@/lib/app/breaks/browser-keys';
import { generatePattern } from '@/lib/app/breaks/generate';
import type { Pattern } from '@/lib/app/breaks/types';
import { useStoredSetting } from '@/lib/app/breaks/use-stored-setting';
import { testStyle } from '@/tests/helpers/catalogue';

function emptyPattern(): Pattern {
  const p = generatePattern({
    style: testStyle('funk'),
    meter: '4/4',
    seed: 7,
    bars: 1,
    density: 50,
    ghosts: 50,
  });
  for (const lane of ['k', 's', 'h'] as const) p.bars[0][lane].fill(0);
  return p;
}

const onSet = vi.fn();
const onCycle = vi.fn();

function mount(view = emptyPattern(), zoom?: number) {
  return render(
    <StepEditor
      view={view}
      stored={view}
      cursor={null}
      onCycle={onCycle}
      onSet={onSet}
      section="A"
      zoom={zoom}
    />
  );
}

const cell = (lane: string, slot: number) =>
  document.querySelector<HTMLButtonElement>(
    `.cell[data-bar="0"][data-lane="${lane}"][data-slot="${slot}"]`
  )!;

/** A tap from a pointer: a click with a press behind it (a keyboard's has detail 0). */
const TAP = { detail: 1 };

beforeEach(() => {
  onSet.mockReset();
  onCycle.mockReset();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('setting a cell (5.15)', () => {
  it('a tap on an empty snare cell gives the lane’s default hit', () => {
    mount();
    fireEvent.click(cell('s', 4));
    expect(defaultHit('s')).toBe(2);
    expect(onSet).toHaveBeenCalledWith('A', 0, 's', 4, 2, 'start');
  });

  it('a tap on a note selects it, and a second tap clears it', () => {
    const view = emptyPattern();
    view.bars[0].k[0] = 1;
    mount(view);
    fireEvent.click(cell('k', 0), TAP);
    expect(onSet).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the first tap only selects
    expect(cell('k', 0)).toHaveClass('active');
    expect(cell('k', 0)).toHaveAccessibleName(/, selected$/);

    fireEvent.click(cell('k', 0), TAP);
    expect(onSet).toHaveBeenCalledWith('A', 0, 'k', 0, 0, 'start');
  });

  it('selects the note a tap has just written', () => {
    const view = emptyPattern();
    const { rerender } = mount(view);
    fireEvent.click(cell('s', 4), TAP);
    expect(onSet).toHaveBeenCalledWith('A', 0, 's', 4, 2, 'start');
    // the console writes it, and the grid is handed the pattern with it
    const written = structuredClone(view);
    written.bars[0].s[4] = 2;
    rerender(
      <StepEditor
        view={written}
        stored={written}
        cursor={null}
        onCycle={onCycle}
        onSet={onSet}
        section="A"
      />
    );
    expect(cell('s', 4)).toHaveClass('active');
  });

  it('a brush picked in the selected note’s lane rewrites it, and the lane shows its value', () => {
    const view = emptyPattern();
    view.bars[0].s[4] = 3;
    view.bars[0].k[0] = 1;
    mount(view);
    fireEvent.click(cell('s', 4), TAP);
    // the snare's brushes light the selected note's accent, not the usual hit
    expect(screen.getByRole('radio', { name: 'Snare brush: accent' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Snare brush: cross-stick' }));
    expect(onSet).toHaveBeenCalledTimes(1);
    expect(onSet).toHaveBeenCalledWith('A', 0, 's', 4, 4, 'start');

    // another lane's brush leaves the selected snare note alone
    onSet.mockClear();
    fireEvent.click(screen.getByRole('radio', { name: 'Kick brush: accent' }));
    expect(onSet).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a brush in another lane writes nothing
  });

  it('lets the note go on a press away from the grid and the brushes, not on a brush', () => {
    const view = emptyPattern();
    view.bars[0].s[4] = 2;
    mount(view);
    fireEvent.click(cell('s', 4), TAP);

    fireEvent.pointerDown(screen.getByRole('radio', { name: 'Snare brush: accent' }));
    expect(cell('s', 4)).toHaveClass('active');

    fireEvent.pointerDown(document.body);
    expect(cell('s', 4)).not.toHaveClass('active');
    // and a brush picked now writes nothing
    fireEvent.click(screen.getByRole('radio', { name: 'Snare brush: accent' }));
    expect(onSet).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing is selected
  });

  it('a press that selects a note never paints, however it wobbles', () => {
    const view = emptyPattern();
    view.bars[0].s[0] = 2;
    mount(view);
    const at = vi.spyOn(document, 'elementFromPoint');
    fireEvent.pointerDown(cell('s', 0), { button: 0 });
    at.mockReturnValue(cell('s', 1));
    fireEvent.pointerMove(cell('s', 1));
    at.mockRestore();
    fireEvent.pointerUp(cell('s', 0));
    fireEvent.click(cell('s', 0), TAP);
    expect(onSet).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the press only selects
    expect(cell('s', 0)).toHaveClass('active');
  });

  it('Enter on a note clears it at once, and selects nothing', () => {
    const view = emptyPattern();
    view.bars[0].k[0] = 1;
    mount(view);
    fireEvent.click(cell('k', 0), { detail: 0 });
    expect(onSet).toHaveBeenCalledWith('A', 0, 'k', 0, 0, 'start');
    expect(cell('k', 0)).not.toHaveClass('active');
  });

  it('a brush picked for the selected note leaves the lane’s lit brush alone', () => {
    const view = emptyPattern();
    view.bars[0].s[4] = 2;
    mount(view);
    fireEvent.click(cell('s', 4), TAP);
    fireEvent.click(screen.getByRole('radio', { name: 'Snare brush: cross-stick' }));
    expect(onSet).toHaveBeenCalledWith('A', 0, 's', 4, 4, 'start');

    fireEvent.pointerDown(document.body);
    onSet.mockClear();
    fireEvent.click(cell('s', 6), TAP);
    expect(onSet).toHaveBeenCalledWith('A', 0, 's', 6, defaultHit('s'), 'start');
  });

  it('arrowing through the brushes is one undo step; a click starts a new one', () => {
    const view = emptyPattern();
    view.bars[0].s[4] = 2;
    mount(view);
    fireEvent.click(cell('s', 4), TAP);
    const hit = screen.getByRole('radio', { name: 'Snare brush: hit' });
    fireEvent.keyDown(hit, { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Snare brush: accent' }), {
      key: 'ArrowRight',
    });
    expect(onSet.mock.calls.map((c) => c[5])).toEqual(['start', 'continue']);

    const ghost = screen.getByRole('radio', { name: 'Snare brush: ghost' });
    fireEvent.pointerDown(ghost);
    fireEvent.click(ghost);
    expect(onSet.mock.calls.at(-1)?.[5]).toBe('start');
  });

  it('does not bring a selection back with its note', () => {
    const view = emptyPattern();
    view.bars[0].s[4] = 2;
    const { rerender } = mount(view);
    fireEvent.click(cell('s', 4), TAP);
    const props = { stored: view, cursor: null, onCycle, onSet, section: 'A' as const };
    // an undo takes the note away, a redo brings it back
    rerender(<StepEditor view={emptyPattern()} {...props} />);
    rerender(<StepEditor view={view} {...props} />);
    expect(cell('s', 4)).not.toHaveClass('active');
  });

  it('lets the note go when focus moves to another cell', () => {
    const view = emptyPattern();
    view.bars[0].s[4] = 2;
    mount(view);
    fireEvent.click(cell('s', 4), TAP);
    fireEvent.focusIn(cell('s', 4));
    expect(cell('s', 4)).toHaveClass('active');
    fireEvent.focusIn(cell('s', 5));
    expect(cell('s', 4)).not.toHaveClass('active');
  });

  it('a long press opens the picker; choosing cross-stick sets it in one step', () => {
    vi.useFakeTimers();
    mount();
    fireEvent.pointerDown(cell('s', 6), { button: 0 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    fireEvent.pointerUp(cell('s', 6));
    // the click that ends the press is not a tap
    fireEvent.click(cell('s', 6), { detail: 1 });
    expect(onSet).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a long press sets nothing until a choice

    const menu = screen.getByRole('menu', { name: /Snare, bar 1 step 7/ });
    expect([...menu.querySelectorAll('[role="menuitem"] .lbl')].map((b) => b.textContent)).toEqual([
      'Empty',
      'Ghost',
      'Hit',
      'Accent',
      'Cross-stick',
      'Rimshot',
      'Flam',
      'Drag',
      'Buzz',
    ]);
    fireEvent.click(screen.getByRole('menuitem', { name: /Cross-stick/ }));

    expect(onSet).toHaveBeenCalledTimes(1);
    expect(onSet).toHaveBeenCalledWith('A', 0, 's', 6, 4, 'start');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('a right-click opens the picker too, and Escape closes it with focus back on the cell', () => {
    mount();
    fireEvent.contextMenu(cell('k', 2));
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(cell('k', 2));
  });

  it('a short press that ends is a tap, not a picker', () => {
    vi.useFakeTimers();
    mount();
    fireEvent.pointerDown(cell('h', 0), { button: 0 });
    fireEvent.pointerUp(cell('h', 0));
    fireEvent.click(cell('h', 0), { detail: 1 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onSet).toHaveBeenCalledWith('A', 0, 'h', 0, defaultHit('h'), 'start');
  });

  it('a drag across four cells of a lane sets four with the value it started with, as one stroke', () => {
    mount();
    const cells = [0, 1, 2, 3].map((i) => cell('s', i));
    const at = vi.spyOn(document, 'elementFromPoint');
    fireEvent.pointerDown(cells[0], { button: 0 });
    for (const c of cells.slice(1)) {
      at.mockReturnValue(c);
      fireEvent.pointerMove(c);
    }
    // a cell in another lane is not painted
    at.mockReturnValue(cell('k', 4));
    fireEvent.pointerMove(cell('k', 4));
    fireEvent.pointerUp(cells[3]);
    fireEvent.click(cells[3], { detail: 1 });

    expect(onSet.mock.calls).toEqual([
      ['A', 0, 's', 0, 2, 'start'],
      ['A', 0, 's', 1, 2, 'continue'],
      ['A', 0, 's', 2, 2, 'continue'],
      ['A', 0, 's', 3, 2, 'continue'],
    ]);
    at.mockRestore();
  });

  it('does not eat the next tap when a mouse drag ended off a cell', () => {
    mount();
    const at = vi.spyOn(document, 'elementFromPoint');
    fireEvent.pointerDown(cell('s', 0), { button: 0 });
    at.mockReturnValue(cell('s', 1));
    fireEvent.pointerMove(cell('s', 1));
    // let go on another cell: the click goes to the row, not a cell
    fireEvent.pointerUp(cell('s', 1));
    at.mockRestore();
    onSet.mockReset();

    fireEvent.pointerDown(cell('k', 5), { button: 0 });
    fireEvent.pointerUp(cell('k', 5));
    fireEvent.click(cell('k', 5), { detail: 1 });
    expect(onSet).toHaveBeenCalledWith('A', 0, 'k', 5, defaultHit('k'), 'start');
  });

  it('never swallows a click from the keyboard', () => {
    vi.useFakeTimers();
    mount();
    fireEvent.pointerDown(cell('s', 2), { button: 0 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    // Enter on the focused cell: a click with no pointer behind it
    fireEvent.click(cell('s', 2), { detail: 0 });
    expect(onSet).toHaveBeenCalledWith('A', 0, 's', 2, defaultHit('s'), 'start');
  });

  it('a clearing drag skips cells this layer shows as empty', () => {
    const view = emptyPattern();
    view.bars[0].s[0] = 2;
    view.bars[0].s[2] = 2;
    mount(view);
    fireEvent.click(cell('s', 0), TAP); // a drag from a note starts once it is selected
    const at = vi.spyOn(document, 'elementFromPoint');
    fireEvent.pointerDown(cell('s', 0), { button: 0 });
    for (const i of [1, 2]) {
      at.mockReturnValue(cell('s', i));
      fireEvent.pointerMove(cell('s', i));
    }
    at.mockRestore();
    expect(onSet.mock.calls).toEqual([
      ['A', 0, 's', 0, 0, 'start'],
      ['A', 0, 's', 2, 0, 'continue'],
    ]);
  });

  it('keeps the section a picker or a drag began in, when the grid moves to the other', () => {
    const view = emptyPattern();
    const { rerender } = mount(view);
    fireEvent.contextMenu(cell('s', 3));
    // the playhead crosses into B under Both
    rerender(
      <StepEditor
        view={view}
        stored={view}
        cursor={null}
        onCycle={onCycle}
        onSet={onSet}
        section="B"
      />
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /Accent/ }));
    expect(onSet).toHaveBeenCalledWith('A', 0, 's', 3, 3, 'start');
  });

  it('keeps the keyboard where it is in the picker while the grid re-renders', () => {
    const view = emptyPattern();
    const { rerender } = mount(view);
    fireEvent.contextMenu(cell('s', 3));
    const accent = screen.getByRole('menuitem', { name: /Accent/ });
    accent.focus();
    rerender(
      <StepEditor
        view={view}
        stored={view}
        cursor={5}
        onCycle={onCycle}
        onSet={onSet}
        section="A"
      />
    );
    expect(document.activeElement).toBe(accent);
  });

  it('keeps Shift-click stepping back through the values', () => {
    mount();
    fireEvent.click(cell('s', 1), { shiftKey: true });
    expect(onCycle).toHaveBeenCalledWith(0, 's', 1, true);
    expect(onSet).not.toHaveBeenCalled(); // test-review:accept no_arg_called — Shift is the old cycle, not a tap
  });
});

describe('cell size (5.14)', () => {
  const css = readFileSync(join(process.cwd(), 'components/app/breaks/breaks.css'), 'utf8');

  it('is 24px with a fine pointer and 32px with a coarse one, times the zoom', () => {
    expect(css).toMatch(
      /\.bb \.gridwrap \{[^}]*--cell: 24px;[^}]*--cell-size: calc\(var\(--cell\) \* var\(--grid-zoom, 1\)\);/
    );
    expect(css).toMatch(/@media \(pointer: coarse\) \{\s*\.bb \.gridwrap \{\s*--cell: 32px;/);
    expect(css).toMatch(
      /\.bb \.cell \{\s*width: var\(--cell-size\);\s*height: var\(--cell-size\);/
    );
  });

  it('puts the zoom on the grid as --grid-zoom', () => {
    mount(emptyPattern(), 1.5);
    expect(
      document.querySelector<HTMLElement>('.gridwrap')?.style.getPropertyValue('--grid-zoom')
    ).toBe('1.5');
  });

  it('reads the stored zoom through its schema, falling back to 1', () => {
    localStorage.setItem(GRID_SIZE.key, JSON.stringify(9));
    expect(renderHook(() => useStoredSetting(GRID_SIZE)).result.current[0]).toBe(1);
    localStorage.setItem(GRID_SIZE.key, JSON.stringify(1.25));
    expect(renderHook(() => useStoredSetting(GRID_SIZE)).result.current[0]).toBe(1.25);
  });
});
