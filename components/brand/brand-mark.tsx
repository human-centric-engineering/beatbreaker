import { BRAND } from '@/lib/brand';

/**
 * BrandMark — the header/footer brand slot.
 *
 * **Fork-owned scaffold** — Sunrise ships this rendering `BRAND.name` as text
 * and does NOT change it after release, so your edits here merge cleanly on
 * upgrade (the stable contract is this file's export, not its body). Treat it
 * like the landing page: a starting point you're expected to modify.
 *
 * A header brand is a *render* concern an env string can't express (image vs.
 * styled wordmark, sizing, `alt`, dark/light variants), so the seam is a
 * component. Replace only this file's body to render a logo, e.g.
 *
 * ```tsx
 * import Image from 'next/image';
 * import { BRAND } from '@/lib/brand';
 *
 * export function BrandMark() {
 *   return (
 *     <Image src="/logo.svg" alt={BRAND.name} width={120} height={28} priority />
 *   );
 * }
 * ```
 *
 * Lives in `components/` (not `lib/app/`) because the `lib/app/**` ESLint
 * boundary bans runtime `next/*` imports and a logo commonly needs `next/image`.
 *
 * The default returns a bare string so vanilla Sunrise header/footer HTML is
 * byte-for-byte unchanged (no extra wrapper element); the surrounding `<Link>`
 * supplies the type styling. `BRAND.name` stays the identity/accessibility
 * string (`alt` / `aria-label`) even when a fork renders an image.
 *
 * Full guide: CUSTOMIZATION.md §2.
 */
export function BrandMark(): React.ReactNode {
  /* The wordmark the console has always carried: the name set solid, with the
     second half in brass. Text rather than an image, so it takes the surface's
     own colours in light and dark and stays selectable.

     It is cut out of BRAND.name rather than spelled out here, because a mark
     that ignores the seam would leave `NEXT_PUBLIC_APP_NAME` doing nothing to
     the one place the name is actually seen. A camel-cased name splits at its
     inner capital; anything else — "Sunrise", a one-word fork — has no seam to
     cut on and comes back as the bare string the platform default returns, with
     no wrapper element, so vanilla header HTML stays byte-for-byte. */
  const name = BRAND.name;
  const cut = name.search(/(?!^)\p{Lu}/u);
  if (cut < 1) return name;

  return (
    <span className="brand-mark">
      {name.slice(0, cut)}
      <span className="brand-mark-em">{name.slice(cut)}</span>
    </span>
  );
}
