'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import type { PatternDocument } from '@/components/app/studio/use-pattern-document';
import type { PracticeShelvesState } from '@/components/app/studio/use-pins';
import type { PracticeHistoryState } from '@/components/app/studio/use-practice-history';
import { type Say, UNDO_MS } from '@/components/app/studio/use-notice';
import { APIClientError, apiClient } from '@/lib/api/client';
import { logger } from '@/lib/logging';
import type { PracticeShelvesView } from '@/lib/validations/pins';

/**
 * Deleting a saved pattern of yours (task 5.11, D22).
 *
 * **The row goes at once** and the toast says "Deleted — Undo" for
 * {@link UNDO_MS}. The `DELETE` is sent when that time is up, or when the
 * Studio or the page is left, since the lists already said it was gone. Until
 * then nothing has happened on the server, so Undo sends nothing. One is held
 * at a time, as the toast holds one line: deleting a second sends the first.
 *
 * **The pattern on the stage survives as scratch.** Its last edit is saved on
 * the way out (the document's `detach`), so the notes stay where they are,
 * unsaved, and Save makes a new pattern of them. Undo makes it the saved
 * pattern again, unless something else has been put on the stage since.
 *
 * The server's pins and visits cascade with the pattern; once it has gone, the
 * shelves are read back and the history drops it locally. While it waits, the
 * history hides it from Recent and from Back and Forward (its `hidden`).
 *
 * A hook of its own for the compiler's refs rule, as with the provider's
 * other ref-reading callbacks: what it returns goes into the Studio's context.
 */

/** Counts the patterns put on the stage, so an Undo can tell when it has moved on. */
export function useStageGeneration(): { bump: () => void; read: () => number } {
  const count = useRef(0);
  const bump = useCallback(() => {
    count.current += 1;
  }, []);
  const read = useCallback(() => count.current, []);
  return useMemo(() => ({ bump, read }), [bump, read]);
}

export interface DeletePattern {
  deletePattern: (id: string, title: string) => void;
  /** Patterns deleted here, or waiting out their Undo: no list shows them. */
  deleted: ReadonlySet<string>;
  /** The shelves without them. */
  shownPins: PracticeShelvesState;
}

export function useDeletePattern({
  doc,
  pins,
  history,
  stage,
  say,
  hidden: [deleted, setDeleted],
}: {
  /** Which patterns are hidden — kept by the provider, since the history reads it too. */
  hidden: [ReadonlySet<string>, React.Dispatch<React.SetStateAction<ReadonlySet<string>>>];
  doc: PatternDocument;
  pins: PracticeShelvesState;
  history: PracticeHistoryState;
  stage: { read: () => number };
  say: Say;
}): DeletePattern {
  const hide = useCallback(
    (id: string, hidden: boolean) => {
      setDeleted((was) => {
        const next = new Set(was);
        if (hidden) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    [setDeleted]
  );

  /** The delete the Undo is holding back. */
  const holding = useRef<{
    id: string;
    title: string;
    timer: ReturnType<typeof setTimeout>;
    /** Put it back on the stage, if it was there and the stage has not moved on. */
    restage: (() => void) | null;
  } | null>(null);
  const { refresh: refreshPins } = pins;
  const { forget: forgetVisits } = history;

  const commit = useCallback(
    (keepalive: boolean) => {
      const held = holding.current;
      if (!held) return;
      holding.current = null;
      clearTimeout(held.timer);
      void (async () => {
        try {
          await apiClient.delete(
            `/api/v1/breaks/${held.id}`,
            keepalive ? { options: { keepalive } } : {}
          );
        } catch (error) {
          // gone already (another tab) is what was asked for
          if (!(error instanceof APIClientError && error.status === 404)) {
            logger.warn('BeatBreaker: a pattern could not be deleted', {
              error,
              breakId: held.id,
            });
            hide(held.id, false);
            say(`Could not delete “${held.title}” — it is still in your patterns`, {
              error: true,
            });
            return;
          }
        }
        forgetVisits(held.id);
        await refreshPins();
      })();
    },
    [hide, say, forgetVisits, refreshPins]
  );

  const undo = useCallback(() => {
    const held = holding.current;
    if (!held) return;
    holding.current = null;
    clearTimeout(held.timer);
    hide(held.id, false);
    held.restage?.();
    say(`“${held.title}” is back`);
  }, [hide, say]);

  /* Read when Delete is pressed, not during render. */
  const docNow = useRef(doc);
  useLayoutEffect(() => {
    docNow.current = doc;
  });

  const deletePattern = useCallback(
    (id: string, title: string) => {
      if (holding.current) commit(false);
      let restage: (() => void) | null = null;
      const now = docNow.current;
      if (now.id === id && now.mine) {
        const { details, sharing } = now;
        const at = stage.read();
        now.detach();
        restage = () => {
          if (stage.read() !== at || docNow.current.id !== null) return;
          docNow.current.attach(id, true, details, sharing);
        };
      }
      hide(id, true);
      holding.current = {
        id,
        title,
        timer: setTimeout(() => commit(false), UNDO_MS),
        restage,
      };
      say(`Deleted “${title}”`, { action: { label: 'Undo', run: undo } });
    },
    [commit, undo, hide, say, stage]
  );

  /* Leaving the Studio, or the page, sends a delete the Undo was holding. */
  useEffect(() => {
    const leave = () => commit(true);
    window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('pagehide', leave);
      commit(true);
    };
  }, [commit]);

  const shownPins = useMemo<PracticeShelvesState>(() => {
    if (!deleted.size) return pins;
    const keep = (list: PracticeShelvesView['practising']) =>
      list.filter((p) => !(p.target.kind === 'break' && deleted.has(p.target.id)));
    return {
      ...pins,
      shelves: { practising: keep(pins.shelves.practising), later: keep(pins.shelves.later) },
    };
  }, [pins, deleted]);

  return { deletePattern, deleted, shownPins };
}
