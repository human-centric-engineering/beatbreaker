import type { StudioCatalogue } from '@/lib/app/breaks/catalogue/types';

/** The picker's heading for your preferred styles. */
export const YOUR_STYLES_GROUP = 'Your styles';

/**
 * The catalogue with your preferred styles first (Phase 7B, task 7B.8).
 *
 * - The style picker gains a _Your styles_ group at the top, in the order you
 *   chose them, and those styles leave their usual groups so none is listed
 *   twice. A group left empty is dropped.
 * - Each library lists the famous breaks in your styles first; the rest keep
 *   their order. Because the library drawer groups entries in the order it
 *   meets them, a group holding one of yours moves up with it.
 *
 * Pure, and a copy: the catalogue is memoised for everyone, so it is never
 * changed in place. Keys the catalogue does not have are ignored. A native
 * client reads the same preferences from `/api/v1/drummer-about` and does the
 * same ordering.
 */
export function preferStyles(catalogue: StudioCatalogue, preferred: string[]): StudioCatalogue {
  const yours = preferred.filter((key) => Object.hasOwn(catalogue.styles, key));
  if (!yours.length) return catalogue;
  const mine = new Set(yours);

  const styleGroups: StudioCatalogue['styleGroups'] = [
    [YOUR_STYLES_GROUP, yours],
    ...catalogue.styleGroups.flatMap(([heading, keys]): StudioCatalogue['styleGroups'] => {
      const rest = keys.filter((key) => !mine.has(key));
      return rest.length ? [[heading, rest]] : [];
    }),
  ];

  const libraries = catalogue.libraries.map((library) => ({
    ...library,
    entries: [
      ...library.entries.filter((e) => mine.has(e.styleKey)),
      ...library.entries.filter((e) => !mine.has(e.styleKey)),
    ],
  }));

  return { ...catalogue, styleGroups, libraries };
}
