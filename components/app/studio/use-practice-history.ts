'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import type { InitialPattern, PracticePlace } from '@/components/app/breaks/use-break-console';
import { APIClientError, apiClient } from '@/lib/api/client';
import { storedLinkSchema } from '@/lib/app/breaks/links';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { logger } from '@/lib/logging';
import { type HistoryItem, practiceVisitViewSchema } from '@/lib/validations/history';
import type { PinTarget } from '@/lib/validations/pins';

/**
 * The practice history as the Studio holds it (D18, task 4.7): what you
 * opened, newest first, and **Back** / **Forward** through it.
 *
 * **Recording.** Whatever is on the stage with an identity — a saved pattern,
 * or the library entry it came from — is recorded when it arrives, and again
 * {@link RECORD_MS} after its layer or tempo last moved, so the history knows
 * where you left it. Leaving a pattern sends that last place at once rather
 * than waiting. A scratch pattern has no identity and is not recorded; saving
 * it gives it one. Requests go one after another, so the pattern left and the
 * pattern arrived at reach the server in that order.
 *
 * **Stepping.** Back is a browser's Back, not "move to the top". Each open
 * moves its item to the top on the server — that is what makes Recent mean
 * recent — so stepping works over a *trail*: the list as it stood when you
 * started stepping, and where you are in it. Back twice then Forward once
 * lands on the one you expect. Opening anything some other way ends the trail.
 */

/** How long after the layer or tempo last moved the place is recorded. */
export const RECORD_MS = 2000;
/** The server keeps 200 (`HISTORY_CAP`); the client never holds more. */
const CAP = 200;

/** What is on the stage now, as far as the history cares. */
export interface HistoryCurrent {
  target: PinTarget;
  level: number;
  bpm: number;
}

/** How an open went: on the stage (or waiting on the prompt), gone for good, or not this time. */
export type OpenResult = 'opened' | 'gone' | 'failed';

export interface PracticeHistoryState {
  items: HistoryItem[];
  /** Which item is on the stage, if any. */
  currentId: string | null;
  /** What Back would open, if anything. */
  previous: HistoryItem | null;
  /** What Forward would open, if anything. */
  following: HistoryItem | null;
  /** One step back (older) or forward (newer). */
  step: (direction: 'back' | 'forward') => void;
  /** Open an item from the list — which ends any trail. */
  open: (item: HistoryItem) => void;
  /** Forget all of it. */
  clear: () => Promise<boolean>;
}

export function keyOf(target: PinTarget): string {
  return 'breakId' in target ? `break:${target.breakId}` : `entry:${target.libraryEntryId}`;
}

function itemKey(item: HistoryItem): string {
  return `${item.target.kind}:${item.target.id}`;
}

/** What `GET /api/v1/breaks/:id` answers that opening needs — checked, not cast. */
const openedSchema = z.object({
  id: z.string(),
  title: z.string(),
  mine: z.boolean(),
  doc: sharePayloadSchema,
  description: z.string().nullish(),
  // links that will not read cost the pattern its chips, never its opening
  links: z.array(storedLinkSchema).catch([]),
});

/**
 * A saved pattern, fetched to be opened in place. `gone` when it was deleted
 * or its owner unshared it — the same 404 either way.
 */
export async function fetchSavedPattern(id: string): Promise<InitialPattern | 'gone' | null> {
  try {
    const row = openedSchema.parse(await apiClient.get(`/api/v1/breaks/${id}`));
    return {
      id: row.id,
      title: row.title,
      mine: row.mine,
      payload: row.doc,
      details: { description: row.description ?? '', links: row.links },
    };
  } catch (error) {
    if (error instanceof APIClientError && error.status === 404) return 'gone';
    logger.warn('BeatBreaker: could not fetch a saved pattern', { error, breakId: id });
    return null;
  }
}

