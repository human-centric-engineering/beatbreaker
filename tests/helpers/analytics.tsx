/**
 * A recording `AnalyticsContext` for the app's events (task 8.8).
 *
 * The context, not a mock of `useAppEvents`: the hook under test is the real
 * one, so a call site that bypassed it, or a hook that dropped what it was
 * given, would show here.
 */

import type { ReactNode } from 'react';
import { expect, vi } from 'vitest';

import { AnalyticsContext } from '@/lib/analytics/analytics-provider';
import type { AnalyticsContextValue, EventProperties } from '@/lib/analytics/types';

export type Tracked = { event: string; props: EventProperties | undefined };

export function recordEvents({ enabled = true, ready = true } = {}) {
  const tracked: Tracked[] = [];
  const value: AnalyticsContextValue = {
    track: vi.fn(async (event: string, props?: EventProperties) => {
      tracked.push({ event, props });
      return { success: true };
    }),
    identify: vi.fn(async () => ({ success: true })),
    page: vi.fn(async () => ({ success: true })),
    reset: vi.fn(async () => ({ success: true })),
    isReady: ready,
    isEnabled: enabled,
    providerName: 'test',
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
  );
  /** The events sent, by name, in order. */
  const names = () => tracked.map((t) => t.event);
  return { tracked, names, wrapper, value };
}

/** Property names that would carry content or identity. */
const BANNED_KEYS = /^(id|.*_id|.*Id|title|name|notes|doc|payload|slug|message|text|email|user.*)$/;
/** The only words a property may be: the closed sets in `AppEventProps`. */
const ALLOWED_WORDS = new Set(['copy', 'variation', 'studio', 'shared_page']);

/**
 * The property scan: nothing sent carries a title, notes or an id. Every
 * value is a number, a boolean or one of the closed set of words, and none of
 * the given strings (the test's titles and ids) appears anywhere in what was
 * sent.
 */
export function expectNoContent(tracked: Tracked[], forbidden: string[]) {
  for (const { event, props } of tracked) {
    const sent = JSON.stringify(props ?? {});
    for (const word of forbidden) {
      expect(sent, `${event} carries "${word}"`).not.toContain(word);
    }
    for (const [key, value] of Object.entries(props ?? {})) {
      expect(key, `${event}.${key}`).not.toMatch(BANNED_KEYS);
      const ok =
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        (typeof value === 'string' && ALLOWED_WORDS.has(value));
      expect(ok, `${event}.${key} = ${JSON.stringify(value)}`).toBe(true);
    }
  }
}
