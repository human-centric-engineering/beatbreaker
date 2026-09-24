'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  type BreakConsole,
  type InitialPattern,
  useBreakConsole,
} from '@/components/app/breaks/use-break-console';
import {
  type PatternDocument,
  usePatternDocument,
} from '@/components/app/studio/use-pattern-document';
import type { StudioCatalogue } from '@/lib/app/breaks/catalogue/types';
import { decodeBreak } from '@/lib/app/breaks/share';

/**
 * The Studio's state, in one place.
 *
 * `useBreakConsole()` has always held every piece of console state; what it
 * lacked was somewhere to be held. The console called it once and passed what
 * each region needed down through JSX, which worked while the console was one
 * component. From Phase 1 the transport lives in the header, the read-out in
 * the footer, and each tool in its own drawer — four subtrees that are siblings
 * in the frame, not descendants of one component. A context is what lets them
 * read the same state without the frame threading props through itself.
 *
 * This is a re-housing: the hook is unchanged and is still called exactly once.
 * The only difference is which component calls it.
 */

/*
 * The content the Studio's pickers are built from is `StudioCatalogue`, which
 * now lives in `lib/app/breaks/catalogue/types.ts` — the server component that
 * reads the database, `/api/v1/catalogue/*` and this provider all work in the
 * same shape, so a native client (D14) has one type to implement against.
 *
 * Structural constants are deliberately NOT in it. Meters, lanes and slots are
 * what the wire format is built on — a saved pattern means nothing without them
 * — so they stay in code and stay imported directly.
 */

export interface Studio extends BreakConsole {
  catalogue: StudioCatalogue;
  /**
   * The line of feedback under the frame — "Copied", "That code is not one of
   * ours". It lives here because the drawers raise it and the frame shows it,
   * and those are siblings now; the console could keep it to itself when it was
   * both.
   */
  toast: string;
  say: (message: string) => void;
  /** The pattern on the stage as a saved-or-not document (Phase 4). */
  doc: PatternDocument;
  /** Save As: rename the pattern on the stage and save it as a new one. */
  saveAs: (title: string) => Promise<boolean>;
  /**
   * A different pattern is waiting to replace one with edits that letting go
   * would lose — the unsaved-changes prompt is open while this is set.
   */
  leaving: { title: string } | null;
  /** The prompt's answer: save first, discard, or stay. */
  resolveLeave: (choice: 'save' | 'discard' | 'cancel') => Promise<void>;
}

const StudioContext = createContext<Studio | null>(null);

/** Would this pasted text load? The console's own decode, without the loading. */
function readsAsBreak(code: string): boolean {
  try {
    const at = code.indexOf('#b=');
    decodeBreak(at >= 0 ? code.slice(at + 3) : code.trim());
    return true;
  } catch {
    return false;
  }
}