export function usePracticeHistory({
  initial,
  current,
  openItem,
  say,
}: {
  /** The history, read server-side with the page. */
  initial: HistoryItem[] | undefined;
  /** What is on the stage, or null for a scratch pattern (or before one loads). */
  current: HistoryCurrent | null;
  /** Put an item on the stage, where it was left. */
  openItem: (item: HistoryItem, at: PracticePlace) => Promise<OpenResult>;
  say: (message: string) => void;
}): PracticeHistoryState {
  const [items, setItems] = useState<HistoryItem[]>(initial ?? []);
  /** The list as it stood when stepping started, and where on it you are. */
  const [trail, setTrail] = useState<{ items: HistoryItem[]; cursor: number } | null>(null);
  /** The step on its way — kept until the stage has it, so a cancelled prompt moves nothing. */
  const stepping = useRef<{ key: string; items: HistoryItem[]; cursor: number } | null>(null);

  const currentKey = current ? keyOf(current.target) : null;

  /* ---- recording ------------------------------------------------------ */

  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const send = useCallback((place: HistoryCurrent) => {
    const run = async () => {
      try {
        const visit = practiceVisitViewSchema.parse(
          await apiClient.post('/api/v1/history', {
            body: { ...place.target, level: place.level, bpm: Math.round(place.bpm) },
          })
        );
        setItems((list) =>
          [visit, ...list.filter((i) => itemKey(i) !== itemKey(visit))].slice(0, CAP)
        );
      } catch (error) {
        // a history that missed one visit is still a history — nothing to tell anyone
        logger.warn('BeatBreaker: a practice visit was not recorded', { error });
      }
    };
    const next = chain.current.then(run, run);
    chain.current = next;
    return next;
  }, []);

  /* The place on the stage now, read by the effects below when they fire. */
  const latest = useRef(current);
  useLayoutEffect(() => {
    latest.current = current;
  });
  /** The last place sent, so a place is not sent twice. */
  const lastSent = useRef<{ key: string; level: number; bpm: number } | null>(null);
  /** The place waiting on {@link RECORD_MS}, if one is. */
  const waiting = useRef<HistoryCurrent | null>(null);

  const record = useCallback(
    (place: HistoryCurrent) => {
      lastSent.current = {
        key: keyOf(place.target),
        level: place.level,
        bpm: Math.round(place.bpm),
      };
      return send(place);
    },
    [send]
  );

  /* A different target: send where the last one was left, if that had not gone
     yet, then record the arrival. The trail survives only a step. */
  const shownKey = useRef<string | null>(null);
  useEffect(() => {
    if (shownKey.current === currentKey) return;
    shownKey.current = currentKey;
    if (waiting.current) void record(waiting.current);
    waiting.current = null;

    const pending = stepping.current;
    stepping.current = null;
    setTrail(
      pending && pending.key === currentKey
        ? { items: pending.items, cursor: pending.cursor }
        : null
    );

    if (latest.current) void record(latest.current);
  }, [currentKey, record]);

  /* The layer or tempo moved: record the new place once it settles. Runs after
     the effect above in the same commit, so an arrival is already sent. */
  const level = current?.level;
  const bpm = current?.bpm;
  useEffect(() => {
    const place = latest.current;
    if (!place || shownKey.current !== keyOf(place.target)) return;
    const sent = lastSent.current;
    if (
      sent &&
      sent.key === keyOf(place.target) &&
      sent.level === place.level &&
      sent.bpm === Math.round(place.bpm)
    ) {
      waiting.current = null;
      return;
    }
    waiting.current = place;
    const t = setTimeout(() => {
      waiting.current = null;
      void record(place);
    }, RECORD_MS);
    return () => clearTimeout(t);
  }, [level, bpm, currentKey, record]);

  /* ---- stepping ------------------------------------------------------- */

  const base = useMemo(
    () =>
      trail ?? {
        items,
        cursor: currentKey === null ? -1 : items.findIndex((i) => itemKey(i) === currentKey),
      },
    [trail, items, currentKey]
  );
  const previous = base.items[base.cursor + 1] ?? null;
  const following = base.cursor > 0 ? (base.items[base.cursor - 1] ?? null) : null;

  const go = useCallback(
    async (item: HistoryItem, step: { items: HistoryItem[]; cursor: number } | null) => {
      stepping.current = step ? { key: itemKey(item), ...step } : null;
      const result = await openItem(item, { level: item.level, bpm: item.bpm });
      if (result === 'opened') return;
      stepping.current = null;
      if (result === 'gone') {
        /* Deleted, or unshared by its owner: it will not open again, so it
           leaves the list (and the trail) rather than being a Back that
           never goes anywhere. */
        const drop = (list: HistoryItem[]) => list.filter((i) => i.id !== item.id);
        setItems(drop);
        setTrail((t) =>
          t
            ? {
                items: drop(t.items),
                cursor: t.cursor - (t.items.indexOf(item) < t.cursor ? 1 : 0),
              }
            : t
        );
        say('That pattern is no longer there — taken out of your history');
      } else {
        say('Could not open that — try again');
      }
    },
    [openItem, say]
  );

  const step = useCallback(
    (direction: 'back' | 'forward') => {
      const to = base.cursor + (direction === 'back' ? 1 : -1);
      const item = to >= 0 ? base.items[to] : undefined;
      if (!item) return;
      void go(item, { items: base.items, cursor: to });
    },
    [base, go]
  );

  const open = useCallback(
    (item: HistoryItem) => {
      if (itemKey(item) === currentKey) return;
      void go(item, null);
    },
    [currentKey, go]
  );

  const clear = useCallback(async () => {
    try {
      await apiClient.delete('/api/v1/history');
      setItems([]);
      setTrail(null);
      return true;
    } catch (error) {
      logger.warn('BeatBreaker: history could not be cleared', { error });
      say('Could not clear your history — try again');
      return false;
    }
  }, [say]);

  const currentId = useMemo(
    () => items.find((i) => itemKey(i) === currentKey)?.id ?? null,
    [items, currentKey]
  );

  return { items, currentId, previous, following, step, open, clear };
}
