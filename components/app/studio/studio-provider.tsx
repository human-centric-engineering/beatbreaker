'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type BreakConsole,
  type InitialPattern,
  type PracticePlace,
  useBreakConsole,
} from '@/components/app/breaks/use-break-console';
import {
  type PatternDocument,
  usePatternDocument,
} from '@/components/app/studio/use-pattern-document';
import { useFavsImport } from '@/components/app/studio/use-favs-import';
import { type PracticeShelvesState, usePins } from '@/components/app/studio/use-pins';
import {
  fetchSavedPattern,
  type HistoryCurrent,
  type OpenResult,
  type PracticeHistoryState,
  usePracticeHistory,
} from '@/components/app/studio/use-practice-history';
import type { StudioCatalogue } from '@/lib/app/breaks/catalogue/types';
import { FULL_LAYER } from '@/lib/app/breaks/layers';
import { decodeBreak } from '@/lib/app/breaks/share';
import type { HistoryItem } from '@/lib/validations/history';
import type { PinTarget, PracticeShelvesView } from '@/lib/validations/pins';

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
  /** The practice shelves (D17). */
  pins: PracticeShelvesState;
  /**
   * What a ★ on the stage pins: the saved pattern if it has an id, else the
   * library entry it was opened from, else nothing — a scratch pattern has no
   * identity to pin until it is saved.
   */
  stagePin: PinTarget | null;
  /** The practice history (D18): Recent, and Back / Forward through it. */
  history: PracticeHistoryState;
  /**
   * Open a pattern or library entry from a shelf or a list (task 4.8) — in
   * place, as the history does, so undo and the Back trail survive.
   */
  open: (target: PinTarget) => Promise<OpenResult>;
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

/**
 * Open from a shelf or a list (task 4.8): in place, at the top of the pattern,
 * and say so when it has gone. A hook of its own for the compiler's refs rule:
 * `openTarget` reads the latest `replace` from a ref, but only once its fetch
 * has landed — never during render — and the rule cannot see that through a
 * `useMemo` value, only through a hook's return (as with the history's open).
 */
function useOpenFromList(
  openTarget: (target: PinTarget) => Promise<OpenResult>,
  say: (message: string) => void
) {
  return useCallback(
    async (target: PinTarget) => {
      const result = await openTarget(target);
      if (result === 'gone') say('That pattern is no longer there');
      else if (result === 'failed') say('Could not open that — try again');
      return result;
    },
    [openTarget, say]
  );
}

