// @vitest-environment happy-dom

/**
 * The console's copy of your Studio settings, and how it gets back to your
 * account. The API is mocked at `apiClient`; every assertion is on what was
 * sent, and when.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { patch: vi.fn() } };
});
vi.mock('@/lib/logging', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { useStudioSettings } from '@/components/app/breaks/use-studio-settings';
import { AUTOSAVE_MS, RETRY_MS } from '@/components/app/studio/use-pattern-document';
import { APIClientError, apiClient } from '@/lib/api/client';
import { logger } from '@/lib/logging';
import { DEFAULT_STUDIO_SETTINGS } from '@/lib/validations/studio-settings';

const bodies = () => vi.mocked(apiClient.patch).mock.calls.map(([, opts]) => opts?.body);

async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const offline = () => new APIClientError('Network error', 'NETWORK_ERROR');

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(apiClient.patch).mockReset().mockResolvedValue({});
  vi.mocked(logger.warn).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useStudioSettings', () => {
  it('starts from the settings it is handed, and changes them at once', () => {
    const start = { ...DEFAULT_STUDIO_SETTINGS, countIn: 2 };
    const { result } = renderHook(() => useStudioSettings(start));
    expect(result.current.settings).toEqual(start);
    act(() => result.current.update({ density: 5 }));
    expect(result.current.settings.density).toBe(5);
    expect(result.current.settings.countIn).toBe(2);
  });

  it('builds a change on the one before it, even within one handler', async () => {
    const { result } = renderHook(() => useStudioSettings(DEFAULT_STUDIO_SETTINGS));
    act(() => {
      result.current.update(({ sound }) => ({ sound: { ...sound, a: { k: { pitch: 1 } } } }));
      result.current.update(({ sound }) => ({ sound: { ...sound, b: { k: { pitch: 2 } } } }));
    });
    expect(Object.keys(result.current.settings.sound)).toEqual(['a', 'b']);
    await wait(AUTOSAVE_MS);
    expect(bodies()).toEqual([{ sound: { a: { k: { pitch: 1 } }, b: { k: { pitch: 2 } } } }]);
  });

  it('sends only the fields that changed, to the settings route', async () => {
    const { result } = renderHook(() => useStudioSettings(DEFAULT_STUDIO_SETTINGS));
    act(() => result.current.update({ guides: false }));
    await wait(AUTOSAVE_MS);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/studio-settings', {
      body: { guides: false },
    });
  });

  it('keeps what did not reach the server and sends it again, under anything newer', async () => {
    vi.mocked(apiClient.patch).mockRejectedValueOnce(offline());
    const { result } = renderHook(() => useStudioSettings(DEFAULT_STUDIO_SETTINGS));
    act(() => result.current.update({ density: 10, ghosts: 10 }));
    await wait(AUTOSAVE_MS);
    act(() => result.current.update({ density: 20 }));
    await wait(AUTOSAVE_MS);
    expect(bodies()).toEqual([
      { density: 10, ghosts: 10 },
      // the failed ghosts ride along; the newer density wins
      { density: 20, ghosts: 10 },
    ]);
  });

  it('tries again on its own while offline, and when the browser says it is back', async () => {
    vi.mocked(apiClient.patch).mockRejectedValueOnce(offline()).mockRejectedValueOnce(offline());
    const { result } = renderHook(() => useStudioSettings(DEFAULT_STUDIO_SETTINGS));
    act(() => result.current.update({ hats: 90 }));
    await wait(AUTOSAVE_MS);
    await wait(RETRY_MS);
    expect(bodies()).toEqual([{ hats: 90 }, { hats: 90 }]);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(bodies()).toEqual([{ hats: 90 }, { hats: 90 }, { hats: 90 }]);
    // landed: nothing further is sent
    await wait(RETRY_MS * 2);
    expect(bodies()).toHaveLength(3);
  });

  it('logs a refusal and does not send it again', async () => {
    vi.mocked(apiClient.patch).mockRejectedValueOnce(
      new APIClientError('Invalid request body', 'VALIDATION_ERROR', 400)
    );
    const { result } = renderHook(() => useStudioSettings(DEFAULT_STUDIO_SETTINGS));
    act(() => result.current.update({ kit: 'gone' }));
    await wait(AUTOSAVE_MS);
    expect(logger.warn).toHaveBeenCalledWith(
      'BeatBreaker: Studio settings refused',
      expect.objectContaining({ fields: ['kit'] })
    );
    act(() => result.current.update({ feel: 80 }));
    await wait(AUTOSAVE_MS);
    expect(bodies()).toEqual([{ kit: 'gone' }, { feel: 80 }]);
  });

  it('sends what is waiting when the Studio is left, without waiting for the timer', () => {
    const { result, unmount } = renderHook(() => useStudioSettings(DEFAULT_STUDIO_SETTINGS));
    act(() => result.current.update({ sticking: true }));
    unmount();
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/studio-settings', {
      body: { sticking: true },
      options: { keepalive: true },
    });
  });

  it('sends what is waiting when the page is hidden, once', async () => {
    const { result } = renderHook(() => useStudioSettings(DEFAULT_STUDIO_SETTINGS));
    act(() => result.current.update({ preview: false }));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(bodies()).toEqual([{ preview: false }]);
    // the timer it replaced does not send it again
    await wait(AUTOSAVE_MS);
    expect(bodies()).toHaveLength(1);
  });

  it('sends nothing when nothing changed', async () => {
    const { result, unmount } = renderHook(() => useStudioSettings(DEFAULT_STUDIO_SETTINGS));
    act(() => result.current.update({}));
    await wait(AUTOSAVE_MS);
    unmount();
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — an empty change is not a request
  });
});
