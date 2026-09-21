/**
 * Request schemas for /api/v1/breaks. The one that matters: a partial update
 * must not fill in fields the request left out (H1 — a rename used to unshare).
 */

import { describe, expect, it } from 'vitest';

import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { encodeBreak } from '@/lib/app/breaks/share';
import { createBreakSchema, listBreaksSchema, updateBreakSchema } from '@/lib/validations/breaks';

const A = generatePattern({
  style: 'funk',
  meter: '4/4',
  seed: 1,
  bars: 2,
  density: 50,
  ghosts: 50,
});
const doc: unknown = JSON.parse(
  atob(encodeBreak({ bpm: 94, swing: 0, level: 5, arrangement: ['A'], A, B: deriveB(A) }))
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

  it('accepts only styles and meters that exist', () => {
    expect(listBreaksSchema.safeParse({ style: 'funk', meter: '7/8' }).success).toBe(true);
    expect(listBreaksSchema.safeParse({ style: 'polka' }).success).toBe(false);
    expect(listBreaksSchema.safeParse({ meter: '5/3' }).success).toBe(false);
  });
});
