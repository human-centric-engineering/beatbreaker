'use client';

import { useCallback, useContext, useEffect, useLayoutEffect, useRef } from 'react';

import { AnalyticsContext } from '@/lib/analytics/analytics-provider';
import type { AnalyticsContextValue } from '@/lib/analytics/types';

/**
 * The app's analytics events (task 8.8) — the ones that answer "is it
 * working": patterns made, kept, come back to, published and copied, and
 * whether BeatBuddy's changes are kept or undone.
 *
 * They go through Sunrise's `AnalyticsContext`, so they reach whichever
 * provider is configured and only with the visitor's optional consent: the
 * context's `track` is a no-op without it. Outside an `AnalyticsProvider`
 * (component tests, a page that mounts none) the hook is a no-op too, rather
 * than the throw `useAnalytics` gives.
 *
 * The provider starts its client after consent is read, asynchronously, and
 * its `track` drops whatever arrives before then — which is when an event
 * fired as a page mounts (`pattern_opened`) arrives. So an event sent with
 * consent but before the client is ready is held, and sent when it is. One
 * sent without consent is dropped, never held. The held list belongs to the
 * module, not to the component that sent it: the provider sits in the root
 * layout and outlives a navigation, so an event sent just before one (a shared
 * page's _Save a copy_ goes straight to the Studio) is sent by whichever
 * component is mounted when the client is ready.
 *
 * **No content leaves.** Each event's properties are fixed below as numbers,
 * booleans and closed sets of words: no title, notes, message, slug or id —
 * the pattern's or the person's — can be passed, because no property takes a
 * free string. Add a property here, not at the call.
 *
 * - `pattern_created` — a new pattern of yours, from scratch or Save As.
 * - `pattern_saved` — edits to a saved pattern of yours reached the server:
 *   once per opening, not once per autosave (one every two seconds of
 *   editing would be noise, and a bill).
 * - `pattern_opened` — a saved pattern of yours put on the stage, with the
 *   whole days since it was created. "Reopened next day" is
 *   `days_since_created >= 1`, derived in the tool rather than stored.
 * - `pattern_published` — to the community library.
 * - `pattern_copied` — a copy or a variation of a pattern, from the Studio's
 *   Save or a shared pattern's _Save a copy_.
 * - `buddy_turn` — a turn BeatBuddy answered, and whether it changed the chart.
 * - `buddy_undo` — one of BeatBuddy's changes taken back. The undo rate is
 *   this over `buddy_turn` with `changed: true`.
 */
export interface AppEventProps {
  pattern_created: Record<string, never>;
  pattern_saved: Record<string, never>;
  pattern_opened: { days_since_created: number };
  pattern_published: Record<string, never>;
  pattern_copied: { kind: 'copy' | 'variation'; from: 'studio' | 'shared_page' };
  buddy_turn: { changed: boolean };
  buddy_undo: Record<string, never>;
}

export type AppEvent = keyof AppEventProps;

/** Send one event; it never throws and is never awaited. */
export type TrackAppEvent = <E extends AppEvent>(event: E, props: AppEventProps[E]) => void;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `createdAt` to `now`; null when the date will not read. */
export function daysSince(createdAt: string, now: number = Date.now()): number | null {
  const at = Date.parse(createdAt);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.floor((now - at) / DAY_MS));
}

const held: { event: AppEvent; props: AppEventProps[AppEvent] }[] = [];

export function useAppEvents(): TrackAppEvent {
  const analytics = useContext(AnalyticsContext);
  const live = useRef<AnalyticsContextValue | undefined>(analytics);
  useLayoutEffect(() => {
    live.current = analytics;
  });

  const ready = analytics?.isReady ?? false;
  useEffect(() => {
    const now = live.current;
    if (!ready || !now) return;
    const send = held.splice(0);
    for (const { event, props } of send) {
      // consent can be withdrawn while an event waits; the provider checks it again
      now.track(event, props).catch(() => {});
    }
  }, [ready]);

  // stable, so it never re-creates the callbacks that send events
  return useCallback<TrackAppEvent>((event, props) => {
    const now = live.current;
    if (!now?.isEnabled) return;
    if (!now.isReady) {
      held.push({ event, props });
      return;
    }
    now.track(event, props).catch(() => {
      // the provider logs its own failures; an event is never worth an error
    });
  }, []);
}
