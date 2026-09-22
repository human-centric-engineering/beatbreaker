/**
 * App authenticated-nav override.
 *
 * **Fork-owned scaffold** — Sunrise ships this `null` (= use the platform
 * default) and does NOT change this file after release, so your edits here merge
 * cleanly on upgrade (the stable contract is this file's export, not its value).
 * Treat it like the landing page: a starting point you're expected to modify.
 *
 * This is the seam that stops an app's own product from being unreachable: the
 * header a signed-in user sees. Pair it with `lib/app/auth-landing.ts`, which
 * decides where they land after login, signup, invite acceptance or email
 * verification — a nav link with no matching landing route still leaves the
 * post-login page pointing at the stock dashboard.
 *
 * Forks OWN this list, so the model is *replacement*, not append: set it to a
 * non-null `ProtectedNavItem[]` and it **replaces** the platform default
 * wholesale (remove/rename/reorder freely). Leave it `null` to keep the default.
 * To add a link while keeping the platform ones, spread
 * `DEFAULT_PROTECTED_NAV` — see the note on it about what spreading pins.
 *
 * Auto-wired: `components/layouts/protected-nav.tsx` reads `protectedNavItems`.
 * The `next/link` / active-state / admin-filtering glue stays in that platform
 * component, so `adminOnly: true` keeps working on a fork's own items.
 *
 * Boundary-clean: type-only import, so this stays within the `lib/app/**`
 * framework-agnostic boundary.
 *
 * Full guide: CUSTOMIZATION.md §4 · lib/protected-nav/types.ts
 */
import { LayoutDashboard, Music4, Shield } from 'lucide-react';

import type { ProtectedNavItem } from '@/lib/protected-nav/types';

/**
 * What a signed-in drummer sees in the header.
 *
 * Home rather than "Dashboard" — the path stays `/dashboard`, so nothing in the
 * platform, `robots.ts` or the auth flows has to move and only the label
 * changes. Profile and Settings are not here: `UserButton` already lists them,
 * and a header that repeats them makes the one thing this app is for harder to
 * see.
 *
 * Explore — the community library — belongs here and is deliberately absent
 * until Phase 6 builds `/explore`. A header link to a route that 404s is worse
 * than a header without the link.
 */
export const protectedNavItems: ProtectedNavItem[] | null = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/studio', label: 'Studio', icon: Music4 },
  { href: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
];
