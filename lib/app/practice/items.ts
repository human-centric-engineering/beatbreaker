/**
 * What a client sends back for the items already in a practice session.
 *
 * `PUT /api/v1/practice-sessions/:id/items` takes the whole list, so adding a
 * pattern, reordering or editing one sends every item. An item already there
 * is named by its `id` with its settings as read; its pattern never changes,
 * so it names none. Pure, so the editor, _Add to a session_ and a native
 * client (D14) build the same list.
 */

import type { ClimbShape } from '@/lib/app/practice/climb';
import { SESSION_MINUTES } from '@/lib/validations/practice-sessions';

/** An item as `GET …/:id` reads it — the fields a kept item sends back. */
export interface ItemSettings {
  id: string;
  level: number;
  goalBpm: number | null;
  minutes: number;
  minutesPinned: boolean;
  startPct: number | null;
  climbPct: number | null;
  climbShape: ClimbShape | null;
  climbSteps: number | null;
}

/** A kept item, as the replacement list names it. */
export function keptItem(item: ItemSettings): ItemSettings {
  return {
    id: item.id,
    level: item.level,
    goalBpm: item.goalBpm,
    minutes: item.minutes,
    minutesPinned: item.minutesPinned,
    startPct: item.startPct,
    climbPct: item.climbPct,
    climbShape: item.climbShape,
    climbSteps: item.climbSteps,
  };
}

/** Minutes a new session gives each pattern it starts with. */
export const MINUTES_EACH = 5;

/**
 * The total for a new session of `count` patterns: five minutes each, within
 * the session's 5 to 120.
 */
export function defaultTotal(count: number): number {
  return Math.min(SESSION_MINUTES.max, Math.max(SESSION_MINUTES.min, count * MINUTES_EACH));
}

/** A shared session's public address. The page is `app/(public)/s/[slug]`. */
export function sharedSessionPath(slug: string): string {
  return `/s/${slug}`;
}
