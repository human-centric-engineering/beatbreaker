'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { z } from 'zod';

import type { InitialPattern } from '@/components/app/breaks/use-break-console';
import { APIClientError, apiClient } from '@/lib/api/client';
import type { SharePayload } from '@/lib/app/breaks/schema';
import { clearScratch, writeScratch } from '@/lib/app/breaks/scratch';
import { logger } from '@/lib/logging';

/**
 * The pattern on the stage, as a document: which saved pattern it is (if any),
 * whether what you see is what the server has, and getting it there.
 *
 * The console's state hook knows the notes; it has never known that the notes
 * belong to something. This is that something, kept beside it rather than in
 * it — the console is 1,300 lines about music and this is about persistence,
 * and the two change for different reasons.
 *
 * **The rules**
 *
 * - **A saved pattern of yours autosaves**: one `PATCH` {@link AUTOSAVE_MS}
 *   after the last edit, never one per keystroke. An edit made while a save is
 *   in flight is saved when that one lands.
 * - **A dropped connection is not an error.** The save waits, says so, and
 *   retries when the browser comes back online and every {@link RETRY_MS} in
 *   the meantime — nothing typed while offline is dropped.
 * - **A pattern that has never been saved is a scratch pattern.** It is kept in
 *   `localStorage` (`lib/app/breaks/scratch.ts`) so a reload does not lose it,
 *   and **Save** gives it an id and an address.
 * - **Someone else's shared pattern never autosaves** — there is nothing of
 *   yours to save it into. Save makes it a copy that is yours.
 * - **Rolling a new pattern, opening a famous break or pasting a code puts a
 *   different pattern on the stage**, so the document is let go first
 *   ({@link PatternDocument.detach}): the pattern you were on gets its last
 *   edit saved, and the new one starts as scratch. Without this, pressing N on
 *   a saved pattern would autosave a random roll over it.
 *
 * **When to ask before letting go** ({@link PatternDocument.needsPrompt}):
 * only when letting go would lose something. A saved pattern of yours with a
 * working connection loses nothing — its last edit is saved on the way out. A
 * scratch pattern is not asked about either: rolling one after another is the
 * whole workflow, and undo brings the last one back. What is asked about is
 * an edited copy of someone else's pattern, and edits to your own that could
 * not reach the server.
 */

/** How long after the last edit an autosave waits. */
export const AUTOSAVE_MS = 2000;
/** How often a save that failed for want of a connection is tried again. */
export const RETRY_MS = 15000;

/**
 * - `scratch` — never saved (or someone else's, not yet copied)
 * - `saved` — the server has exactly this
 * - `unsaved` — edited, the autosave is waiting for you to stop
 * - `saving` — on its way
 * - `offline` — could not reach the server; will retry
 * - `error` — the server refused it; the next edit tries again
 */
export type SaveStatus = 'scratch' | 'saved' | 'unsaved' | 'saving' | 'offline' | 'error';

export interface PatternDocument {
  /** The saved pattern this is, or null for scratch. */
  id: string | null;
  /** False while it is someone else's shared pattern. */
  mine: boolean;
  status: SaveStatus;
  /**
   * Save now. The first save of a scratch pattern (or a copy of someone
   * else's) creates it; after that it is the autosave, without the wait.
   */
  save: () => Promise<boolean>;
  /** A new pattern of yours from what is on the stage, under this title. */
  saveAs: (title: string) => Promise<boolean>;
  /** A different pattern is about to replace this one on the stage. */
  detach: () => void;
  /** True when {@link detach} would lose edits — see the module comment. */
  needsPrompt: boolean;
}

/** What a create answers with that this reads — checked, not cast. */
const created = z.object({ id: z.string().min(1) });

/** A title the API will take: it refuses an empty one. */
function titleFor(title: string): string {
  return title.trim() || 'Untitled pattern';
}

