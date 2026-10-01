/**
 * Request and response schemas for practice sessions (Phase 7D) —
 * `/api/v1/practice-sessions`.
 *
 * @see lib/validations/practice-sessions.ts
 */

import { describe, expect, it } from 'vitest';

import {
  createRunSchema,
  createSessionSchema,
  replaceItemsSchema,
  SESSION_ITEMS_MAX,
  updateSessionSchema,
} from '@/lib/validations/practice-sessions';

const BREAK_ID = 'cbrk00000000000000000001';
const ENTRY_ID = 'centr0000000000000000001';
const ITEM_ID = 'citm00000000000000000001';
const ITEM_ID_2 = 'citm00000000000000000002';

function item(over: Record<string, unknown> = {}) {
  return { breakId: BREAK_ID, level: 3, ...over };
}

function session(over: Record<string, unknown> = {}) {
  return { name: 'Warmup', totalMinutes: 10, ...over };
}

describe('createSessionSchema — defaults', () => {
  it('defaults the climb, countIn and items when only the name and total are given', () => {
    const result = createSessionSchema.parse(session());
    expect(result).toMatchObject({
      startPct: 20,
      climbPct: 67,
      climbShape: 'steady',
      climbSteps: 4,
      countIn: 1,
      items: [],
    });
  });

  it('defaults description to null when omitted', () => {
    expect(createSessionSchema.parse(session()).description).toBeNull();
  });

  it('keeps an explicit climb setting over its default', () => {
    const result = createSessionSchema.parse(
      session({ startPct: 10, climbPct: 90, climbShape: 'steps', climbSteps: 8, countIn: 0 })
    );
    expect(result).toMatchObject({
      startPct: 10,
      climbPct: 90,
      climbShape: 'steps',
      climbSteps: 8,
      countIn: 0,
    });
  });
});

describe('createSessionSchema — name', () => {
  it('trims the name', () => {
    expect(createSessionSchema.parse(session({ name: '  Warmup  ' })).name).toBe('Warmup');
  });

  it('refuses an empty name, even after trimming', () => {
    expect(createSessionSchema.safeParse(session({ name: '   ' })).success).toBe(false);
    expect(createSessionSchema.safeParse(session({ name: '' })).success).toBe(false);
  });

  it('refuses a name over 80 characters', () => {
    expect(createSessionSchema.safeParse(session({ name: 'x'.repeat(81) })).success).toBe(false);
  });

  it('accepts a name at exactly 80 characters', () => {
    expect(createSessionSchema.safeParse(session({ name: 'x'.repeat(80) })).success).toBe(true);
  });
});

describe('createSessionSchema — totalMinutes', () => {
  it.each([4, 121])('refuses %s minutes, outside 5–120', (totalMinutes) => {
    expect(createSessionSchema.safeParse(session({ totalMinutes })).success).toBe(false);
  });

  it.each([5, 120])('accepts %s minutes, the boundary of 5–120', (totalMinutes) => {
    expect(createSessionSchema.safeParse(session({ totalMinutes })).success).toBe(true);
  });
});

describe('createSessionSchema — items', () => {
  it(`refuses more than ${SESSION_ITEMS_MAX} items`, () => {
    const items = Array.from({ length: SESSION_ITEMS_MAX + 1 }, () => item());
    const result = createSessionSchema.safeParse(session({ items }));
    expect(result.success).toBe(false);
  });

  it(`accepts exactly ${SESSION_ITEMS_MAX} items`, () => {
    const items = Array.from({ length: SESSION_ITEMS_MAX }, () => item());
    expect(createSessionSchema.safeParse(session({ items })).success).toBe(true);
  });

  it('names a new item by exactly one target', () => {
    const result = createSessionSchema.parse(session({ items: [item()] }));
    expect(result.items[0].target).toEqual({ breakId: BREAK_ID });
    expect(result.items[0]).not.toHaveProperty('breakId');

    const byEntry = createSessionSchema.parse(
      session({ items: [item({ breakId: undefined, libraryEntryId: ENTRY_ID })] })
    );
    expect(byEntry.items[0].target).toEqual({ libraryEntryId: ENTRY_ID });
  });

  it('refuses a new item with both a breakId and a libraryEntryId', () => {
    const result = createSessionSchema.safeParse(
      session({ items: [item({ libraryEntryId: ENTRY_ID })] })
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['items', 0, 'breakId']);
  });

  it('refuses a new item with neither a breakId nor a libraryEntryId', () => {
    const result = createSessionSchema.safeParse(
      session({ items: [item({ breakId: undefined })] })
    );
    expect(result.success).toBe(false);
  });

  it.each([39, 301])('refuses a goalBpm of %s, outside 40–300', (goalBpm) => {
    const result = createSessionSchema.safeParse(session({ items: [item({ goalBpm })] }));
    expect(result.success).toBe(false);
  });

  it.each([40, 300])('accepts a goalBpm of %s, the boundary of 40–300', (goalBpm) => {
    const result = createSessionSchema.safeParse(session({ items: [item({ goalBpm })] }));
    expect(result.success).toBe(true);
  });

  it('allows a null goalBpm', () => {
    const result = createSessionSchema.parse(session({ items: [item({ goalBpm: null })] }));
    expect(result.items[0].goalBpm).toBeNull();
  });

  it('defaults a missing goalBpm to null, not undefined', () => {
    const result = createSessionSchema.parse(session({ items: [item()] }));
    expect(result.items[0].goalBpm).toBeNull();
  });
});

