import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { APIError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { maxBpm } from '@/lib/app/breaks/audio/transport';
import { PUBLIC } from '@/lib/app/breaks/catalogue/data';
import {
  breakHash,
  entryHash,
  placesOn,
  type TableTarget,
} from '@/lib/app/breaks/community/speed-tables';
import { readStoredVideo } from '@/lib/app/breaks/community/video-links';
import { openableBy } from '@/lib/app/breaks/community/visibility';
import { updateStudioSettings } from '@/lib/app/breaks/saved/settings';
import { prisma } from '@/lib/db/client';
import type { PinTarget } from '@/lib/validations/pins';
import { STUDIO_SETTINGS_FIELDS } from '@/lib/validations/studio-settings';
import {
  type CreateSpeedInput,
  SPEED_BPM_MIN,
  type SpeedRecordView,
  type YourSpeeds,
} from '@/lib/validations/speeds';

/**
 * Your speed records (Phase 7C): the fastest tempo you can play something
 * well, at a layer, with the date — and over time, your progress.
 *
 * **Server-side only.** Every record is kept; your best is the highest tempo
 * per target and layer. Each is only as readable as it is yours: nobody else
 * reads your records here, and the public tables (`speed-tables.ts`) show
 * only your listed bests, under your username.
 */

/** New records one person may make in 24 hours. */
export const SPEED_DAILY_CAP = 50;
/** How many of your records on one target the Practise drawer is sent. */
export const YOUR_SPEEDS_MAX = 200;

const DAY_MS = 24 * 60 * 60 * 1000;

/** What a record needs to know about its target, read from the database. */
interface Resolved {
  title: string;
  meter: string;
  hash: string;
  /** Has a public table: a published pattern or a famous break. */
  public: boolean;
}

/**
 * The target, if the caller may see it: one of theirs, someone's shared or
 * published pattern, or a famous break. Null for anything else — the same
 * answer as for one that does not exist, so an id cannot be probed.
 */
async function resolveTarget(userId: string, target: PinTarget): Promise<Resolved | null> {
  if ('breakId' in target) {
    const row = await prisma.break.findFirst({
      where: { id: target.breakId, ...openableBy(userId) },
      select: { title: true, meter: true, visibility: true, slug: true, gridHash: true, doc: true },
    });
    if (!row) return null;
    return {
      title: row.title,
      meter: row.meter,
      hash: await breakHash(row),
      public: row.visibility === 'published' && row.slug !== null,
    };
  }
  const row = await prisma.libraryEntry.findFirst({
    where: { id: target.libraryEntryId, library: PUBLIC },
    select: { title: true, meter: true, doc: true },
  });
  if (!row) return null;
  return { title: row.title, meter: row.meter, hash: await entryHash(row.doc), public: true };
}

type ListSpeeds = 'ask' | 'list' | 'keep';

/** Your `listSpeeds` setting alone — read from the row, not the whole settings object. */
async function readListSpeeds(userId: string): Promise<ListSpeeds> {
  const row = await prisma.studioSettings.findUnique({
    where: { userId },
    select: { prefs: true },
  });
  // the other settings are not this one's business, and are left unread
  const parsed = listSpeedsOnly.safeParse(row?.prefs);
  return parsed.success ? parsed.data.listSpeeds : 'ask';
}

const listSpeedsOnly = z.object({ listSpeeds: STUDIO_SETTINGS_FIELDS.listSpeeds });

const RECORD_SELECT = {
  id: true,
  level: true,
  bpm: true,
  videoUrl: true,
  note: true,
  listed: true,
  recordedAt: true,
  titleSnapshot: true,
  breakRef: { select: { title: true } },
  libraryEntry: { select: { title: true } },
} as const satisfies Prisma.SpeedRecordSelect;

type RecordRow = Prisma.SpeedRecordGetPayload<{ select: typeof RECORD_SELECT }>;

function toView(row: RecordRow): SpeedRecordView {
  return {
    id: row.id,
    level: row.level,
    bpm: row.bpm,
    video: readStoredVideo(row.videoUrl),
    note: row.note,
    listed: row.listed,
    recordedAt: row.recordedAt.toISOString(),
    // the target's name now, while it has one; what it was called, once it has gone
    title: row.breakRef?.title ?? row.libraryEntry?.title ?? row.titleSnapshot,
  };
}

/**
 * Record a speed. The time is the server's. The tempo is held to 40 and the
 * meter's own ceiling; past {@link SPEED_DAILY_CAP} records in a day is a 429.
 *
 * **Listing.** Only a record on a target with a public table can be listed;
 * on anything else `listed` is false whatever was asked, so publishing a
 * pattern later never puts records on a table nobody was asked about. With
 * no `listed` in the request, your `listSpeeds` setting decides (`ask` is
 * not listed). The first answer on a public target, while the setting is
 * still `ask`, becomes the setting — the "asked once" every client gets.
 */
export async function recordSpeed(
  userId: string,
  input: CreateSpeedInput,
  now = new Date()
): Promise<SpeedRecordView> {
  const resolved = await resolveTarget(userId, input.target);
  if (!resolved) throw new NotFoundError('Pattern not found');

  const ceiling = maxBpm(resolved.meter);
  if (input.bpm < SPEED_BPM_MIN || input.bpm > ceiling) {
    throw new ValidationError(`A speed is between ${SPEED_BPM_MIN} and ${ceiling} bpm`, {
      bpm: [`Between ${SPEED_BPM_MIN} and ${ceiling}`],
    });
  }

  const today = await prisma.speedRecord.count({
    where: { userId, recordedAt: { gte: new Date(now.getTime() - DAY_MS) } },
  });
  if (today >= SPEED_DAILY_CAP) {
    throw new APIError(
      "That's a lot of speeds for one day. Try again tomorrow.",
      'SPEED_LIMIT',
      429
    );
  }

  const setting = await readListSpeeds(userId);
  const listed = resolved.public && (input.listed ?? setting === 'list');
  if (resolved.public && input.listed !== undefined && setting === 'ask') {
    await updateStudioSettings(userId, { listSpeeds: input.listed ? 'list' : 'keep' });
  }

  const row = await prisma.speedRecord.create({
    data: {
      userId,
      ...input.target,
      titleSnapshot: resolved.title.slice(0, 160),
      level: input.level,
      bpm: input.bpm,
      gridHash: resolved.hash,
      videoUrl: input.videoUrl ?? null,
      note: input.note ?? null,
      listed,
      recordedAt: now,
    },
    select: RECORD_SELECT,
  });
  return toView(row);
}

/**
 * Your records on one target, newest first, and where your bests place you
 * on its table. Null when you cannot see the target — a pattern its owner
 * made private is as gone for this as for opening it.
 */
export async function yourSpeeds(userId: string, target: PinTarget): Promise<YourSpeeds | null> {
  const resolved = await resolveTarget(userId, target);
  if (!resolved) return null;

  const table: TableTarget = { target, hash: resolved.hash };
  const [rows, places, profile, listSpeeds] = await Promise.all([
    prisma.speedRecord.findMany({
      where: { userId, ...target },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      take: YOUR_SPEEDS_MAX,
      select: RECORD_SELECT,
    }),
    resolved.public ? placesOn(table, userId) : [],
    prisma.drummerProfile.findUnique({ where: { userId }, select: { userId: true } }),
    readListSpeeds(userId),
  ]);

  return {
    records: rows.map(toView),
    public: resolved.public,
    places,
    hasUsername: profile !== null,
    listSpeeds,
  };
}

/** Delete one of your records. False when there is no such record of yours. */
export async function deleteSpeed(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.speedRecord.deleteMany({ where: { id, userId } });
  return count > 0;
}
