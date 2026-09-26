'use client';

import { useCallback, useMemo } from 'react';

import type { StoredSetting } from '@/lib/app/breaks/browser-keys';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';

/**
 * A browser setting, read through its schema (D19, H9).
 *
 * Sunrise's `useLocalStorage` parses what is stored and hands it back as
 * whatever type it was asked for. This sits on top of it and checks: bad JSON,
 * a value of the wrong type or one out of range all read as the setting's
 * fallback. Take the setting from `browser-keys.ts`, so every key the app
 * writes is listed there.
 */
export function useStoredSetting<T>(setting: StoredSetting<T>): [T, (next: T) => void] {
  const { key, schema, fallback } = setting;
  const [raw, setRaw] = useLocalStorage<unknown>(key, fallback);

  const value = useMemo(() => {
    const parsed = schema.safeParse(raw);
    return parsed.success ? parsed.data : fallback;
  }, [raw, schema, fallback]);

  const set = useCallback((next: T) => setRaw(next), [setRaw]);

  return [value, set];
}
