/**
 * The pieces (`scripts/kits/pieces.ts`), against the shipped manifest and lock.
 *
 * The test that matters is the last: every recorded kit, re-expressed as a
 * map of pieces the way the seed writes it, plays the same recording at the
 * same trim for every slot it had. A piece lent to several packs resolves to
 * its first pack's copy, so where the folder differs the file must be the
 * same bytes — the lock's sha256 says so.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveKitSamples } from '@/lib/app/breaks/catalogue/pieces';
import { type KitSampleSlot, slotLayers, slotTrim } from '@/lib/app/breaks/kit';
import { KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';
import type { Recipe } from '@/scripts/kits/recipe';
import { type Manifest, derivePieces, packPieceMap, pieceKey } from '@/scripts/kits/pieces';
import { RECIPES } from '@/scripts/kits/recipes';

const manifest = JSON.parse(
  readFileSync(join(process.cwd(), 'public/kits/manifest.json'), 'utf8')
) as Manifest;

const lock = JSON.parse(
  readFileSync(join(process.cwd(), 'scripts/kits/build-lock.generated.json'), 'utf8')
) as { packs: Record<string, { files: Record<string, { sha256: string }> }> };

const packLabels = Object.fromEntries(
  Object.values(KITS).flatMap((k) => (k.pack ? [[k.pack, k.label]] : []))
);

const pieces = derivePieces(RECIPES, manifest, packLabels);
const byKey = new Map(pieces.map((p) => [p.key, { ...p, credit: undefined }] as const));

const layered = (v: number, files: string[]): KitSampleSlot => ({
  layers: [{ v, files }],
  trim: 1,
});

describe('derivePieces', () => {
  it('names each piece once, with a key a kit slot can hold', () => {
    const keys = pieces.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z0-9][a-zA-Z0-9-]*$/);
  });

  it('keeps a piece lent to several packs as one, in the first pack that has it', () => {
    const splash = pieces.filter((p) => p.key === 'salamander-splash');
    expect(splash).toHaveLength(1);
    expect(splash[0].folder).toBe('bigrusty');
    expect(splash[0].source).toBe('salamander');
    expect(splash[0].label).toBe('Salamander splash, Paiste 8"');
  });

  it('names a piece by its kit and first slot where it has no label of its own', () => {
    expect(byKey.get('bigrusty-s')?.label).toBe('Big Rusty · Snare');
    expect(byKey.get('drs-brush-sCross')?.label).toBe('DRS brushes · Cross-stick');
    expect(byKey.get('gogodze-r')?.label).toBe('Big Rusty ride, close mic');
  });

  it('refuses two different sounds under one key', () => {
    const shared = {
      role: 'snare' as const,
      key: 'one',
      slots: { s: RECIPES[0].pieces[1].slots.s },
    };
    const recipes: Recipe[] = [
      { pack: 'a', pieces: [shared] },
      { pack: 'b', pieces: [shared] },
    ];
    const differ: Manifest = {
      a: { slots: { s: layered(1, ['s-0-0.m4a']) } },
      b: { slots: { s: layered(1, ['s-0-1.m4a']) } },
    };
    expect(() => derivePieces(recipes, differ, {})).toThrow(/one key, two sounds/);

    const same: Manifest = {
      a: { slots: { s: layered(1, ['s-0-0.m4a']) } },
      b: { slots: { s: layered(1, ['s-0-0.m4a']) } },
    };
    expect(derivePieces(recipes, same, {})).toHaveLength(1);
  });

  it('leaves out a slot the build found nothing for, and a piece with none', () => {
    const recipes: Recipe[] = [
      {
        pack: 'a',
        pieces: [
          {
            role: 'snare',
            slots: { s: RECIPES[0].pieces[1].slots.s, sGhost: RECIPES[0].pieces[1].slots.s },
          },
          { role: 'tom', slots: { t1: RECIPES[0].pieces[1].slots.s } },
        ],
      },
    ];
    const got = derivePieces(recipes, { a: { slots: { s: layered(1, ['s.m4a']) } } }, {});
    expect(got.map((p) => [p.key, Object.keys(p.slots)])).toEqual([['a-s', ['s']]]);
  });
});

describe('every recorded kit as pieces', () => {
  it.each(RECIPES.map((r) => [r.pack, r] as const))(
    '%s plays the same recording at the same trim in every slot',
    (pack, recipe) => {
      const own = manifest[pack].slots;
      const map = packPieceMap(recipe, manifest);
      expect(Object.keys(map).sort()).toEqual(Object.keys(own).sort());

      const { samples, missing } = resolveKitSamples(
        { slots: Object.fromEntries(Object.entries(map).map(([s, piece]) => [s, { piece }])) },
        byKey
      );
      expect(missing).toEqual([]);

      for (const [slot, before] of Object.entries(own)) {
        const after = samples.slots?.[slot];
        expect(after, slot).toBeDefined();
        if (!after) continue;
        expect(slotLayers(after), slot).toEqual(slotLayers(before));
        expect(slotTrim(after), slot).toBe(slotTrim(before));

        // another pack's copy of a lent piece: the same bytes, file by file
        const folder = after.folder ?? pack;
        if (folder !== pack) {
          for (const file of slotLayers(after).flatMap((l) => l.files)) {
            expect(lock.packs[folder].files[file].sha256, `${slot}/${file}`).toBe(
              lock.packs[pack].files[file].sha256
            );
          }
        }
      }
    }
  );

  it('maps each slot to the piece its own recipe fills it with', () => {
    const bigrusty = RECIPES.find((r) => r.pack === 'bigrusty');
    expect(bigrusty).toBeDefined();
    if (!bigrusty) return;
    const map = packPieceMap(bigrusty, manifest);
    expect(map.s).toBe('bigrusty-s');
    expect(map.sRim).toBe('bigrusty-s');
    expect(map.cChina).toBe('bigrusty-c');
    expect(map.cSplash).toBe('salamander-splash');
    expect(pieceKey('bigrusty', bigrusty.pieces[0])).toBe('bigrusty-k');
  });
});
