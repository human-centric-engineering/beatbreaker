/**
 * A famous drummer plays a sampled kit: a recording of real drums, never one
 * of the synthesised kits — unless the drummer played electronic drums on
 * that record, which is the only thing the list below may hold.
 */

import { describe, expect, it } from 'vitest';

import { KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';

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
        if (KITS[kit!]?.engine !== 'pack' && !ELECTRONIC[where!])
          synthesised.push(`${where}: ${kit}`);
      }
    }
    expect(synthesised).toEqual([]);
  });
});
