/**
 * `publicListQuerySchema` and `readPublicListQuery` — the one filter schema
 * the community library API and `/explore` both run search params through.
 * Filters are filters, not claims: an unparseable field should fall back to
 * "no filter", never a 500 for a hand-edited URL.
 *
 * @see lib/validations/public-patterns.ts
 */

import { describe, expect, it } from 'vitest';

import { PUBLIC_PAGE_DEFAULT, PUBLIC_PAGE_MAX } from '@/lib/app/breaks/community/public';
import { METER_KEYS } from '@/lib/app/breaks/meter';
import {
  nonEmptyParams,
  publicListQuerySchema,
  readPublicListQuery,
} from '@/lib/validations/public-patterns';

describe('publicListQuerySchema', () => {
  it('defaults sort to newest and limit to the page default', () => {
    const parsed = publicListQuerySchema.parse({});
    expect(parsed.sort).toBe('newest');
    expect(parsed.limit).toBe(PUBLIC_PAGE_DEFAULT);
  });

  it('refuses a limit over the page max', () => {
    expect(publicListQuerySchema.safeParse({ limit: PUBLIC_PAGE_MAX + 1 }).success).toBe(false);
  });

  it('accepts a limit at the page max', () => {
    expect(publicListQuerySchema.safeParse({ limit: PUBLIC_PAGE_MAX }).success).toBe(true);
  });

  it('coerces a difficulty query string to a number', () => {
    const parsed = publicListQuerySchema.parse({ difficulty: '2' });
    expect(parsed.difficulty).toBe(2);
  });

  it.each(['0', '4', '1.5'])('refuses a difficulty outside 1-3 (%s)', (value) => {
    expect(publicListQuerySchema.safeParse({ difficulty: value }).success).toBe(false);
  });

  it('refuses an unknown meter', () => {
    expect(publicListQuerySchema.safeParse({ meter: 'bogus' }).success).toBe(false);
  });

  it('accepts every real meter key', () => {
    for (const meter of METER_KEYS) {
      expect(publicListQuerySchema.safeParse({ meter }).success).toBe(true);
    }
  });

  it('refuses an unknown tempo band', () => {
    expect(publicListQuerySchema.safeParse({ tempo: 'blazing' }).success).toBe(false);
  });

  it('accepts the real tempo bands', () => {
    for (const tempo of ['slow', 'medium', 'fast']) {
      expect(publicListQuerySchema.safeParse({ tempo }).success).toBe(true);
    }
  });
});

describe('nonEmptyParams', () => {
  it('drops empty values and keeps the first of repeated ones, from a record or URLSearchParams', () => {
    expect(
      nonEmptyParams({ style: 'funk', meter: '', tempo: undefined, sort: ['saved', 'newest'] })
    ).toEqual({
      style: 'funk',
      sort: 'saved',
    });
    expect(nonEmptyParams(new URLSearchParams('style=funk&meter=&sort=saved&sort=newest'))).toEqual(
      {
        style: 'funk',
        sort: 'saved',
      }
    );
  });
});

describe('readPublicListQuery', () => {
  it('treats an empty string as no filter, not a literal empty style', () => {
    const parsed = readPublicListQuery({ style: '' });
    expect(parsed.style).toBeUndefined();
  });

  it('takes the first element when a param arrives as an array', () => {
    const parsed = readPublicListQuery({ style: ['funk', 'boombap'] });
    expect(parsed.style).toBe('funk');
  });

  it('drops a field that fails to parse while keeping the rest', () => {
    const parsed = readPublicListQuery({ meter: 'bogus', style: 'funk' });
    expect(parsed.style).toBe('funk');
    expect(parsed.meter).toBeUndefined();
  });

  it('falls back to the defaults entirely when every field is bad', () => {
    const parsed = readPublicListQuery({ meter: 'bogus', tempo: 'blazing', limit: '9999' });
    expect(parsed).toEqual(publicListQuerySchema.parse({}));
  });

  it('reads a fully valid query straight through', () => {
    const parsed = readPublicListQuery({ style: 'funk', sort: 'saved', limit: '10' });
    expect(parsed).toMatchObject({ style: 'funk', sort: 'saved', limit: 10 });
  });
});
