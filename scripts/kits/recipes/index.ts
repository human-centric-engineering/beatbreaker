/**
 * Every recorded pack, in the order the manifest lists them.
 */

import type { Recipe } from '@/scripts/kits/recipe';
import { bigrusty } from '@/scripts/kits/recipes/bigrusty';
import { trap, vintage } from '@/scripts/kits/recipes/boochi';
import { brush } from '@/scripts/kits/recipes/brush';
import { crocell, crocellRight } from '@/scripts/kits/recipes/crocell';
import { drsBrushes, drsSticks } from '@/scripts/kits/recipes/drs';
import { frankensnare } from '@/scripts/kits/recipes/frankensnare';
import { gogodze } from '@/scripts/kits/recipes/gogodze';
import { muldjord } from '@/scripts/kits/recipes/muldjord';
import { osdk } from '@/scripts/kits/recipes/osdk';
import { smdrums } from '@/scripts/kits/recipes/smdrums';
import { unruly } from '@/scripts/kits/recipes/unruly';
import { virtuosity } from '@/scripts/kits/recipes/virtuosity';

/**
 * The piece libraries: packs no kit row plays whole, whose pieces are for
 * building your own kit and the combinations. Frankensnare's snares, and
 * CrocellKit's right-hand china and splash.
 */
const PIECE_LIBRARY_RECIPES: Recipe[] = [...frankensnare, crocellRight];

export const PIECE_LIBRARIES: ReadonlySet<string> = new Set(
  PIECE_LIBRARY_RECIPES.map((r) => r.pack)
);

export const RECIPES: Recipe[] = [
  muldjord,
  vintage,
  trap,
  virtuosity,
  brush,
  bigrusty,
  drsSticks,
  drsBrushes,
  unruly,
  gogodze,
  smdrums,
  osdk,
  crocell,
  // pieces only: no kit row names these packs
  ...PIECE_LIBRARY_RECIPES,
];
