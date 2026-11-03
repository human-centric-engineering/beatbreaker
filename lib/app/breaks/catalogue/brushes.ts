/**
 * Which sections are played on brushes, for the server's critic (D86).
 *
 * The Studio knows the kit a break sounds on; the server knows only what the
 * catalogue asks for. A section plays its own kit, else its song's, else its
 * style's (`breakKit`), and is judged as brushes where that kit is a brushed
 * one: a brush does not rebound, so a stick's double is two wrist strokes.
 */

import { listKits, listStyles } from '@/lib/app/breaks/catalogue/data';
import type { CatalogueKit, CatalogueStyle } from '@/lib/app/breaks/catalogue/types';
import { breakKit } from '@/lib/app/breaks/songs';
import type { Pattern } from '@/lib/app/breaks/types';

/** Whether a section plays on brushes, by the catalogue's kits and styles. */
export type BrushedSection = (pat: Pattern) => boolean;

/** Whether a kit, by key, is played with brushes. */
export function brushedKit(kits: CatalogueKit[]): (kit: string | undefined) => boolean {
  const brushed = new Set(kits.filter((k) => k.brushes).map((k) => k.key));
  return (kit) => !!kit && brushed.has(kit);
}

/** A {@link BrushedSection} over these kits and styles. */
export function brushedIn(kits: CatalogueKit[], styles: CatalogueStyle[]): BrushedSection {
  const brushed = brushedKit(kits);
  const byKey = new Map(styles.map((s) => [s.key, s]));
  return (pat) => {
    const style = byKey.get(pat.style);
    return brushed(pat.kit ?? (style ? breakKit(style.params, pat.song) : undefined));
  };
}

/** The catalogue's {@link BrushedSection}: two cached reads. */
export async function loadBrushed(): Promise<BrushedSection> {
  const [kits, styles] = await Promise.all([listKits(), listStyles()]);
  return brushedIn(kits, styles);
}
