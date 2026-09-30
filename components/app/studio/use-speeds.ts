'use client';

import { useCallback, useEffect, useState } from 'react';

import { APIClientError, apiClient } from '@/lib/api/client';
import { logger } from '@/lib/logging';
import type { PinTarget } from '@/lib/validations/pins';
import {
  speedTableSchema,
  type SpeedTableRow,
  type YourSpeeds,
  yourSpeedsSchema,
} from '@/lib/validations/speeds';
import type { Say } from '@/components/app/studio/use-notice';

/**
 * Your speeds on the pattern on the stage (Phase 7C), for the Practise drawer:
 * your records, where they place you, and recording a new one.
 *
 * Read when the drawer shows a target and again after every change, whole,
 * from `GET /api/v1/speed-records` — the places are worked out on the server
 * against everyone's records, and one small request is cheaper than a second
 * copy of that rule here. Answers are kept against the target they are for,
 * so switching patterns never shows the last one's speeds.
 */

export interface SpeedEntry {
  level: number;
  bpm: number;
  videoUrl?: string;
  note?: string;
  listed?: boolean;
}

export interface SpeedsState {
  /** Null while the first read is on its way, or when it failed. */
  speeds: YourSpeeds | null;
  /** Record a speed on the target. False, with the toast saying why, when it did not. */
  record: (entry: SpeedEntry) => Promise<boolean>;
  /** Delete one of your records. */
  remove: (id: string) => Promise<void>;
  /** Goes up after every change — what the table beside it reads again on. */
  version: number;
}

function keyOf(target: PinTarget | null): string | null {
  if (!target) return null;
  return 'breakId' in target ? `break:${target.breakId}` : `entry:${target.libraryEntryId}`;
}

export function useSpeeds(target: PinTarget | null, say: Say): SpeedsState {
  const key = keyOf(target);
  const [held, setHeld] = useState<{ key: string; speeds: YourSpeeds } | null>(null);
  /** Bumped after a change, to read the list back. */
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!target || !key) return;
    let live = true;
    void (async () => {
      try {
        const speeds = yourSpeedsSchema.parse(
          await apiClient.get('/api/v1/speed-records', { params: target })
        );
        if (live) setHeld({ key, speeds });
      } catch (error) {
        // no speeds shown is what an unreadable answer costs — nothing to tell anyone
        logger.warn('BeatBreaker: speeds could not be read', { error });
      }
    })();
    return () => {
      live = false;
    };
    // `target` is read through `key`, which names it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  const record = useCallback(
    async (entry: SpeedEntry) => {
      if (!target) return false;
      try {
        await apiClient.post('/api/v1/speed-records', { body: { ...target, ...entry } });
        setVersion((v) => v + 1);
        say(`Recorded: ${entry.bpm} bpm`);
        return true;
      } catch (error) {
        say(error instanceof APIClientError ? error.message : 'Could not record that — try again', {
          error: true,
        });
        return false;
      }
    },
    [target, say]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/api/v1/speed-records/${id}`);
      } catch (error) {
        logger.warn('BeatBreaker: a speed could not be deleted', { error });
        say('Could not delete that — try again', { error: true });
      }
      setVersion((v) => v + 1);
    },
    [say]
  );

  return { speeds: held && held.key === key ? held.speeds : null, record, remove, version };
}

/** How many rows of a table the drawer shows. */
export const TABLE_TOP = 5;

/**
 * The top of a target's public table at one layer, or null while it loads
 * or when there is no table. `url` is the table's endpoint; `version` reads it
 * again after you record a speed.
 */
export function useTableTop(
  url: string | null,
  level: number,
  version: number
): SpeedTableRow[] | null {
  const key = url ? `${url}?level=${level}` : null;
  const [held, setHeld] = useState<{ key: string; rows: SpeedTableRow[] } | null>(null);

  useEffect(() => {
    if (!url || !key) return;
    let live = true;
    void (async () => {
      try {
        const rows = speedTableSchema.parse(
          await apiClient.get(url, { params: { level, limit: TABLE_TOP } })
        );
        if (live) setHeld({ key, rows });
      } catch (error) {
        logger.warn('BeatBreaker: a speed table could not be read', { error });
      }
    })();
    return () => {
      live = false;
    };
  }, [url, key, level, version]);

  return held && held.key === key ? held.rows : null;
}
