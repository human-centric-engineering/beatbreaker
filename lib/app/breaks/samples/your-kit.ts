import type { CatalogueKit, StudioCatalogue } from '@/lib/app/breaks/catalogue/types';
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

export const YOUR_KIT_HINT = 'Your own kit. A slot you leave empty plays the synthesised voice.';

/**
 * Your kit as a catalogue entry.
 *
 * - A slot holding a sample of yours has its id in `files`, which the sample
 *   source turns into its audio URL.
 * - A slot holding a piece (9-v) has the piece's recordings and folder, which
 *   the pack source fetches from `/kits/<folder>/`.
 *
 * Either carries the slot's Level, Tune and Decay.
 */
export function yourKitToCatalogue(view: YourKitView): CatalogueKit {
  const slots: NonNullable<CatalogueKit['samples']['slots']> = {};
  for (const [slot, s] of Object.entries(view.slots)) {
    const settings = {
      ...(s.level !== undefined ? { level: s.level } : {}),
      ...(s.tune !== undefined ? { tune: s.tune } : {}),
      ...(s.decay !== undefined ? { decay: s.decay } : {}),
    };
    slots[slot] =
      'sampleId' in s ? { v: null, files: [s.sampleId], ...settings } : { ...s.spec, ...settings };
  }
  return {
    ...structuredClone(view.params ?? YOUR_KIT_PARAMS),
    key: view.key,
    label: view.label,
    hint: YOUR_KIT_HINT,
    group: YOUR_KITS_GROUP,
    engine: 'user',
    samples: { slots, ...(view.pan ? { pan: view.pan } : {}) },
  };
}

/**
 * The catalogue with your kits added, under their own heading at the end.
 *
 * The catalogue itself is everyone's and cached for everyone, so your kits are
 * never in it; the Studio adds them here, per person. Their keys carry a prefix
 * no system kit may use, so an entry of yours never replaces one of the
 * catalogue's.
 */
export function withYourKits(
  catalogue: StudioCatalogue,
  kits: readonly YourKitView[]
): StudioCatalogue {
  if (!kits.length) return catalogue;
  const yours = kits.map(yourKitToCatalogue);
  return {
    ...catalogue,
    kits: { ...catalogue.kits, ...Object.fromEntries(yours.map((k) => [k.key, k])) },
    kitGroups: [...catalogue.kitGroups, { label: YOUR_KITS_GROUP, keys: yours.map((k) => k.key) }],
  };
}
