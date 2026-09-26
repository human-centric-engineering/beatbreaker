'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** How long a confirmation stays up. */
export const TOAST_MS = 2200;
/** How long an Undo is on offer — and so how long what it undoes waits to be sent. */
export const UNDO_MS = 6000;

export interface SayOptions {
  /**
   * Something went wrong, or will not happen. It stays until it is dismissed:
   * a two-second line is easy to miss, and this is the one you needed to read.
   */
  error?: boolean;
  /** A button on the line — Undo — offered for {@link UNDO_MS}. */
  action?: { label: string; run: () => void };
}

/** Put a line of feedback under the Studio. */
export type Say = (message: string, options?: SayOptions) => void;

export interface Notice {
  /** New for every `say`, so the same words twice are a new line, timed afresh. */
  id: number;
  message: string;
  error: boolean;
  action?: SayOptions['action'];
}

/**
 * The Studio's one line of feedback (E9).
 *
 * Confirmations — "Saved", "Link copied" — go after {@link TOAST_MS}. An error
 * stays until dismissed. A line with an action stays for {@link UNDO_MS}, the
 * time the thing it undoes is held back. Saying anything replaces what was
 * there, and saying the same thing again starts its time over: the console's
 * toast keyed its timer on the text, so a second "Could not save" in a row
 * went away with the first one's time.
 */
export function useNotice(): { notice: Notice | null; say: Say; dismiss: () => void } {
  const [notice, setNotice] = useState<Notice | null>(null);
  const next = useRef(0);

  const say = useCallback<Say>((message, options = {}) => {
    next.current += 1;
    setNotice({
      id: next.current,
      message,
      error: options.error ?? false,
      action: options.action,
    });
  }, []);

  const dismiss = useCallback(() => setNotice(null), []);

  useEffect(() => {
    if (!notice || notice.error) return;
    /* Only this notice: an Undo's time runs out as the thing it held back is
       sent, and an error that sending raises can be said before this effect
       has been re-run to cancel the timer. It must not take that down. */
    const { id } = notice;
    const t = setTimeout(
      () => setNotice((now) => (now?.id === id ? null : now)),
      notice.action ? UNDO_MS : TOAST_MS
    );
    return () => clearTimeout(t);
  }, [notice]);

  return { notice, say, dismiss };
}
