import type { Prisma } from '@prisma/client';

import { APIError, ValidationError } from '@/lib/api/errors';
import { pieceMap } from '@/lib/app/breaks/catalogue/data';
import { type CataloguePiece, resolveSlot } from '@/lib/app/breaks/catalogue/pieces';
import {
  type KitParams,
  kitParamsSchema,
  kitSamplesSchema,
} from '@/lib/app/breaks/catalogue/schemas';
import { type KitSlotSettings, slotFiles } from '@/lib/app/breaks/kit';
import {
  MAX_YOUR_KITS,
  YOUR_KIT_KEY_PREFIX,
  sampleAudioUrl,
} from '@/lib/app/breaks/samples/limits';
import { YOUR_KITS_GROUP, YOUR_KIT_HINT, YOUR_KIT_PARAMS } from '@/lib/app/breaks/samples/your-kit';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logging';
import type {
  CreateYourKit,
  UpdateYourKit,
  YourKitSlotInput,
  YourKitView,
} from '@/lib/validations/samples';

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

const KIT_SELECT = { id: true, key: true, label: true, params: true, samples: true } as const;

type KitRow = { id: string; key: string; label: string; params: unknown; samples: unknown };

/** A filled slot of yours as the column stores it: a sample of yours, or a piece. */
type Entry = KitSlotSettings & ({ sample: string } | { piece: string; from?: string });

/** What a kit of yours holds, read through the schema. */
interface Held {
  slots: Record<string, Entry>;
  pan: Partial<Record<string, number>>;
}

function settingsOf(v: KitSlotSettings): KitSlotSettings {
  const out: KitSlotSettings = {};
  if (v.level !== undefined) out.level = v.level;
  if (v.tune !== undefined) out.tune = v.tune;
  if (v.decay !== undefined) out.decay = v.decay;
  return out;
}

/**
 * Slot → what is in it. A slot that does not parse is empty. The flat shape,
 * `{ v: null, files: [id] }`, is how a slot of yours was stored before
 * pieces, and is read as that sample.
 */
function held(samples: unknown): Held {
  const parsed = kitSamplesSchema.safeParse(samples ?? {});
  if (!parsed.success) return { slots: {}, pan: {} };
  const slots: Record<string, Entry> = {};
  for (const [slot, spec] of Object.entries(parsed.data.slots ?? {})) {
    if ('piece' in spec)
      slots[slot] = {
        ...settingsOf(spec),
        piece: spec.piece,
        ...(spec.from ? { from: spec.from } : {}),
      };
    else if ('sample' in spec) slots[slot] = { ...settingsOf(spec), sample: spec.sample };
    else {
      const first = slotFiles(spec)[0];
      if (first) slots[slot] = { ...settingsOf(spec), sample: first };
    }
  }
  return { slots, pan: parsed.data.pan ?? {} };
}

/** What a kit of yours holds, as the column stores it. */
function toSamplesColumn({ slots, pan }: Held): Prisma.InputJsonObject {
  const out: Record<string, Prisma.InputJsonObject> = {};
  for (const [slot, entry] of Object.entries(slots)) out[slot] = { ...entry };
  const pans = Object.fromEntries(
    Object.entries(pan).filter((e): e is [string, number] => e[1] !== undefined)
  );
  return Object.keys(pans).length ? { slots: out, pan: pans } : { slots: out };
}

/**
 * Your kits, each slot joined to the sample or piece in it. One query for the
 * kits and one for the samples they name, however many kits there are; the
 * pieces are the catalogue's, cached.
 */
