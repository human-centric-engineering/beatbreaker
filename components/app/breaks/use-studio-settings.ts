'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

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
 * back over. Tuning (`sound`) merges a level deeper, by kit, here and on the
 * server, so a change sends only the kit it touched.
 *
 * **Requests go one after another**, so an older one cannot land after a newer
 * one and put an old value back. Each takes what is waiting when its turn
 * comes, not when it was queued.
 *
 * **A failed request is not a lost setting.** What did not land is kept, under
 * anything changed since, and tried again when the browser comes back online,
 * on a {@link RETRY_MS} timer, or with the next change. That covers a dropped
 * connection, a server error, a rate limit and an expired session alike. Only
 * a 400 is dropped, because sending it again gets the same answer — and only
 * the fields it names; the rest of that request goes again.
 *
 * **Leaving does not wait for the timer.** A change still waiting when the
 * Studio unmounts or the page is hidden is queued straight away, with
 * `keepalive`. When the page itself is going (`pagehide`), anything not yet
 * sent goes at once rather than behind a request still out, which may not
 * answer before the page has gone. That is the one case where two requests
 * can overlap.
 */

const ROUTE = '/api/v1/studio-settings';

export interface StudioSettingsState {
  settings: StudioSettings;
  /**
   * Change some settings. Takes the fields to set, or a function of the
   * settings as they stand now — for a change built on the current value,
   * such as one voice's tuning. `sound` merges by kit: give only the kits
   * that changed, each whole.
   */
  update: (change: StudioSettingsPatch | ((now: StudioSettings) => StudioSettingsPatch)) => void;
}

type Patch = StudioSettingsPatch;

/** `patch` over `base`, with `sound` merged by kit — the server's rule. */
function merge<T extends Patch>(base: T, patch: Patch): T {
  const out = { ...base, ...patch };
  if (patch.sound && base.sound) out.sound = { ...base.sound, ...patch.sound };
  return out;
}

/** What a patch sets, one key per field and one per tuned kit (`sound.<kit>`). */
function keysOf(patch: Patch): string[] {
  return Object.keys(patch).flatMap((field) =>
    field === 'sound' ? Object.keys(patch.sound ?? {}).map((kit) => `sound.${kit}`) : [field]
  );
}

/** The part of `patch` whose keys pass `keep`. */
function pick(patch: Patch, keep: (key: string) => boolean): Patch {
  const out: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(patch)) {
    if (field !== 'sound') {
      if (keep(field)) out[field] = value;
      continue;
    }
    const kits = Object.entries(patch.sound ?? {}).filter(([kit]) => keep(`sound.${kit}`));
    if (kits.length) out.sound = Object.fromEntries(kits);
  }
  return out;
}

/** A 400's `details`, as `validateRequestBody` shapes them. */
const refusalSchema = z.object({ errors: z.array(z.object({ path: z.string() })) });

/** The fields a 400 names (`details.errors[].path`, first segment), or none it can tell. */
function refusedFields(error: APIClientError): Set<string> {
  const parsed = refusalSchema.safeParse(error.details);
  if (!parsed.success) return new Set();
  return new Set(parsed.data.errors.map((e) => e.path.split('.')[0]).filter(Boolean));
}

export function useStudioSettings(initial: StudioSettings): StudioSettingsState {
  const [settings, setSettings] = useState(initial);
  /* The settings as of the last `update`, written synchronously. Two changes in
     one handler (a style that brings its own kit and tempo) each build on the
     one before rather than on the render both started from. */
  const now = useRef(initial);
  /** Changed and not yet sent. */
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  /** Numbers each request; `lastSent` says which request last carried each key. */
  const sends = useRef(0);
  const lastSent = useRef(new Map<string, number>());
  const [retrying, setRetrying] = useState(false);

  /**
   * Send what is waiting. True when a refusal left part of it to send again
   * straight away — the caller loops, so this does not call itself.
   */
  const flush = useCallback(async (keepalive: boolean): Promise<boolean> => {
    const body = pending.current;
    const keys = keysOf(body);
    if (!keys.length) return false;
    pending.current = {};
    const stamp = ++sends.current;
    for (const key of keys) lastSent.current.set(key, stamp);

    /* Put back what did not land, unless a later request has carried it since,
       under anything changed since. */
    const putBack = (drop: Set<string>) => {
      const again = pick(
        body,
        (key) => lastSent.current.get(key) === stamp && !drop.has(key.split('.')[0])
      );
      pending.current = merge(again, pending.current);
      return keysOf(again).length > 0;
    };

    try {
      await apiClient.patch(ROUTE, { body, ...(keepalive ? { options: { keepalive } } : {}) });
      setRetrying(false);
      return false;
    } catch (error) {
      if (error instanceof APIClientError && error.status === 400) {
        /* Only what the answer names is dropped. An answer that names nothing
           in this request cannot be pinned on a field, so it drops the lot —
           sending it again would get the same answer, forever. */
        const named = refusedFields(error);
        const pinned = keys.some((key) => named.has(key.split('.')[0]));
        logger.warn('BeatBreaker: Studio settings refused', {
          error,
          fields: pinned ? [...named] : Object.keys(body),
        });
        return pinned && putBack(named);
      }
      putBack(new Set());
      setRetrying(true);
      return false;
    }
  }, []);

  /** Queue a request behind any still out. */
  const send = useCallback(
    (keepalive: boolean) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      const run = async () => {
        while (await flush(keepalive));
      };
      chain.current = chain.current.then(run, run);
    },
    [flush]
  );

  const update = useCallback<StudioSettingsState['update']>(
    (change) => {
      const patch = typeof change === 'function' ? change(now.current) : change;
      if (!Object.keys(patch).length) return;
      now.current = merge(now.current, patch);
      setSettings(now.current);
      pending.current = merge(pending.current, patch);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => send(false), AUTOSAVE_MS);
    },
    [send]
  );

  /* A request that failed: try again when the browser says it is back, and on
     a timer in case it never says. */
  useEffect(() => {
    if (!retrying) return;
    const retry = () => send(false);
    window.addEventListener('online', retry);
    const t = setInterval(retry, RETRY_MS);
    return () => {
      window.removeEventListener('online', retry);
      clearInterval(t);
    };
  }, [retrying, send]);

  /* Leaving: send what is waiting now rather than lose it with the timer. */
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === 'hidden') send(true);
    };
    /* The page is going: a queued request would go with it. */
    const leave = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      void flush(true);
    };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', leave);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', leave);
      send(true);
    };
  }, [send, flush]);

  return { settings, update };
}
