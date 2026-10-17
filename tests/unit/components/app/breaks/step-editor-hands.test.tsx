// @vitest-environment happy-dom

/**
 * The Hands row (Phase 14): writing the sticking under the notes in the step
 * grid. A tap goes R, L, then back to the drummer's choice; a hold or a
 * right-click opens the picker, which offers graces on the same stick only
 * where the step has them, and the bar at once (D69). A step no hand plays
 * cannot be set, and a hand the drummer cannot obey says so (D67).
 *
 * @see components/app/breaks/step-editor.tsx
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LONG_PRESS_MS, StepEditor } from '@/components/app/breaks/step-editor';
import { generatePattern } from '@/lib/app/breaks/generate';
import { FLAM } from '@/lib/app/breaks/lanes';
import type { Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

/** One bar of funk, emptied, then: snare on 0, 4 (a flam) and 8, kick alone on 12, ride on 14. */
function fixture(sticking: Pattern['sticking'] = null): Pattern {
  const p = generatePattern({
    style: testStyle('funk'),
    meter: '4/4',
    seed: 7,
    bars: 1,
    density: 50,
    ghosts: 50,
  });
  for (const lane of Object.keys(p.bars[0]) as (keyof Pattern['bars'][number])[])
    p.bars[0][lane].fill(0);
  p.bars[0].s[0] = 2;
  p.bars[0].s[4] = FLAM;
  p.bars[0].s[8] = 2;
  p.bars[0].k[12] = 1;
  p.bars[0].r[14] = 1;
  p.lanes = [...new Set([...p.lanes, 'r' as const])];
  p.sticking = sticking;
  return p;
}

const onHands = vi.fn();

function mount(view: Pattern, hands = true) {
  return render(
    <StepEditor
      view={view}
      stored={view}
      cursor={null}
      onCycle={vi.fn()}
      onSet={vi.fn()}
      section="A"
      onHands={hands ? onHands : undefined}
    />
  );
}

const hcell = (step: number) =>
  screen.getByRole('button', { name: new RegExp(`^Hands, bar 1 step ${step + 1}:`) });

