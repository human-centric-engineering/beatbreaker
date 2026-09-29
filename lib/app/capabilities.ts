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
import { ExplainDifficultyCapability } from '@/lib/app/breaks/buddy/explain-difficulty';
import { FindPatternsCapability } from '@/lib/app/breaks/buddy/find-patterns';
import { GeneratePatternCapability } from '@/lib/app/breaks/buddy/generate-pattern';
import { GetPatternCapability } from '@/lib/app/breaks/buddy/get-pattern';
import { ListStylesCapability } from '@/lib/app/breaks/buddy/list-styles';
import { OpenPatternCapability } from '@/lib/app/breaks/buddy/open-pattern';
import { SavePatternCapability } from '@/lib/app/breaks/buddy/save-pattern';
import { SetPlaybackCapability } from '@/lib/app/breaks/buddy/set-playback';
import { SuggestTitleCapability } from '@/lib/app/breaks/buddy/suggest-title';
import { TidyPatternCapability } from '@/lib/app/breaks/buddy/tidy-pattern';
import { WriteBarsCapability } from '@/lib/app/breaks/buddy/write-bars';
import { registerAppCapability } from '@/lib/orchestration/capabilities/registry';

/**
 * BeatBuddy's tools (Phase 7). Each needs its active `AiCapability` row and a
 * binding to the `beatbuddy` agent before a model sees it — both seeded by
 * `prisma/seeds/app-beatbreaker/003-beatbuddy.ts`, which reads each tool's
 * `functionDefinition` from these same classes.
 */
export const BEATBUDDY_CAPABILITIES = [
  new GetPatternCapability(),
  new ListStylesCapability(),
  new GeneratePatternCapability(),
  new WriteBarsCapability(),
  new ApplyDoctorMoveCapability(),
  new TidyPatternCapability(),
  new SetPlaybackCapability(),
  new ExplainDifficultyCapability(),
  new FindPatternsCapability(),
  new OpenPatternCapability(),
  new SavePatternCapability(),
  new SuggestTitleCapability(),
];

export function initAppCapabilities(): void {
  for (const capability of BEATBUDDY_CAPABILITIES) registerAppCapability(capability);
}
