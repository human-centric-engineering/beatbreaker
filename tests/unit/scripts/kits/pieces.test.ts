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
import { KIT_CREDITS } from '@/lib/app/breaks/kit-credits.generated';
import { COMBINATIONS, KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';
import type { Recipe } from '@/scripts/kits/recipe';
import {
  type Manifest,
  combinationCredit,
  combinationPieceMap,
  derivePieces,
  sourceCredit,
  packPieceMap,
  pieceKey,
} from '@/scripts/kits/pieces';
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

describe('combinationPieceMap', () => {
  it('fills every slot of each piece, a later piece taking a slot from an earlier one', () => {
    const map = combinationPieceMap(['crocell-c', 'salamander-china', 'bigrusty-k'], pieces);
    expect(map).toEqual({
      c: 'crocell-c',
      c2: 'crocell-c',
      cSplash: 'crocell-c',
      cChina: 'salamander-china',
      k: 'bigrusty-k',
    });
  });

  it('refuses a key no recipe builds', () => {
    expect(() => combinationPieceMap(['bigrusty-k', 'salamander-ride'], pieces)).toThrow(
      /No piece "salamander-ride"/
    );
  });

  it('refuses a piece whose every slot a later piece takes', () => {
    // a typo'd order: the china first, then a crash set that has a china of its own
    expect(() => combinationPieceMap(['salamander-china', 'crocell-c'], pieces)).toThrow(
      /salamander-china fill no slot/
    );
  });

  it('builds every shipped combination', () => {
    for (const [key, combo] of Object.entries(COMBINATIONS)) {
      expect(() => combinationPieceMap(combo.pieces, pieces), key).not.toThrow();
    }
  });
});

describe('combinationCredit', () => {
  it('credits each library once, in the order its pieces first appear, with its notice', () => {
    // gogodze-r is Big Rusty's ride on Gogodze's mic: its source is Big Rusty
    const credit = combinationCredit(
      ['gogodze-k', 'drs-s', 'gogodze-r', 'gogodze-h'],
      pieces,
      KIT_CREDITS
    );
    expect(credit).toBe(
      'Gogodze Phu Vol II by Karoryfer Lecolds · CC0 1.0. ' +
        'DRSKit by Lars and Deva Muldjord, DrumGizmo, on a kit lent by DRSDrums · CC BY 4.0. Drum samples provided by DrumGizmo.org. ' +
        'Big Rusty Drums by Karoryfer Samples · CC0 1.0. ' +
        'Mixed to mono, trimmed and re-encoded for the web.'
    );
  });

  it('refuses a key no recipe builds, rather than leaving its library out', () => {
    expect(() => combinationCredit(['bigrusty-k', 'drs-snare'], pieces, KIT_CREDITS)).toThrow(
      /No piece "drs-snare"/
    );
  });

  it('credits a library with the line its pieces carry', () => {
    const drs = KIT_CREDITS.find((c) => c.id === 'drskit');
    expect(drs && combinationCredit(['drs-k'], pieces, KIT_CREDITS)).toContain(sourceCredit(drs!));
  });

  it('refuses a source with no credit, rather than shipping a kit without one', () => {
    expect(() => combinationCredit(['bigrusty-k'], pieces, [])).toThrow(
      /No credit for source "bigrusty"/
    );
  });
});