async function toViews(userId: string, rows: KitRow[]): Promise<YourKitView[]> {
  const kits = rows.map((r) => held(r.samples));
  const wanted = [
    ...new Set(
      kits.flatMap((k) => Object.values(k.slots).flatMap((e) => ('sample' in e ? [e.sample] : [])))
    ),
  ];
  const [samples, pieces] = await Promise.all([
    wanted.length
      ? prisma.sample.findMany({
          where: { userId, id: { in: wanted } },
          select: { id: true, name: true },
        })
      : [],
    kits.some((k) => Object.values(k.slots).some((e) => 'piece' in e))
      ? pieceMap()
      : new Map<string, CataloguePiece>(),
  ]);
  const names = new Map(samples.map((s) => [s.id, s.name]));

  return rows.map((row, i) => {
    const slots: YourKitView['slots'] = {};
    for (const [slot, entry] of Object.entries(kits[i].slots)) {
      const settings = settingsOf(entry);
      if ('sample' in entry) {
        const name = names.get(entry.sample);
        /* A slot naming a sample that is not yours, or is gone, is empty. Delete
           clears slots as it goes, so this is a row written some other way. */
        if (name !== undefined) {
          slots[slot] = {
            sampleId: entry.sample,
            name,
            audioUrl: sampleAudioUrl(entry.sample),
            ...settings,
          };
        }
        continue;
      }
      // a piece the catalogue no longer has is empty too
      const piece = pieces.get(entry.piece);
      const spec = resolveSlot(slot, { piece: entry.piece, from: entry.from }, pieces);
      if (piece && spec) {
        slots[slot] = {
          piece: entry.piece,
          ...(entry.from ? { from: entry.from } : {}),
          label: piece.label,
          spec,
          ...settings,
        };
      }
    }
    const params = kitParamsSchema.safeParse(row.params);
    return {
      id: row.id,
      key: row.key,
      label: row.label,
      slots,
      ...(Object.keys(kits[i].pan).length ? { pan: kits[i].pan } : {}),
      ...(params.success ? { params: params.data } : {}),
    };
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

/**
 * What a copy starts from (9-v): a recorded kit's pieces and numbers, or one
 * of your kits whole. A synthesised kit or a machine has no pieces to copy,
 * so it is a 400, as is a key that names nothing you can see.
 */
async function copySource(
  tx: Prisma.TransactionClient,
  userId: string,
  from: string
): Promise<{ label: string; held: Held; params: KitParams | null }> {
  const row = await tx.kit.findFirst({
    where: { key: from, OR: [{ ownerId: null, visibility: 'system' }, OWN(userId)] },
    select: { label: true, engine: true, ownerId: true, params: true, samples: true },
  });
  const usable = row && (row.ownerId !== null || row.engine === 'pack');
  if (!row || !usable) {
    throw new ValidationError('Invalid request body', {
      errors: [{ path: 'from', message: 'Not a recorded kit, or one of yours' }],
    });
  }

  const copied = held(row.samples);
  // a recorded kit's slots are all pieces; anything else in one is not yours to copy
  if (row.ownerId === null) {
    for (const [slot, entry] of Object.entries(copied.slots))
      if (!('piece' in entry)) delete copied.slots[slot];
  }

  /* The numbers come too, so the copy sounds like the kit it came from: the
     recorded kits' master chains differ a good deal (the Dusty sampler is
     low-passed at 9 kHz and driven hard). A kit of yours plays its pieces
     from their folders, so it names no pack. */
  const params = kitParamsSchema.safeParse(row.params);
  let own: KitParams | null = null;
  if (params.success) {
    const { pack: _pack, ...rest } = params.data;
    own = rest;
  }
  return { label: row.label, held: copied, params: own };
}

/**
 * A new kit: empty, or a copy of another (9-v). Refused once you have
 * {@link MAX_YOUR_KITS}.
 */
export async function createYourKit(userId: string, input: CreateYourKit): Promise<YourKitView> {
  const row = await prisma.$transaction(async (tx) => {
    await lockYourKits(tx, userId);
    const count = await tx.kit.count({ where: OWN(userId) });
    if (count >= MAX_YOUR_KITS) {
      throw new APIError(`You can keep ${MAX_YOUR_KITS} kits of your own`, 'KIT_LIMIT', 409);
    }
    const source = input.from ? await copySource(tx, userId, input.from) : null;
    const label = input.label ?? (source ? `My ${source.label}`.slice(0, 80) : 'My kit');

    return tx.kit.create({
      data: {
        ...OWN(userId),
        /* 6 + 32 characters, inside the column's 40. Random rather than derived
           from the id, which does not exist until the row does. */
        key: `${YOUR_KIT_KEY_PREFIX}${crypto.randomUUID().replace(/-/g, '')}`,
        label,
        hint: YOUR_KIT_HINT,
        group: YOUR_KITS_GROUP,
        params: source?.params ?? kitParamsSchema.parse(YOUR_KIT_PARAMS),
        samples: toSamplesColumn(source?.held ?? { slots: {}, pan: {} }),
        visibility: 'private',
      },
      select: KIT_SELECT,
    });
  });
  return (await toViews(userId, [row]))[0];
}

/**
 * Check every slot the patch fills before anything is written: a sample that
 * is not yours, a piece the catalogue does not have, or a slot of a piece it
 * does not fill, is a 400 naming the slot.
 */
async function refuseUnknown(
  tx: Prisma.TransactionClient,
  userId: string,
  slots: NonNullable<UpdateYourKit['slots']>
): Promise<void> {
  const given = Object.entries(slots).filter(
    (e): e is [string, YourKitSlotInput] => e[1] !== null && e[1] !== undefined
  );
  const sampleOf = (v: YourKitSlotInput): string | null =>
    typeof v === 'string' ? v : 'sample' in v ? v.sample : null;

  const ids = [...new Set(given.map(([, v]) => sampleOf(v)).filter((v): v is string => !!v))];
  const found = ids.length
    ? await tx.sample.findMany({ where: { userId, id: { in: ids } }, select: { id: true } })
    : [];
  const mine = new Set(found.map((s) => s.id));
  const pieces = given.some(([, v]) => typeof v !== 'string' && 'piece' in v)
    ? await pieceMap()
    : new Map<string, CataloguePiece>();

  const errors: Array<{ path: string; message: string }> = [];
  for (const [slot, v] of given) {
    const sample = sampleOf(v);
    if (sample !== null) {
      if (!mine.has(sample))
        errors.push({ path: `slots.${slot}`, message: 'Not one of your samples' });
      continue;
    }
    if (typeof v === 'string' || !('piece' in v)) continue;
    const piece = pieces.get(v.piece);
    if (!piece) errors.push({ path: `slots.${slot}.piece`, message: 'No such piece' });
    else if (!piece.slots[v.from ?? slot]) {
      errors.push({
        path: v.from ? `slots.${slot}.from` : `slots.${slot}`,
        message: `${piece.label} has no ${v.from ?? slot}`,
      });
    }
  }
  if (errors.length) throw new ValidationError('Invalid request body', { errors });
}

/** A slot as the patch gives it, as the column stores it. */
function toEntry(v: YourKitSlotInput): Entry {
  if (typeof v === 'string') return { sample: v };
  if ('sample' in v) return { ...settingsOf(v), sample: v.sample };
  return { ...settingsOf(v), piece: v.piece, ...(v.from ? { from: v.from } : {}) };
}

/**
 * Rename a kit of yours, or change its slots or pans. `null` empties a slot,
 * or puts a lane back to its default pan. Anything refused is refused before
 * anything is written. Not yours, or not there, is `null` — the route
 * answers 404.
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

    if (patch.slots || patch.pan) {
      if (patch.slots) await refuseUnknown(tx, userId, patch.slots);
      const kit = held(row.samples);
      for (const [slot, v] of Object.entries(patch.slots ?? {})) {
        if (v) kit.slots[slot] = toEntry(v);
        else delete kit.slots[slot];
      }
      for (const [lane, v] of Object.entries(patch.pan ?? {})) {
        if (v === null || v === undefined) delete kit.pan[lane];
        else kit.pan[lane] = v;
      }
      data.samples = toSamplesColumn(kit);
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
    const kit = held(row.samples);
    const before = Object.keys(kit.slots).length;
    for (const [slot, entry] of Object.entries(kit.slots))
      if ('sample' in entry && entry.sample === sampleId) delete kit.slots[slot];
    if (Object.keys(kit.slots).length === before) continue;
    await tx.kit.update({ where: { id: row.id }, data: { samples: toSamplesColumn(kit) } });
    logger.info('BeatBreaker: cleared a deleted sample from your kit', { kitId: row.id, sampleId });
  }
}
