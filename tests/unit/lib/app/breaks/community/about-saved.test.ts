import { describe, expect, it, vi } from 'vitest';

/**
 * `aboutSaved` (Phase 7B, tasks 7B.8 and 7B.9): what saving About you changes
 * elsewhere — a changed ability writes the Studio's starting layer and tempo,
 * and every save drops BeatBuddy's cached context.
 *
 * `updateStudioSettings` and `invalidateContext` are mocked at their module
 * boundaries; this file is about when `about-saved.ts` calls them and with
 * what, not about what either of them does internally.
 *
 * @see lib/app/breaks/community/about-saved.ts
 */

vi.mock('@/lib/app/breaks/saved/settings', () => ({
  updateStudioSettings: vi.fn(),
}));
vi.mock('@/lib/orchestration/chat/context-builder', () => ({
  invalidateContext: vi.fn(),
}));

import { aboutSaved } from '@/lib/app/breaks/community/about-saved';
import { BUDDY_CONTEXT } from '@/lib/app/breaks/buddy/about-context';
import type { AboutView } from '@/lib/app/breaks/community/about';
import { updateStudioSettings } from '@/lib/app/breaks/saved/settings';
import { invalidateContext } from '@/lib/orchestration/chat/context-builder';
import { ABILITY_START } from '@/lib/validations/drummer-about';

const USER_ID = 'user-1';

const EMPTY_ABOUT: AboutView = {
  purposes: [],
  styles: [],
  ability: null,
  styleAbility: {},
  channels: [],
  public: { purposes: false, styles: false, ability: false, channels: true },
  askedAt: null,
};

describe('aboutSaved', () => {
  it('writes the ability’s starting layer and tempo into Studio settings when the ability changed', async () => {
    const about: AboutView = { ...EMPTY_ABOUT, ability: 'advanced' };

    await aboutSaved(USER_ID, about, { abilityChanged: true });

    expect(updateStudioSettings).toHaveBeenCalledWith(USER_ID, ABILITY_START.advanced);
  });

  it('does not touch Studio settings when the ability is unchanged, even if one is set', async () => {
    const about: AboutView = { ...EMPTY_ABOUT, ability: 'intermediate' };

    await aboutSaved(USER_ID, about, { abilityChanged: false });

    expect(updateStudioSettings).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing about the ability changed
  });

  it('does not touch Studio settings when a changed ability was cleared to null', async () => {
    const about: AboutView = { ...EMPTY_ABOUT, ability: null };

    await aboutSaved(USER_ID, about, { abilityChanged: true });

    expect(updateStudioSettings).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to start a pattern at
  });

  it('always invalidates BeatBuddy’s cached studio/about context, keyed by the user id', async () => {
    await aboutSaved(USER_ID, { ...EMPTY_ABOUT, ability: null }, { abilityChanged: false });

    expect(invalidateContext).toHaveBeenCalledWith(BUDDY_CONTEXT.type, BUDDY_CONTEXT.id, {
      userId: USER_ID,
    });
  });

  it('invalidates the context even when the ability also changed', async () => {
    await aboutSaved(USER_ID, { ...EMPTY_ABOUT, ability: 'beginner' }, { abilityChanged: true });

    expect(invalidateContext).toHaveBeenCalledWith('studio', 'about', { userId: USER_ID });
  });
});
