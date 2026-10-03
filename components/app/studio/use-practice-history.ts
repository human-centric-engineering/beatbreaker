'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import type { InitialPattern, PracticePlace } from '@/components/app/breaks/use-break-console';
import { APIClientError, apiClient } from '@/lib/api/client';
import { VISIBILITIES } from '@/lib/app/breaks/community/visibility';
import { FULL_LAYER } from '@/lib/app/breaks/layers';
import { storedLinkSchema } from '@/lib/app/breaks/links';
import { type SharePayload, sharePayloadSchema } from '@/lib/app/breaks/schema';
import { logger } from '@/lib/logging';
import { type HistoryItem, practiceVisitViewSchema } from '@/lib/validations/history';
import type { PinTarget } from '@/lib/validations/pins';
import { type Say, UNDO_MS } from '@/components/app/studio/use-notice';

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
 *
 * **Unsaved rolls are on the trail too** (task 5.13, D24). Pressing N, or
 * opening anything else, while the stage holds a pattern that was never
 * saved puts that pattern on the list as "Unsaved · 14:02", so Back returns to
 * it intact: notes, tempo and layer. Rolling one pattern after another is the
 * workflow, so nothing asks first. These entries live in the page only. They
 * are never sent, a reload forgets them (the last scratch is still kept by
 * `bb.scratch`), and saving one makes it an ordinary history item.
 */

/** How long after the layer or tempo last moved the place is recorded. */
export const RECORD_MS = 2000;
/** The server keeps 200 (`HISTORY_CAP`); the client never holds more. */
const CAP = 200;
/** How many unsaved rolls the trail keeps; the oldest goes first. */
export const UNSAVED_CAP = 20;

/**
 * A pattern that was never saved, left for something else (5.13). Shaped like
 * a history item so the list and the trail treat it as one; its target is
 * the page's own, never the server's.
 */
export interface UnsavedItem {
  id: string;
  level: number;
  bpm: number;
  target: { kind: 'unsaved'; id: string; title: string };
  /** The roll's own name, which it is put back on the stage under. */
  name: string;
  payload: SharePayload;
}

/** What the list and the trail hold: the server's visits, and the page's unsaved rolls. */
export type TrailItem = HistoryItem | UnsavedItem;

export function isUnsaved(item: TrailItem): item is UnsavedItem {
  return item.target.kind === 'unsaved';
}

/** "Unsaved · 14:02", at the time it was left. */
export function unsavedTitle(at: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `Unsaved · ${two(at.getHours())}:${two(at.getMinutes())}`;
}

/** The unsaved pattern being left: its trail id if it is already on the trail. */
export interface LeftUnsaved {
  id: string | null;
  payload: SharePayload;
  name: string;
}

/** What is on the stage now, as far as the history cares. */
export interface HistoryCurrent {
  target: PinTarget;
  level: number;
  bpm: number;
}

/** How an open went: on the stage (or waiting on the prompt), gone for good, or not this time. */
export type OpenResult = 'opened' | 'gone' | 'failed';

export interface PracticeHistoryState {
  items: TrailItem[];
  /** Which item is on the stage, if any. */
  currentId: string | null;
  /** What Back would open, if anything. */
  previous: TrailItem | null;
  /** What Forward would open, if anything. */
  following: TrailItem | null;
  /** One step back (older) or forward (newer). */
  step: (direction: 'back' | 'forward') => void;
  /** Open an item from the list — which ends any trail. */
  open: (item: TrailItem) => void;
  /**
   * Forget all of it — at once on screen, with an Undo for {@link UNDO_MS},
   * and on the server when the Undo has gone.
   */
  clear: () => void;
  /** Take a saved pattern out of the list and the trail — it was deleted (5.11). */
  forget: (breakId: string) => void;
  /**
   * The stage is letting go of a pattern that was never saved (5.13): put it
   * on the trail, or bring its entry up to date if it is one already. The id
   * of a new entry, so a replacement that then fails can take it off again.
   */
  leave: (left: LeftUnsaved) => string | null;
  /**
   * Take an unsaved entry off: it was saved, and is an ordinary history item
   * now, or the replacement that put it there did not happen.
   */
  drop: (unsavedId: string) => void;
}

export function keyOf(target: PinTarget): string {
  return 'breakId' in target ? `break:${target.breakId}` : `entry:${target.libraryEntryId}`;
}

function itemKey(item: TrailItem): string {
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
  // nor does a sharing field that will not read: it opens as private, uncredited
  visibility: z.enum(VISIBILITIES).catch('private'),
  slug: z.string().nullish().catch(null),
  basedOn: z
    .object({ title: z.string(), username: z.string(), slug: z.string() })
    .nullish()
    .catch(null),
  /* Unreadable reads as not fixed: the edit is then autosaved and the server
     refuses it (409 PUBLISHED_FIXED), so the notes still cannot change. */
  frozenAt: z.string().nullish().catch(null),
  // only counted with (8.8), so a date that will not read costs nothing
  createdAt: z.string().optional().catch(undefined),
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
      sharing: {
        visibility: row.visibility,
        slug: row.slug ?? null,
        basedOn: row.basedOn ?? null,
        fixed: !!row.frozenAt,
      },
      ...(row.createdAt ? { createdAt: row.createdAt } : {}),
    };
  } catch (error) {
    if (error instanceof APIClientError && error.status === 404) return 'gone';
    logger.warn('BeatBreaker: could not fetch a saved pattern', { error, breakId: id });
    return null;
  }
}

