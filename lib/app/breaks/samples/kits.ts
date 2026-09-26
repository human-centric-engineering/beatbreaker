import type { Prisma } from '@prisma/client';

import { APIError, ValidationError } from '@/lib/api/errors';
import { kitParamsSchema, kitSamplesSchema } from '@/lib/app/breaks/catalogue/schemas';
import {
  MAX_YOUR_KITS,
  YOUR_KIT_KEY_PREFIX,
  sampleAudioUrl,
} from '@/lib/app/breaks/samples/limits';
import { YOUR_KITS_GROUP, YOUR_KIT_PARAMS } from '@/lib/app/breaks/samples/your-kit';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logging';
import type { UpdateYourKit, YourKitView } from '@/lib/validations/samples';

/**
 * Your own kits (D20): `Kit` rows with `ownerId` set and `engine: 'user'`.
 *
 * **Server-side only.** Read and written through `/api/v1/kits`, never through
 * the catalogue: the catalogue is public, cached for everyone and memoised per
 * process, and a kit of yours in it would be served to the next caller. The
 * Studio pages read these per request and add them to the catalogue they hand
 * the console.
 *
 * Each slot names one of your samples by id, in the same `samples.slots` shape
 * a recorded kit uses (`files` holds the id). A kit's key is minted here under
 * {@link YOUR_KIT_KEY_PREFIX}, which no system kit may use, so the key the
 * `kit` setting stores can never shadow a system kit.
 *
 * **Writes to your kits queue behind a per-person advisory lock.** Creating a
 * kit counts then inserts, and changing slots reads the column then writes it
 * back; without the lock two requests at once (two tabs, an API client) could
 * both see room for one more kit, or each write back a column missing the
 * other's slot. Emptying a deleted sample's slots takes the same lock.
 */

/** A namespace for this module's advisory locks, so they cannot meet another's. */
const KITS_LOCK = 4_120_002;

