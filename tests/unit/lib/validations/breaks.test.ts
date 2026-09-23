/**
 * Request schemas for /api/v1/breaks. The one that matters: a partial update
 * must not fill in fields the request left out (H1 — a rename used to unshare).
 */

import { describe, expect, it } from 'vitest';

import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { encodeBreak } from '@/lib/app/breaks/share';
import { createBreakSchema, listBreaksSchema, updateBreakSchema } from '@/lib/validations/breaks';
import { testStyle } from '@/tests/helpers/catalogue';

const funk = testStyle('funk');
const A = generatePattern({
  style: funk,
  meter: '4/4',
  seed: 1,
  bars: 2,
  density: 50,
  ghosts: 50,
});
const doc: unknown = JSON.parse(
  atob(
    encodeBreak({ bpm: 94, swing: 0, level: 5, arrangement: ['A'], A, B: deriveB(A, funk.params) })
  )
);

describe('createBreakSchema', () => {
  it('defaults shared to false and trims the title', () => {
    expect(createBreakSchema.parse({ title: '  Funky  ', doc })).toMatchObject({
      title: 'Funky',
      shared: false,
    });
  });

  it('refuses a blank title and a missing document', () => {
    expect(createBreakSchema.safeParse({ title: '   ', doc }).success).toBe(false);
    expect(createBreakSchema.safeParse({ title: 'x' }).success).toBe(false);
  });
});

describe('updateBreakSchema', () => {
  it('fills in nothing the request left out', () => {
    expect(updateBreakSchema.parse({ title: 'Renamed' })).toEqual({ title: 'Renamed' });
    expect(updateBreakSchema.parse({})).toEqual({});
    expect(Object.keys(updateBreakSchema.parse({ doc }))).toEqual(['doc']);
  });

  it('still validates what is present', () => {
    expect(updateBreakSchema.safeParse({ shared: 'yes' }).success).toBe(false);
    expect(updateBreakSchema.safeParse({ title: '' }).success).toBe(false);
    expect(updateBreakSchema.safeParse({ doc: { ver: 3 } }).success).toBe(false);
  });
});

describe('listBreaksSchema', () => {
  it('coerces the limit and caps it', () => {
    expect(listBreaksSchema.parse({ limit: '20' }).limit).toBe(20);
    expect(listBreaksSchema.parse({}).limit).toBe(50);
    expect(listBreaksSchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it('takes any style key that fits the column, and only meters that exist', () => {
    expect(listBreaksSchema.safeParse({ style: 'funk', meter: '7/8' }).success).toBe(true);

    /* `polka` is not a style, and this schema no longer says so. The check moved
       out because styles are catalogue rows from Phase 2: a key list is a
       database query, and this schema is synchronous and runs in the browser.
       More to the point, filtering by a style this installation does not have
       is an empty page rather than a bad request — the honest answer. What a
       key is still held to is the width of the column it is compared against,
       `Break.style VARCHAR(40)`, which is the assertion below. */
    expect(listBreaksSchema.safeParse({ style: 'polka' }).success).toBe(true);
    expect(listBreaksSchema.safeParse({ style: 'x'.repeat(40) }).success).toBe(true);
    expect(listBreaksSchema.safeParse({ style: 'x'.repeat(41) }).success).toBe(false);

    expect(listBreaksSchema.safeParse({ meter: '5/3' }).success).toBe(false);
  });
});
