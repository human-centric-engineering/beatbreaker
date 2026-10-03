// @vitest-environment happy-dom

/**
 * `useAppEvents` (task 8.8): sent only with optional consent, held until the
 * analytics client is ready, and a no-op where no provider is mounted.
 *
 * The consent case runs against Sunrise's real `AnalyticsProvider`, with only
 * the consent read and the provider client stubbed, so "nothing without
 * consent" is the provider's gate as the app meets it — not a flag this file
 * set on a fake context.
 *
 * @see lib/app/breaks/events.ts
 */

import { act, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = {
  name: 'stub',
  init: vi.fn(async () => {}),
  isReady: vi.fn(() => true),
  track: vi.fn(async () => ({ success: true })),
  reset: vi.fn(async () => ({ success: true })),
};
const consent = vi.fn(() => false);

vi.mock('@/lib/analytics/client', () => ({
  getAnalyticsClient: () => client,
  initAnalytics: async () => {},
  getAnalyticsProviderName: () => 'stub',
  resetAnalyticsClient: () => {},
}));
vi.mock('@/lib/consent', () => ({ useHasOptionalConsent: () => consent() }));

import { AnalyticsContext, AnalyticsProvider } from '@/lib/analytics/analytics-provider';
import { daysSince, useAppEvents } from '@/lib/app/breaks/events';
import { recordEvents } from '@/tests/helpers/analytics';

beforeEach(() => {
  client.track.mockClear();
  consent.mockReset().mockReturnValue(false);
});

describe('useAppEvents', () => {
  it('is a no-op outside an AnalyticsProvider, rather than a throw', () => {
    const { result } = renderHook(() => useAppEvents());
    expect(() => result.current('pattern_saved', {})).not.toThrow();
  });

  it('sends nothing to the provider without optional consent', () => {
    consent.mockReturnValue(false);
    const { result } = renderHook(() => useAppEvents(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider>{children}</AnalyticsProvider>
      ),
    });
    act(() => {
      result.current('pattern_created', {});
      result.current('buddy_turn', { changed: true });
    });
    expect(client.track).not.toHaveBeenCalled();
  });

  it('sends to the provider with optional consent', async () => {
    consent.mockReturnValue(true);
    const { result } = renderHook(() => useAppEvents(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider>{children}</AnalyticsProvider>
      ),
    });
    await act(async () => {
      result.current('pattern_opened', { days_since_created: 2 });
    });
    expect(client.track).toHaveBeenCalledTimes(1);
    expect(client.track).toHaveBeenCalledWith('pattern_opened', { days_since_created: 2 });
  });

  it('holds an event sent before the client is ready, and sends it once when it is', async () => {
    const early = recordEvents({ ready: false });
    let send: ReturnType<typeof useAppEvents> = () => {};
    function Probe() {
      send = useAppEvents();
      return null;
    }
    const { rerender } = render(
      <AnalyticsContext.Provider value={early.value}>
        <Probe />
      </AnalyticsContext.Provider>
    );
    act(() => send('pattern_opened', { days_since_created: 1 }));
    expect(early.value.track).not.toHaveBeenCalled();

    const ready = { ...early.value, isReady: true };
    await act(async () => {
      rerender(
        <AnalyticsContext.Provider value={ready}>
          <Probe />
        </AnalyticsContext.Provider>
      );
    });
    expect(early.names()).toEqual(['pattern_opened']);

    // the held list is spent: a later render sends nothing twice
    await act(async () => {
      rerender(
        <AnalyticsContext.Provider value={{ ...ready }}>
          <Probe />
        </AnalyticsContext.Provider>
      );
    });
    expect(early.names()).toEqual(['pattern_opened']);
  });

  it('sends an event held by a component that has gone, once another is mounted when the client is ready', async () => {
    const early = recordEvents({ ready: false });
    let send: ReturnType<typeof useAppEvents> = () => {};
    function Sender() {
      send = useAppEvents();
      return null;
    }
    function After() {
      useAppEvents();
      return null;
    }
    // a shared page's Save a copy, then straight to the Studio
    const { rerender } = render(
      <AnalyticsContext.Provider value={early.value}>
        <Sender />
      </AnalyticsContext.Provider>
    );
    act(() => send('pattern_copied', { kind: 'copy', from: 'shared_page' }));
    rerender(
      <AnalyticsContext.Provider value={early.value}>
        <After />
      </AnalyticsContext.Provider>
    );
    expect(early.value.track).not.toHaveBeenCalled();

    await act(async () => {
      rerender(
        <AnalyticsContext.Provider value={{ ...early.value, isReady: true }}>
          <After />
        </AnalyticsContext.Provider>
      );
    });
    expect(early.tracked).toEqual([
      { event: 'pattern_copied', props: { kind: 'copy', from: 'shared_page' } },
    ]);
  });

  it('drops, never holds, an event sent without consent — consent given later does not send it', async () => {
    const off = recordEvents({ enabled: false, ready: false });
    let send: ReturnType<typeof useAppEvents> = () => {};
    function Probe() {
      send = useAppEvents();
      return null;
    }
    const { rerender } = render(
      <AnalyticsContext.Provider value={off.value}>
        <Probe />
      </AnalyticsContext.Provider>
    );
    act(() => send('pattern_saved', {}));
    await act(async () => {
      rerender(
        <AnalyticsContext.Provider value={{ ...off.value, isEnabled: true, isReady: true }}>
          <Probe />
        </AnalyticsContext.Provider>
      );
    });
    expect(off.value.track).not.toHaveBeenCalled();
  });

  it('swallows a provider that rejects', async () => {
    const rec = recordEvents();
    vi.mocked(rec.value.track).mockRejectedValueOnce(new Error('blocked'));
    const { result } = renderHook(() => useAppEvents(), { wrapper: rec.wrapper });
    await act(async () => {
      result.current('buddy_undo', {});
    });
    expect(rec.value.track).toHaveBeenCalledTimes(1);
  });
});

describe('daysSince', () => {
  const NOW = Date.parse('2026-10-03T12:00:00Z');

  it('counts whole days: the same day is 0, 25 hours is 1', () => {
    expect(daysSince('2026-10-03T01:00:00Z', NOW)).toBe(0);
    expect(daysSince('2026-10-02T11:00:00Z', NOW)).toBe(1);
    expect(daysSince('2026-09-26T12:00:00Z', NOW)).toBe(7);
  });

  it('is null for a date that will not read, and never negative for a clock behind', () => {
    expect(daysSince('not a date', NOW)).toBeNull();
    expect(daysSince('2026-10-04T12:00:00Z', NOW)).toBe(0);
  });
});
