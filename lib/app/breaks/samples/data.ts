import { APIError, ErrorCodes } from '@/lib/api/errors';
import { clearSampleFromYourKits } from '@/lib/app/breaks/samples/kits';
import { sampleAudioUrl } from '@/lib/app/breaks/samples/limits';
import { prisma } from '@/lib/db/client';
import { env } from '@/lib/env';
import { logger } from '@/lib/logging';
import { createRateLimiter } from '@/lib/security/rate-limit';
import { getStorageClient } from '@/lib/storage/client';
import { getStorageCapabilities, type StorageProvider } from '@/lib/storage/providers/types';
import type { SampleList, SampleUsage, SampleView } from '@/lib/validations/samples';

/**
 * Your own samples (D20): the `Sample` rows, and the audio in storage.
 *
 * **Server-side only**, like `saved/pins.ts`.
 *
 * **Private or not at all.** Every file is written with `public: false` under
 * `samples/<userId>/`, and read back only through `download()` for its owner.
 * A provider that cannot keep an object private (Vercel Blob), or cannot read
 * one back, is refused with a 503 before anything is written — storing
 * someone's audio in the open is worse than not storing it.
 *
 * **The allowance is checked where the upload is recorded.** The count and the
 * byte total are read and the row written in one transaction, behind a
 * per-person advisory lock, so two uploads at once cannot both see room for
 * one. The file is written after the row commits, and the row is removed if
 * the write fails: a refused upload leaves no file, and a failed write leaves
 * no row.
 */

/** A namespace for this module's advisory locks, so they cannot meet another's. */
const QUOTA_LOCK = 4_120_001;

/**
 * Uploads per person per window. A per-flow cap inside the handler, keyed on
 * the session: Sunrise's `uploadLimiter` (10 per 15 minutes, per IP) is too
 * few to fill a 15-slot kit, and an IP is the wrong key for an account quota.
 */
export const sampleUploadLimiter = createRateLimiter({
  interval: 10 * 60 * 1000,
  maxRequests: 60,
});

/** How much an account may keep. Env settings, so production can move them. */
export function sampleAllowance(): { maxCount: number; maxBytes: number } {
  return { maxCount: env.SAMPLES_MAX_COUNT, maxBytes: env.SAMPLES_MAX_BYTES };
}

/**
 * The storage provider, if it can hold a sample: keep it private and read it
 * back. Otherwise a 503 saying which, so an operator reading the log knows
 * what to configure (`.context/app/samples.md`).
 */
export function sampleStorage(): StorageProvider {
  const storage = getStorageClient();
  if (!storage) {
    throw new APIError('Sample storage is not configured', ErrorCodes.STORAGE_NOT_CONFIGURED, 503);
  }
  const caps = getStorageCapabilities(storage);
  if (!caps.privateObjects || !caps.download || !storage.download) {
    logger.error('BeatBreaker: the storage provider cannot hold samples privately', {
      provider: storage.name,
      privateObjects: caps.privateObjects,
      download: caps.download,
    });
    throw new APIError('Sample storage cannot keep your audio private', 'STORAGE_NOT_PRIVATE', 503);
  }
  return storage;
}

type SampleRow = {
  id: string;
  name: string;
  slot: string;
  bytes: number;
  durationMs: number;
  createdAt: Date;
};

const SAMPLE_SELECT = {
  id: true,
  name: true,
  slot: true,
  bytes: true,
  durationMs: true,
  createdAt: true,
} as const;

function toView(row: SampleRow): SampleView {
  return { ...row, createdAt: row.createdAt.toISOString(), audioUrl: sampleAudioUrl(row.id) };
}

async function usageOf(userId: string): Promise<SampleUsage> {
  const agg = await prisma.sample.aggregate({
    where: { userId },
    _count: { _all: true },
    _sum: { bytes: true },
  });
  return { count: agg._count._all, bytes: agg._sum.bytes ?? 0, ...sampleAllowance() };
}

/** Your samples, newest first, and how much of your allowance they use. */
export async function listSamples(userId: string): Promise<SampleList> {
  const [rows, usage] = await Promise.all([
    prisma.sample.findMany({
      where: { userId },
      select: SAMPLE_SELECT,
      orderBy: { createdAt: 'desc' },
    }),
    usageOf(userId),
  ]);
  return { samples: rows.map(toView), usage };
}

