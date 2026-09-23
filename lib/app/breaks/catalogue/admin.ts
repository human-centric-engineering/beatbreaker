import { z } from 'zod';

import { invalidateCatalogue } from '@/lib/app/breaks/catalogue/data';
import {
  kitParamsSchema,
  kitSamplesSchema,
  libraryEntrySchema,
  styleParamsSchema,
} from '@/lib/app/breaks/catalogue/schemas';
import { packedPatternSchema } from '@/lib/app/breaks/schema';
import { prisma } from '@/lib/db/client';
import { logAdminAction } from '@/lib/orchestration/audit/admin-audit-logger';

/**
 * Writing to the catalogue.
 *
 * **Server-side only**, in the same sense as the read side — see the note in
 * `data.ts`. Nothing here is reachable from a client component.
 *
 * The shapes the admin routes accept, and the two rules that make the write
 * side safe to expose at all:
 *
 * 1. **A style version is never updated.** Editing a style's parameters creates
 *    version n+1 and moves the pointer. Every pattern anyone has saved points
 *    at the version it was generated from, and rewriting that version would
 *    change breaks nobody touched. This is not a convention — there is no
 *    update path here, only `addStyleVersion`.
 *
 * 2. **Columns are derived from parameters, never sent alongside them.** A
 *    style's label, hint and meter live both in the row (so a list query can
 *    read them) and in `params` (so the generator has one object). A request
 *    that could set them separately would let the two disagree, and then "which
 *    one is the style called" has two answers.
 *
 * Every write records an audit entry and invalidates the `catalogue` cache tag.
 * The audit entry is what makes D10 workable — a credit corrected without a
 * deploy still has to be a correction somebody can find later.
 */

const KEY = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'a key is lower-case letters, digits and hyphens');

export const createStyleSchema = z.object({
  key: KEY,
  group: z.string().min(1).max(60),
  position: z.number().int().min(0).max(999).default(0),
  params: styleParamsSchema,
});

