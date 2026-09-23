/**
 * App admin-sidebar nav registrations.
 *
 * **Fork-owned scaffold** — Sunrise ships this empty and does NOT change it
 * after release, so your edits here merge cleanly on upgrade (the stable
 * contract is this file's export, not its body). Treat it like the landing
 * page: a starting point you're expected to modify.
 *
 * Auto-wired: `components/admin/admin-sidebar.tsx` calls this once at module
 * load (client runtime). Add `registerNavSection({ … })` calls. Keep this file
 * client-safe — registrar + icon imports only, no server code — and use a
 * `title` distinct from the core sections.
 *
 * Full guide + example: CUSTOMIZATION.md §4 · lib/admin-nav/registry.ts
 */
import { Disc3 } from 'lucide-react';

import { registerNavSection } from '@/lib/admin-nav/registry';

export function initAppNav(): void {
  /* One section, one item. The catalogue is the only part of BeatBreaker an
     operator administers — everything else a user does they do in the Studio,
     and the platform's own sections cover users, flags and logs.

     Client-safe on purpose: this file is imported by the sidebar at module
     load, so it may hold a registrar and an icon and nothing else. The page
     behind the href does the data work. */
  registerNavSection({
    title: 'BeatBreaker',
    items: [
      {
        href: '/admin/catalogue',
        label: 'Catalogue',
        icon: Disc3,
        description: 'Styles, famous breaks and kits — the content the generator works from.',
      },
    ],
  });
}
