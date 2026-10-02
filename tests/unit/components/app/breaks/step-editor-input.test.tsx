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
      zoom={zoom}
    />
  );
}

const cell = (lane: string, slot: number) =>
  document.querySelector<HTMLButtonElement>(
    `.cell[data-bar="0"][data-lane="${lane}"][data-slot="${slot}"]`
  )!;

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
    expect(onSet).toHaveBeenCalledWith(0, 's', 4, 2, 'start');
  });

  it('a tap on a cell with a note clears it', () => {
    const view = emptyPattern();
    view.bars[0].k[0] = 1;
    mount(view);
    fireEvent.click(cell('k', 0));
    expect(onSet).toHaveBeenCalledWith(0, 'k', 0, 0, 'start');
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
    fireEvent.click(cell('s', 6));
    expect(onSet).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a long press sets nothing until a choice

    const menu = screen.getByRole('menu', { name: /Snare, bar 1 step 7/ });
    expect([...menu.querySelectorAll('[role="menuitem"] .lbl')].map((b) => b.textContent)).toEqual([
      'Empty',
      'Ghost',
      'Hit',
      'Accent',
      'Cross-stick',
    ]);
    fireEvent.click(screen.getByRole('menuitem', { name: /Cross-stick/ }));

    expect(onSet).toHaveBeenCalledTimes(1);
    expect(onSet).toHaveBeenCalledWith(0, 's', 6, 4, 'start');
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
    fireEvent.click(cell('h', 0));
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onSet).toHaveBeenCalledWith(0, 'h', 0, defaultHit('h'), 'start');
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
    fireEvent.click(cells[3]);

    expect(onSet.mock.calls).toEqual([
      [0, 's', 0, 2, 'start'],
      [0, 's', 1, 2, 'continue'],
      [0, 's', 2, 2, 'continue'],
      [0, 's', 3, 2, 'continue'],
    ]);
    at.mockRestore();
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
