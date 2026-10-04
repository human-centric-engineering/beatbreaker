/**
 * Every recorded pack, in the order the manifest lists them.
 */

import type { Recipe } from '@/scripts/kits/recipe';
import { bigrusty } from '@/scripts/kits/recipes/bigrusty';
import { trap, vintage } from '@/scripts/kits/recipes/boochi';
import { brush } from '@/scripts/kits/recipes/brush';
import { drsBrushes, drsSticks } from '@/scripts/kits/recipes/drs';
import { gogodze } from '@/scripts/kits/recipes/gogodze';
import { muldjord } from '@/scripts/kits/recipes/muldjord';
import { unruly } from '@/scripts/kits/recipes/unruly';
import { virtuosity } from '@/scripts/kits/recipes/virtuosity';

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
];
