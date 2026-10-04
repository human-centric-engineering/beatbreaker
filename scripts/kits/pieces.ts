/**
 * The pieces: every instrument the recipes build, as the `KitPiece` catalogue
 * holds them (Phase 9-v).
 *
 * Derived, not generated. Which slots a piece fills is in its recipe, and
 * each slot's layers and trim are in the manifest the build wrote, so the seed
 * reads both and nothing new is written to disk. Pure, so the seed and the
 * tests read the same answer.
 *
 * **A piece keeps its pack's folder.** The build writes each pack whole, and a
 * piece lent to several packs (Salamander's splash) is copied into each, byte
 * for byte, at the same trim. Its folder is the first pack in `RECIPES` that
 * has it. {@link derivePieces} throws if another copy differs, because then
 * they are not one piece, and a kit re-expressed as pieces would play a
 * different file from the one it played before.
 */

import { type KitSampleSlot, SLOT_BY_ID } from '@/lib/app/breaks/kit';
import type { Piece, Recipe, Role } from '@/scripts/kits/recipe';
import type { SourceId } from '@/scripts/kits/sources';

/** One pack as `public/kits/manifest.json` holds it. */
export interface ManifestPack {
  sampleRate?: number;
  slots: Record<string, KitSampleSlot>;
  perc?: Record<string, KitSampleSlot>;
}

export type Manifest = Record<string, ManifestPack>;

export interface DerivedPiece {
  key: string;
  label: string;
  role: Role;
  /** Which library it was recorded from: the first slot's source. */
  source: SourceId;
  /** The folder under `public/kits/` its files are in. */
  folder: string;
  /** Each slot it fills, as the manifest has it. */
  slots: Record<string, KitSampleSlot>;
}

/** A piece's key: its own, or its pack and first slot. */
export function pieceKey(pack: string, piece: Piece): string {
  return piece.key ?? `${pack}-${Object.keys(piece.slots)[0]}`;
}

/**
 * Every piece, in recipe order, each once.
 *
 * `packLabels` names each pack's kit (`bigrusty` → "Big Rusty"), for a piece
 * with no label of its own: "Big Rusty · Snare".
 */
export function derivePieces(
  recipes: readonly Recipe[],
  manifest: Manifest,
  packLabels: Record<string, string>
): DerivedPiece[] {
  const out: DerivedPiece[] = [];
  const byKey = new Map<string, DerivedPiece>();

  for (const recipe of recipes) {
    const pack = manifest[recipe.pack];
    if (!pack) throw new Error(`The manifest has no pack "${recipe.pack}"`);

    for (const piece of recipe.pieces) {
      const key = pieceKey(recipe.pack, piece);
      const slots: Record<string, KitSampleSlot> = {};
      // a slot the build found nothing for is not in the manifest, and not in the piece
      for (const slot of Object.keys(piece.slots)) {
        const spec = pack.slots[slot];
        if (spec) slots[slot] = spec;
      }
      if (!Object.keys(slots).length) continue;

      const seen = byKey.get(key);
      if (seen) {
        if (JSON.stringify(seen.slots) !== JSON.stringify(slots)) {
          throw new Error(
            `Piece "${key}" in ${recipe.pack} differs from its copy in ${seen.folder}: one key, two sounds`
          );
        }
        continue;
      }

      const first = Object.keys(piece.slots)[0];
      const derived: DerivedPiece = {
        key,
        label:
          piece.label ??
          `${packLabels[recipe.pack] ?? recipe.pack} · ${SLOT_BY_ID[first]?.label ?? first}`,
        role: piece.role,
        source: piece.slots[first].source,
        folder: recipe.pack,
        slots,
      };
      byKey.set(key, derived);
      out.push(derived);
    }
  }
  return out;
}

/**
 * Each pack's slots as pieces: slot → the key of the piece that fills it.
 *
 * What a recorded kit becomes in the seed. A slot resolves to the piece's
 * copy of it, and the copies are equal ({@link derivePieces}), so the kit
 * plays the file it played when it read its own pack.
 */
export function packPieceMap(recipe: Recipe, manifest: Manifest): Record<string, string> {
  const pack = manifest[recipe.pack];
  const map: Record<string, string> = {};
  for (const piece of recipe.pieces) {
    const key = pieceKey(recipe.pack, piece);
    for (const slot of Object.keys(piece.slots)) if (pack?.slots[slot]) map[slot] = key;
  }
  return map;
}
