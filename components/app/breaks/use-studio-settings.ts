'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AUTOSAVE_MS, RETRY_MS } from '@/components/app/studio/use-pattern-document';
import { APIClientError, apiClient } from '@/lib/api/client';
import { logger } from '@/lib/logging';
import type { StudioSettings, StudioSettingsPatch } from '@/lib/validations/studio-settings';

/**
 * Your Studio settings (D19), held by the console and written back to your
 * account.
 *
 * The page reads the row server-side and hands it in, so the Studio opens with
 * your kit and tuning rather than flashing the defaults first. From then on
 * this state is the Studio's copy, and every change goes to
 * `PATCH /api/v1/studio-settings` the way a pattern autosaves: one request
 * {@link AUTOSAVE_MS} after the last change, carrying every field changed
 * since the one before. A slider dragged end to end is one PATCH, not sixty.
 *
 * **A PATCH is a partial merge on the server**, so this sends only the fields
 * that changed — another device's change to a different field is not written
 * back over. Requests go one after another, so an older one cannot land after
 * a newer one and put an old value back.
 *
 * **A dropped connection is not a lost setting.** What did not land is kept,
 * under anything changed since, and tried again when the browser comes back
 * online, on a {@link RETRY_MS} timer, or with the next change. A refusal is
 * logged and dropped: sending the same fields again gets the same answer.
 *
 * **Leaving does not wait for the timer.** A change still waiting when the
 * Studio unmounts, or when the page is hidden (a tab closed, a phone
 * backgrounding the browser), is sent then, straight away rather than queued,
 * with `keepalive` so the browser finishes the request after the page has gone.
 */

const ROUTE = '/api/v1/studio-settings';

export interface StudioSettingsState {
  settings: StudioSettings;
  /**
   * Change some settings. Takes the fields to set, or a function of the
   * settings as they stand now — for a change built on the current value,
   * such as one voice's tuning inside the whole map.
   */
  update: (change: StudioSettingsPatch | ((now: StudioSettings) => StudioSettingsPatch)) => void;
}

export function useStudioSettings(initial: StudioSettings): StudioSettingsState {
  const [settings, setSettings] = useState(initial);
  /* The settings as of the last `update`, written synchronously. Two changes in
     one handler (a style that brings its own kit and tempo) each build on the
     one before rather than on the render both started from. */
  const now = useRef(initial);
  /** Changed since the last request went out. */
  const pending = useRef<StudioSettingsPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const [offline, setOffline] = useState(false);

  const send = useCallback((keepalive: boolean) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const body = pending.current;
    if (!Object.keys(body).length) return;
    pending.current = {};
    const run = async () => {
      try {
        await apiClient.patch(ROUTE, { body, ...(keepalive ? { options: { keepalive } } : {}) });
        setOffline(false);
      } catch (error) {
        if (error instanceof APIClientError && error.code === 'NETWORK_ERROR') {
          // what did not land goes back under anything changed since
          pending.current = { ...body, ...pending.current };
          setOffline(true);
          return;
        }
        logger.warn('BeatBreaker: Studio settings refused', {
          error,
          fields: Object.keys(body),
        });
      }
    };
    /* On the way out it goes now, not behind a request still in flight: the
       page may be gone before that one answers, and a queued send with it. */
    chain.current = keepalive ? run() : chain.current.then(run, run);
  }, []);

  const update = useCallback<StudioSettingsState['update']>(
    (change) => {
      const patch = typeof change === 'function' ? change(now.current) : change;
      if (!Object.keys(patch).length) return;
      now.current = { ...now.current, ...patch };
      setSettings(now.current);
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => send(false), AUTOSAVE_MS);
    },
    [send]
  );

  /* Offline: try again when the browser says it is back, and on a timer in
     case it never says. */
  useEffect(() => {
    if (!offline) return;
    const retry = () => send(false);
    window.addEventListener('online', retry);
    const t = setInterval(retry, RETRY_MS);
    return () => {
      window.removeEventListener('online', retry);
      clearInterval(t);
    };
  }, [offline, send]);

  /* Leaving: send what is waiting now rather than lose it with the timer. */
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === 'hidden') send(true);
    };
    const leave = () => send(true);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', leave);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', leave);
      send(true);
    };
  }, [send]);

  return { settings, update };
}