type Trail = { items: TrailItem[]; cursor: number };

export function usePracticeHistory({
  initial,
  current,
  unsavedId = null,
  hidden,
  openItem,
  say,
}: {
  /** The history, read server-side with the page. */
  initial: HistoryItem[] | undefined;
  /** What is on the stage, or null for a scratch pattern (or before one loads). */
  current: HistoryCurrent | null;
  /** The unsaved entry the stage holds, when it was put back from the trail (5.13). */
  unsavedId?: string | null;
  /**
   * Saved patterns deleted on screen, or waiting out their Undo (5.11): out of
   * Recent, and out of Back and Forward, so neither can open one the DELETE is
   * about to take.
   */
  hidden?: ReadonlySet<string>;
  /** Put an item on the stage, where it was left. */
  openItem: (item: TrailItem, at: PracticePlace) => Promise<OpenResult>;
  say: Say;
}): PracticeHistoryState {
  const [items, setItems] = useState<TrailItem[]>(initial ?? []);
  /** The list as it stood when stepping started, and where on it you are. */
  const [trail, setTrail] = useState<Trail | null>(null);
  /** The step on its way — kept until the stage has it, so a cancelled prompt moves nothing. */
  const stepping = useRef<({ key: string } & Trail) | null>(null);

  const currentKey = current ? keyOf(current.target) : unsavedId ? `unsaved:${unsavedId}` : null;

  /* ---- recording ------------------------------------------------------ */

  const chain = useRef<Promise<unknown>>(Promise.resolve());
  /**
   * A clear that has not been sent yet: what it took off the screen, and the
   * gate that holds every later request behind it. A visit recorded while the
   * Undo is up waits for the gate, so it lands after the DELETE and is kept —
   * sent first, the DELETE would take it too.
   */
  const clearing = useRef<{
    items: TrailItem[];
    trail: Trail | null;
    timer: ReturnType<typeof setTimeout>;
    ahead: Promise<unknown>;
    release: () => void;
  } | null>(null);
  const send = useCallback((place: HistoryCurrent) => {
    const run = async () => {
      try {
        const visit = practiceVisitViewSchema.parse(
          await apiClient.post('/api/v1/history', {
            body: { ...place.target, level: place.level, bpm: Math.round(place.bpm) },
          })
        );
        const onTop = (list: TrailItem[]) =>
          [visit, ...list.filter((i) => itemKey(i) !== itemKey(visit))].slice(0, CAP);
        /* Answered while a clear is held, it was already on its way when
           Clear was pressed — everything since waits behind the clear. The
           clear will take it, so it is not put on the emptied list; it joins
           what an Undo brings back. */
        const held = clearing.current;
        if (held) held.items = onTop(held.items);
        else setItems(onTop);
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

  const shown = useCallback(
    (i: TrailItem) => !(hidden?.size && i.target.kind === 'break' && hidden.has(i.target.id)),
    [hidden]
  );
  const base = useMemo(() => {
    const all = trail ?? {
      items,
      cursor: currentKey === null ? -1 : items.findIndex((i) => itemKey(i) === currentKey),
    };
    if (!hidden?.size) return all;
    const gone = all.items.slice(0, Math.max(all.cursor, 0)).filter((i) => !shown(i)).length;
    return { items: all.items.filter(shown), cursor: all.cursor - gone };
  }, [trail, items, currentKey, hidden, shown]);
  const visibleItems = useMemo(
    () => (hidden?.size ? items.filter(shown) : items),
    [items, hidden, shown]
  );
  const previous = base.items[base.cursor + 1] ?? null;
  const following = base.cursor > 0 ? (base.items[base.cursor - 1] ?? null) : null;

  const go = useCallback(
    async (item: TrailItem, step: Trail | null) => {
      stepping.current = step ? { key: itemKey(item), ...step } : null;
      const result = await openItem(item, { level: item.level, bpm: item.bpm });
      if (result === 'opened') return;
      stepping.current = null;
      if (result === 'gone') {
        /* Deleted, or unshared by its owner: it will not open again, so it
           leaves the list (and the trail) rather than being a Back that
           never goes anywhere. */
        const drop = (list: TrailItem[]) => list.filter((i) => i.id !== item.id);
        setItems(drop);
        setTrail((t) =>
          t
            ? {
                items: drop(t.items),
                cursor: t.cursor - (t.items.indexOf(item) < t.cursor ? 1 : 0),
              }
            : t
        );
        say('That pattern is no longer there — taken out of your history', { error: true });
      } else {
        say('Could not open that — try again', { error: true });
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
    (item: TrailItem) => {
      if (itemKey(item) === currentKey) return;
      void go(item, null);
    },
    [currentKey, go]
  );

  /* ---- clearing, with an undo ---------------------------------------- */

  const commitClear = useCallback(
    (keepalive: boolean) => {
      const held = clearing.current;
      if (!held) return;
      clearing.current = null;
      clearTimeout(held.timer);
      const run = async () => {
        try {
          await apiClient.delete('/api/v1/history', keepalive ? { options: { keepalive } } : {});
        } catch (error) {
          logger.warn('BeatBreaker: history could not be cleared', { error });
          /* Still on the server, so back on the screen, under anything since. */
          setItems((now) => [...now, ...held.items.filter((i) => !now.some((n) => n.id === i.id))]);
          say('Could not clear your history — try again', { error: true });
        } finally {
          held.release();
        }
      };
      /* Leaving, it goes now: behind a request still in flight, it would
         start after the page had gone. Otherwise after what was already
         sent, so the order the server sees is the order things happened. */
      if (keepalive) void run();
      else void held.ahead.then(run, run);
    },
    [say]
  );

  const undoClear = useCallback(() => {
    const held = clearing.current;
    if (!held) return;
    clearing.current = null;
    clearTimeout(held.timer);
    setItems(held.items);
    setTrail(held.trail);
    held.release();
  }, []);

  const clear = useCallback(() => {
    if (clearing.current) commitClear(false);
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ahead = chain.current;
    chain.current = ahead.then(
      () => gate,
      () => gate
    );
    clearing.current = {
      items,
      trail,
      timer: setTimeout(() => commitClear(false), UNDO_MS),
      ahead,
      release,
    };
    setItems([]);
    setTrail(null);
    say('History cleared', { action: { label: 'Undo', run: undoClear } });
  }, [items, trail, commitClear, undoClear, say]);

  /* Leaving the Studio, or the page, sends a clear the Undo was holding: the
     list said it was gone, so it goes. */
  useEffect(() => {
    const leave = () => commitClear(true);
    window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('pagehide', leave);
      commitClear(true);
    };
  }, [commitClear]);

  const forget = useCallback((breakId: string) => {
    const drop = (list: TrailItem[]) =>
      list.filter((i) => !(i.target.kind === 'break' && i.target.id === breakId));
    setItems(drop);
    setTrail((t) => {
      if (!t) return t;
      const before = t.items
        .slice(0, t.cursor)
        .filter((i) => i.target.kind === 'break' && i.target.id === breakId).length;
      return { items: drop(t.items), cursor: t.cursor - before };
    });
  }, []);

  /* ---- unsaved rolls on the trail (5.13) ---------------------------- */

  const unsavedCount = useRef(0);
  const leave = useCallback((left: LeftUnsaved) => {
    const update = (list: TrailItem[], item: UnsavedItem) =>
      list.map((i) => (i.id === item.id ? item : i));
    const at = new Date();
    const entry = (id: string): UnsavedItem => ({
      id,
      level: left.payload.lv ?? FULL_LAYER,
      bpm: Math.round(left.payload.bpm),
      target: { kind: 'unsaved', id, title: unsavedTitle(at) },
      name: left.name,
      payload: left.payload,
    });

    if (left.id) {
      /* Back on the trail already: it keeps its place, with what was done to
         it since it was put back. */
      const item = entry(left.id);
      setItems((list) => update(list, item));
      setTrail((t) => (t ? { ...t, items: update(t.items, item) } : t));
      const pending = stepping.current;
      if (pending) pending.items = update(pending.items, item);
      return null;
    }

    unsavedCount.current += 1;
    const item = entry(`unsaved-${unsavedCount.current}`);
    const capped = (list: TrailItem[]) => {
      const unsaved = list.filter(isUnsaved);
      if (unsaved.length <= UNSAVED_CAP) return list;
      const oldest = unsaved[unsaved.length - 1];
      return list.filter((i) => i !== oldest);
    };
    setItems((list) => capped([item, ...list]));
    /* A step from it is on its way: the stage it is leaving is now the newest
       place on the trail, so the step's place moves down one. */
    const pending = stepping.current;
    if (pending) {
      pending.items = [item, ...pending.items];
      pending.cursor += 1;
    }
    return item.id;
  }, []);

  const drop = useCallback((id: string) => {
    const keep = (list: TrailItem[]) => list.filter((i) => i.id !== id);
    const pending = stepping.current;
    if (pending) {
      const at = pending.items.findIndex((i) => i.id === id);
      if (at >= 0) {
        pending.items = keep(pending.items);
        if (at < pending.cursor) pending.cursor -= 1;
      }
    }
    setItems(keep);
    setTrail((t) => {
      if (!t) return t;
      const at = t.items.findIndex((i) => i.id === id);
      return { items: keep(t.items), cursor: at >= 0 && at < t.cursor ? t.cursor - 1 : t.cursor };
    });
  }, []);

  const currentId = useMemo(
    () => items.find((i) => itemKey(i) === currentKey)?.id ?? null,
    [items, currentKey]
  );

  return {
    items: visibleItems,
    currentId,
    previous,
    following,
    step,
    open,
    clear,
    forget,
    leave,
    drop,
  };
}
