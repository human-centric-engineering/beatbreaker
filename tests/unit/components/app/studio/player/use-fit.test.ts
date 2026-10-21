// @vitest-environment happy-dom

/**
 * The player bar's fit: the width picks the widest layout worth trying, and
 * a layout whose row is crowded steps down to the next.
 *
 * jsdom lays nothing out, so each test gives the row the measurements a
 * browser would, keyed on the layout the bar has on it at the time.
 */
import { describe, expect, it } from 'vitest';

import { type BarFit, crowded, fitFor, fitOf } from '@/components/app/studio/player/use-fit';

/** Sets read-only layout measurements on an element. */
function measure(el: HTMLElement, sizes: Record<string, () => number | Element | null>) {
  for (const [key, get] of Object.entries(sizes))
    Object.defineProperty(el, key, { configurable: true, get });
}

/** A bar with a row of two items; `wraps` and `wide` say which layouts crowd it. */
function bar(width: number, crowds: (fit: BarFit | undefined) => 'wraps' | 'wide' | null) {
  const root = document.createElement('div');
  const row = document.createElement('div');
  row.className = 'player-row';
  root.append(row);
  const fit = () => root.dataset.fit as BarFit | undefined;
  const [a, b] = [document.createElement('span'), document.createElement('span')];
  row.append(a, b);
  measure(root, { clientWidth: () => width });
  measure(row, {
    clientWidth: () => width,
    scrollWidth: () => (crowds(fit()) === 'wide' ? width + 40 : width),
  });
  for (const k of [a, b]) measure(k, { offsetParent: () => row, offsetHeight: () => 30 });
  measure(a, { offsetTop: () => 0 });
  measure(b, { offsetTop: () => (crowds(fit()) === 'wraps' ? 38 : 0) });
  return { root, row };
}

describe('the player bar’s fit', () => {
  it('picks the widest layout the width allows', () => {
    expect(fitFor(1600)).toBe('roomy');
    expect(fitFor(1400)).toBe('one-row');
    expect(fitFor(900)).toBe('two-rows');
    expect(fitFor(600)).toBe('three-rows');
  });

  it('keeps the layout the width picks when its row has room', () => {
    const { root } = bar(1600, () => null);
    expect(fitOf(root)).toBe('roomy');
  });

  it('steps down from one row that has wrapped onto a second line', () => {
    const { root } = bar(1350, (fit) => (fit === 'one-row' ? 'wraps' : null));
    expect(fitOf(root)).toBe('two-rows');
  });

  it('steps down from two rows whose tools run past the bar’s edge', () => {
    const { root } = bar(850, (fit) => (fit === 'two-rows' ? 'wide' : null));
    expect(fitOf(root)).toBe('three-rows');
  });

  it('leaves the bar’s own layout on it, for React to set', () => {
    const { root } = bar(1350, (fit) => (fit === 'one-row' ? 'wraps' : null));
    root.dataset.fit = 'roomy';
    fitOf(root);
    expect(root.dataset.fit).toBe('roomy');
    const fresh = bar(1350, () => null).root;
    fitOf(fresh);
    expect(fresh.dataset.fit).toBeUndefined();
  });

  it('reads a second line only where the bar is meant to be one row', () => {
    const { row } = bar(900, () => 'wraps');
    expect(crowded(row, 'one-row')).toBe(true);
    expect(crowded(row, 'two-rows')).toBe(false);
  });
});