export function StudioProvider({
  catalogue,
  initial,
  children,
}: {
  /**
   * The catalogue, loaded server-side by the `(studio)` layout.
   *
   * Required, with no fallback to a compiled-in default. A default would be a
   * second copy of the content, which is the thing Phase 2 got rid of — and a
   * Studio that quietly renders 37 styles that are not the ones in the database
   * is worse than one that will not render at all.
   */
  catalogue: StudioCatalogue;
  /** The saved pattern `/studio/[id]` opened, if any. */
  initial?: InitialPattern;
  children: React.ReactNode;
}) {
  const state = useBreakConsole(catalogue, initial);
  const content = catalogue;

  const [toast, setToast] = useState('');
  const say = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  /* The document is built from the fields that make up a saved pattern, and
     only those: the console re-renders at frame rate while playing, and the
     pattern does not change with the playhead. */
  const { ready, patterns, bpm, swing, level, arrangement, payload: toPayload } = state;
  const payload = useMemo(
    () => (ready ? toPayload() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toPayload is rebuilt from exactly these
    [ready, patterns, bpm, swing, level, arrangement]
  );
  const doc = usePatternDocument({ payload, title: patterns.A?.name ?? '', initial, say });

  /* Every action that puts a different pattern on the stage lets the current
     document go first, so the pattern being left keeps its last edit and the
     new one starts as scratch. Wrapped here, where both hooks meet, rather than
     taught to the console, which should not need to know patterns are saved.
     Regenerating one section is an edit to the pattern, not a new one, so
     `newBreak('A')` and `newBreak('B')` pass straight through. */
  const { detach, needsPrompt } = doc;
  const { newBreak, loadLibraryEntry, loadFav, loadCode, rename, favs } = state;

  /* The replacement waiting on the prompt, if there is one. Kept as a thunk so
     "Don't save" and "Save" run exactly what was asked for, later. */
  const [pending, setPending] = useState<(() => void) | null>(null);

  /** Let the document go and replace it — or ask first, when that would lose edits. */
  const replace = useCallback(
    (go: () => void) => {
      const run = () => {
        detach();
        go();
      };
      if (needsPrompt) setPending(() => run);
      else run();
    },
    [detach, needsPrompt]
  );

  const replacing = useMemo(
    () => ({
      newBreak: (which?: Parameters<typeof newBreak>[0]) => {
        if (which === undefined || which === 'both') replace(() => newBreak(which));
        else newBreak(which);
      },
      loadLibraryEntry: (id: string) => replace(() => loadLibraryEntry(id)),
      /* These two answer "does it read?", not "has it loaded?": a code that
         reads may be waiting on the unsaved-changes prompt, which can still be
         cancelled. So the panels say only when it will not read, and the
         "Loaded" is said here, when the load actually happens. */
      loadFav: (index: number) => {
        // same rule as a pasted code: one that will not read replaces nothing
        const fav = favs[index];
        if (!fav || !readsAsBreak(fav.code)) return loadFav(index);
        replace(() => {
          if (loadFav(index)) say('Loaded');
        });
        return true;
      },
      loadCode: (code: string) => {
        /* A code that does not read replaces nothing, so it is checked before
           anything is let go — and before anyone is asked about letting go. */
        if (!readsAsBreak(code)) return loadCode(code);
        replace(() => {
          if (loadCode(code)) say('Break loaded');
        });
        return true;
      },
    }),
    [replace, newBreak, loadLibraryEntry, loadFav, loadCode, favs, say]
  );

  const resolveLeave = useCallback(
    async (choice: 'save' | 'discard' | 'cancel') => {
      const go = pending;
      if (!go || choice === 'cancel') {
        setPending(null);
        return;
      }
      /* A save that fails keeps the prompt open: the edits are still only
         here, and the toast has said why. */
      if (choice === 'save' && !(await doc.save())) return;
      setPending(null);
      go();
    },
    [pending, doc]
  );

  /* The stage is renamed only once the copy exists. Renamed first, a Save As
     that failed left the new name on the pattern it was copying — and the
     autosave then wrote that name onto the original. */
  const saveAs = useCallback(
    async (title: string) => {
      const ok = await doc.saveAs(title);
      if (ok) rename(title);
      return ok;
    },
    [rename, doc]
  );

  /* `useBreakConsole` returns a fresh object each render, so there is nothing to
     memoise away here — every consumer re-renders when any of the state moves,
     exactly as the single component did. Splitting the context by concern is a
     Phase 4 optimisation with a measurement behind it, not a guess now. */
  const value = useMemo<Studio>(
    () => ({
      ...state,
      ...replacing,
      catalogue: content,
      toast,
      say,
      doc,
      saveAs,
      leaving: pending ? { title: patterns.A?.name ?? '' } : null,
      resolveLeave,
    }),
    [state, replacing, content, toast, say, doc, saveAs, pending, patterns.A?.name, resolveLeave]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

/**
 * Read the Studio's state.
 *
 * Throws outside a provider rather than handing back a null: every caller is a
 * piece of the Studio frame, and a silently stateless drawer is harder to
 * diagnose than a failed render.
 */
export function useStudio(): Studio {
  const value = useContext(StudioContext);
  if (!value) throw new Error('useStudio must be used within a StudioProvider');
  return value;
}
