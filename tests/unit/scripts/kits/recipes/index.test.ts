/**
 * The recipes (`scripts/kits/recipes/`) against what consumes them. A recipe
 * is only read by the build, which CI never runs, so a pack with no kit row,
 * a slot the sampler has never heard of, or a pick naming a source that is
 * not pinned would otherwise surface only on a developer's machine — or as a
 * lane that quietly falls back to the synthesised voice.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SLOT_BY_ID } from '@/lib/app/breaks/kit';
import { KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';
import { type Pick, ROLE_TAIL_CAP, ROLE_TARGET_DB } from '@/scripts/kits/recipe';
import { PIECE_LIBRARIES, RECIPES } from '@/scripts/kits/recipes';
import { pinOf, SOURCES } from '@/scripts/kits/sources';

const manifest = JSON.parse(
  readFileSync(join(process.cwd(), 'public/kits/manifest.json'), 'utf8')
) as Record<string, { slots: Record<string, unknown> }>;

/** Every pick a recipe makes, with where it is. */
const picks: Array<{ at: string; pick: Pick }> = RECIPES.flatMap((r) => [
  ...r.pieces.flatMap((piece, i) => [
    ...Object.entries(piece.slots).map(([slot, pick]) => ({ at: `${r.pack}/${slot}`, pick })),
    ...(piece.matchOn ? [{ at: `${r.pack}/piece ${i} matchOn`, pick: piece.matchOn }] : []),
  ]),
  ...Object.entries(r.perc ?? {}).flatMap(([inst, p]) => [
    { at: `${r.pack}/perc ${inst} stroke`, pick: p.stroke },
    { at: `${r.pack}/perc ${inst} accent`, pick: p.accent },
  ]),
]);

const pieceLibrary = (pack: string): boolean => PIECE_LIBRARIES.has(pack);

describe('the recipes', () => {
  it('build thirteen kits, six snares and a china and splash, each pack named once', () => {
    const packs = RECIPES.map((r) => r.pack);
    expect(new Set(packs).size).toBe(packs.length);
    expect(packs.filter((p) => !pieceLibrary(p))).toHaveLength(13);
    expect(packs.filter((p) => p.startsWith('frankensnare-'))).toHaveLength(6);
    expect([...PIECE_LIBRARIES].sort()).toEqual(
      [...packs.filter((p) => p.startsWith('frankensnare-')), 'crocell-right'].sort()
    );
  });

  it('each build a pack the manifest has, and a kit row plays every one but the piece libraries', () => {
    const rowPacks = Object.values(KITS).flatMap((k) =>
      k.engine === 'pack' && k.pack ? [k.pack] : []
    );
    for (const { pack, pieces } of RECIPES) {
      // the piece libraries are for building a kit: no row plays them whole
      if (!pieceLibrary(pack)) expect(rowPacks, pack).toContain(pack);
      // every slot a recipe makes is in the manifest the seed reads
      const made = pieces.flatMap((p) => Object.keys(p.slots)).sort();
      expect(Object.keys(manifest[pack]?.slots ?? {}).sort(), pack).toEqual(made);
    }
    // and no kit row plays a pack nothing builds
    expect([...new Set(rowPacks)].sort()).toEqual(
      RECIPES.map((r) => r.pack)
        .filter((p) => !pieceLibrary(p))
        .sort()
    );
  });

  it('fill only slots the sampler knows, each once per pack', () => {
    for (const { pack, pieces } of RECIPES) {
      const slots = pieces.flatMap((p) => Object.keys(p.slots));
      expect(new Set(slots).size, pack).toBe(slots.length);
      for (const slot of slots) expect(SLOT_BY_ID[slot], `${pack}/${slot}`).toBeDefined();
    }
  });

  it.each(picks)('$at names a pinned source and a shape the build can choose from', ({ pick }) => {
    const source = SOURCES[pick.source];
    expect(source).toBeDefined();
    expect(pick.layers).toBeGreaterThanOrEqual(1);
    expect(pick.rr).toBeGreaterThanOrEqual(1);
    expect(Object.keys(pick.mics).length).toBeGreaterThanOrEqual(1);
    if (pick.range) expect(pick.range[0]).toBeLessThan(pick.range[1]);
    // a pick mixes either several files or one file's channels, never both
    if (pick.channels) {
      expect(source.kind).toBe('zip');
      expect(pick.mics).toEqual({ '': 1 });
    }
    // several mics need a {mic} in the path to swap
    if (Object.keys(pick.mics).length > 1) expect(pick.pattern).toContain('{mic}');
  });

  it('give every piece a role with a level and a tail cap', () => {
    for (const { pack, pieces } of RECIPES) {
      for (const { role, level } of pieces) {
        expect(ROLE_TARGET_DB[role], `${pack} ${role}`).toBeLessThanOrEqual(0);
        expect(ROLE_TAIL_CAP[role], `${pack} ${role}`).toBeGreaterThan(0);
        // a nudge against the role, not a role of its own
        if (level !== undefined) expect(Math.abs(level), `${pack} ${role}`).toBeLessThanOrEqual(6);
      }
    }
  });

  it('give the round-one kits and CrocellKit a recording of every 9-iv articulation their sources allow', () => {
    const made = (pack: string): string[] =>
      (RECIPES.find((r) => r.pack === pack)?.pieces ?? []).flatMap((p) => Object.keys(p.slots));
    const ARTICULATIONS = ['sRim', 'hHalf', 'c2', 'cChina', 'cSplash'];
    // DRSKit and Gogodze have no rimshot, and nothing else's is their snare
    const want: Record<string, string[]> = {
      bigrusty: ARTICULATIONS,
      unruly: ARTICULATIONS,
      gogodze: ARTICULATIONS.filter((s) => s !== 'sRim'),
      drs: ARTICULATIONS.filter((s) => s !== 'sRim'),
      'drs-brush': ARTICULATIONS.filter((s) => s !== 'sRim'),
      // every one from its own recording, Salamander's lending none
      crocell: ARTICULATIONS,
    };
    for (const [pack, slots] of Object.entries(want)) {
      expect(
        made(pack)
          .filter((s) => SLOT_BY_ID[s]?.late)
          .sort(),
        pack
      ).toEqual([...slots].sort());
    }
  });
});

describe('pinOf()', () => {
  it('names a git source by its commit and an archive by its sha256', () => {
    expect(pinOf(SOURCES.unruly)).toBe(
      'sfzinstruments/karoryfer.unruly-drums@9bf75c2a1392f190cd1c264645653629f0b3a097'
    );
    expect(pinOf(SOURCES.drskit)).toBe(
      'https://drumgizmo.org/kits/DRSKit/DRSKit2_1.zip (sha256 529f2dcad836593167d0cab218f125f591cd71199748fa681e05e3866667f090)'
    );
    expect(pinOf(SOURCES.salamander)).toBe(
      'https://archive.org/download/SalamanderDrumkit/salamanderDrumkit.tar.bz2 (sha256 34e746ec1721bb530b1caf5b17443ae3cde45a2cce1a80e2637e4c11d6f1e3f5)'
    );
  });
});
