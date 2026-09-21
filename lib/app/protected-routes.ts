/**
 * App-owned protected route prefixes.
 *
 * **Fork-owned scaffold** — Sunrise ships this empty (`[]`) and does NOT change
 * it after release, so your edits merge cleanly on upgrade (the stable contract
 * is this export, not its value).
 *
 * Append your fork's new authenticated top-level sections here (e.g.
 * `/projects`) instead of editing the `proxy.ts` literal. The model is *append*:
 * these are **merged with** the core protected routes (`/dashboard`,
 * `/settings`, `/profile`), which always stay protected. Any request whose path
 * starts with a listed prefix gets the edge redirect-to-login when signed out.
 *
 * Scope: this is only the "is-logged-in-at-all" edge gate — per-resource
 * authorisation stays in `withAuth` / `withAdminAuth` (`lib/auth/guards.ts`).
 *
 * Use leading-slash prefixes (a trailing slash is normalised away); the proxy
 * drops any entry that isn't a non-empty `/`-prefixed path. Full guide:
 * CUSTOMIZATION.md §4.
 *
 * Boundary-clean: a plain string array (no imports), safe to import at the
 * proxy runtime.
 */
export const appProtectedRoutes: string[] = [
  // The break console. Saving a break or a take needs a session, and the page
  // is the only way in — without this it rendered fine signed out and every
  // save failed at the API with a 401, which is a worse answer than the login
  // page. The API guards itself regardless; this is the edge redirect.
  '/breaks',
];
