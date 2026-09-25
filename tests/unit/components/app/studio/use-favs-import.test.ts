// @vitest-environment happy-dom

/**
 * `useFavsImport` on its own — the edges the Studio-level tests in
 * `panels/patterns-panel.test.tsx` do not reach: more favourites than one bulk
 * request takes, a key that is not JSON, a browser that refuses storage, a
 * Strict Mode remount, and a second Studio mounting while the first import is
 * still in flight — none of which may send the favourites twice.
 *
 * `readFavs` and the storage are real; only the HTTP client is mocked.
 *
 * @see components/app/studio/use-favs-import.ts
 */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } };
});

import { CLAIM_KEY, CLAIM_MS, useFavsImport } from '@/components/app/studio/use-favs-import';
import { apiClient } from '@/lib/api/client';
import { FAVS_KEY } from '@/lib/app/breaks/favs';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { encodeBreak } from '@/lib/app/breaks/share';
import { MAX_BULK_BREAKS } from '@/lib/validations/breaks';
import { testStyle, testStyles } from '@/tests/helpers/catalogue';

const STYLES = testStyles();
const lookup = (key: string) => STYLES[key];

function code(seed: number) {
  const funk = testStyle('funk');
  const A = generatePattern({ style: funk, meter: '4/4', seed, bars: 2, density: 50, ghosts: 50 });
  return encodeBreak({
    bpm: 90,
    swing: 0,
    level: 3,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  });
}

const fav = (i: number) => ({ name: `Fav ${i}`, bpm: 100, style: 'funk', level: 3, code: code(i) });

/** Answers the bulk create with one row per break sent, as the route does. */
function acceptAll() {
  vi.mocked(apiClient.post).mockImplementation((_url, options) => {
    const { breaks } = (options?.body ?? {}) as { breaks: unknown[] };
    return Promise.resolve(breaks.map((_, i) => ({ id: `cbrk${String(i).padStart(20, '0')}` })));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useFavsImport', () => {
  it(`sends the first ${MAX_BULK_BREAKS} and keeps the rest in the key for next time`, async () => {
    const all = Array.from({ length: MAX_BULK_BREAKS + 2 }, (_, i) => fav(i));
    localStorage.setItem(FAVS_KEY, JSON.stringify(all));
    acceptAll();
    const say = vi.fn();

    renderHook(() => useFavsImport(lookup, say));

    await waitFor(() =>
      expect(say).toHaveBeenCalledWith(
        `Your ${MAX_BULK_BREAKS} browser favourites are now in your account — under Patterns › All`
      )
    );
    const { breaks } = vi.mocked(apiClient.post).mock.calls[0][1]?.body as {
      breaks: Array<{ title: string }>;
    };
    expect(breaks.map((b) => b.title)).toEqual(all.slice(0, MAX_BULK_BREAKS).map((f) => f.name));
    // the overflow is left exactly as it was stored, not re-encoded
    expect(JSON.parse(localStorage.getItem(FAVS_KEY) ?? 'null')).toEqual(
      all.slice(MAX_BULK_BREAKS)
    );
  });

  it('imports once under a Strict Mode remount', async () => {
    localStorage.setItem(FAVS_KEY, JSON.stringify([fav(1)]));
    acceptAll();
    const say = vi.fn();

    renderHook(() => useFavsImport(lookup, say), { reactStrictMode: true });

    await waitFor(() => expect(say).toHaveBeenCalledTimes(1));
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it('leaves a key that is not JSON alone and sends nothing', async () => {
    localStorage.setItem(FAVS_KEY, '{not json');
    const say = vi.fn();

    renderHook(() => useFavsImport(lookup, say));
    await Promise.resolve();

    expect(apiClient.post).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing readable to send
    expect(localStorage.getItem(FAVS_KEY)).toBe('{not json');
    expect(say).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no import, no toast
  });

  it('does nothing, and does not throw, when the browser refuses storage', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const say = vi.fn();

    expect(() => renderHook(() => useFavsImport(lookup, say))).not.toThrow();
    await Promise.resolve();

    expect(apiClient.post).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no storage, nothing to import
    expect(say).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no import, no toast
  });

  it('sends once when a second Studio mounts while the first request is in flight', async () => {
    localStorage.setItem(FAVS_KEY, JSON.stringify([fav(1)]));
    let answer: (rows: unknown) => void = () => {};
    vi.mocked(apiClient.post).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      })
    );

    // a navigation remounts the provider: the first request is still out
    const first = renderHook(() => useFavsImport(lookup, vi.fn()));
    first.unmount();
    renderHook(() => useFavsImport(lookup, vi.fn()));
    await Promise.resolve();
    expect(apiClient.post).toHaveBeenCalledTimes(1);

    answer([{ id: 'cbrk00000000000000000000' }]);
    await waitFor(() => expect(localStorage.getItem(FAVS_KEY)).toBeNull());
    expect(localStorage.getItem(CLAIM_KEY)).toBeNull();
  });

  it('lets go of the claim when the request fails, so the next load tries again', async () => {
    localStorage.setItem(FAVS_KEY, JSON.stringify([fav(1)]));
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('offline'));

    const first = renderHook(() => useFavsImport(lookup, vi.fn()));
    await waitFor(() => expect(localStorage.getItem(CLAIM_KEY)).toBeNull());
    first.unmount();

    acceptAll();
    renderHook(() => useFavsImport(lookup, vi.fn()));
    await waitFor(() => expect(localStorage.getItem(FAVS_KEY)).toBeNull());
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it(`ignores a claim older than ${CLAIM_MS / 1000}s — a tab that died mid-request`, async () => {
    localStorage.setItem(FAVS_KEY, JSON.stringify([fav(1)]));
    localStorage.setItem(CLAIM_KEY, String(Date.now() - CLAIM_MS - 1));
    acceptAll();

    renderHook(() => useFavsImport(lookup, vi.fn()));

    await waitFor(() => expect(localStorage.getItem(FAVS_KEY)).toBeNull());
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });
});
