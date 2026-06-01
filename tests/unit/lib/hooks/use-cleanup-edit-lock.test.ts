/**
 * useCleanupEditLock Hook Tests
 *
 * Test Coverage:
 * - Initial state is null until first fetch resolves
 * - After initial fetch, state reflects GET response; heldByMe true when heldBy === currentUserId && active
 * - heldByOther true when held by a different user AND active; both flags false when lock is unset
 * - acquire() POSTs to the lock URL; on 200 updates state to heldBy=currentUserId, active=true, resolves true
 * - acquire() on 423 (LOCK_HELD) sets error from details.heldBy[0] and resolves false
 * - release() DELETEs the lock URL and triggers a re-fetch (GET called again after DELETE)
 * - Polling cadence: advance 25s → GET called 3 times; unmount → no further calls after 30s more
 *
 * Mocking: globalThis.fetch per test; vi.useFakeTimers() only for the polling-cadence test.
 *
 * @see lib/hooks/use-cleanup-edit-lock.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import { useCleanupEditLock } from '@/lib/hooks/use-cleanup-edit-lock';

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_ID = 'doc-test-123';
const USER_ID = 'user-me-456';
const OTHER_USER_ID = 'user-other-789';
const LOCK_URL = `/api/v1/admin/orchestration/knowledge/documents/${DOC_ID}/cleanup/lock`;

// ─── Fetch helpers ────────────────────────────────────────────────────────────

function makeGetResponse(data: {
  heldBy: string | null;
  acquiredAt: string | null;
  active: boolean;
  ttlMs: number;
}) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data }),
  };
}

function makePostResponse(data: {
  acquired: boolean;
  heldBy?: string;
  acquiredAt?: string;
  ttlMs: number;
}) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data }),
  };
}

function makeLockHeldResponse(heldByName: string) {
  return {
    ok: false,
    status: 423,
    json: () =>
      Promise.resolve({
        success: false,
        error: {
          code: 'LOCK_HELD',
          message: 'Lock is held by another admin',
          details: { heldBy: [heldByName] },
        },
      }),
  };
}

function makeDeleteResponse() {
  return {
    ok: true,
    status: 204,
    json: () => Promise.resolve({}),
  };
}

function makeInactiveLockResponse() {
  return makeGetResponse({ heldBy: null, acquiredAt: null, active: false, ttlMs: 30_000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useCleanupEditLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Guard: always restore real timers to prevent cascade from any fake-timer test
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initial state is null before the first fetch resolves', () => {
    // Arrange: fetch never resolves during this assertion window
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    // Act
    const { result } = renderHook(() => useCleanupEditLock(DOC_ID, USER_ID));

    // Assert: state is null before fetch settles
    expect(result.current.state).toBeNull();
    expect(result.current.heldByMe).toBe(false);
    expect(result.current.heldByOther).toBe(false);
  });

  it('state reflects GET response shape after initial fetch resolves', async () => {
    // Arrange
    const lockData = {
      heldBy: OTHER_USER_ID,
      acquiredAt: '2026-01-01T00:00:00.000Z',
      active: true,
      ttlMs: 30_000,
    };
    globalThis.fetch = vi.fn().mockResolvedValue(makeGetResponse(lockData));

    // Act
    const { result } = renderHook(() => useCleanupEditLock(DOC_ID, USER_ID));

    // Assert: after the effect runs, state is populated with the fetched data
    await waitFor(() => {
      expect(result.current.state).toEqual(lockData);
    });

    // Anti-green-bar: verify the hook parsed and applied the response —
    // state.heldBy is from the fetch response, not a default value
    expect(result.current.state?.heldBy).toBe(OTHER_USER_ID);
    expect(result.current.state?.active).toBe(true);
  });

  it('heldByMe is true when heldBy === currentUserId AND active === true', async () => {
    // Arrange: lock held by the current user
    globalThis.fetch = vi.fn().mockResolvedValue(
      makeGetResponse({
        heldBy: USER_ID,
        acquiredAt: '2026-01-01T00:00:00.000Z',
        active: true,
        ttlMs: 30_000,
      })
    );

    // Act
    const { result } = renderHook(() => useCleanupEditLock(DOC_ID, USER_ID));

    // Assert: derived flag computed from response data
    await waitFor(() => {
      expect(result.current.heldByMe).toBe(true);
    });
    expect(result.current.heldByOther).toBe(false);
  });

  it('heldByOther is true when held by a different user AND active; both false when lock is inactive', async () => {
    // Arrange: lock held by another user, active
    const fetchMock = vi.fn().mockResolvedValueOnce(
      makeGetResponse({
        heldBy: OTHER_USER_ID,
        acquiredAt: '2026-01-01T00:00:00.000Z',
        active: true,
        ttlMs: 30_000,
      })
    );
    globalThis.fetch = fetchMock;

    // Act
    const { result } = renderHook(() => useCleanupEditLock(DOC_ID, USER_ID));

    await waitFor(() => {
      expect(result.current.heldByOther).toBe(true);
    });
    expect(result.current.heldByMe).toBe(false);

    // Now simulate lock becoming inactive
    fetchMock.mockResolvedValueOnce(makeInactiveLockResponse());

    // Re-fetch via refresh
    await act(async () => {
      await result.current.refresh();
    });

    // Both flags should now be false — lock is no longer active
    expect(result.current.heldByMe).toBe(false);
    expect(result.current.heldByOther).toBe(false);
  });

  it('acquire() POSTs to the lock URL and on 200 updates state to heldByMe=true, resolves true', async () => {
    // Arrange: initial GET returns inactive lock
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeInactiveLockResponse())
      // POST acquire response
      .mockResolvedValueOnce(
        makePostResponse({
          acquired: true,
          heldBy: USER_ID,
          acquiredAt: '2026-01-01T10:00:00.000Z',
          ttlMs: 30_000,
        })
      );
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useCleanupEditLock(DOC_ID, USER_ID));

    // Wait for initial fetch to resolve
    await waitFor(() => {
      expect(result.current.state).not.toBeNull();
    });

    // Act
    let acquired: boolean;
    await act(async () => {
      acquired = await result.current.acquire();
    });

    // Assert: acquire returned true
    expect(acquired!).toBe(true);

    // Assert: POST was made to the lock URL
    expect(fetchMock).toHaveBeenCalledWith(LOCK_URL, expect.objectContaining({ method: 'POST' }));

    // Assert: state was updated to reflect the acquired lock (not just the mock return value —
    // the hook constructs state from POST response fields)
    expect(result.current.heldByMe).toBe(true);
    expect(result.current.state?.active).toBe(true);
    expect(result.current.state?.heldBy).toBe(USER_ID);
    expect(result.current.error).toBeNull();
  });

  it('acquire() on 423 sets error with the holder name from details.heldBy[0] and resolves false', async () => {
    // Arrange: initial GET returns inactive, POST returns 423
    const holderName = 'Alice Admin';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeInactiveLockResponse())
      // 423 POST response
      .mockResolvedValueOnce(makeLockHeldResponse(holderName))
      // re-fetch after acquire failure
      .mockResolvedValueOnce(
        makeGetResponse({
          heldBy: OTHER_USER_ID,
          acquiredAt: '2026-01-01T00:00:00.000Z',
          active: true,
          ttlMs: 30_000,
        })
      );
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useCleanupEditLock(DOC_ID, USER_ID));

    await waitFor(() => {
      expect(result.current.state).not.toBeNull();
    });

    // Act
    let acquired: boolean;
    await act(async () => {
      acquired = await result.current.acquire();
    });

    // Assert: resolved false
    expect(acquired!).toBe(false);

    // Assert: error message includes the holder name extracted from details.heldBy[0]
    // (the hook builds `Edit lock is held by ${held}`)
    await waitFor(() => {
      expect(result.current.error).toMatch(holderName);
    });
  });

  it('release() DELETEs the lock URL and triggers a re-fetch (GET called again)', async () => {
    // Arrange: initial GET, then DELETE, then re-fetch GET
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeGetResponse({
          heldBy: USER_ID,
          acquiredAt: '2026-01-01T00:00:00.000Z',
          active: true,
          ttlMs: 30_000,
        })
      )
      .mockResolvedValueOnce(makeDeleteResponse())
      .mockResolvedValueOnce(makeInactiveLockResponse());
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useCleanupEditLock(DOC_ID, USER_ID));

    await waitFor(() => {
      expect(result.current.heldByMe).toBe(true);
    });

    const callCountBeforeRelease = fetchMock.mock.calls.length;

    // Act
    await act(async () => {
      await result.current.release();
    });

    // Assert: DELETE was called
    expect(fetchMock).toHaveBeenCalledWith(LOCK_URL, expect.objectContaining({ method: 'DELETE' }));

    // Assert: a GET re-fetch happened after DELETE (call count increased by 2: DELETE + GET)
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callCountBeforeRelease);

    // The re-fetch returned inactive lock — state updated accordingly
    await waitFor(() => {
      expect(result.current.heldByMe).toBe(false);
    });
  });

  it('polling cadence: 25s passes → GET called 3 times; unmount → no more calls after 30s', async () => {
    // This test uses fake timers — gotcha #24: use vi.useRealTimers() in afterEach (already done)
    vi.useFakeTimers();

    const fetchMock = vi.fn().mockResolvedValue(makeInactiveLockResponse());
    globalThis.fetch = fetchMock;

    const { unmount } = renderHook(() => useCleanupEditLock(DOC_ID, USER_ID));

    // Flush the initial fetch (microtasks)
    await act(async () => {
      await Promise.resolve();
    });

    // After initial render: 1 GET call
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Advance 10s → second poll fires
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Advance another 15s (total 25s) → third poll fires
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Unmount clears the interval
    unmount();
    const callsAtUnmount = fetchMock.mock.calls.length;

    // Advance another 30s — no further GET calls should be made
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(fetchMock.mock.calls.length).toBe(callsAtUnmount);
  });
});
