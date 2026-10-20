// @vitest-environment happy-dom

/**
 * `useChartFollow`: the chart reads down the stage as it plays, each new
 * bar's line brought up to a fifth of the way down the view, and a scroll of
 * your own left alone for a while.
 *
 * @see components/app/studio/use-chart-follow.ts
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useChartFollow } from '@/components/app/studio/use-chart-follow';

/* happy-dom lays nothing out: the stage is 500px tall, 2000px of chart in
   it, and the docked player's bar covers its last 100px — a view of 400px,
   so the line playing is held 80px down it. */
function laidOut(lineTop: number) {
  const stage = document.createElement('div');
  stage.className = 'studio-stage';
  const chart = document.createElement('div');
  chart.innerHTML =
    '<svg><rect class="playhead" width="0"></rect></svg><svg><rect class="playhead" width="30"></rect></svg>';
  const docked = document.createElement('div');
  docked.className = 'player-bar docked';
  stage.append(chart, docked);
  document.body.append(stage);

  const box = (top: number, height: number) => new DOMRect(0, top, 300, height);
  vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue(box(0, 500));
  vi.spyOn(docked, 'getBoundingClientRect').mockReturnValue(box(400, 100));
  const heads = chart.querySelectorAll('.playhead');
  vi.spyOn(heads[0], 'getBoundingClientRect').mockReturnValue(box(0, 0));
  vi.spyOn(heads[1], 'getBoundingClientRect').mockImplementation(() =>
    box(lineTop - stage.scrollTop, 120)
  );
  Object.defineProperty(stage, 'scrollHeight', { value: 2000 });
  Object.defineProperty(stage, 'clientHeight', { value: 500 });
  const scrollTo = vi.fn((o: ScrollToOptions) => {
    stage.scrollTop = o.top ?? 0;
  });
  stage.scrollTo = scrollTo as unknown as typeof stage.scrollTo;
  return { stage, chart, scrollTo };
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('useChartFollow', () => {
  it('brings a new bar’s line up to a fifth of the way down the view', () => {
    const { chart, scrollTo } = laidOut(600);
    renderHook(({ bar }) => useChartFollow(chart, bar), { initialProps: { bar: 'A:2' } });
    expect(scrollTo).toHaveBeenCalledWith({ top: 600 - 80, behavior: 'smooth' });
  });

  it('moves nothing for a bar on the line already held, or with nothing playing', () => {
    const { chart, scrollTo } = laidOut(80);
    const { rerender } = renderHook(({ bar }) => useChartFollow(chart, bar), {
      initialProps: { bar: null as string | null },
    });
    rerender({ bar: 'A:0' });
    rerender({ bar: 'A:1' });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('never scrolls above the top of the stage', () => {
    const { stage, chart, scrollTo } = laidOut(40);
    stage.scrollTop = 30;
    renderHook(({ bar }) => useChartFollow(chart, bar), { initialProps: { bar: 'A:0' } });
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('lets a scroll of your own stand for a while, so you can read ahead', () => {
    const { stage, chart, scrollTo } = laidOut(600);
    const { rerender } = renderHook(({ bar }) => useChartFollow(chart, bar), {
      initialProps: { bar: null as string | null },
    });
    stage.dispatchEvent(new Event('wheel'));
    rerender({ bar: 'A:2' });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it.each([
    ['a press on the scrollbar or the grid', new Event('pointerdown')],
    ['a scrolling key', new KeyboardEvent('keydown', { key: 'PageDown' })],
  ])('counts %s as a scroll of your own', (_, event) => {
    const { stage, chart, scrollTo } = laidOut(600);
    const { rerender } = renderHook(({ bar }) => useChartFollow(chart, bar), {
      initialProps: { bar: null as string | null },
    });
    stage.dispatchEvent(event);
    rerender({ bar: 'A:2' });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not count a press on the player as yours', () => {
    const { stage, chart, scrollTo } = laidOut(600);
    const { rerender } = renderHook(({ bar }) => useChartFollow(chart, bar), {
      initialProps: { bar: null as string | null },
    });
    const player = stage.querySelector('.player-bar') as HTMLElement;
    player.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    rerender({ bar: 'A:2' });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('comes back to the line playing when the while is up, though the bar has not changed', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { stage, chart, scrollTo } = laidOut(600);
    renderHook(({ bar }) => useChartFollow(chart, bar), { initialProps: { bar: 'A:0' } });
    scrollTo.mockClear();
    stage.scrollTop = 900;
    stage.dispatchEvent(new Event('wheel'));
    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(scrollTo).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(scrollTo).toHaveBeenCalledWith({ top: 600 - 80, behavior: 'smooth' });
  });

  it('leaves the stage alone while the step grid is up where the line would be held', () => {
    const { stage, chart, scrollTo } = laidOut(600);
    const grid = document.createElement('div');
    grid.className = 'stepeditor';
    stage.append(grid);
    const at = vi
      .spyOn(grid, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 30, 300, 400));
    const { rerender } = renderHook(({ bar }) => useChartFollow(chart, bar), {
      initialProps: { bar: 'A:0' },
    });
    expect(scrollTo).not.toHaveBeenCalled();

    // further down than the line is held — the chart's last line above it — it follows
    at.mockReturnValue(new DOMRect(0, 300, 300, 400));
    rerender({ bar: 'A:1' });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});
