/**
 * App capability (agent tool) registrations.
 *
 * **Fork-owned scaffold** — Sunrise ships this empty and does NOT change it
 * after release, so your edits here merge cleanly on upgrade (the stable
 * contract is this file's export, not its body). Treat it like the landing
 * page: a starting point you're expected to modify.
 *
 * Auto-wired: `registerBuiltInCapabilities()` calls this once before the first
 * agent dispatch (server route-handler runtime). Add
 * `registerAppCapability(new YourTool())` calls (your tools extend
 * `BaseCapability`).
 *
 * Full guide + example: CUSTOMIZATION.md §4 · .context/orchestration/capabilities.md
 */
import { ApplyDoctorMoveCapability } from '@/lib/app/breaks/buddy/apply-doctor-move';
import { GetPatternCapability } from '@/lib/app/breaks/buddy/get-pattern';
import { registerAppCapability } from '@/lib/orchestration/capabilities/registry';

/**
 * BeatBuddy's tools (Phase 7). Each needs its active `AiCapability` row and a
 * binding to the `beatbuddy` agent before a model sees it — both seeded by
 * `prisma/seeds/app-beatbreaker/003-beatbuddy.ts`, which reads each tool's
 * `functionDefinition` from these same classes.
 */
export const BEATBUDDY_CAPABILITIES = [new GetPatternCapability(), new ApplyDoctorMoveCapability()];

export function initAppCapabilities(): void {
  for (const capability of BEATBUDDY_CAPABILITIES) registerAppCapability(capability);
}
