import type { AboutView } from '@/lib/app/breaks/community/about';
import { BUDDY_CONTEXT } from '@/lib/app/breaks/buddy/about-context';
import { updateStudioSettings } from '@/lib/app/breaks/saved/settings';
import { invalidateContext } from '@/lib/orchestration/chat/context-builder';
import { ABILITY_START } from '@/lib/validations/drummer-about';

/**
 * What saving About you changes elsewhere (Phase 7B, tasks 7B.8 and 7B.9).
 * **Server-side only.** Kept apart from `about.ts` so that the data layer,
 * which BeatBuddy's context contributor reads, does not import the chat
 * context cache it is registered with.
 *
 * - **A changed ability** writes the layer and tempo a new pattern starts at
 *   into your Studio settings. Saving the same ability again leaves them
 *   alone, so a tempo you have since set yourself (D21) is not undone by
 *   saving an unrelated field. Clearing your ability leaves them as they are.
 * - **Every save** drops BeatBuddy's cached copy, so the next turn reads what
 *   you just said rather than waiting out the cache.
 */
export async function aboutSaved(
  userId: string,
  about: AboutView,
  { abilityChanged }: { abilityChanged: boolean }
): Promise<void> {
  if (abilityChanged && about.ability) {
    await updateStudioSettings(userId, ABILITY_START[about.ability]);
  }
  invalidateContext(BUDDY_CONTEXT.type, BUDDY_CONTEXT.id, { userId });
}
