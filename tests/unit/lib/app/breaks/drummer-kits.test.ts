/**
 * A famous drummer plays a sampled kit: a recording of real drums, never one
 * of the synthesised kits — unless the drummer played electronic drums on
 * that record, which is the only thing the list below may hold.
 */

import { describe, expect, it } from 'vitest';

import { COMBINATIONS, KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';

/** Every system kit by key: a combination (9-vi-c) is a sampled kit too. */
const ALL_KITS = { ...KITS, ...COMBINATIONS };

/** `style/song` → why a synthesised kit is the drummer's own sound there. */
const ELECTRONIC: Record<string, string> = {};

describe('the drummers’ kits', () => {
  it('are all sampled, the style’s and every song’s', () => {
    const synthesised: string[] = [];
    for (const [key, st] of Object.entries(STYLES)) {
      if (!st.drummer) continue;
      const kits = [
        [key, st.kit],
        ...(st.songs ?? []).map((s) => [`${key}/${s.key}`, s.params.kit ?? st.kit]),
      ];
      for (const [where, kit] of kits) {
        expect(kit, `${where} names no kit`).toBeDefined();
        if (ALL_KITS[kit!]?.engine !== 'pack' && !ELECTRONIC[where!])
          synthesised.push(`${where}: ${kit}`);
      }
    }
    expect(synthesised).toEqual([]);
  });

  it('names a kit the seed writes, for every style and every song', () => {
    // a style naming a kit no row has would play whatever kit was last chosen
    const missing: string[] = [];
    for (const [key, st] of Object.entries(STYLES)) {
      const kits = [
        [key, st.kit],
        ...(st.songs ?? []).map((s) => [`${key}/${s.key}`, s.params.kit]),
      ];
      for (const [where, kit] of kits) if (kit && !ALL_KITS[kit]) missing.push(`${where}: ${kit}`);
    }
    expect(missing).toEqual([]);
  });
});