/** Where the address bar should be for a document, without a navigation. */
function showAddress(id: string | null) {
  if (typeof window === 'undefined') return;
  const want = id ? `/studio/${id}` : '/studio';
  if (window.location.pathname !== want) window.history.replaceState(null, '', want);
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function usePatternDocument({
  payload,
  title,
  initial,
  say,
}: {
  /** The pattern on the stage, or null before there is one. */
  payload: SharePayload | null;
  /** Its name, which is what the saved row is called. */
  title: string;
  /** The saved pattern `/studio/[id]` opened on, if any. */
  initial?: InitialPattern;
  /** The Studio's one line of feedback. */
  say: (message: string) => void;
}): PatternDocument {
  const [id, setId] = useState<string | null>(initial?.id ?? null);
  const [mine, setMine] = useState(initial ? initial.mine : true);
  /** The document as the server last acknowledged it; null before a baseline. */
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'offline' | 'error'>('idle');

  /* Everything a save sends is read from here at the moment it is sent, so a
     save fired by a timer or by `detach` sends what was on the stage then —
     not what a closure captured renders ago. */
  const key = payload ? JSON.stringify({ payload, title: titleFor(title) }) : null;
  const latest = useRef({ payload, title, key, id, mine, savedKey });
  /* A layout effect, not a plain one: it runs after the commit and before any
     ordinary effect or event, so the autosave and scratch effects below, and a
     `detach` from the next click, all read this render's values. */
  useLayoutEffect(() => {
    latest.current = { payload, title, key, id, mine, savedKey };
  });

  /* Saves go one after another. Two PATCHes of one pattern in flight at once
     can land in either order, and the older landing second would overwrite
     the newer on the server with nobody the wiser. */
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  /* A baseline for a pattern that was opened. At that moment it is what the
     server has. Its payload as the console re-encodes it can differ trivially
     from the stored one (defaults filled in, the row's title applied), so the
     baseline is taken from the first render that has a payload rather than
     from the row. */
  useEffect(() => {
    if (id && savedKey === null && key !== null) setSavedKey(key);
  }, [id, savedKey, key]);

  /**
   * Queue a save of this snapshot. The snapshot is taken by the caller, now —
   * so a save queued by `detach` still carries the pattern being left, even
   * though by the time it runs the stage holds another one. What it does to
   * the status is applied only if its pattern is still the one on the stage.
   */
  const patch = useCallback(
    (snap: { id: string; payload: SharePayload; title: string; key: string }) => {
      const current = () => latest.current.id === snap.id;
      const run = async (): Promise<boolean> => {
        if (current()) setPhase('saving');
        try {
          await apiClient.patch(`/api/v1/breaks/${snap.id}`, {
            body: { doc: snap.payload, title: titleFor(snap.title) },
          });
          if (current()) {
            setSavedKey(snap.key);
            setPhase('idle');
          }
          return true;
        } catch (error) {
          if (!current()) {
            logger.warn('BeatBreaker: the last save of a pattern you left failed', {
              error,
              breakId: snap.id,
            });
          } else if (error instanceof APIClientError && error.code === 'NETWORK_ERROR') {
            setPhase('offline');
          } else if (error instanceof APIClientError && error.status === 404) {
            /* Deleted somewhere else. What is on the stage is the only copy
               left, so it becomes scratch rather than vanishing — Save puts it
               back. */
            setId(null);
            setMine(true);
            setSavedKey(null);
            setPhase('idle');
            showAddress(null);
            say('That pattern was deleted elsewhere — it is unsaved here now');
          } else {
            logger.warn('BeatBreaker: autosave refused', { error, breakId: snap.id });
            setPhase('error');
          }
          return false;
        }
      };
      const next = chain.current.then(run, run);
      chain.current = next;
      return next;
    },
    [say]
  );

  /** The stage as it is now, if it is a saved pattern of yours to save. */
  const snapshot = useCallback(() => {
    const now = latest.current;
    if (!now.id || !now.mine || !now.payload || now.key === null) return null;
    return { id: now.id, payload: now.payload, title: now.title, key: now.key };
  }, []);

  const saveNow = useCallback(() => {
    const snap = snapshot();
    return snap ? patch(snap) : Promise.resolve(false);
  }, [snapshot, patch]);

  /* The autosave. Re-armed on every edit, so it fires once, after the last. */
  useEffect(() => {
    if (!id || !mine || key === null || savedKey === null || key === savedKey) return;
    if (phase === 'saving' || phase === 'offline') return;
    const t = setTimeout(() => void saveNow(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [id, mine, key, savedKey, phase, saveNow]);

  /* Offline: try again when the browser says it is back, and on a timer in
     case it never says (it often does not). */
  useEffect(() => {
    if (phase !== 'offline') return;
    const retry = () => void saveNow();
    window.addEventListener('online', retry);
    const t = setInterval(retry, RETRY_MS);
    return () => {
      window.removeEventListener('online', retry);
      clearInterval(t);
    };
  }, [phase, saveNow]);

  /* Scratch survives a reload. Written on every change rather than debounced:
     it is one small synchronous write, and a debounce is a window in which a
     reload loses the last edit. */
  useEffect(() => {
    const now = latest.current.payload;
    if (id || !now || key === null) return;
    const store = storage();
    if (store) writeScratch(store, now);
    // keyed on the serialised pattern, not the object: a new object every render
    // (the playhead renders at frame rate) would be a storage write per frame
  }, [id, key]);

  const dirty = key !== null && savedKey !== null && key !== savedKey;
  const needsPrompt = !!id && dirty && (!mine || phase === 'offline' || phase === 'error');

  /* Leaving the page with edits the server does not have. An autosave in its
     two-second wait counts: the browser will not wait for it. */
  useEffect(() => {
    if (!(id && dirty) && !needsPrompt) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [id, dirty, needsPrompt]);

  const create = useCallback(
    async (name: string): Promise<boolean> => {
      const now = latest.current;
      if (!now.payload || now.key === null) return false;
      setPhase('saving');
      try {
        const data = created.parse(
          await apiClient.post('/api/v1/breaks', { body: { title: name, doc: now.payload } })
        );
        setId(data.id);
        setMine(true);
        /* The baseline is what was sent under the name it was sent as. A Save
           As renames the stage as it calls this (the provider does that), but
           the rename renders after this read the stage — so the document sent
           still carries the old name inside it, and one autosave follows to
           put the new one there too. */
        setSavedKey(JSON.stringify({ payload: now.payload, title: name }));
        setPhase('idle');
        const store = storage();
        if (store) clearScratch(store);
        showAddress(data.id);
        say('Saved');
        return true;
      } catch (error) {
        setPhase(
          error instanceof APIClientError && error.code === 'NETWORK_ERROR' ? 'offline' : 'error'
        );
        logger.warn('BeatBreaker: save refused', { error });
        say(
          error instanceof APIClientError && error.code === 'NETWORK_ERROR'
            ? 'Could not reach the server — not saved yet'
            : 'That did not save'
        );
        return false;
      }
    },
    [say]
  );

  const save = useCallback(async (): Promise<boolean> => {
    const now = latest.current;
    if (now.id && now.mine) return saveNow();
    return create(titleFor(now.title));
  }, [saveNow, create]);

  const saveAs = useCallback((name: string) => create(titleFor(name)), [create]);

  const detach = useCallback(() => {
    /* The last edit to the pattern being left goes now, not after a wait the
       new pattern would cancel. Queued behind any save already in flight, and
       its outcome is logged rather than shown: it belongs to a pattern that is
       no longer on the stage. */
    const snap = snapshot();
    if (snap && snap.key !== latest.current.savedKey) void patch(snap);
    setId(null);
    setMine(true);
    setSavedKey(null);
    setPhase('idle');
    showAddress(null);
  }, [snapshot, patch]);

  let status: SaveStatus;
  if (!id || !mine) status = 'scratch';
  else if (phase !== 'idle') status = phase;
  else status = dirty ? 'unsaved' : 'saved';

  return { id, mine, status, save, saveAs, detach, needsPrompt };
}
