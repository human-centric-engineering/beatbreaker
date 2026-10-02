import { z } from 'zod';

import { apiClient } from '@/lib/api/client';
import { defaultTotal, keptItem } from '@/lib/app/practice/items';
import type { PinTarget } from '@/lib/validations/pins';
import {
  SESSION_ITEMS_MAX,
  SESSION_NAME_MAX,
  type SessionSummary,
  sessionSummarySchema,
  type SessionView,
  sessionViewSchema,
  type ShareState,
  shareStateSchema,
} from '@/lib/validations/practice-sessions';

/**
 * The browser's calls to `/api/v1/practice-sessions` (Phase 7D), each answer
 * checked against the schema the route answers with rather than cast.
 */

const BASE = '/api/v1/practice-sessions';

/** A pattern as a new item names it, at the layer it is to be played. */
export interface NewItem {
  target: PinTarget;
  level: number;
}

/** Your sessions, as the list reads them. One request. */
export async function listMySessions(): Promise<SessionSummary[]> {
  return z.array(sessionSummarySchema).parse(await apiClient.get(BASE));
}

/** Whether a session has room for one more pattern: twelve, and a minute each. */
export function hasRoom(session: Pick<SessionSummary, 'itemCount' | 'totalMinutes'>): boolean {
  return session.itemCount < SESSION_ITEMS_MAX && session.itemCount < session.totalMinutes;
}

/**
 * Add a pattern to the end of one of your sessions. The list is replaced
 * whole, so the session is read first and every item in it is sent back.
 */
export async function addToSession(id: string, item: NewItem): Promise<SessionView> {
  const current = sessionViewSchema.parse(await apiClient.get(`${BASE}/${id}`));
  return sessionViewSchema.parse(
    await apiClient.put(`${BASE}/${id}/items`, {
      body: {
        items: [...current.items.map(keptItem), { ...item.target, level: item.level }],
      },
    })
  );
}

/** How long an empty new session is, before anything is in it. */
export const EMPTY_SESSION_MINUTES = 20;

/**
 * A new session of these patterns, in this order — at most twelve, five
 * minutes each — named `name`. With no patterns it is
 * {@link EMPTY_SESSION_MINUTES} long.
 */
export async function createSessionWith(name: string, items: NewItem[]): Promise<SessionView> {
  const kept = items.slice(0, SESSION_ITEMS_MAX);
  return sessionViewSchema.parse(
    await apiClient.post(BASE, {
      body: {
        name: name.trim().slice(0, SESSION_NAME_MAX) || 'New session',
        totalMinutes: kept.length ? defaultTotal(kept.length) : EMPTY_SESSION_MINUTES,
        items: kept.map((i) => ({ ...i.target, level: i.level })),
      },
    })
  );
}

/** Where a session is edited. */
export function sessionPath(id: string): string {
  return `/practice/${id}`;
}

/**
 * Share one of your sessions with a link, or stop sharing it. A refusal —
 * a pattern in it others could not open — is an `APIClientError` whose
 * `details.items` names them (`shareBlockedSchema`).
 */
export async function setSessionShared(id: string, shared: boolean): Promise<ShareState> {
  const path = `${BASE}/${id}/share`;
  return shareStateSchema.parse(
    shared ? await apiClient.post(path, { body: {} }) : await apiClient.delete(path)
  );
}

/** Save someone's shared session as yours. The copy is private, and its targets are yours. */
export async function saveSharedSession(slug: string): Promise<SessionView> {
  return sessionViewSchema.parse(
    await apiClient.post(`/api/v1/public/practice-sessions/${slug}/copy`, { body: {} })
  );
}