/** Held until `tx` ends. Keyed on the user id, so other people are not held up. */
async function lockYourKits(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${KITS_LOCK}::int, hashtext(${userId}))`;
}

const OWN = (userId: string) => ({ ownerId: userId, engine: 'user' }) as const;

const KIT_SELECT = { id: true, key: true, label: true, samples: true } as const;

type KitRow = { id: string; key: string; label: string; samples: unknown };

/** Slot → sample id, read through the schema. A slot that does not parse is empty. */
function slotIds(samples: unknown): Record<string, string> {
  const parsed = kitSamplesSchema.safeParse(samples ?? {});
  if (!parsed.success) return {};
  const out: Record<string, string> = {};
  for (const [slot, spec] of Object.entries(parsed.data.slots ?? {})) {
    if (spec.files[0]) out[slot] = spec.files[0];
  }
  return out;
}

/** Slot → sample id, as the column stores it. */
function toSamplesColumn(ids: Record<string, string>): Prisma.InputJsonObject {
  const slots: Record<string, { v: null; files: string[] }> = {};
  for (const [slot, id] of Object.entries(ids)) slots[slot] = { v: null, files: [id] };
  return { slots };
}

/**
 * Your kits, each slot joined to the sample in it. One query for the kits and
 * one for the samples they name, however many kits there are.
 */
async function toViews(userId: string, rows: KitRow[]): Promise<YourKitView[]> {
  const ids = rows.map((r) => slotIds(r.samples));
  const wanted = [...new Set(ids.flatMap((m) => Object.values(m)))];
  const samples = wanted.length
    ? await prisma.sample.findMany({
        where: { userId, id: { in: wanted } },
        select: { id: true, name: true },
      })
    : [];
  const names = new Map(samples.map((s) => [s.id, s.name]));

  return rows.map((row, i) => {
    const slots: YourKitView['slots'] = {};
    for (const [slot, sampleId] of Object.entries(ids[i])) {
      const name = names.get(sampleId);
      /* A slot naming a sample that is not yours, or is gone, is empty. Delete
         clears slots as it goes, so this is a row written some other way. */
      if (name !== undefined) slots[slot] = { sampleId, name, audioUrl: sampleAudioUrl(sampleId) };
    }
    return { id: row.id, key: row.key, label: row.label, slots };
  });
}

/** Every kit of yours, oldest first. */
export async function listYourKits(userId: string): Promise<YourKitView[]> {
  const rows = await prisma.kit.findMany({
    where: OWN(userId),
    select: KIT_SELECT,
    orderBy: { createdAt: 'asc' },
  });
  return toViews(userId, rows);
}

/** One kit of yours. `null` if it is not yours or not there. */
export async function getYourKit(userId: string, id: string): Promise<YourKitView | null> {
  const row = await prisma.kit.findFirst({ where: { id, ...OWN(userId) }, select: KIT_SELECT });
  return row ? (await toViews(userId, [row]))[0] : null;
}

/** The keys of your kits — what the `kit` setting may name besides a system kit. */
export async function yourKitKeys(userId: string): Promise<Set<string>> {
  const rows = await prisma.kit.findMany({ where: OWN(userId), select: { key: true } });
  return new Set(rows.map((r) => r.key));
}

/** A new, empty kit. Refused once you have {@link MAX_YOUR_KITS}. */
export async function createYourKit(userId: string, label: string): Promise<YourKitView> {
  const row = await prisma.$transaction(async (tx) => {
    await lockYourKits(tx, userId);
    const count = await tx.kit.count({ where: OWN(userId) });
    if (count >= MAX_YOUR_KITS) {
      throw new APIError(`You can keep ${MAX_YOUR_KITS} kits of your own`, 'KIT_LIMIT', 409);
    }
    return tx.kit.create({
      data: {
        ...OWN(userId),
        /* 6 + 32 characters, inside the column's 40. Random rather than derived
           from the id, which does not exist until the row does. */
        key: `${YOUR_KIT_KEY_PREFIX}${crypto.randomUUID().replace(/-/g, '')}`,
        label,
        hint: 'Your own recordings. A slot you leave empty plays the synthesised voice.',
        group: YOUR_KITS_GROUP,
        params: kitParamsSchema.parse(YOUR_KIT_PARAMS),
        samples: toSamplesColumn({}),
        visibility: 'private',
      },
      select: KIT_SELECT,
    });
  });
  return (await toViews(userId, [row]))[0];
}

/**
 * Rename a kit of yours, or change its slots. `null` empties a slot. A sample
 * that is not yours is refused as a 400 naming the slot, before anything is
 * written. Not yours, or not there, is `null` — the route answers 404.
 */
export async function updateYourKit(
  userId: string,
  id: string,
  patch: UpdateYourKit
): Promise<YourKitView | null> {
  const updated = await prisma.$transaction(async (tx) => {
    /* Before the read, so the slots written back are the latest, and a sample
       checked here cannot be deleted before this commits. */
    await lockYourKits(tx, userId);
    const row = await tx.kit.findFirst({ where: { id, ...OWN(userId) }, select: KIT_SELECT });
    if (!row) return null;

    const data: Prisma.KitUpdateInput = {};
    if (patch.label !== undefined) data.label = patch.label;

    if (patch.slots) {
      const assigned = Object.entries(patch.slots).filter(
        (e): e is [string, string] => typeof e[1] === 'string'
      );
      const ids = [...new Set(assigned.map(([, sampleId]) => sampleId))];
      const found = ids.length
        ? await tx.sample.findMany({ where: { userId, id: { in: ids } }, select: { id: true } })
        : [];
      const mine = new Set(found.map((s) => s.id));
      const errors = assigned
        .filter(([, sampleId]) => !mine.has(sampleId))
        .map(([slot]) => ({ path: `slots.${slot}`, message: 'Not one of your samples' }));
      if (errors.length) throw new ValidationError('Invalid request body', { errors });

      const slots = slotIds(row.samples);
      for (const [slot, sampleId] of Object.entries(patch.slots)) {
        if (sampleId) slots[slot] = sampleId;
        else delete slots[slot];
      }
      data.samples = toSamplesColumn(slots);
    }

    return tx.kit.update({ where: { id: row.id }, data, select: KIT_SELECT });
  });
  return updated ? (await toViews(userId, [updated]))[0] : null;
}

/** Delete a kit of yours. `false` if it is not yours or not there. */
export async function deleteYourKit(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.kit.deleteMany({ where: { id, ...OWN(userId) } });
  return count > 0;
}

/**
 * Empty every slot of yours that holds `sampleId`, inside the caller's
 * transaction — the sample is about to go, and a slot naming it would be a
 * slot naming nothing.
 */
export async function clearSampleFromYourKits(
  tx: Prisma.TransactionClient,
  userId: string,
  sampleId: string
): Promise<void> {
  await lockYourKits(tx, userId);
  const rows = await tx.kit.findMany({
    where: OWN(userId),
    select: { id: true, samples: true },
  });
  for (const row of rows) {
    const slots = slotIds(row.samples);
    const kept = Object.fromEntries(Object.entries(slots).filter(([, id]) => id !== sampleId));
    if (Object.keys(kept).length === Object.keys(slots).length) continue;
    await tx.kit.update({ where: { id: row.id }, data: { samples: toSamplesColumn(kept) } });
    logger.info('BeatBreaker: cleared a deleted sample from your kit', { kitId: row.id, sampleId });
  }
}
