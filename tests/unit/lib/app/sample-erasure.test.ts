/**
 * Erasing an account removes its samples' files (D20, 4A.7).
 *
 * The `sample` rows cascade from `user`; nothing in the database reaches
 * storage, so `initAppErasureHooks()` registers a cleanup hook that deletes
 * everything under `samples/<userId>/`. This drives the hook as `eraseUser`
 * does — through the registry's lazy init alone, with nothing booted, which is
 * what a script or worker that erases an account gets.
 *
 * FORK NOTE — this reads `@/lib/app/erasure` for real, through the registry,
 * because the hook it registers is what is under test. A fork of BeatBreaker
 * that adds its own hooks there keeps this passing as long as the
 * `beatbreaker-samples` hook stays; one that drops samples should delete this
 * file with them.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// the real seam, over the suite-wide pin in tests/setup.ts that empties it
vi.mock('@/lib/app/erasure', async (importOriginal) => importOriginal());
vi.mock('@/lib/storage/upload', () => ({
  deleteByPrefix: vi.fn(),
  isStorageEnabled: vi.fn(),
}));

import {
  __resetErasureCleanupHooksForTests,
  getErasureCleanupHooks,
} from '@/lib/privacy/erasure-hooks';
import { deleteByPrefix, isStorageEnabled } from '@/lib/storage/upload';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';

function samplesHook() {
  // no initApp(): the registry's own lazy init is the only wiring
  __resetErasureCleanupHooksForTests();
  const hook = getErasureCleanupHooks().find((h) => h.name === 'beatbreaker-samples');
  if (!hook?.cleanupExternal) throw new Error('the samples erasure hook is not registered');
  return hook.cleanupExternal;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isStorageEnabled).mockReturnValue(true);
  vi.mocked(deleteByPrefix).mockResolvedValue({ success: true, key: '' });
});

describe('the samples erasure hook', () => {
  it('deletes everything under the person’s samples prefix, and nobody else’s', async () => {
    await samplesHook()({ userId: USER_ID });

    expect(deleteByPrefix).toHaveBeenCalledTimes(1);
    expect(deleteByPrefix).toHaveBeenCalledWith(`samples/${USER_ID}/`);
  });

  it('throws when the delete fails, so eraseUser records it', async () => {
    vi.mocked(deleteByPrefix).mockResolvedValue({ success: false, key: '' });

    await expect(samplesHook()({ userId: USER_ID })).rejects.toThrow(`samples/${USER_ID}/`);
  });

  it('does nothing when there is no storage to delete from', async () => {
    vi.mocked(isStorageEnabled).mockReturnValue(false);

    await samplesHook()({ userId: USER_ID });
    expect(deleteByPrefix).not.toHaveBeenCalled();
  });
});
