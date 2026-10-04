/**
 * Salamander Drumkit's cymbals, for the kits whose own source has no china,
 * no splash or no second crash. Not a pack of its own: each piece is lent to
 * a recipe, as Big Rusty lends Gogodze its cymbals.
 *
 * Every sample was recorded on the overheads alone and normalised one by one,
 * so loudness says nothing about which were played harder, and nothing about
 * how loud a cymbal is against another. The hard strokes are chosen by name
 * (`FF`, `F`), and each piece's `level` sets where it sits against the crash.
 * The source's own program turns its china up and its splash down against its
 * crash; these follow it by less.
 */

import type { Piece, Pick } from '@/scripts/kits/recipe';

const sal = (stroke: string, rr: number, tail?: number): Pick => ({
  source: 'salamander',
  pattern: `OH/${stroke}_*.wav`,
  mics: { '': 1 },
  layers: 1,
  rr,
  ...(tail ? { tail } : {}),
});

/** Paiste 8" splash, its harder strokes. */
export const salamanderSplash: Piece = {
  role: 'crash',
  level: -4,
  slots: { cSplash: sal('splash1_OH_F', 2, 2.5) },
};

/** Paiste 18" Innovations china. */
export const salamanderChina: Piece = {
  role: 'crash',
  level: 1,
  slots: { cChina: sal('china2_OH_FF', 2) },
};

/** Paiste 20" Rude thin crash: bigger and darker than a kit's own 16" or 17". */
export const salamanderCrash: Piece = {
  role: 'crash',
  slots: { c2: sal('crash2_OH_FF', 2) },
};
