import { buildDrummer, type DrummerModel } from '@/components/app/studio/drummer/drummer-model';
import {
  disposeMaterials,
  makeMaterials,
  woodMaterial,
} from '@/components/app/studio/drummer/parts';
import { buildSkeleton } from '@/components/app/studio/drummer/skeleton-model';
import type { Persona } from '@/lib/app/breaks/drummer/personas';

/** Whoever sits at the kit, and how to let go of what was made for them. */
export interface Figure {
  model: DrummerModel;
  /** Free the materials made for this figure (its meshes are freed with its tree). */
  dispose: () => void;
}

/**
 * Build the figure for `who` (experiment: the drummer view): a dressed
 * drummer in their colours, or — for a skeleton — the bones, which need no
 * dress at all: only the wood of the sticks.
 */
export function buildFigure(who: Persona): Figure {
  if (who.kind === 'skeleton') {
    const wood = woodMaterial();
    return { model: buildSkeleton(wood, who), dispose: () => wood.dispose() };
  }
  const dress = makeMaterials(who);
  return { model: buildDrummer(dress, who), dispose: () => disposeMaterials(dress) };
}