describe('replaceItemsSchema', () => {
  it('keeps a kept item with no target and no settled fields disturbed', () => {
    const result = replaceItemsSchema.parse({ items: [{ id: ITEM_ID, level: 2 }] });
    expect(result.items[0]).toMatchObject({ id: ITEM_ID, target: null, level: 2 });
  });

  it('refuses a kept item that also names a breakId', () => {
    const result = replaceItemsSchema.safeParse({
      items: [{ id: ITEM_ID, level: 2, breakId: BREAK_ID }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['items', 0, 'breakId']);
  });

  it('refuses a kept item that also names a libraryEntryId', () => {
    const result = replaceItemsSchema.safeParse({
      items: [{ id: ITEM_ID, level: 2, libraryEntryId: ENTRY_ID }],
    });
    expect(result.success).toBe(false);
  });

  it('requires exactly one target on a new (no id) item', () => {
    const neither = replaceItemsSchema.safeParse({ items: [{ level: 2 }] });
    expect(neither.success).toBe(false);

    const both = replaceItemsSchema.safeParse({
      items: [{ level: 2, breakId: BREAK_ID, libraryEntryId: ENTRY_ID }],
    });
    expect(both.success).toBe(false);

    const one = replaceItemsSchema.parse({ items: [{ level: 2, breakId: BREAK_ID }] });
    expect(one.items[0].target).toEqual({ breakId: BREAK_ID });
  });

  it('accepts a mix of kept and new items, up to the item cap', () => {
    const result = replaceItemsSchema.safeParse({
      items: [
        { id: ITEM_ID, level: 1 },
        { id: ITEM_ID_2, level: 2 },
        { level: 3, breakId: BREAK_ID },
      ],
    });
    expect(result.success).toBe(true);
  });

  it(`refuses more than ${SESSION_ITEMS_MAX} items`, () => {
    const items = Array.from({ length: SESSION_ITEMS_MAX + 1 }, () => item());
    expect(replaceItemsSchema.safeParse({ items }).success).toBe(false);
  });
});

describe('updateSessionSchema', () => {
  it('refuses an empty body', () => {
    expect(updateSessionSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a single changed field', () => {
    expect(updateSessionSchema.safeParse({ name: 'New name' }).success).toBe(true);
  });

  it("turns an empty description into null, rather than leaving it ''", () => {
    const result = updateSessionSchema.parse({ description: '' });
    expect(result.description).toBeNull();
  });

  it('trims and keeps a real description', () => {
    const result = updateSessionSchema.parse({ description: '  practice notes  ' });
    expect(result.description).toBe('practice notes');
  });

  it('allows an explicit null description', () => {
    expect(updateSessionSchema.parse({ description: null }).description).toBeNull();
  });

  it.each([4, 121])('refuses a totalMinutes of %s, outside 5–120', (totalMinutes) => {
    expect(updateSessionSchema.safeParse({ totalMinutes }).success).toBe(false);
  });
});

describe('createRunSchema', () => {
  const slot = { title: 'Funky Drummer', level: 3, targetBpm: 120, reachedBpm: 118, seconds: 90 };

  it('requires at least one slot', () => {
    const result = createRunSchema.safeParse({
      startedAt: '2026-09-30T12:00:00.000Z',
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('requires startedAt to be a real ISO datetime', () => {
    const result = createRunSchema.safeParse({ startedAt: 'not a date', items: [slot] });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed run', () => {
    const result = createRunSchema.safeParse({
      startedAt: '2026-09-30T12:00:00.000Z',
      items: [slot],
    });
    expect(result.success).toBe(true);
  });

  it.each([39, 301])('refuses a slot targetBpm of %s, outside 40–300', (targetBpm) => {
    const result = createRunSchema.safeParse({
      startedAt: '2026-09-30T12:00:00.000Z',
      items: [{ ...slot, targetBpm }],
    });
    expect(result.success).toBe(false);
  });

  it.each([39, 301])('refuses a slot reachedBpm of %s, outside 40–300', (reachedBpm) => {
    const result = createRunSchema.safeParse({
      startedAt: '2026-09-30T12:00:00.000Z',
      items: [{ ...slot, reachedBpm }],
    });
    expect(result.success).toBe(false);
  });

  it.each([40, 300])('accepts a slot bpm of %s, the boundary of 40–300', (bpm) => {
    const result = createRunSchema.safeParse({
      startedAt: '2026-09-30T12:00:00.000Z',
      items: [{ ...slot, targetBpm: bpm, reachedBpm: bpm }],
    });
    expect(result.success).toBe(true);
  });
});
