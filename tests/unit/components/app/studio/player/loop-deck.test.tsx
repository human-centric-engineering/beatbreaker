// @vitest-environment happy-dom

/**
 * The Loop bars panel (16-b-vi): which slot and bars it offers, what Loop
 * loops, and how the sliders move a loop that is on.
 *
 * The Studio is a fake: the panel reads where the playhead is and what loop
 * holds, and hands a loop back; the console's own tests cover what it does
 * with one.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoopDeck, LoopPop } from '@/components/app/studio/player/loop-deck';
import type { Studio } from '@/components/app/studio/studio-provider';
import type { BarLoop } from '@/lib/app/breaks/bar-loop';

const setBarLoop = vi.fn<(loop: BarLoop | null) => void>();
let studio: Record<string, unknown> = {};

vi.mock('@/components/app/studio/studio-provider', () => ({
  // a structural fake of the parts of the Studio the panel reads
  useStudio: () => studio as unknown as Studio,
}));

const bars = (n: number) => ({ bars: Array.from({ length: n }, () => ({})) });

function stage(over: Record<string, unknown> = {}) {
  studio = {
    viewMode: 'both',
    position: null,
    pausedAt: null,
    cue: null,
    barLoop: null,
    arrangement: ['A', 'B'],
    view: { A: bars(32), B: bars(4) },
    setBarLoop,
    ...over,
  };
}

const slider = (name: string) => screen.getByRole<HTMLInputElement>('slider', { name });
const loop = () => screen.getByRole('button', { name: 'Loop these bars' });

beforeEach(() => {
  setBarLoop.mockClear();
  stage();
});

describe('LoopDeck', () => {
  it('offers the bar the playhead is in, and follows it as it plays', () => {
    stage({ position: { t: 0, slot: 3, secIdx: 0, barIdx: 4, letter: 'A' } });
    const view = render(<LoopDeck />);
    expect(screen.getByText(/A · slot 1 · Bar 5 of 32/)).toBeTruthy();
    stage({ position: { t: 0, slot: 0, secIdx: 0, barIdx: 19, letter: 'A' } });
    view.rerender(<LoopDeck />);
    fireEvent.click(loop());
    expect(setBarLoop).toHaveBeenCalledWith({ slot: 0, from: 19, to: 19 });
  });

  it('loops the bars the sliders were moved to, and keeps them as it plays on', () => {
    stage({ position: { t: 0, slot: 0, secIdx: 0, barIdx: 4, letter: 'A' } });
    const view = render(<LoopDeck />);
    fireEvent.change(slider('To bar'), { target: { value: '8' } });
    stage({ position: { t: 0, slot: 0, secIdx: 0, barIdx: 6, letter: 'A' } });
    view.rerender(<LoopDeck />);
    fireEvent.click(loop());
    expect(setBarLoop).toHaveBeenCalledWith({ slot: 0, from: 4, to: 7 });
  });

  it('starts from the top of a cued slot, where nothing plays', () => {
    stage({ cue: 1 });
    render(<LoopDeck />);
    expect(slider('From bar').max).toBe('4');
    fireEvent.click(loop());
    expect(setBarLoop).toHaveBeenCalledWith({ slot: 1, from: 0, to: 0 });
  });

  it('moves a loop that is on as its sliders move, each end taking the other with it', () => {
    stage({ barLoop: { slot: 0, from: 4, to: 5 } });
    render(<LoopDeck />);
    expect(loop().getAttribute('aria-pressed')).toBe('true');
    fireEvent.change(slider('From bar'), { target: { value: '10' } });
    expect(setBarLoop).toHaveBeenLastCalledWith({ slot: 0, from: 9, to: 9 });
    fireEvent.change(slider('To bar'), { target: { value: '3' } });
    expect(setBarLoop).toHaveBeenLastCalledWith({ slot: 0, from: 2, to: 2 });
  });

  it('stops looping', () => {
    stage({ barLoop: { slot: 0, from: 4, to: 5 } });
    render(<LoopDeck />);
    fireEvent.click(loop());
    expect(setBarLoop).toHaveBeenCalledWith(null);
  });

  it('says so where nothing has bars to loop', () => {
    stage({ arrangement: [], view: {} });
    render(<LoopDeck />);
    expect(screen.getByText(/Nothing is playing that has bars to loop/)).toBeTruthy();
    expect(screen.queryByRole('slider')).toBeNull();
  });
});

describe('LoopPop', () => {
  it('names its bars on its face while a loop is on', () => {
    stage({ barLoop: { slot: 0, from: 4, to: 5 } });
    render(<LoopPop />);
    const button = screen.getByRole('button', { name: 'Loop bars' });
    expect(button.textContent).toContain('Bars 5–6');
    expect(button.className).toContain('on');
  });

  it('says Loop while none is', () => {
    render(<LoopPop />);
    expect(screen.getByRole('button', { name: 'Loop bars' }).textContent).toContain('Loop');
  });
});
