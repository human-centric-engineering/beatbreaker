'use client';

import { FieldHelp } from '@/components/ui/field-help';

/**
 * The Studio's ⓘ: Sunrise's `<FieldHelp>`, with a target a finger can hit.
 *
 * `FieldHelp`'s trigger is 16px, which is fine beside a form label on a page and
 * under the 24px minimum Phase 5 holds the Studio to (WCAG 2.5.8). The icon
 * stays the same size; the button round it grows. It is named after what it
 * explains — "About Match tempo" — because a drawer can hold six of them and
 * six "More information" buttons are one button to a screen reader.
 *
 * The explanation that used to sit inline in the panels lives in here now
 * (E14): a drawer is narrow, and a paragraph pushes the controls under it off
 * the bottom.
 */
export function StudioHelp({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <FieldHelp
      title={title}
      ariaLabel={`About ${title}`}
      className="-my-1 h-6 w-6"
      contentClassName="max-w-xs"
    >
      {children}
    </FieldHelp>
  );
}
