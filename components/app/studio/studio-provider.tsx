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
import { type SessionRun, useSessionRun } from '@/components/app/practice/use-session-run';
import type { StudioDrawer } from '@/components/app/shell/studio-address';
import {
  notesKey,
  type PatternDocument,
  usePatternDocument,
} from '@/components/app/studio/use-pattern-document';
import { type PracticeShelvesState, usePins } from '@/components/app/studio/use-pins';
import { type Notice, type Say, useNotice } from '@/components/app/studio/use-notice';
import { useDeletePattern, useStageGeneration } from '@/components/app/studio/use-delete-pattern';
import { type YourSounds, useYourSounds } from '@/components/app/studio/use-your-sounds';
import {
  fetchSavedPattern,
  type HistoryCurrent,
  isUnsaved,
  type OpenResult,
  type PracticeHistoryState,
  type TrailItem,
  usePracticeHistory,
} from '@/components/app/studio/use-practice-history';
import type { StudioCatalogue } from '@/lib/app/breaks/catalogue/types';
import { FULL_LAYER } from '@/lib/app/breaks/layers';
import { withYourKits } from '@/lib/app/breaks/samples/your-kit';
import { decodeBreak } from '@/lib/app/breaks/share';
import type { HistoryItem } from '@/lib/validations/history';
import type { StudioSettings } from '@/lib/validations/studio-settings';
import type { PinTarget, PracticeShelvesView } from '@/lib/validations/pins';
import type { SessionView } from '@/lib/validations/practice-sessions';
import type { SampleList, YourKitView } from '@/lib/validations/samples';

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
   * both. See `useNotice` for how long each kind stays.
   */
  notice: Notice | null;
  say: Say;
  /** Take the line down — how an error, which does not time out, goes. */
  dismiss: () => void;
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
  /**
   * The stage holds a famous break whose notes have been edited since it was
   * opened — what is playing is no longer the break `stagePin` names, so a
   * speed marked now would not be a speed on it. Undo back and it is false
   * again. Always false for anything but a famous break.
   */
  entryEdited: boolean;
  /** The practice history (D18): Recent, and Back / Forward through it. */
  history: PracticeHistoryState;
  /**
   * Open a pattern or library entry from a shelf or a list (task 4.8) — in
   * place, as the history does, so undo and the Back trail survive.
   */
  open: (target: PinTarget) => Promise<OpenResult>;
  /** The drawer the address asked for (`?drawer=`), opened once by the frame. */
  openDrawer?: StudioDrawer;
  /** Your own samples and kits (D20), for the Kit drawer. */
  sounds: YourSounds;
  /** The practice session `?session=` opened, running or ready to (7D); null without one. */
  sessionRun: SessionRun | null;
  /**
   * Delete a saved pattern of yours (5.11, D22). It leaves every list at once
   * and the toast offers Undo for six seconds; the `DELETE` is sent when
   * the Undo has gone. The pattern on the stage stays there, as unsaved.
   */
  deletePattern: (id: string, title: string) => void;
  /** Patterns deleted from this Studio, or waiting out their Undo: no list shows them. */
  deleted: ReadonlySet<string>;
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
function useOpenFromList(openTarget: (target: PinTarget) => Promise<OpenResult>, say: Say) {
  return useCallback(
    async (target: PinTarget) => {
      const result = await openTarget(target);
      if (result === 'gone') say('That pattern is no longer there', { error: true });
      else if (result === 'failed') say('Could not open that — try again', { error: true });
      return result;
    },
    [openTarget, say]
  );
}

/** What a replacement runs: false when the new pattern did not load after all. */
type Go = () => boolean | void;
/** Undo what letting the stage go told the history, when the replacement failed. */
type Undo = () => void;

/**
 * A function called from an event, whose body is set after each render — how
 * `replace` reaches the history, which is made after it. A hook of its own for
 * the compiler's refs rule, as with {@link useOpenFromList}.
 */
function useLateCallback(): { call: () => Undo; set: (fn: () => Undo) => void } {
  const body = useRef<(() => Undo) | null>(null);
  const call = useCallback((): Undo => body.current?.() ?? (() => {}), []);
  const set = useCallback((fn: () => Undo) => {
    body.current = fn;
  }, []);
  return useMemo(() => ({ call, set }), [call, set]);
}

