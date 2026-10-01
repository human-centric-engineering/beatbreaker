'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import type {
  InitialPattern,
  PatternDetails,
  PatternSharing,
} from '@/components/app/breaks/use-break-console';
import { APIClientError, apiClient } from '@/lib/api/client';
import { VISIBILITIES } from '@/lib/app/breaks/community/visibility';
import { storedLinkSchema } from '@/lib/app/breaks/links';
import type { SharePayload } from '@/lib/app/breaks/schema';
import { clearScratch, writeScratch } from '@/lib/app/breaks/scratch';
import { logger } from '@/lib/logging';
import type { Say } from '@/components/app/studio/use-notice';

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
 * - **Nor does a fixed pattern of yours** (D26 — published, now or before).
 *   Its notes never change, so an edit to them is a **variation**: the row is
 *   left as it is, a banner says what is happening, and Save makes the
 *   variation through the copy route, credited to the original. Undo back to
 *   where it was and it is the original again. Only the notes count: tempo
 *   and layer are where you practise it (kept per visit), and the name is
 *   changed through Details, which renames the row itself.
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
 *
 * **Details** (task 4.11) — the description and reference links — are the
 * row's, not the document's, so they are not autosaved with the notes:
 * {@link PatternDocument.saveDetails} sends them when the Details form is
 * submitted. A copy (Save on someone else's pattern, or Save a copy) carries
 * them into the new row.
 */

/** How long after the last edit an autosave waits. */
export const AUTOSAVE_MS = 2000;
/** How often a save that failed for want of a connection is tried again. */
export const RETRY_MS = 15000;

/**
 * - `scratch` — never saved (or someone else's, not yet copied)
 * - `saving` is also what a first save says while it is on its way
 * - `saved` — the server has exactly this
 * - `unsaved` — edited, the autosave is waiting for you to stop
 * - `saving` — on its way
 * - `offline` — could not reach the server; will retry
 * - `error` — the server refused it; the next edit tries again, not a timer
 */
export type SaveStatus = 'scratch' | 'saved' | 'unsaved' | 'saving' | 'offline' | 'error';

export interface PatternDocument {
  /** The saved pattern this is, or null for scratch. */
  id: string | null;
  /** False while it is someone else's shared pattern. */
  mine: boolean;
  /** Its notes are fixed (D26), so an edit to them makes a variation. */
  fixed: boolean;
  /**
   * What Save makes of an edited pattern that is not a plain saved one of
   * yours: a `variation` of a fixed pattern of yours or of a published one
   * (D26), else a `copy`.
   */
  copyKind: 'copy' | 'variation';
  /**
   * The name of the fixed pattern while the stage holds an unsaved variation
   * of it — the banner's "You're making a variation of _X_". Null otherwise.
   */
  variationOf: string | null;
  status: SaveStatus;
  /**
   * Save now. The first save of a scratch pattern (or a copy of someone
   * else's) creates it; after that it is the autosave, without the wait.
   */
  save: () => Promise<boolean>;
  /** A new pattern of yours from what is on the stage, under this title. */
  saveAs: (title: string) => Promise<boolean>;
  /**
   * A different pattern is about to replace this one on the stage. Its last
   * edit is saved on the way out unless `discard` — the prompt's Don't save.
   */
  detach: (options?: { discard?: boolean }) => void;
  /**
   * The pattern just put on the stage is this saved one — opened from inside
   * the Studio rather than by its address. Call it after {@link detach}, in
   * the same update as the load: the next render's pattern is the baseline.
   */
  attach: (id: string, mine: boolean, details?: PatternDetails, sharing?: PatternSharing) => void;
  /** True when {@link detach} would lose edits — see the module comment. */
  needsPrompt: boolean;
  /** The description and links of the pattern on the stage; empty for scratch. */
  details: PatternDetails;
  /**
   * Send new details for a saved pattern of yours, and its new name if it has
   * one — sent here rather than left to the autosave, which a fixed pattern
   * does not have. What the server kept (its canonical links), or null — with
   * the toast saying why — when there is no such pattern or the server
   * refused them.
   */
  saveDetails: (details: PatternDetails, title?: string) => Promise<PatternDetails | null>;
  /** Who can open it, and whom a copy is credited to (Phase 6). */
  sharing: PatternSharing;
  /**
   * Share a saved pattern of yours by link, or make it private again. Making
   * a published pattern either one unpublishes it. True once the server has
   * it; false, with the toast saying why, when it did not.
   */
  share: (visibility: 'private' | 'link') => Promise<boolean>;
  /**
   * Publish a saved pattern of yours to the community library (task 6.9).
   * `ok`, or the server's refusal — its code (`USERNAME_REQUIRED`,
   * `DUPLICATE`, …) and the words to show — for the publish dialog to put in
   * front of you. The dialog, not the toast, says what went wrong.
   */
  publish: () => Promise<PublishResult>;
}

const NO_DETAILS: PatternDetails = { description: '', links: [] };
export type PublishResult = { ok: true } | { ok: false; code: string | null; message: string };

/** What a publish answers with that this reads — checked, not cast. */
const publishedAnswer = z.object({ visibility: z.literal('published'), slug: z.string() });

const NO_SHARING: PatternSharing = { visibility: 'private', slug: null, basedOn: null };

/** What a visibility PATCH answers with that this reads — checked, not cast. */
const sharingAnswer = z.object({
  visibility: z.enum(VISIBILITIES),
  slug: z.string().nullable(),
});

const basedOnSchema = z.object({ title: z.string(), username: z.string(), slug: z.string() });

/** What a details PATCH answers with that this reads — checked, not cast. */
const detailsAnswer = z.object({
  description: z.string().nullable(),
  links: z.array(storedLinkSchema),
});

/** What a create or a copy answers with that this reads — checked, not cast. */
const created = z.object({ id: z.string().min(1), basedOn: basedOnSchema.nullish() });

/**
 * What a fixed pattern is compared on: the notes, without the name (the row's
 * to change), the tempo or the layer (where you practise it, D26).
 */
export function notesKey(payload: SharePayload): string {
  const { bpm: _bpm, lv: _lv, ...rest } = payload;
  return JSON.stringify({ ...rest, A: { ...rest.A, n: '' }, B: { ...rest.B, n: '' } });
}

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
  say: Say;
}): PatternDocument {
  const [id, setId] = useState<string | null>(initial?.id ?? null);
  const [mine, setMine] = useState(initial ? initial.mine : true);
  /** The document as the server last acknowledged it; null before a baseline. */
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'offline' | 'error'>('idle');
  /**
   * The document as it stood when the server last refused it. Sending the same
   * thing again gets the same answer, so the autosave waits for an edit that
   * makes it something else — without this it re-armed on the refusal itself
   * and resent the refused pattern every AUTOSAVE_MS, forever.
   */
  const [refusedKey, setRefusedKey] = useState<string | null>(null);
  const [details, setDetails] = useState<PatternDetails>(initial?.details ?? NO_DETAILS);
  const [sharing, setSharing] = useState<PatternSharing>(initial?.sharing ?? NO_SHARING);
  /** A fixed pattern's notes as the stage first had them; null before a baseline. */
  const [savedNotes, setSavedNotes] = useState<string | null>(null);
  const fixed = sharing.fixed === true;
  // read by `share`, which says what changed, without re-creating it on every change
  const sharingNow = useRef(sharing);
  useLayoutEffect(() => {
    sharingNow.current = sharing;
  });

  /* Everything a save sends is read from here at the moment it is sent, so a
     save fired by a timer or by `detach` sends what was on the stage then —
     not what a closure captured renders ago. */
  const key = payload ? JSON.stringify({ payload, title: titleFor(title) }) : null;
  const latest = useRef({ payload, title, key, id, mine, fixed, savedKey, savedNotes, details });
  /* A layout effect, not a plain one: it runs after the commit and before any
     ordinary effect or event, so the autosave and scratch effects below, and a
     `detach` from the next click, all read this render's values. */
  useLayoutEffect(() => {
    latest.current = { payload, title, key, id, mine, fixed, savedKey, savedNotes, details };
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
    if (id && savedKey === null && key !== null && payload) {
      setSavedKey(key);
      setSavedNotes(notesKey(payload));
    }
  }, [id, savedKey, key, payload]);

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
            setRefusedKey(null);
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
            setSharing(NO_SHARING);
            setPhase('idle');
            showAddress(null);
            say('That pattern was deleted elsewhere — it is unsaved here now', { error: true });
          } else {
            logger.warn('BeatBreaker: autosave refused', { error, breakId: snap.id });
            setRefusedKey(snap.key);
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
    if (!now.id || !now.mine || now.fixed || !now.payload || now.key === null) return null;
    return { id: now.id, payload: now.payload, title: now.title, key: now.key };
  }, []);

  const saveNow = useCallback(() => {
    const snap = snapshot();
    return snap ? patch(snap) : Promise.resolve(false);
  }, [snapshot, patch]);

  /* The autosave. Re-armed on every edit, so it fires once, after the last. */
  useEffect(() => {
    if (!id || !mine || fixed || key === null || savedKey === null || key === savedKey) return;
    if (phase === 'saving' || phase === 'offline') return;
    // refused as it stands: wait for an edit, not a timer
    if (key === refusedKey) return;
    const t = setTimeout(() => void saveNow(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [id, mine, fixed, key, savedKey, phase, refusedKey, saveNow]);

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

  const notes = useMemo(() => (payload ? notesKey(payload) : null), [payload]);
  const dirty = fixed
    ? notes !== null && savedNotes !== null && notes !== savedNotes
    : key !== null && savedKey !== null && key !== savedKey;
  const needsPrompt = !!id && dirty && (!mine || fixed || phase === 'offline' || phase === 'error');
  const copyKind = fixed && (mine || sharing.visibility === 'published') ? 'variation' : 'copy';

  /* Leaving the page with edits the server does not have. An autosave in its
     two-second wait counts: the browser will not wait for it. */
  useEffect(() => {
    if (!(id && dirty) && !needsPrompt) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [id, dirty, needsPrompt]);

  /* One create at a time. Until the first answers there is no id to tell a
     second Save that the pattern already exists, so a double click, S pressed
     twice or a held Cmd+S would each POST — and each POST is another row. */
  const creating = useRef(false);
  /* Which pattern is on the stage, as a count of detaches. A first save that
     answers after the stage has moved on created its row — the pattern that
     was saved is saved — but must not bind the new pattern to that row, or
     its autosave would write the new pattern over the one just saved. */
  const generation = useRef(0);

  const create = useCallback(
    async (name: string): Promise<boolean> => {
      const now = latest.current;
      if (!now.payload || now.key === null || creating.current) return false;
      creating.current = true;
      const sentFor = generation.current;
      setPhase('saving');
      try {
        /* Someone else's pattern is saved through the copy route, so the
           copy records where it came from and can credit it (task 6.3); the
           server carries its description and links across. A copy of your own
           keeps what your pattern said about itself.

           If the original has gone — deleted, or made private while it was
           open here — the copy route answers 404 however often it is asked.
           The notes on the stage are still yours to keep, so that is saved
           as a plain new pattern instead, with no credit to a pattern nobody
           can open any more. */
        const { description, links } = now.details;
        const plain = () =>
          apiClient.post('/api/v1/breaks', {
            body: {
              title: name,
              doc: now.payload,
              ...(description ? { description } : {}),
              links,
            },
          });
        let answer: unknown;
        // a fixed pattern of yours is copied too: that is what makes a variation
        if (now.id && (!now.mine || now.fixed)) {
          try {
            answer = await apiClient.post(`/api/v1/breaks/${now.id}/copy`, {
              body: { title: name, doc: now.payload },
            });
          } catch (error) {
            if (!(error instanceof APIClientError && error.status === 404)) throw error;
            answer = await plain();
          }
        } else {
          answer = await plain();
        }
        const data = created.parse(answer);
        if (generation.current !== sentFor) {
          // the stage moved on while this was out: saved, but not what is shown now
          setPhase('idle');
          say('Saved to your account');
          return true;
        }
        const madeVariation = !!now.id && now.fixed;
        setId(data.id);
        setMine(true);
        setSharing({ ...NO_SHARING, basedOn: data.basedOn ?? null });
        setSavedNotes(notesKey(now.payload));
        /* The baseline is what was sent under the name it was sent as. A Save
           As renames the stage once this has succeeded (the provider does
           that), so the document sent still carries the old name inside it,
           and one autosave follows to put the new one there too. */
        setSavedKey(JSON.stringify({ payload: now.payload, title: name }));
        setPhase('idle');
        const store = storage();
        if (store) clearScratch(store);
        showAddress(data.id);
        /* Where it went, not just that it went: a bare "Saved" sent people
           looking for it among the browser-only favourites. */
        say(
          madeVariation
            ? 'Saved as a variation — under Patterns › All'
            : 'Saved to your account — under Patterns › All'
        );
        return true;
      } catch (error) {
        setPhase(
          error instanceof APIClientError && error.code === 'NETWORK_ERROR' ? 'offline' : 'error'
        );
        logger.warn('BeatBreaker: save refused', { error });
        say(
          error instanceof APIClientError && error.code === 'NETWORK_ERROR'
            ? 'Could not reach the server — not saved yet'
            : 'That did not save',
          { error: true }
        );
        return false;
      } finally {
        creating.current = false;
      }
    },
    [say]
  );

  const save = useCallback(async (): Promise<boolean> => {
    const now = latest.current;
    if (now.id && now.mine && !now.fixed) return saveNow();
    /* A fixed pattern of yours with no edit to its notes has nothing to save.
       Without this, S or ⌘S on it made an unchanged variation every time. */
    if (
      now.id &&
      now.mine &&
      now.fixed &&
      now.payload &&
      notesKey(now.payload) === now.savedNotes
    ) {
      return true;
    }
    return create(titleFor(now.title));
  }, [saveNow, create]);

  const saveAs = useCallback((name: string) => create(titleFor(name)), [create]);

  const detach = useCallback(
    (options?: { discard?: boolean }) => {
      generation.current += 1;
      /* The last edit to the pattern being left goes now, not after a wait the
       new pattern would cancel. Queued behind any save already in flight, and
       its outcome is logged rather than shown: it belongs to a pattern that is
       no longer on the stage. Not when the prompt was answered Don't save:
       that answer is a promise that the edits go nowhere. */
      const snap = snapshot();
      if (!options?.discard && snap && snap.key !== latest.current.savedKey) void patch(snap);
      setId(null);
      setMine(true);
      setSavedKey(null);
      setSavedNotes(null);
      setRefusedKey(null);
      setPhase('idle');
      setDetails(NO_DETAILS);
      setSharing(NO_SHARING);
      showAddress(null);
    },
    [snapshot, patch]
  );

  const attach = useCallback(
    (savedId: string, isMine: boolean, next?: PatternDetails, nextSharing?: PatternSharing) => {
      generation.current += 1;
      setId(savedId);
      setMine(isMine);
      setDetails(next ?? NO_DETAILS);
      setSharing(nextSharing ?? NO_SHARING);
      // null, so the baseline effect takes the pattern as it arrives
      setSavedKey(null);
      setSavedNotes(null);
      setRefusedKey(null);
      setPhase('idle');
      showAddress(savedId);
    },
    []
  );

  const share = useCallback(
    async (visibility: 'private' | 'link'): Promise<boolean> => {
      const savedId = latest.current.mine ? latest.current.id : null;
      if (!savedId) return false;
      const wasPublished = sharingNow.current.visibility === 'published';
      try {
        const answer = sharingAnswer.parse(
          await apiClient.patch(`/api/v1/breaks/${savedId}`, { body: { visibility } })
        );
        if (latest.current.id === savedId) {
          setSharing((was) => ({ ...was, visibility: answer.visibility, slug: answer.slug }));
        }
        say(
          visibility === 'private'
            ? 'Not shared any more'
            : wasPublished
              ? 'Unpublished — anyone with the link can still open it'
              : 'Shared — anyone with the link can open it'
        );
        return true;
      } catch (error) {
        logger.warn('BeatBreaker: sharing refused', { error, breakId: savedId });
        say(
          error instanceof APIClientError && error.code === 'NETWORK_ERROR'
            ? 'Could not reach the server — sharing not changed'
            : 'That did not change who can open it',
          { error: true }
        );
        return false;
      }
    },
    [say]
  );

  const publish = useCallback(async (): Promise<PublishResult> => {
    const savedId = latest.current.mine ? latest.current.id : null;
    if (!savedId) return { ok: false, code: null, message: 'Save the pattern first.' };
    /* Publishing fixes the notes the server has, so the server must have the
       ones on the stage first: an edit still in its autosave wait, or one a
       save is still carrying, goes now. If it cannot land, nothing is
       published — otherwise the older notes would be fixed and the edit on
       the stage would look saved when it never was. */
    const pending = snapshot();
    const flushed =
      pending && pending.key !== latest.current.savedKey
        ? await patch(pending)
        : await chain.current.then(
            () => true,
            () => true
          );
    if (!flushed || latest.current.id !== savedId) {
      return {
        ok: false,
        code: null,
        message: 'Your last change has not saved yet, so nothing was published. Try again.',
      };
    }
    // what the server now fixes: the stage as it was saved just now
    const publishedNotes = latest.current.payload ? notesKey(latest.current.payload) : null;
    try {
      const answer = publishedAnswer.parse(
        await apiClient.post(`/api/v1/breaks/${savedId}/publish`, { body: { confirm: true } })
      );
      if (latest.current.id === savedId) {
        // published is fixed (D26): an edit from here on is a variation
        setSharing((was) => ({ ...was, visibility: 'published', slug: answer.slug, fixed: true }));
        if (publishedNotes) setSavedNotes(publishedNotes);
      }
      say('Published to the community library');
      return { ok: true };
    } catch (error) {
      if (error instanceof APIClientError) {
        return {
          ok: false,
          code: error.code ?? null,
          message:
            error.code === 'NETWORK_ERROR'
              ? 'Could not reach the server — not published.'
              : error.message,
        };
      }
      logger.warn('BeatBreaker: publish failed', { error, breakId: savedId });
      return { ok: false, code: null, message: 'That did not publish. Try again.' };
    }
  }, [say, snapshot, patch]);

  const saveDetails = useCallback(
    async (next: PatternDetails, title?: string): Promise<PatternDetails | null> => {
      const savedId = latest.current.mine ? latest.current.id : null;
      if (!savedId) return null;
      try {
        const answer = detailsAnswer.parse(
          await apiClient.patch(`/api/v1/breaks/${savedId}`, {
            body: {
              description: next.description,
              links: next.links,
              ...(title === undefined ? {} : { title: titleFor(title) }),
            },
          })
        );
        const kept = { description: answer.description ?? '', links: answer.links };
        // the stage may have moved on while this was out
        if (latest.current.id === savedId) setDetails(kept);
        return kept;
      } catch (error) {
        logger.warn('BeatBreaker: details refused', { error, breakId: savedId });
        say(
          error instanceof APIClientError && error.code === 'NETWORK_ERROR'
            ? 'Could not reach the server — details not saved'
            : 'Those details did not save',
          { error: true }
        );
        return null;
      }
    },
    [say]
  );

  let status: SaveStatus;
  // a first save on its way says so, and takes Save away until it answers
  if ((!id || !mine || fixed) && phase === 'saving') status = 'saving';
  else if (!id || !mine) status = 'scratch';
  // a fixed pattern of yours: the row is saved; an edit is a variation not yet saved
  else if (fixed)
    status = phase === 'offline' || phase === 'error' ? phase : dirty ? 'scratch' : 'saved';
  else if (phase !== 'idle') status = phase;
  else status = dirty ? 'unsaved' : 'saved';

  return {
    id,
    mine,
    fixed,
    copyKind,
    variationOf: id && dirty && copyKind === 'variation' ? titleFor(title) : null,
    status,
    save,
    saveAs,
    detach,
    attach,
    needsPrompt,
    details,
    saveDetails,
    sharing,
    share,
    publish,
  };
}
