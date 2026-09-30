/**
 * Request schemas for speed records (Phase 7C) — `/api/v1/speed-records` and
 * the public tables.
 *
 * @see lib/validations/speeds.ts
 */

import { describe, expect, it } from 'vitest';

import { VIDEO_RULE } from '@/lib/app/breaks/community/video-links';
import {
  createSpeedSchema,
  DEFAULT_TABLE_LEVEL,
  SPEED_BPM_MAX,
  SPEED_BPM_MIN,
  speedTableQuerySchema,
  TABLE_PAGE_DEFAULT,
  TABLE_PAGE_MAX,
  yourSpeedsQuerySchema,
} from '@/lib/validations/speeds';

const BREAK_ID = 'clzx9k8p40000x8c2g3h5m7b1';
const ENTRY_ID = 'clzx9k8p40001x8c2g3h5m7b2';

function body(over: Record<string, unknown> = {}) {
  return { breakId: BREAK_ID, level: 3, bpm: 120, ...over };
}

describe('createSpeedSchema', () => {
  it('names the target by exactly one id', () => {
    const byBreak = createSpeedSchema.parse(body());
    expect(byBreak.target).toEqual({ breakId: BREAK_ID });
    expect(byBreak).not.toHaveProperty('breakId');
    expect(byBreak).not.toHaveProperty('libraryEntryId');

    const byEntry = createSpeedSchema.parse(body({ breakId: undefined, libraryEntryId: ENTRY_ID }));
    expect(byEntry.target).toEqual({ libraryEntryId: ENTRY_ID });
  });

  it('refuses both a breakId and a libraryEntryId', () => {
    const result = createSpeedSchema.safeParse(body({ libraryEntryId: ENTRY_ID }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['breakId']);
  });

  it('refuses neither a breakId nor a libraryEntryId', () => {
    const result = createSpeedSchema.safeParse(body({ breakId: undefined }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['breakId']);
  });

  it.each([0, 6, 1.5])('refuses a level of %s', (level) => {
    expect(createSpeedSchema.safeParse(body({ level })).success).toBe(false);
  });

  it.each([1, 2, 3, 4, 5])('accepts a level of %s', (level) => {
    expect(createSpeedSchema.safeParse(body({ level })).success).toBe(true);
  });

  it.each([SPEED_BPM_MIN, SPEED_BPM_MAX])('accepts the bpm boundary %s', (bpm) => {
    expect(createSpeedSchema.safeParse(body({ bpm })).success).toBe(true);
  });

  it.each([SPEED_BPM_MIN - 1, SPEED_BPM_MAX + 1, 120.5])('refuses a bpm of %s', (bpm) => {
    expect(createSpeedSchema.safeParse(body({ bpm })).success).toBe(false);
  });

  it('canonicalises an accepted video link, not the string sent', () => {
    const result = createSpeedSchema.parse(body({ videoUrl: 'https://youtu.be/dQw4w9WgXcQ?t=30' }));
    expect(result.videoUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s');
  });

  it('refuses a video link with VIDEO_RULE', () => {
    const result = createSpeedSchema.safeParse(body({ videoUrl: 'https://example.com/video' }));
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.message === VIDEO_RULE)).toBe(true);
  });

  it.each(['', '   ', undefined])('reads an empty video link (%s) as none', (videoUrl) => {
    const result = createSpeedSchema.parse(body({ videoUrl }));
    expect(result.videoUrl).toBeUndefined();
  });

  it('trims a note and reads an empty one as none', () => {
    expect(createSpeedSchema.parse(body({ note: '  nice and clean  ' })).note).toBe(
      'nice and clean'
    );
    expect(createSpeedSchema.parse(body({ note: '   ' })).note).toBeUndefined();
    expect(createSpeedSchema.parse(body({})).note).toBeUndefined();
  });

  it('refuses a note over 280 characters', () => {
    const result = createSpeedSchema.safeParse(body({ note: 'x'.repeat(281) }));
    expect(result.success).toBe(false);
  });

  it('accepts a note at exactly 280 characters', () => {
    expect(createSpeedSchema.safeParse(body({ note: 'x'.repeat(280) })).success).toBe(true);
  });

  it('leaves listed optional', () => {
    expect(createSpeedSchema.parse(body({})).listed).toBeUndefined();
    expect(createSpeedSchema.parse(body({ listed: true })).listed).toBe(true);
    expect(createSpeedSchema.parse(body({ listed: false })).listed).toBe(false);
  });
});

describe('yourSpeedsQuerySchema', () => {
  it('names exactly one target', () => {
    expect(yourSpeedsQuerySchema.parse({ breakId: BREAK_ID })).toEqual({ breakId: BREAK_ID });
    expect(yourSpeedsQuerySchema.parse({ libraryEntryId: ENTRY_ID })).toEqual({
      libraryEntryId: ENTRY_ID,
    });
  });

  it('refuses both targets and refuses neither', () => {
    const both = yourSpeedsQuerySchema.safeParse({ breakId: BREAK_ID, libraryEntryId: ENTRY_ID });
    expect(both.success).toBe(false);
    expect(both.error?.issues[0].path).toEqual(['breakId']);

    const neither = yourSpeedsQuerySchema.safeParse({});
    expect(neither.success).toBe(false);
  });
});

describe('speedTableQuerySchema', () => {
  it('defaults level, video and limit when the query is empty', () => {
    const result = speedTableQuerySchema.parse({});
    expect(result.level).toBe(DEFAULT_TABLE_LEVEL);
    expect(result.video).toBe(false);
    expect(result.limit).toBe(TABLE_PAGE_DEFAULT);
  });

  it.each(['1', 'true'])('reads video=%s as true', (video) => {
    expect(speedTableQuerySchema.parse({ video }).video).toBe(true);
  });

  it('refuses a video value the enum does not name', () => {
    // the enum only names '1' and 'true'; anything else is refused outright
    // rather than silently reading as false
    expect(speedTableQuerySchema.safeParse({ video: '0' }).success).toBe(false);
  });

  it.each([0, 6])('refuses a level of %s', (level) => {
    expect(speedTableQuerySchema.safeParse({ level: String(level) }).success).toBe(false);
  });

  it.each([1, 5])('accepts a level of %s', (level) => {
    expect(speedTableQuerySchema.parse({ level: String(level) }).level).toBe(level);
  });

  it(`refuses a limit over ${TABLE_PAGE_MAX}`, () => {
    expect(speedTableQuerySchema.safeParse({ limit: String(TABLE_PAGE_MAX + 1) }).success).toBe(
      false
    );
  });

  it(`accepts a limit of exactly ${TABLE_PAGE_MAX}`, () => {
    expect(speedTableQuerySchema.parse({ limit: String(TABLE_PAGE_MAX) }).limit).toBe(
      TABLE_PAGE_MAX
    );
  });

  it('refuses a limit below 1', () => {
    expect(speedTableQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
  });

  it('passes a cursor through untouched', () => {
    expect(speedTableQuerySchema.parse({ cursor: 'MTA' }).cursor).toBe('MTA');
  });
});
