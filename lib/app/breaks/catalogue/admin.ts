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

/* The `meter` column has to say what the document says. It is what the library
   panel prints, while loading the entry sets the transport from
   `patternFromPacked(entry.doc).meter` — so a row advertising 7/4 whose
   document is in 4/4 shows one meter and plays another, and nothing errors.
   The seed derives the column from the document (`001-catalogue.ts`); the admin
   write path is held to the same thing, named rather than silently corrected. */
const meterMatchesDoc = (v: { meter?: string; doc?: { mt?: string } }): boolean =>
  v.meter === undefined || v.doc === undefined || v.meter === (v.doc.mt ?? '4/4');
const METER_MISMATCH = { message: "meter must match the document's own", path: ['meter'] };

export const createEntrySchema = libraryEntrySchema
  .extend({
    doc: packedPatternSchema,
    position: z.number().int().min(0).max(9999).optional(),
  })
  .refine(meterMatchesDoc, METER_MISMATCH);

export const patchEntrySchema = libraryEntrySchema
  .partial()
  .extend({ doc: packedPatternSchema.optional() })
  .refine((v) => Object.keys(v).length > 0, 'nothing to change')
  /* Only catches the both-supplied case. A patch that moves one of them alone
     is checked in `patchEntry`, against whichever half is already stored. */
  .refine(meterMatchesDoc, METER_MISMATCH);

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

  /* Read-then-create in one transaction. `(libraryId, position)` is unique, so
     two admins appending to the same library at once otherwise compute the same
     index and the loser gets a P2002 surfaced as a 409 with nothing to retry.
     The read is the reason the write needs a transaction at all. */
  const entry = await prisma.$transaction(async (tx) => {
    const at =
      position ??
      ((
        await tx.libraryEntry.findFirst({
          where: { libraryId: library.id },
          orderBy: { position: 'desc' },
          select: { position: true },
        })
      )?.position ?? -1) + 1;

    return tx.libraryEntry.create({
      data: {
        libraryId: library.id,
        position: at,
        ...fields,
        note: fields.note ?? null,
        doc: doc,
      },
      select: { id: true, position: true },
    });
  });
  const at = entry.position;

  recorded(actor, 'catalogue.entry.create', 'library_entry', entry.id, fields.title, {
    library: library.title,
    position: at,
  });
  /* `{ id }`, not `entry` — the create selects `position` back so the audit
     line can name the index that was actually taken, and that is an internal
     need. Returning the row as-is would widen the declared contract by a field
     the caller never asked for. */
  return { id: entry.id };
}

/** Correct an entry — a title, a credit, a note, or the pattern itself (D10). */
/**
 * One entry, but only if it is in the library the URL named.
 *
 * `findUnique({ where: { id } })` is the obvious version and it makes the
 * `[key]` segment decorative: `DELETE …/libraries/anything-at-all/entries/<id>`
 * would delete the entry and write an audit line naming a library the row was
 * never in. The sibling list/create route resolves the library and 404s on a
 * bad key, so the pair read as scoped while only one of them was.
 *
 * `ownerId: null` is on the library rather than the entry because that is where
 * ownership lives. It is redundant today — every library is a system row — and
 * it is the line that keeps this from becoming a cross-owner write the day a
 * user owns a library.
 */
async function entryIn(
  libraryKey: string,
  id: string
): Promise<{ title: string; meter: string; doc: unknown } | null> {
  return prisma.libraryEntry.findFirst({
    where: { id, library: { key: libraryKey, ownerId: null } },
    select: { title: true, meter: true, doc: true },
  });
}

export async function patchEntry(
  libraryKey: string,
  id: string,
  input: z.infer<typeof patchEntrySchema>,
  actor: Actor
): Promise<boolean> {
  const entry = await entryIn(libraryKey, id);
  if (!entry) return false;

  /* The schema rejects a patch that supplies both halves and disagrees. A
     ONE-SIDED patch cannot be judged there — replacing only `doc`, or moving
     only `meter`, puts the column and the document out of step just as
     effectively — so the column is derived from whichever document the row ends
     up with. The document is the source of truth (the seed derives the column
     the same way); returning an error here would have to travel as the route's
     410, which is not what a bad field means. */
  const { doc, note, ...rest } = input;
  const finalDoc = doc ?? packedPatternSchema.parse(entry.doc);

  await prisma.libraryEntry.update({
    where: { id },
    data: {
      ...rest,
      meter: finalDoc.mt ?? '4/4',
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
export async function deleteEntry(libraryKey: string, id: string, actor: Actor): Promise<boolean> {
  const entry = await entryIn(libraryKey, id);
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