/** Metadata only — the parameters move by adding a version. */
export const patchStyleSchema = z
  .object({
    group: z.string().min(1).max(60).optional(),
    position: z.number().int().min(0).max(999).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'nothing to change');

export const addStyleVersionSchema = z.object({
  params: styleParamsSchema,
  note: z.string().max(200).default(''),
});

export const createEntrySchema = libraryEntrySchema.extend({
  doc: packedPatternSchema,
  position: z.number().int().min(0).max(9999).optional(),
});

export const patchEntrySchema = libraryEntrySchema
  .partial()
  .extend({ doc: packedPatternSchema.optional() })
  .refine((v) => Object.keys(v).length > 0, 'nothing to change');

export const patchKitSchema = z
  .object({
    label: z.string().min(1).max(80).optional(),
    hint: z.string().max(800).optional(),
    group: z.string().min(1).max(60).optional(),
    credit: z.string().max(600).nullable().optional(),
    position: z.number().int().min(0).max(999).optional(),
    params: kitParamsSchema.optional(),
    samples: kitSamplesSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'nothing to change');

/** Who did it and from where, for the audit entry. */
export interface Actor {
  userId: string;
  clientIp: string | null;
}

/**
 * Record the change and drop the cache.
 *
 * One helper rather than two calls per route, because forgetting the second is
 * a bug you only see as "my edit did not take" some minutes later, on a page
 * you were not looking at.
 */
function recorded(
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  entityName: string,
  metadata?: Record<string, unknown>
): void {
  logAdminAction({
    userId: actor.userId,
    action,
    entityType,
    entityId,
    entityName,
    metadata: metadata ?? null,
    clientIp: actor.clientIp,
  });
  invalidateCatalogue();
}

/** A new system style, at version 1. */
export async function createStyle(
  input: z.infer<typeof createStyleSchema>,
  actor: Actor
): Promise<{ id: string; key: string }> {
  const { key, group, position, params } = input;

  const style = await prisma.$transaction(async (tx) => {
    const row = await tx.style.create({
      data: {
        key,
        group,
        position,
        label: params.label,
        hint: params.hint,
        meter: params.meter ?? '4/4',
        visibility: 'system',
        currentVersion: 1,
      },
      select: { id: true, key: true },
    });
    await tx.styleVersion.create({
      data: {
        styleId: row.id,
        version: 1,
        params,
        createdById: actor.userId,
      },
    });
    return row;
  });

  recorded(actor, 'catalogue.style.create', 'style', style.id, params.label);
  return style;
}

/**
 * A new version of an existing style.
 *
 * The version number is read inside the transaction and the unique constraint
 * on `(styleId, version)` is what settles a race — two admins saving at once
 * get one success and one retry rather than two rows claiming to be version 3.
 */
export async function addStyleVersion(
  key: string,
  input: z.infer<typeof addStyleVersionSchema>,
  actor: Actor
): Promise<{ version: number } | null> {
  const style = await prisma.style.findFirst({
    where: { key, ownerId: null },
    select: { id: true, currentVersion: true, label: true },
  });
  if (!style) return null;

  const { params, note } = input;
  const version = await prisma.$transaction(async (tx) => {
    const latest = await tx.styleVersion.findFirst({
      where: { styleId: style.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const next = (latest?.version ?? 0) + 1;
    await tx.styleVersion.create({
      data: {
        styleId: style.id,
        version: next,
        params,
        note,
        createdById: actor.userId,
      },
    });
    /* The columns follow the parameters, in the same transaction. A label that
       changed in `params` but not in the row would show one name in the picker
       and another in the generator. */
    await tx.style.update({
      where: { id: style.id },
      data: {
        currentVersion: next,
        label: params.label,
        hint: params.hint,
        meter: params.meter ?? '4/4',
      },
    });
    return next;
  });

  recorded(actor, 'catalogue.style.version', 'style', style.id, params.label, {
    version,
    previous: style.currentVersion,
    note,
  });
  return { version };
}

/** Where a style sits in the picker. Nothing the generator reads. */
export async function patchStyle(
  key: string,
  input: z.infer<typeof patchStyleSchema>,
  actor: Actor
): Promise<boolean> {
  const style = await prisma.style.findFirst({
    where: { key, ownerId: null },
    select: { id: true, label: true },
  });
  if (!style) return false;

  await prisma.style.update({ where: { id: style.id }, data: input });
  recorded(actor, 'catalogue.style.update', 'style', style.id, style.label, { ...input });
  return true;
}

/**
 * Add a pattern to a library.
 *
 * With no `position` it goes on the end. `(libraryId, position)` is unique, so
 * inserting into the middle is a reorder rather than a create — deliberately
 * not supported here: it would be a multi-row rewrite behind a single-row verb.
 */
export async function createEntry(
  libraryKey: string,
  input: z.infer<typeof createEntrySchema>,
  actor: Actor
): Promise<{ id: string } | null> {
  const library = await prisma.patternLibrary.findFirst({
    where: { key: libraryKey, ownerId: null },
    select: { id: true, title: true },
  });
  if (!library) return null;

  const { position, doc, ...fields } = input;
  const at =
    position ??
    ((
      await prisma.libraryEntry.findFirst({
        where: { libraryId: library.id },
        orderBy: { position: 'desc' },
        select: { position: true },
      })
    )?.position ?? -1) + 1;

  const entry = await prisma.libraryEntry.create({
    data: {
      libraryId: library.id,
      position: at,
      ...fields,
      note: fields.note ?? null,
      doc: doc,
    },
    select: { id: true },
  });

  recorded(actor, 'catalogue.entry.create', 'library_entry', entry.id, fields.title, {
    library: library.title,
    position: at,
  });
  return entry;
}

/** Correct an entry — a title, a credit, a note, or the pattern itself (D10). */
export async function patchEntry(
  id: string,
  input: z.infer<typeof patchEntrySchema>,
  actor: Actor
): Promise<boolean> {
  const entry = await prisma.libraryEntry.findUnique({ where: { id }, select: { title: true } });
  if (!entry) return false;

  const { doc, note, ...rest } = input;
  await prisma.libraryEntry.update({
    where: { id },
    data: {
      ...rest,
      ...(note !== undefined ? { note: note ?? null } : {}),
      ...(doc ? { doc: doc } : {}),
    },
  });

  recorded(actor, 'catalogue.entry.update', 'library_entry', id, entry.title, {
    fields: Object.keys(input),
  });
  return true;
}

/**
 * Remove an entry.
 *
 * A real delete, not a flag: an entry taken down because the credit was wrong
 * or the rights holder objected (D10) has to actually go. Patterns people made
 * from it are their own rows and are untouched — a library entry is a starting
 * point, not a parent.
 */
export async function deleteEntry(id: string, actor: Actor): Promise<boolean> {
  const entry = await prisma.libraryEntry.findUnique({ where: { id }, select: { title: true } });
  if (!entry) return false;

  await prisma.libraryEntry.delete({ where: { id } });
  recorded(actor, 'catalogue.entry.delete', 'library_entry', id, entry.title);
  return true;
}

/** A kit's metadata, its knobs, or the credit CC BY 4.0 asks for. */
export async function patchKit(
  key: string,
  input: z.infer<typeof patchKitSchema>,
  actor: Actor
): Promise<boolean> {
  const kit = await prisma.kit.findFirst({
    where: { key, ownerId: null },
    select: { id: true, label: true },
  });
  if (!kit) return false;

  const { params, samples, credit, ...rest } = input;
  await prisma.kit.update({
    where: { id: kit.id },
    data: {
      ...rest,
      ...(credit !== undefined ? { credit: credit ?? null } : {}),
      ...(params ? { params: params } : {}),
      ...(samples ? { samples: samples } : {}),
    },
  });

  recorded(actor, 'catalogue.kit.update', 'kit', kit.id, kit.label, {
    fields: Object.keys(input),
  });
  return true;
}
