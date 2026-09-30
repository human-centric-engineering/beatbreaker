import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `initAppContextContributors` (Phase 7B, task 7B.9): registers the `studio`
 * context contributor BeatBuddy reads from every chat turn.
 *
 * Deliberately does NOT mock `@/lib/app/context-contributors` itself — that
 * is the seam under test. Only `aboutContext`, the thing it wires up, is
 * mocked, so this proves the registration reaches `buildContext` for real.
 *
 * @see lib/app/context-contributors.ts
 */

vi.mock('@/lib/app/breaks/buddy/about-context', () => ({
  aboutContext: vi.fn(),
  BUDDY_CONTEXT: { type: 'studio', id: 'about' },
}));

import { aboutContext, BUDDY_CONTEXT } from '@/lib/app/breaks/buddy/about-context';
import {
  buildContext,
  __resetContextContributorsForTests,
} from '@/lib/orchestration/chat/context-builder';

beforeEach(() => {
  vi.clearAllMocks();
  __resetContextContributorsForTests();
});

describe('initAppContextContributors', () => {
  it('registers a "studio" contributor whose body reaches buildContext’s LOCKED CONTEXT framing', async () => {
    vi.mocked(aboutContext).mockResolvedValue('Overall ability: beginner.');

    const result = await buildContext(BUDDY_CONTEXT.type, BUDDY_CONTEXT.id, { userId: 'user-1' });

    expect(result).toContain('type: studio');
    expect(result).toContain('id: about');
    expect(result).toContain('Overall ability: beginner.');
  });

  it('calls aboutContext with the request’s userId, never the context id buildContext was given', async () => {
    vi.mocked(aboutContext).mockResolvedValue('ok');

    await buildContext('studio', 'some-other-id', { userId: 'user-1' });

    expect(aboutContext).toHaveBeenCalledWith('user-1');
    expect(aboutContext).not.toHaveBeenCalledWith('some-other-id');
  });

  it('passes undefined to aboutContext when the request carries no userId', async () => {
    vi.mocked(aboutContext).mockResolvedValue('nobody signed in');

    await buildContext('studio', 'about');

    expect(aboutContext).toHaveBeenCalledWith(undefined);
  });
});
