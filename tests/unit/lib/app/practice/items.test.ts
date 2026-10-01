/**
 * What a client sends back for a session's kept items, and a new session's
 * total (Phase 7D).
 *
 * @see lib/app/practice/items.ts
 */

import { describe, expect, it } from 'vitest';

import { defaultTotal, keptItem, MINUTES_EACH } from '@/lib/app/practice/items';
import { replaceItemsSchema, SESSION_MINUTES } from '@/lib/validations/practice-sessions';
import { item } from '@/tests/unit/components/app/practice/fixtures';

describe('keptItem', () => {
  it('keeps the id and the settings, and drops what the server works out', () => {
    const view = item(1, { goalBpm: 120, minutes: 7, minutesPinned: true, climbShape: 'steps' });
    expect(keptItem(view)).toEqual({
      id: view.id,
      level: 5,
      goalBpm: 120,
      minutes: 7,
      minutesPinned: true,
      startPct: null,
      climbPct: null,
      climbShape: 'steps',
      climbSteps: null,
    });
  });

  it('is a list the items route accepts as it stands', () => {
    const parsed = replaceItemsSchema.safeParse({ items: [item(1), item(2)].map(keptItem) });
    expect(parsed.success).toBe(true);
  });
});

describe('defaultTotal', () => {
  it('gives each pattern five minutes', () => {
    expect(defaultTotal(4)).toBe(4 * MINUTES_EACH);
  });

  it('is never under the session floor, even with nothing in it', () => {
    expect(defaultTotal(0)).toBe(SESSION_MINUTES.min);
  });

  it('holds twelve patterns within the ceiling', () => {
    expect(defaultTotal(12)).toBe(60);
    expect(defaultTotal(100)).toBe(SESSION_MINUTES.max);
  });
});
