/**
 * Erasing an account removes its samples' files (D20, 4A.7).
 *
 * The `sample` rows cascade from `user`; nothing in the database reaches
 * storage, so `initApp()` registers a cleanup hook that deletes everything
 * under `samples/<userId>/`. This drives the hook as `eraseUser` does.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/storage/upload', () => ({
  deleteByPrefix: vi.fn(),
  isStorageEnabled: vi.fn(),
}));

import { initApp } from '@/lib/app/bootstrap';
import {
  __resetErasureCleanupHooksForTests,
  getErasureCleanupHooks,
} from '@/lib/privacy/erasure-hooks';
import { deleteByPrefix, isStorageEnabled } from '@/lib/storage/upload';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';

async function samplesHook() {
  __resetErasureCleanupHooksForTests();
  await initApp();
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
    await (
      await samplesHook()
    )({ userId: USER_ID });

    expect(deleteByPrefix).toHaveBeenCalledTimes(1);
    expect(deleteByPrefix).toHaveBeenCalledWith(`samples/${USER_ID}/`);
  });

  it('throws when the delete fails, so eraseUser records it', async () => {
    vi.mocked(deleteByPrefix).mockResolvedValue({ success: false, key: '' });

    await expect((await samplesHook())({ userId: USER_ID })).rejects.toThrow(`samples/${USER_ID}/`);
  });

  it('does nothing when there is no storage to delete from', async () => {
    vi.mocked(isStorageEnabled).mockReturnValue(false);

    await (
      await samplesHook()
    )({ userId: USER_ID });
    expect(deleteByPrefix).not.toHaveBeenCalled();
  });
});
