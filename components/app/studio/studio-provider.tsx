'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type BreakConsole, useBreakConsole } from '@/components/app/breaks/use-break-console';
import type { StudioCatalogue } from '@/lib/app/breaks/catalogue/types';

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
}

const StudioContext = createContext<Studio | null>(null);

export function StudioProvider({
  catalogue,
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
  children: React.ReactNode;
}) {
  const state = useBreakConsole(catalogue);
  const content = catalogue;

  const [toast, setToast] = useState('');
  const say = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  /* `useBreakConsole` returns a fresh object each render, so there is nothing to
     memoise away here — every consumer re-renders when any of the state moves,
     exactly as the single component did. Splitting the context by concern is a
     Phase 4 optimisation with a measurement behind it, not a guess now. */
  const value = useMemo<Studio>(
    () => ({ ...state, catalogue: content, toast, say }),
    [state, content, toast, say]
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