export function StudioProvider({
  catalogue,
  initial,
  pins: initialPins,
  history: initialHistory,
  openEntry,
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
  /** The practice shelves, read server-side with the page. */
  pins?: PracticeShelvesView;
  /** The practice history, read server-side with the page. */
  history?: HistoryItem[];
  /**
   * A library entry to open once the Studio is up — `/studio?entry=<id>`,
   * which is how Home's Continue reaches a famous break. It opens where the
   * history last left it.
   */
  openEntry?: string;
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
  const pins = usePins(initialPins, say);
  const styleLookup = useCallback((key: string) => catalogue.styles[key], [catalogue]);
  useFavsImport(styleLookup, say);

  /* The library entry on the stage, if that is where it came from. Set when an
     entry is opened and cleared by anything else that replaces the pattern;
     edits keep it, as they keep a saved pattern's id — it is still that break,
     being practised. */
  const [entryId, setEntryId] = useState<string | null>(null);
  const stagePin = useMemo<PinTarget | null>(
    () => (doc.id ? { breakId: doc.id } : entryId ? { libraryEntryId: entryId } : null),
    [doc.id, entryId]
  );

  /* Every action that puts a different pattern on the stage lets the current
     document go first, so the pattern being left keeps its last edit and the
     new one starts as scratch. Wrapped here, where both hooks meet, rather than
     taught to the console, which should not need to know patterns are saved.
     Regenerating one section is an edit to the pattern, not a new one, so
     `newBreak('A')` and `newBreak('B')` pass straight through. */
  const { detach, needsPrompt } = doc;
  const { newBreak, loadLibraryEntry, loadCode, rename } = state;

  /* The replacement waiting on the prompt, if there is one. Kept as a thunk so
     "Don't save" and "Save" run exactly what was asked for, later. The detach
     is not in it: the answer decides how the document is let go. */
  const [pending, setPending] = useState<(() => void) | null>(null);

  /** Let the document go and replace it — or ask first, when that would lose edits. */
  const replace = useCallback(
    (go: () => void) => {
      if (needsPrompt) {
        setPending(() => go);
        return;
      }
      detach();
      go();
    },
    [detach, needsPrompt]
  );

  const replacing = useMemo(
    () => ({
      newBreak: (which?: Parameters<typeof newBreak>[0]) => {
        if (which === undefined || which === 'both')
          replace(() => {
            setEntryId(null);
            newBreak(which);
          });
        else newBreak(which);
      },
      loadLibraryEntry: (id: string) =>
        replace(() => {
          setEntryId(id);
          loadLibraryEntry(id);
        }),
      /* This answers "does it read?", not "has it loaded?": a code that
         reads may be waiting on the unsaved-changes prompt, which can still be
         cancelled. So the panels say only when it will not read, and
         "Break loaded" is said here, when the load actually happens. */
      loadCode: (code: string) => {
        /* A code that does not read replaces nothing, so it is checked before
           anything is let go — and before anyone is asked about letting go. */
        if (!readsAsBreak(code)) return loadCode(code);
        replace(() => {
          if (!loadCode(code)) return;
          setEntryId(null);
          say('Break loaded');
        });
        return true;
      },
    }),
    [replace, newBreak, loadLibraryEntry, loadCode, say]
  );

  /* Opening from the history happens after a fetch, so it reads `replace` as
     it is when the answer lands — the prompt may be due by then, or not. */
  const replaceNow = useRef(replace);
  useLayoutEffect(() => {
    replaceNow.current = replace;
  });
  const { loadPayload } = state;
  const { attach } = doc;

  /**
   * Put a history item on the stage, where it was left. A library entry opens
   * from the catalogue already in the page; a saved pattern is fetched and
   * opened in place — no page load, so the trail and the undo stack survive.
   *
   * The place is applied to library entries and to other people's patterns.
   * Your own pattern autosaves its layer and tempo as you change them, so the
   * document already holds where you left it, and applying the visit on top
   * could only disagree with it — and then autosave the disagreement.
   */
  const openTarget = useCallback(
    async (target: PinTarget, at?: PracticePlace): Promise<OpenResult> => {
      if ('libraryEntryId' in target) {
        const id = target.libraryEntryId;
        if (!catalogue.libraries.some((l) => l.entries.some((e) => e.id === id))) return 'gone';
        replaceNow.current(() => {
          setEntryId(id);
          loadLibraryEntry(id, at);
        });
        return 'opened';
      }
      const opened = await fetchSavedPattern(target.breakId);
      if (opened === 'gone') return 'gone';
      if (!opened) return 'failed';
      replaceNow.current(() => {
        if (!loadPayload(opened.payload, opened.title, opened.mine ? undefined : at)) {
          say('That pattern would not open');
          return;
        }
        setEntryId(null);
        attach(opened.id, opened.mine, opened.details);
      });
      return 'opened';
    },
    [catalogue, loadLibraryEntry, loadPayload, attach, say]
  );

  const openItem = useCallback(
    (item: HistoryItem, at: PracticePlace) =>
      openTarget(
        item.target.kind === 'entry'
          ? { libraryEntryId: item.target.id }
          : { breakId: item.target.id },
        at
      ),
    [openTarget]
  );

  const open = useOpenFromList(openTarget, say);

  /* Once, when the console is first ready: the entry the address asked for,
     through the same open a shelf uses, so it lands on the stage as that
     entry — pinnable, and recorded in the history. */
  const entryToOpen = useRef(openEntry);
  useEffect(() => {
    const id = entryToOpen.current;
    if (!ready || !id) return;
    entryToOpen.current = undefined;
    const left = initialHistory?.find((v) => v.target.kind === 'entry' && v.target.id === id);
    /* Never opened: the full break at its own tempo — what Home's card says it
       opens at, rather than whatever layer and tempo the Studio last had. */
    const entry = catalogue.libraries.flatMap((l) => l.entries).find((e) => e.id === id);
    const at = left
      ? { level: left.level, bpm: left.bpm }
      : entry
        ? { level: FULL_LAYER, bpm: entry.bpm }
        : undefined;
    void openTarget({ libraryEntryId: id }, at).then((result) => {
      if (result === 'gone') say('That pattern is no longer there');
    });
  }, [ready, initialHistory, catalogue, openTarget, say]);

  const historyCurrent = useMemo<HistoryCurrent | null>(
    () => (ready && stagePin ? { target: stagePin, level, bpm } : null),
    [ready, stagePin, level, bpm]
  );
  const history = usePracticeHistory({
    initial: initialHistory,
    current: historyCurrent,
    openItem,
    say,
  });

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
      detach({ discard: choice === 'discard' });
      go();
    },
    [pending, doc, detach]
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
      pins,
      stagePin,
      history,
      open,
    }),
    [
      state,
      replacing,
      content,
      toast,
      say,
      doc,
      saveAs,
      pending,
      patterns.A?.name,
      resolveLeave,
      pins,
      stagePin,
      history,
      open,
    ]
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
