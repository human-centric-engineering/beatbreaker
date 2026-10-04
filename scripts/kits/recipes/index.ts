/**
 * Every recorded pack, in the order the manifest lists them.
 */

import type { Recipe } from '@/scripts/kits/recipe';
import { trap, vintage } from '@/scripts/kits/recipes/boochi';
import { brush } from '@/scripts/kits/recipes/brush';
import { muldjord } from '@/scripts/kits/recipes/muldjord';
import { virtuosity } from '@/scripts/kits/recipes/virtuosity';

export const RECIPES: Recipe[] = [muldjord, vintage, trap, virtuosity, brush];
