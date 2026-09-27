/**
 * Who can open a saved pattern (Phase 6, task 6.1): reading a stored value
 * safely, the "shared with anyone" filter, the slug shape a URL must meet,
 * and the public path it resolves to.
 *
 * @see lib/app/breaks/community/visibility.ts
 */

import { describe, expect, it } from 'vitest';

import {
  OPENABLE,
  openableBy,
  publicPath,
  readVisibility,
  slugSchema,
} from '@/lib/app/breaks/community/visibility';

describe('readVisibility', () => {
  it.each(['private', 'link', 'published'] as const)('reads %s as itself', (v) => {
    expect(readVisibility(v)).toBe(v);
  });

  it.each([undefined, null, '', 'shared', 42, {}])(
    'treats an unrecognised value (%p) as the safe answer, private',
    (value) => {
      expect(readVisibility(value)).toBe('private');
    }
  );
});

describe('openableBy', () => {
  it('is yours, or anything not private, and nothing else', () => {
    expect(openableBy('user-1')).toEqual({
      OR: [{ userId: 'user-1' }, OPENABLE],
    });
  });

  it('names the visibilities "not private" means, exactly', () => {
    expect(OPENABLE).toEqual({ visibility: { in: ['link', 'published'] } });
  });
});

describe('slugSchema', () => {
  it('accepts lower-case letters and digits, 6 to 16 characters', () => {
    expect(slugSchema.safeParse('abcdefghjk').success).toBe(true);
    expect(slugSchema.safeParse('abc123').success).toBe(true);
    expect(slugSchema.safeParse('a'.repeat(16)).success).toBe(true);
  });

  it('refuses fewer than 6 or more than 16 characters', () => {
    expect(slugSchema.safeParse('abcde').success).toBe(false);
    expect(slugSchema.safeParse('a'.repeat(17)).success).toBe(false);
  });

  it('refuses upper-case letters and characters outside the shape', () => {
    expect(slugSchema.safeParse('ABCDEF').success).toBe(false);
    expect(slugSchema.safeParse('abc-def').success).toBe(false);
    expect(slugSchema.safeParse('abc def').success).toBe(false);
  });
});

describe('publicPath', () => {
  it('builds the /p/<slug> path', () => {
    expect(publicPath('abcdefghjk')).toBe('/p/abcdefghjk');
  });
});
