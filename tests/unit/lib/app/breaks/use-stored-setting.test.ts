// @vitest-environment happy-dom

/**
 * A browser setting read back through its schema. What is in `localStorage`
 * was written by every earlier version of the app and by anyone with devtools,
 * so the cases that matter are the ones where what comes back is not a setting.
 *
 * @see lib/app/breaks/use-stored-setting.ts
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logging', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { PATTERNS_TAB, SIZE, VIEW } from '@/lib/app/breaks/browser-keys';
import { useStoredSetting } from '@/lib/app/breaks/use-stored-setting';

beforeEach(() => {
  localStorage.clear();
});

describe('useStoredSetting', () => {
  it('reads a stored value that fits its schema', () => {
    localStorage.setItem('bb.size', '1.3');
    const { result } = renderHook(() => useStoredSetting(SIZE));
    expect(result.current[0]).toBe(1.3);
  });

  it('reads the fallback when nothing is stored', () => {
    const { result } = renderHook(() => useStoredSetting(VIEW));
    expect(result.current[0]).toBe('both');
  });

  it('reads bad JSON as the fallback', () => {
    localStorage.setItem('bb.size', '{not json');
    const { result } = renderHook(() => useStoredSetting(SIZE));
    expect(result.current[0]).toBe(1);
  });

  it('reads a value of the wrong type as the fallback', () => {
    localStorage.setItem('bb.size', JSON.stringify('huge'));
    const { result } = renderHook(() => useStoredSetting(SIZE));
    expect(result.current[0]).toBe(1);
  });

  it('reads a size out of range as the fallback, at either end', () => {
    localStorage.setItem('bb.size', '9');
    const big = renderHook(() => useStoredSetting(SIZE));
    expect(big.result.current[0]).toBe(1);

    localStorage.setItem('bb.size', '0.2');
    const small = renderHook(() => useStoredSetting(SIZE));
    expect(small.result.current[0]).toBe(1);
  });

  it('reads a view that is not one of its own as the fallback', () => {
    localStorage.setItem('bb.view', JSON.stringify('grid'));
    const { result } = renderHook(() => useStoredSetting(VIEW));
    expect(result.current[0]).toBe('both');
  });

  it('reads an unknown tab as no tab, so the drawer picks one', () => {
    localStorage.setItem('bb.patternsTab', JSON.stringify('community'));
    const { result } = renderHook(() => useStoredSetting(PATTERNS_TAB));
    expect(result.current[0]).toBeNull();
  });

  it('writes what it is given, and reads it back', () => {
    const { result } = renderHook(() => useStoredSetting(VIEW));
    act(() => result.current[1]('A'));
    expect(result.current[0]).toBe('A');
    expect(localStorage.getItem('bb.view')).toBe('"A"');
  });

  it('follows a bad value written by another tab back to the fallback', () => {
    localStorage.setItem('bb.size', '1.2');
    const { result } = renderHook(() => useStoredSetting(SIZE));
    expect(result.current[0]).toBe(1.2);

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'bb.size',
          newValue: '"huge"',
          storageArea: localStorage,
        })
      );
    });
    expect(result.current[0]).toBe(1);
  });
});
