'use client';

import { createContext, useContext, useMemo } from 'react';

import { type BreakConsole, useBreakConsole } from '@/components/app/breaks/use-break-console';
import { KITS, kitGroups } from '@/lib/app/breaks/kit';
import { libraryGroups } from '@/lib/app/breaks/library';
import { STYLES, STYLE_GROUPS } from '@/lib/app/breaks/styles';

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

/**
 * The content the Studio's pickers are built from.
 *
 * Styles, kits and the famous-breaks library are TypeScript constants today and
 * database rows from Phase 2 (D13). Everything that renders a picker reads them
 * from here rather than importing the constants, so that phase changes where the
 * data comes from and nothing else.
 *
 * Structural constants are deliberately NOT here. Meters, lanes and slots are
 * what the wire format is built on — a saved pattern means nothing without them
 * — so they stay in code and stay imported directly.
 */
export interface StudioCatalogue {
  styles: typeof STYLES;
  styleGroups: typeof STYLE_GROUPS;
  kits: typeof KITS;
  kitGroups: ReturnType<typeof kitGroups>;
  library: ReturnType<typeof libraryGroups>;
}

/** The catalogue as it stands before Phase 2: read out of the code constants. */
export function codeCatalogue(): StudioCatalogue {
  return {
    styles: STYLES,
    styleGroups: STYLE_GROUPS,
    kits: KITS,
    kitGroups: kitGroups(),
    library: libraryGroups(),
  };
}

export interface Studio extends BreakConsole {
  catalogue: StudioCatalogue;
}

const StudioContext = createContext<Studio | null>(null);

export function StudioProvider({
  catalogue,
  children,
}: {
  /** Defaults to the code constants; Phase 2 passes rows fetched from the API. */
  catalogue?: StudioCatalogue;
  children: React.ReactNode;
}) {
  const state = useBreakConsole();
  const content = useMemo(() => catalogue ?? codeCatalogue(), [catalogue]);

  /* `useBreakConsole` returns a fresh object each render, so there is nothing to
     memoise away here — every consumer re-renders when any of the state moves,
     exactly as the single component did. Splitting the context by concern is a
     Phase 4 optimisation with a measurement behind it, not a guess now. */
  const value = useMemo<Studio>(() => ({ ...state, catalogue: content }), [state, content]);

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
