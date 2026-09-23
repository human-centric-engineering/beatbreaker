/**
 * The shipped sample packs.
 *
 * These are 106 binary files under `public/`, referenced by name from a
 * manifest. Nothing type-checks that relationship, and the failure mode is
 * quiet: a renamed or dropped file makes one lane of one kit silently fall
 * through to the synthesised voice, which sounds like a kit that is simply not
 * very good rather than like a bug.
 *
 * The kit table moved out of `lib/app/breaks/kit.ts` and into the seed data in
 * Phase 2, and the manifest moved with it: `001-catalogue` reads
 * `public/kits/manifest.json` and writes it to each pack kit's `samples`
 * column, and `packs.ts` no longer fetches it at run time. That makes this
 * cross-check more worth having, not less — the manifest is now read once, at
 * seed time, so a file that is named but not shipped is baked into a row.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';

const ROOT = join(process.cwd(), 'public/kits');

interface Entry {
  sampleRate: number;
  slots: Record<string, { v: number[] | null; files: string[] }>;
  perc?: Record<string, { v: number[] | null; files: string[] }>;
}

const manifest: Record<string, Entry> = JSON.parse(
  readFileSync(join(ROOT, 'manifest.json'), 'utf8')
) as Record<string, Entry>;

describe('shipped sample packs', () => {
  it('has a pack for every kit that names one', () => {
    const wanted = Object.values(KITS)
      .filter((k) => k.engine === 'pack')
      .map((k) => k.pack);
    expect(wanted.length).toBeGreaterThan(0);
    for (const pack of wanted) expect(Object.keys(manifest)).toContain(pack);
  });

  it('ships every file the manifest names, and none that it does not', () => {
    for (const [pack, entry] of Object.entries(manifest)) {
      const named = new Set<string>();
      for (const group of [entry.slots, entry.perc ?? {}]) {
        for (const spec of Object.values(group)) for (const f of spec.files) named.add(f);
      }

      const onDisk = new Set(readdirSync(join(ROOT, pack)));
      const missing = [...named].filter((f) => !onDisk.has(f));
      const orphan = [...onDisk].filter((f) => !named.has(f));

      expect(missing, `${pack}: named in the manifest but not shipped`).toEqual([]);
      expect(orphan, `${pack}: shipped but named by nothing`).toEqual([]);
    }
  });

  it('ships files with audio in them', () => {
    for (const [pack, entry] of Object.entries(manifest)) {
      for (const [slot, spec] of Object.entries(entry.slots)) {
        for (const file of spec.files) {
          const path = join(ROOT, pack, file);
          expect(existsSync(path)).toBe(true);
          // an empty or truncated mp3 decodes to silence, which is a lane that
          // simply never sounds — worse than an error, because nothing says so
          expect(statSync(path).size, `${pack}/${slot} ${file}`).toBeGreaterThan(512);
        }
      }
    }
  });

  it('gives every velocity-layered slot one velocity per file', () => {
    for (const [pack, entry] of Object.entries(manifest)) {
      for (const [slot, spec] of Object.entries(entry.slots)) {
        if (!spec.v) continue;
        expect(spec.v.length, `${pack}/${slot}`).toBe(spec.files.length);
        // layers are picked by "the first one at or above this velocity", which
        // needs them in order
        const sorted = [...spec.v].sort((a, b) => a - b);
        expect(spec.v, `${pack}/${slot} velocities out of order`).toEqual(sorted);
        expect(spec.v[spec.v.length - 1], `${pack}/${slot} never reaches full velocity`).toBe(1);
      }
    }
  });

  it('carries the recorded percussion the styles reach for', () => {
    // percussion is shared across kits, and loads from whichever pack ships it
    const withPerc = Object.entries(manifest).filter(([, e]) => e.perc);
    expect(withPerc.length).toBe(1);
    const [, entry] = withPerc[0];
    expect(Object.keys(entry.perc ?? {}).length).toBeGreaterThanOrEqual(9);
  });
});
