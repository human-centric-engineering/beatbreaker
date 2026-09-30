/**
 * App context-contributor registrations (prompt-context loaders).
 *
 * **Fork-owned scaffold** — Sunrise ships this empty and does NOT change it
 * after release, so your edits here merge cleanly on upgrade (the stable
 * contract is this file's export, not its body). Treat it like the landing
 * page: a starting point you're expected to modify.
 *
 * Auto-wired: `buildContext()` calls this once before its first lookup
 * (server route-handler runtime). Add `registerContextContributor(type,
 * loader)` calls to inject your own `LOCKED CONTEXT` block per turn for a
 * given `contextType`, without editing the core `buildContext` switch.
 *
 * Full guide + example: CUSTOMIZATION.md §4 · .context/orchestration/chat.md
 */

import { aboutContext, BUDDY_CONTEXT } from '@/lib/app/breaks/buddy/about-context';
import { registerContextContributor } from '@/lib/orchestration/chat';
export function initAppContextContributors(): void {
  /* BeatBuddy (Phase 7B): what the drummer said about themselves — purposes,
     styles, ability. Read by the chat handler's user id, never the context id. */
  registerContextContributor(BUDDY_CONTEXT.type, (_id, { userId }) => aboutContext(userId));
}