export interface NewSample {
  name: string;
  slot: string;
  /** The WAV, already checked by `parseWav`. */
  wav: Buffer;
  durationMs: number;
}

/**
 * Record a sample and store its audio.
 *
 * The allowance is checked and the row written in one transaction; the file is
 * written after it commits, and the row removed again if the write fails.
 */
export async function createSample(
  userId: string,
  storage: StorageProvider,
  sample: NewSample
): Promise<{ sample: SampleView; usage: SampleUsage }> {
  const { maxCount, maxBytes } = sampleAllowance();
  const bytes = sample.wav.length;
  const storageKey = `samples/${userId}/${crypto.randomUUID()}.wav`;

  const row = await prisma.$transaction(async (tx) => {
    /* Held until the transaction ends. Two uploads from the same person queue
       here, so the second one counts the first. Other people are not held up:
       the lock is keyed on the user id. */
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${QUOTA_LOCK}::int, hashtext(${userId}))`;

    const agg = await tx.sample.aggregate({
      where: { userId },
      _count: { _all: true },
      _sum: { bytes: true },
    });
    const count = agg._count._all;
    const used = agg._sum.bytes ?? 0;
    if (count >= maxCount) {
      throw new APIError(
        `You have ${count} samples, which is the most an account can keep — delete one to make room`,
        'SAMPLE_LIMIT_COUNT',
        409,
        { count, maxCount }
      );
    }
    if (used + bytes > maxBytes) {
      throw new APIError(
        'That would take your samples past the storage your account has — delete one to make room',
        'SAMPLE_LIMIT_BYTES',
        409,
        { bytes: used, maxBytes, needed: bytes }
      );
    }

    return tx.sample.create({
      data: {
        userId,
        name: sample.name,
        slot: sample.slot,
        bytes,
        durationMs: sample.durationMs,
        storageKey,
      },
      select: SAMPLE_SELECT,
    });
  });

  try {
    await storage.upload(sample.wav, { key: storageKey, contentType: 'audio/wav', public: false });
  } catch (error) {
    await prisma.sample.delete({ where: { id: row.id } }).catch((cleanup: unknown) => {
      logger.error('BeatBreaker: could not remove the row of a sample that failed to store', {
        sampleId: row.id,
        error: cleanup,
      });
    });
    logger.error('BeatBreaker: storing a sample failed', { userId, sampleId: row.id, error });
    throw new APIError('Your sample could not be stored — try again', 'SAMPLE_NOT_STORED', 502);
  }

  return { sample: toView(row), usage: await usageOf(userId) };
}

/**
 * Delete a sample of yours: empty the slots that hold it, remove the row, then
 * the file. `null` if it is not yours or not there.
 *
 * The file goes after the row, and a failed delete is logged rather than
 * thrown. By then the sample is gone from everything you can see; the file is
 * under your prefix, so erasure still reaches it.
 */
export async function deleteSample(
  userId: string,
  storage: StorageProvider,
  id: string
): Promise<SampleUsage | null> {
  const removed = await prisma.$transaction(async (tx) => {
    const row = await tx.sample.findFirst({
      where: { id, userId },
      select: { id: true, storageKey: true },
    });
    if (!row) return null;
    await clearSampleFromYourKits(tx, userId, row.id);
    await tx.sample.delete({ where: { id: row.id } });
    return row;
  });
  if (!removed) return null;

  try {
    await storage.delete(removed.storageKey);
  } catch (error) {
    logger.warn('BeatBreaker: a deleted sample left its file behind', { sampleId: id, error });
  }
  return usageOf(userId);
}

/** A sample's audio, for its owner only. `null` if it is not yours or not there. */
export async function readSampleAudio(
  userId: string,
  storage: StorageProvider,
  id: string
): Promise<Buffer | null> {
  const row = await prisma.sample.findFirst({
    where: { id, userId },
    select: { storageKey: true },
  });
  if (!row || !storage.download) return null;
  try {
    return (await storage.download(row.storageKey)).body;
  } catch (error) {
    /* The row is there and the file is not: a write that half-failed, or a
       bucket cleaned by hand. To the person it is a sample that will not play,
       the same as one that is gone. */
    logger.warn('BeatBreaker: a sample row has no file behind it', { sampleId: id, error });
    return null;
  }
}
