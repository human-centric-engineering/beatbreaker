// @vitest-environment happy-dom

/**
 * `useSpeeds` and `useTableTop` (Phase 7C) — your records on the pattern on
 * the stage, and the top of its public table, for the Practise drawer.
 *
 * `apiClient` is mocked so every assertion is on what was sent, and the real
 * `APIClientError` is kept so the hook's "server refused" versus "network
 * failed" branch is exercised against the error the client actually throws.
 *
 * @see components/app/studio/use-speeds.ts
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } };
});
vi.mock('@/lib/logging', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { useSpeeds, useTableTop, TABLE_TOP } from '@/components/app/studio/use-speeds';
import { APIClientError, apiClient } from '@/lib/api/client';
import { logger } from '@/lib/logging';
import type { PinTarget } from '@/lib/validations/pins';
import type { YourSpeeds } from '@/lib/validations/speeds';

const TARGET: PinTarget = { breakId: 'cbrk00000000000000000001' };
const OTHER_TARGET: PinTarget = { breakId: 'cbrk00000000000000000002' };

const ANSWER: YourSpeeds = {
  records: [
    {
      id: 'cspd00000000000000000001',
      level: 5,
      bpm: 120,
      video: null,
      note: null,
      listed: false,
      recordedAt: '2026-09-29T12:00:00.000Z',
      title: 'Cold Carpet',
    },
  ],
  public: true,
  places: [{ level: 5, position: 2, of: 41 }],
  hasUsername: true,
  listSpeeds: 'ask',
};

const say = vi.fn();

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.delete).mockReset();
  vi.mocked(logger.warn).mockReset();
  say.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSpeeds', () => {
  it('asks nothing and holds no speeds when there is no target', () => {
    const { result } = renderHook(() => useSpeeds(null, say));

    expect(apiClient.get).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to read with no target
    expect(result.current.speeds).toBeNull();
  });

  it('reads your speeds on the target, with the target as the query', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(ANSWER);
    const { result } = renderHook(() => useSpeeds(TARGET, say));

    await vi.waitFor(() => expect(result.current.speeds).not.toBeNull());

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/speed-records', { params: TARGET });
    expect(result.current.speeds).toEqual(ANSWER);
  });

  it('leaves speeds null and logs a warning when the answer does not match the schema', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ nonsense: true });
    const { result } = renderHook(() => useSpeeds(TARGET, say));

    await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());

    expect(result.current.speeds).toBeNull();
    expect(say).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a failed read says nothing to the user
  });

  it('leaves speeds null and logs a warning when the request is rejected, without throwing', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useSpeeds(TARGET, say));

    await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());

    expect(result.current.speeds).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      'BeatBreaker: speeds could not be read',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('never shows the last target’s speeds once a different target is on the stage', async () => {
    const resolvers: Array<(value: YourSpeeds) => void> = [];
    vi.mocked(apiClient.get).mockImplementation(
      () =>
        new Promise<YourSpeeds>((resolve) => {
          resolvers.push(resolve);
        })
    );

    const { result, rerender } = renderHook(({ target }) => useSpeeds(target, say), {
      initialProps: { target: TARGET as PinTarget | null },
    });

    // switch targets before the first (slow) request has resolved
    rerender({ target: OTHER_TARGET });
    expect(resolvers).toHaveLength(2);

    // the new target's request lands first
    const otherAnswer = { ...ANSWER, places: [{ level: 5, position: 9, of: 9 }] };
    resolvers[1](otherAnswer);
    await vi.waitFor(() => expect(result.current.speeds).not.toBeNull());
    expect(result.current.speeds?.places[0].position).toBe(9);

    // the stale first-target answer lands late — it must not clobber the new target's speeds
    resolvers[0](ANSWER);
    await Promise.resolve();
    await Promise.resolve();
    expect(result.current.speeds?.places[0].position).toBe(9);
  });

  it('records a speed, says it, re-reads, and bumps version', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(ANSWER);
    vi.mocked(apiClient.post).mockResolvedValue({});
    const { result } = renderHook(() => useSpeeds(TARGET, say));
    await vi.waitFor(() => expect(result.current.speeds).not.toBeNull());
    const versionBefore = result.current.version;
    vi.mocked(apiClient.get).mockClear();

    let ok = false;
    await act(async () => {
      ok = await result.current.record({ level: 5, bpm: 140 });
    });

    expect(ok).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/speed-records', {
      body: { ...TARGET, level: 5, bpm: 140 },
    });
    expect(say).toHaveBeenCalledWith('Recorded: 140 bpm');
    expect(result.current.version).toBe(versionBefore + 1);
    await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalled());
  });

  it('reports the server’s refusal and returns false when recording is refused', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(ANSWER);
    vi.mocked(apiClient.post).mockRejectedValue(
      new APIClientError('Too many records today', 'RATE_LIMIT', 429)
    );
    const { result } = renderHook(() => useSpeeds(TARGET, say));
    await vi.waitFor(() => expect(result.current.speeds).not.toBeNull());

    let ok = true;
    await act(async () => {
      ok = await result.current.record({ level: 5, bpm: 140 });
    });

    expect(ok).toBe(false);
    expect(say).toHaveBeenCalledWith('Too many records today', { error: true });
  });

  it('says a generic message and returns false when recording fails for a non-API reason', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(ANSWER);
    vi.mocked(apiClient.post).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSpeeds(TARGET, say));
    await vi.waitFor(() => expect(result.current.speeds).not.toBeNull());

    let ok = true;
    await act(async () => {
      ok = await result.current.record({ level: 5, bpm: 140 });
    });

    expect(ok).toBe(false);
    expect(say).toHaveBeenCalledWith('Could not record that — try again', { error: true });
  });

  it('deletes one of your records and re-reads', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(ANSWER);
    vi.mocked(apiClient.delete).mockResolvedValue({});
    const { result } = renderHook(() => useSpeeds(TARGET, say));
    await vi.waitFor(() => expect(result.current.speeds).not.toBeNull());
    const versionBefore = result.current.version;
    vi.mocked(apiClient.get).mockClear();

    await act(async () => {
      await result.current.remove('cspd00000000000000000001');
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/speed-records/cspd00000000000000000001');
    expect(result.current.version).toBe(versionBefore + 1);
    await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalled());
  });

  it('says an error when a delete fails', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(ANSWER);
    vi.mocked(apiClient.delete).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSpeeds(TARGET, say));
    await vi.waitFor(() => expect(result.current.speeds).not.toBeNull());

    await act(async () => {
      await result.current.remove('cspd00000000000000000001');
    });

    expect(say).toHaveBeenCalledWith('Could not delete that — try again', { error: true });
    expect(logger.warn).toHaveBeenCalledWith(
      'BeatBreaker: a speed could not be deleted',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});

describe('useTableTop', () => {
  it('asks nothing and holds no rows with no url', () => {
    const { result } = renderHook(() => useTableTop(null, 5, 0));

    expect(apiClient.get).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to read with no table
    expect(result.current).toBeNull();
  });

  const URL = '/api/v1/public/patterns/cold000001/speeds';

  it('reads the table at the given level, capped to the drawer’s top', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    const { result } = renderHook(() => useTableTop(URL, 5, 0));

    await vi.waitFor(() => expect(result.current).not.toBeNull());

    expect(apiClient.get).toHaveBeenCalledWith(URL, { params: { level: 5, limit: TABLE_TOP } });
    expect(result.current).toEqual([]);
  });

  it('reads again when the level changes', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    const { rerender } = renderHook(({ level }) => useTableTop(URL, level, 0), {
      initialProps: { level: 5 },
    });
    await vi.waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(URL, { params: { level: 5, limit: TABLE_TOP } })
    );
    vi.mocked(apiClient.get).mockClear();

    rerender({ level: 2 });

    await vi.waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(URL, { params: { level: 2, limit: TABLE_TOP } })
    );
  });

  it('reads again when version changes, at the same level', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    const { rerender } = renderHook(({ version }) => useTableTop(URL, 5, version), {
      initialProps: { version: 0 },
    });
    await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
    vi.mocked(apiClient.get).mockClear();

    rerender({ version: 1 });

    await vi.waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(URL, { params: { level: 5, limit: TABLE_TOP } })
    );
  });
});