export function StudioProvider({
  catalogue,
  initial,
  pins: initialPins,
  history: initialHistory,
  settings,
  yourKits,
  yourSamples,
  openEntry,
  openDrawer,
  session,
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
   * Your Studio settings (D19), read server-side with the page so the Studio
   * opens with your kit and tuning rather than the defaults first.
   */
  settings?: StudioSettings;
  /**
   * Your own kits (D20), read server-side with the page. Never part of the
   * catalogue, which is everyone's; added to it here, for you.
   */
  yourKits?: YourKitView[];
  /** Your samples and how much of your allowance they use (D20), read with the page. */
  yourSamples?: SampleList;
  /**
   * A library entry to open once the Studio is up — `/studio?entry=<id>`,
   * which is how Home's Continue reaches a famous break. It opens where the
   * history last left it.
   */
  openEntry?: string;
  /** A drawer to open once the Studio is up — `/studio?drawer=patterns&tab=libraries`. */
  openDrawer?: StudioDrawer;
  /** A practice session to run — `/studio?session=<id>`, read server-side (7D). */
  session?: SessionView;
  children: React.ReactNode;
}) {
  /* Whether the stage holds a saved pattern, for the console's starting values
     (D21). The console is called before the document exists, so it asks
     through this when a change is made, and the answer is kept current below
     once the document has rendered. */
  const stageIsSaved = useRef(initial !== undefined);
  const stageSaved = useCallback(() => stageIsSaved.current, []);
  const { notice, say, dismiss } = useNotice();

  /* Your own kits join the catalogue here, per person, and the console never
     knows the difference: a kit of yours is a catalogue entry on the `user`
     engine, and filling a slot changes the entry it plays from. */
  const sounds = useYourSounds({ kits: yourKits, samples: yourSamples }, say);
  const content = useMemo(() => withYourKits(catalogue, sounds.kits), [catalogue, sounds.kits]);
  const state = useBreakConsole(content, initial, { settings, stageSaved });

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
  useLayoutEffect(() => {
    stageIsSaved.current = doc.id !== null;
  });
  const pins = usePins(initialPins, say);

  /* The library entry on the stage, if that is where it came from. Set when an
     entry is opened and cleared by anything else that replaces the pattern;
     edits keep it, as they keep a saved pattern's id — it is still that break,
     being practised. */
  const [entry, setEntry] = useState<{ id: string; notes: string | null } | null>(null);
  const entryId = entry?.id ?? null;
  /* The entry's notes are taken from the first render after it opens, as a
     saved pattern's baseline is — the console's encoding of them, so an
     untouched entry always compares equal. */
  useEffect(() => {
    if (entry && entry.notes === null && payload) setEntry({ ...entry, notes: notesKey(payload) });
  }, [entry, payload]);
  const entryEdited = useMemo(
    () => !!entry?.notes && !!payload && notesKey(payload) !== entry.notes,
    [entry, payload]
  );
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
  const [pending, setPending] = useState<Go | null>(null);

  const stage = useStageGeneration();
  /* Whatever replaces the stage tells the history first, so an unsaved roll
     being left goes on the trail (5.13). Set below, once the history exists. */
  const beforeReplace = useLateCallback();
  /** The unsaved trail entry the stage holds, when one was put back (5.13). */
  const [unsavedId, setUnsavedId] = useState<string | null>(null);

  /** Let the document go and replace it — or ask first, when that would lose edits. */
  const replace = useCallback(
    (go: Go) => {
      if (needsPrompt) {
        setPending(() => go);
        return;
      }
      stage.bump();
      const undo = beforeReplace.call();
      detach();
      if (go() === false) undo();
    },
    [detach, needsPrompt, stage, beforeReplace]
  );

  const replacing = useMemo(
    () => ({
      newBreak: (which?: Parameters<typeof newBreak>[0]) => {
        if (which === undefined || which === 'both')
          replace(() => {
            setEntry(null);
            newBreak(which);
          });
        else newBreak(which);
      },
      loadLibraryEntry: (id: string) =>
        replace(() => {
          setEntry({ id, notes: null });
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
          if (!loadCode(code)) return false;
          setEntry(null);
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
          setEntry({ id, notes: null });
          loadLibraryEntry(id, at);
        });
        return 'opened';
      }
      const opened = await fetchSavedPattern(target.breakId);
      if (opened === 'gone') return 'gone';
      if (!opened) return 'failed';
      replaceNow.current(() => {
        if (!loadPayload(opened.payload, opened.title, opened.mine ? undefined : at)) {
          say('That pattern would not open', { error: true });
          return false;
        }
        setEntry(null);
        attach(opened.id, opened.mine, opened.details, opened.sharing);
      });
      return 'opened';
    },
    [catalogue, loadLibraryEntry, loadPayload, attach, say]
  );

  const openItem = useCallback(
    (item: TrailItem, at: PracticePlace): Promise<OpenResult> => {
      if (isUnsaved(item)) {
        /* An unsaved roll from the trail (5.13): put back as it was left —
           its notes, tempo and layer are all in the payload. */
        replaceNow.current(() => {
          if (!loadPayload(item.payload, item.name)) {
            say('That pattern would not open', { error: true });
            return false;
          }
          setEntry(null);
          setUnsavedId(item.id);
        });
        return Promise.resolve('opened');
      }
      return openTarget(
        item.target.kind === 'entry'
          ? { libraryEntryId: item.target.id }
          : { breakId: item.target.id },
        at
      );
    },
    [openTarget, loadPayload, say]
  );

  const open = useOpenFromList(openTarget, say);

  const sessionRun = useSessionRun({
    session,
    console: state,
    openTarget,
    stageUnrecordable: entryEdited || !!doc.variationOf,
    stageWillPrompt: doc.needsPrompt,
    say,
  });

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
      if (result === 'gone') say('That pattern is no longer there', { error: true });
    });
  }, [ready, initialHistory, catalogue, openTarget, say]);

  const historyCurrent = useMemo<HistoryCurrent | null>(
    () => (ready && stagePin ? { target: stagePin, level, bpm } : null),
    [ready, stagePin, level, bpm]
  );
  /* Patterns deleted here or waiting on their Undo (5.11), hidden by every list. */
  const deletedState = useState<ReadonlySet<string>>(() => new Set());
  const history = usePracticeHistory({
    initial: initialHistory,
    current: historyCurrent,
    unsavedId,
    hidden: deletedState[0],
    openItem,
    say,
  });

  /* What the stage is letting go of, told to the history before it goes: a
     pattern that was never saved goes on the trail. A famous break has its
     entry and a saved pattern its id, so neither is one. */
  const { leave: leaveUnsaved, drop: dropUnsaved } = history;
  const leftName = patterns.A?.name ?? '';
  useLayoutEffect(() => {
    beforeReplace.set(() => {
      const was = unsavedId;
      const added =
        !doc.id && !entryId && payload ? leaveUnsaved({ id: was, payload, name: leftName }) : null;
      setUnsavedId(null);
      /* The new pattern did not load, so the roll is still on the stage: off
         the trail again if it was new there, and still its entry if not. */
      return () => {
        if (added) dropUnsaved(added);
        setUnsavedId(was);
      };
    });
  });

  /* An unsaved entry that is saved is an ordinary history item from then on:
     the visit the save records stands in for it. */
  useEffect(() => {
    if (doc.id && unsavedId) {
      dropUnsaved(unsavedId);
      setUnsavedId(null);
    }
  }, [doc.id, unsavedId, dropUnsaved]);

  const { deletePattern, deleted, shownPins } = useDeletePattern({
    doc,
    pins,
    history,
    stage,
    say,
    hidden: deletedState,
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
      stage.bump();
      const undo = beforeReplace.call();
      detach({ discard: choice === 'discard' });
      if (go() === false) undo();
    },
    [pending, doc, detach, stage, beforeReplace]
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
      notice,
      say,
      dismiss,
      doc,
      saveAs,
      leaving: pending ? { title: patterns.A?.name ?? '' } : null,
      resolveLeave,
      pins: shownPins,
      stagePin,
      entryEdited,
      history,
      open,
      openDrawer,
      sounds,
      sessionRun,
      deletePattern,
      deleted,
    }),
    [
      state,
      replacing,
      content,
      notice,
      say,
      dismiss,
      doc,
      saveAs,
      pending,
      patterns.A?.name,
      resolveLeave,
      shownPins,
      stagePin,
      entryEdited,
      history,
      open,
      openDrawer,
      sounds,
      sessionRun,
      deletePattern,
      deleted,
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
