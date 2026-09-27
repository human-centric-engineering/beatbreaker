/**
 * Minting a pattern's public address (task 6.1): the alphabet, the length,
 * and that it actually varies.
 *
 * @see lib/app/breaks/community/slug.ts
 */

import { describe, expect, it } from 'vitest';

import { SLUG_LENGTH, mintSlug } from '@/lib/app/breaks/community/slug';

describe('mintSlug', () => {
  it('is SLUG_LENGTH characters long', () => {
    expect(mintSlug()).toHaveLength(SLUG_LENGTH);
    expect(SLUG_LENGTH).toBe(10);
  });

  it('uses only Crockford base32, lower-case, and never i, l, o or u', () => {
    // run it enough times that a rare character has a real chance to show up
    const slugs = Array.from({ length: 200 }, () => mintSlug());
    const seen = new Set(slugs.join(''));
    for (const ch of seen) {
      expect(ch).toMatch(/^[0-9a-z]$/);
      expect(['i', 'l', 'o', 'u']).not.toContain(ch);
    }
  });

  it('does not mint the same address twice in a row, for all practical purposes', () => {
    const a = mintSlug();
    const b = mintSlug();
    expect(a).not.toBe(b);
  });
});
