import type { CatalogueKit } from '@/lib/app/breaks/catalogue/types';
import type { Kit } from '@/lib/app/breaks/kit';
import type { YourKitView } from '@/lib/validations/samples';

/**
 * A kit of yours as the Studio plays it (D20).
 *
 * Pure, so the server can write a new kit's numbers and the browser can turn
 * the kits it holds into catalogue entries without either importing the other.
 */

/**
 * What a kit of yours starts with: speed, level and room for each recorded
 * voice, and the synthesised toms and percussion every kit shares. The same
 * numbers the seeded "Your samples" kit had.
 */
export const YOUR_KIT_PARAMS: Omit<Kit, 'label' | 'hint' | 'engine' | 'credit'> = {
  master: { lp: 18000, drive: 1.0, room: 0.08 },
  k: { rate: 1, level: 0.95, room: 0.02 },
  s: { rate: 1, level: 0.95, room: 0.08 },
  h: { rate: 1, level: 0.95, room: 0.06 },
  r: { rate: 1, level: 0.95, room: 0.1 },
  c: { rate: 1, level: 0.95, room: 0.14 },
  t: { tune: 90, decay: 0.5, tone: 0.4, room: 0.12 },
  p: { tune: 1.0, level: 0.9, tone: 1.0, room: 0.1 },
};

/** The heading your kits file under in the picker. */
export const YOUR_KITS_GROUP = 'Your kits';

/**
 * Your kit as a catalogue entry. Each filled slot's `files` holds the sample's
 * id, which the sample source turns into its audio URL.
 */
export function yourKitToCatalogue(view: YourKitView): CatalogueKit {
  const slots: NonNullable<CatalogueKit['samples']['slots']> = {};
  for (const [slot, s] of Object.entries(view.slots))
    slots[slot] = { v: null, files: [s.sampleId] };
  return {
    ...structuredClone(YOUR_KIT_PARAMS),
    key: view.key,
    label: view.label,
    hint: 'Your own recordings. A slot you leave empty plays the synthesised voice.',
    group: YOUR_KITS_GROUP,
    engine: 'user',
    samples: { slots },
  };
}