beforeEach(() => {
  onHands.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the Hands row', () => {
  it('is drawn only when the Studio hands it a way to write', () => {
    mount(fixture(), false);
    expect(screen.queryByText('Hands')).toBeNull();
  });

  it('shows what is written, and leaves the rest to the drummer', () => {
    mount(fixture(['L...............']));
    expect(hcell(0).textContent).toBe('L');
    expect(hcell(0).getAttribute('aria-label')).toBe('Hands, bar 1 step 1: L');
    expect(hcell(8).textContent).toBe('');
    expect(hcell(8).getAttribute('aria-label')).toMatch(/the drummer's choice$/);
  });

  it('cannot be set on a step only the feet play, or nothing does', () => {
    mount(fixture());
    expect(hcell(12)).toBeDisabled();
    expect(hcell(12).getAttribute('aria-label')).toMatch(/no hand plays this step$/);
    expect(hcell(1)).toBeDisabled();
    fireEvent.click(hcell(12));
    expect(onHands).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a disabled cell writes nothing
  });

  it('goes R, L, then the drummer’s choice, a tap at a time', () => {
    const { rerender } = mount(fixture());
    fireEvent.click(hcell(0));
    expect(onHands).toHaveBeenLastCalledWith(0, 0, { kind: 'hand', hand: 'R' });
    const props = {
      cursor: null,
      onCycle: vi.fn(),
      onSet: vi.fn(),
      section: 'A' as const,
      onHands,
    };
    const writtenR = fixture(['R...'.padEnd(16, '.')]);
    rerender(<StepEditor view={writtenR} stored={writtenR} {...props} />);
    fireEvent.click(hcell(0));
    expect(onHands).toHaveBeenLastCalledWith(0, 0, { kind: 'hand', hand: 'L' });
    const writtenL = fixture(['L...'.padEnd(16, '.')]);
    rerender(<StepEditor view={writtenL} stored={writtenL} {...props} />);
    fireEvent.click(hcell(0));
    expect(onHands).toHaveBeenLastCalledWith(0, 0, { kind: 'hand', hand: null });
  });

  it('opens its picker on a long press, and offers the graces only on a flam', () => {
    vi.useFakeTimers();
    mount(fixture());
    fireEvent.pointerDown(hcell(4), { button: 0 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    fireEvent.pointerUp(hcell(4));
    // the click that ends the press is not a tap
    fireEvent.click(hcell(4), { detail: 1 });
    expect(onHands).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a long press writes nothing until a choice

    const menu = screen.getByRole('menu', { name: 'Hands, bar 1 step 5' });
    expect([...menu.querySelectorAll('[role="menuitem"] .lbl')].map((b) => b.textContent)).toEqual([
      'R',
      'L',
      'R, its graces on R too',
      'L, its graces on L too',
      "Drummer's choice",
      'Alternate from here, R first',
      'Alternate from here, L first',
      "Clear this bar's hands",
    ]);
    fireEvent.click(screen.getByRole('menuitem', { name: /R, its graces on R too/ }));
    expect(onHands).toHaveBeenCalledTimes(1);
    expect(onHands).toHaveBeenCalledWith(0, 4, { kind: 'hand', hand: 'r' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('writes the bar at once from its picker, and closes back onto the cell', () => {
    mount(fixture());
    fireEvent.contextMenu(hcell(0));
    const menu = screen.getByRole('menu');
    expect(menu.textContent).not.toMatch(/graces/);
    fireEvent.click(screen.getByRole('menuitem', { name: /Alternate from here, L first/ }));
    expect(onHands).toHaveBeenCalledWith(0, 0, { kind: 'alternate', hand: 'L' });
    expect(document.activeElement).toBe(hcell(0));

    fireEvent.contextMenu(hcell(8));
    fireEvent.click(screen.getByRole('menuitem', { name: /Clear this bar/ }));
    expect(onHands).toHaveBeenLastCalledWith(0, 8, { kind: 'clear' });
  });

  it('reads what can be written from the stored pattern, and says which notes this layer hides', () => {
    // the layer shows the flam as a tap and leaves the snare on 8 out
    const stored = fixture(['........R.......']);
    const view = fixture(['........R.......']);
    view.bars[0].s[4] = 2;
    view.bars[0].s[8] = 0;
    render(
      <StepEditor
        view={view}
        stored={stored}
        cursor={null}
        onCycle={vi.fn()}
        onSet={vi.fn()}
        section="A"
        onHands={onHands}
      />
    );
    expect(hcell(8)).not.toBeDisabled();
    expect(hcell(8).textContent).toBe('R');
    expect(hcell(8).getAttribute('aria-label')).toBe(
      'Hands, bar 1 step 9: R, for a note this layer leaves out'
    );
    fireEvent.contextMenu(hcell(4));
    expect(screen.getByRole('menuitem', { name: /R, its graces on R too/ })).toBeTruthy();
  });

  it('opens one picker when a long press is followed by the context menu, as Android sends', () => {
    vi.useFakeTimers();
    mount(fixture());
    fireEvent.pointerDown(hcell(0), { button: 0 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    fireEvent.contextMenu(hcell(0));
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    // the click that ends it, even off the cell, is not a tap
    fireEvent.pointerUp(hcell(8));
    fireEvent.click(hcell(0), { detail: 1 });
    expect(onHands).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a long press writes nothing until a choice
  });

  it('strikes through a hand the drummer cannot play the step with, and says why (D67)', () => {
    mount(fixture(['..............L.']));
    const ride = hcell(14);
    expect(ride.className).toMatch(/unreached/);
    expect(ride.getAttribute('aria-label')).toMatch(
      /L cannot reach the ride here, so the drummer plays this step as if nothing were written$/
    );
    expect(hcell(0).className).not.toMatch(/unreached/);
  });
});
