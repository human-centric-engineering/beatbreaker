import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The catalogue's write side, and the two rules that make it safe to expose
 * at all (`.context/app/catalogue.md` §"A style is edited by adding a
 * version"):
 *
 * 1. A style version is never updated — editing writes version n+1 and moves
 *    `Style.currentVersion`. There is no update path; `addStyleVersion` is the
 *    only way a parameter change reaches the database.
 * 2. Every write is audited and invalidates the catalogue cache, in that
 *    order relative to the transaction — a write that succeeded but was never
 *    logged, or that left a stale read behind, are both real incidents this
 *    guards against.
 *
 * `prisma.$transaction` is mocked to hand its callback the same object every
 * write in this file talks to — `tx` below — so a test can assert both "this
 * table was written" and "that one was not touched", in one transaction,
 * which is the actual claim `addStyleVersion`'s test makes.
 */

const tx = {
  style: { create: vi.fn(), update: vi.fn() },
  styleVersion: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
};

vi.mock('@/lib/db/client', () => ({
  prisma: {
    style: { findFirst: vi.fn(), update: vi.fn() },
    patternLibrary: { findFirst: vi.fn() },
    libraryEntry: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    kit: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(tx)),
  },
}));

vi.mock('@/lib/orchestration/audit/admin-audit-logger', () => ({
  logAdminAction: vi.fn(),
}));

vi.mock('@/lib/app/breaks/catalogue/data', () => ({
  invalidateCatalogue: vi.fn(),
}));

import {
  addStyleVersion,
  createEntry,
  createStyle,
  deleteEntry,
  patchEntry,
  patchEntrySchema,
  patchKit,
  patchKitSchema,
  patchStyle,
  patchStyleSchema,
  type Actor,
} from '@/lib/app/breaks/catalogue/admin';
import { invalidateCatalogue } from '@/lib/app/breaks/catalogue/data';
import {
  kitParamsSchema,
  kitSamplesSchema,
  styleParamsSchema,
} from '@/lib/app/breaks/catalogue/schemas';
import { prisma } from '@/lib/db/client';
import { logAdminAction } from '@/lib/orchestration/audit/admin-audit-logger';
import { testLibrary, testStyle } from '@/tests/helpers/catalogue';

const ACTOR: Actor = { userId: 'admin-1', clientIp: '10.0.0.1' };
// Parsed through the real schema rather than cast: `admin.ts`'s functions take
// `z.infer<typeof styleParamsSchema>`, and the seed data is typed as the
// hand-written `Style` interface — structurally the same shape, but a plain
// cast would paper over a real divergence between the two instead of proving
// there isn't one.
const FUNK_PARAMS = styleParamsSchema.parse(testStyle('funk').params);
// Minimal-but-valid: `master` and the seven voices are required objects, but
// every field inside each is optional, so `{}` satisfies the schema without
// pulling in a real engine's numbers.
const KIT_PARAMS = kitParamsSchema.parse({
  master: {},
  k: {},
  s: {},
  h: {},
  r: {},
  c: {},
  t: {},
  p: {},
});
// Every field of kitSamplesSchema is optional — `{}` is "no samples", which is
// itself a value worth writing (it is what a fresh kit with no recordings yet
// looks like).
const KIT_SAMPLES = kitSamplesSchema.parse({});

beforeEach(() => {
  // `clearAllMocks` only clears call history, not implementations — so the
  // `$transaction` factory above (which hands its callback `tx`) survives
  // this and needs no re-wiring per test.
  vi.clearAllMocks();
});

/**
 * `patchStyleSchema`, `patchEntrySchema` and `patchKitSchema` all share the
 * same `.refine((v) => Object.keys(v).length > 0, 'nothing to change')` — a
 * `PATCH` with no fields at all is indistinguishable from a client bug (a
 * form that submitted before anything was edited), and rejecting it at the
 * schema means the route never has to special-case an empty `data: {}` on
 * the way into Prisma. The three admin functions that consume these schemas
 * (`patchStyle`, `patchEntry`, `patchKit`) take already-parsed input, so the
 * refine itself is only reachable by parsing directly — the same thing the
 * routes that own these schemas do.
 */
describe('the "nothing to change" refine shared by every patch schema', () => {
  it('patchStyleSchema rejects an empty patch and accepts a real one', () => {
    expect(patchStyleSchema.safeParse({}).success).toBe(false);
    expect(patchStyleSchema.safeParse({ group: 'New group' }).success).toBe(true);
  });

  it('patchEntrySchema rejects an empty patch and accepts a real one', () => {
    expect(patchEntrySchema.safeParse({}).success).toBe(false);
    expect(patchEntrySchema.safeParse({ title: 'New title' }).success).toBe(true);
  });

  it('patchKitSchema rejects an empty patch and accepts a real one', () => {
    expect(patchKitSchema.safeParse({}).success).toBe(false);
    expect(patchKitSchema.safeParse({ label: 'New label' }).success).toBe(true);
  });
});

describe('addStyleVersion', () => {
  it('creates a new styleVersion row and never updates an existing one', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue({
      id: 'style-1',
      currentVersion: 1,
      label: 'Funk',
    } as never);
    vi.mocked(tx.styleVersion.findFirst).mockResolvedValue({ version: 1 });
    vi.mocked(tx.styleVersion.create).mockResolvedValue({});
    vi.mocked(tx.style.update).mockResolvedValue({});

    const result = await addStyleVersion('funk', { params: FUNK_PARAMS, note: 'retune' }, ACTOR);

    expect(result).toEqual({ version: 2 });
    expect(tx.styleVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ styleId: 'style-1', version: 2, params: FUNK_PARAMS }),
      })
    );
    // The whole point of the immutability rule: no update method on
    // styleVersion is ever called, in this write or any other in this file.
    expect(tx.styleVersion.update).not.toHaveBeenCalled();
  });

  it('moves the columns that mirror params in the same transaction — not a second write', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue({
      id: 'style-1',
      currentVersion: 1,
      label: 'Funk',
    } as never);
    vi.mocked(tx.styleVersion.findFirst).mockResolvedValue({ version: 1 });
    vi.mocked(tx.styleVersion.create).mockResolvedValue({});
    vi.mocked(tx.style.update).mockResolvedValue({});

    await addStyleVersion('funk', { params: FUNK_PARAMS, note: '' }, ACTOR);

    // Called on `tx`, so it is inside the same transaction as the version
    // create — a label that changed in params but not in the row would show
    // one name in the picker and another in the generator.
    expect(tx.style.update).toHaveBeenCalledWith({
      where: { id: 'style-1' },
      data: {
        currentVersion: 2,
        label: FUNK_PARAMS.label,
        hint: FUNK_PARAMS.hint,
        meter: FUNK_PARAMS.meter ?? '4/4',
      },
    });
    expect(prisma.style.update).not.toHaveBeenCalled();
  });

  it('audits the write and invalidates the cache', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue({
      id: 'style-1',
      currentVersion: 1,
      label: 'Funk',
    } as never);
    vi.mocked(tx.styleVersion.findFirst).mockResolvedValue({ version: 1 });
    vi.mocked(tx.styleVersion.create).mockResolvedValue({});
    vi.mocked(tx.style.update).mockResolvedValue({});

    await addStyleVersion('funk', { params: FUNK_PARAMS, note: 'retune' }, ACTOR);

    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ userId: ACTOR.userId, action: 'catalogue.style.version' })
    );
    expect(invalidateCatalogue).toHaveBeenCalledTimes(1);
  });

  it('starts numbering at 1 when the style has no prior version row', async () => {
    // A style created before this rule existed, or repaired by hand, could in
    // principle have zero rows in `styleVersion`. `latest?.version ?? 0` is
    // what keeps that case starting at 1 instead of crashing on
    // `undefined + 1`.
    vi.mocked(prisma.style.findFirst).mockResolvedValue({
      id: 'style-2',
      currentVersion: 0,
      label: 'Orphan',
    } as never);
    vi.mocked(tx.styleVersion.findFirst).mockResolvedValue(null);
    vi.mocked(tx.styleVersion.create).mockResolvedValue({});
    vi.mocked(tx.style.update).mockResolvedValue({});

    const result = await addStyleVersion('orphan', { params: FUNK_PARAMS, note: '' }, ACTOR);

    expect(result).toEqual({ version: 1 });
    expect(tx.styleVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: 1 }) })
    );
  });

  it('returns null, without touching the transaction or the audit log, for a style that is not there', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue(null);

    const result = await addStyleVersion('no-such-style', { params: FUNK_PARAMS, note: '' }, ACTOR);

    expect(result).toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(logAdminAction).not.toHaveBeenCalled();
    expect(invalidateCatalogue).not.toHaveBeenCalled();
  });
});

describe('createStyle', () => {
  it('writes the style row and its version 1 in one transaction, and audits it', async () => {
    vi.mocked(tx.style.create).mockResolvedValue({ id: 'style-9', key: 'newstyle' });
    vi.mocked(tx.styleVersion.create).mockResolvedValue({});

    const result = await createStyle(
      { key: 'newstyle', group: 'Classic', position: 0, params: FUNK_PARAMS },
      ACTOR
    );

    expect(result).toEqual({ id: 'style-9', key: 'newstyle' });
    expect(tx.style.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'newstyle',
          currentVersion: 1,
          label: FUNK_PARAMS.label,
        }),
      })
    );
    expect(tx.styleVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: 1, styleId: 'style-9' }) })
    );
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalogue.style.create' })
    );
    expect(invalidateCatalogue).toHaveBeenCalledTimes(1);
  });
});

describe('patchStyle', () => {
  it('returns false without writing for a key that does not exist', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue(null);

    const result = await patchStyle('ghost', { group: 'New' }, ACTOR);

    expect(result).toBe(false);
    expect(prisma.style.update).not.toHaveBeenCalled();
    expect(logAdminAction).not.toHaveBeenCalled();
    expect(invalidateCatalogue).not.toHaveBeenCalled();
  });

  it('updates only what it was given — position and heading, never parameters — and audits it', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue({ id: 'style-1', label: 'Funk' } as never);
    vi.mocked(prisma.style.update).mockResolvedValue({} as never);

    const result = await patchStyle('funk', { group: 'New group', position: 2 }, ACTOR);

    expect(result).toBe(true);
    expect(prisma.style.update).toHaveBeenCalledWith({
      where: { id: 'style-1' },
      data: { group: 'New group', position: 2 },
    });
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalogue.style.update' })
    );
    expect(invalidateCatalogue).toHaveBeenCalledTimes(1);
  });
});

describe('createEntry', () => {
  const entry = testLibrary().entries[0];
  if (!entry) throw new Error('seed library has no entries to build a fixture from');
  const entryInput = {
    group: entry.group,
    title: entry.title,
    artist: entry.artist,
    note: entry.note,
    bpm: entry.bpm,
    styleKey: entry.styleKey,
    meter: entry.meter,
    doc: entry.doc,
  };

  it('appends to the end when no position is given', async () => {
    vi.mocked(prisma.patternLibrary.findFirst).mockResolvedValue({
      id: 'lib-1',
      title: 'Famous breaks',
    } as never);
    vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue({ position: 3 } as never);
    vi.mocked(prisma.libraryEntry.create).mockResolvedValue({ id: 'entry-9' } as never);

    const result = await createEntry('famous-breaks', entryInput, ACTOR);

    expect(result).toEqual({ id: 'entry-9' });
    expect(prisma.libraryEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 4, libraryId: 'lib-1' }),
      })
    );
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalogue.entry.create' })
    );
    expect(invalidateCatalogue).toHaveBeenCalledTimes(1);
  });

  it('does not look up the current max position when one is given explicitly', async () => {
    vi.mocked(prisma.patternLibrary.findFirst).mockResolvedValue({
      id: 'lib-1',
      title: 'Famous breaks',
    } as never);
    vi.mocked(prisma.libraryEntry.create).mockResolvedValue({ id: 'entry-9' } as never);

    await createEntry('famous-breaks', { ...entryInput, position: 0 }, ACTOR);

    expect(prisma.libraryEntry.findFirst).not.toHaveBeenCalled();
    expect(prisma.libraryEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 0 }) })
    );
  });

  it('returns null without writing for a library that does not exist', async () => {
    vi.mocked(prisma.patternLibrary.findFirst).mockResolvedValue(null);

    const result = await createEntry('no-such-library', entryInput, ACTOR);

    expect(result).toBeNull();
    expect(prisma.libraryEntry.create).not.toHaveBeenCalled();
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  it('starts at position 0 for a library that has no entries yet', async () => {
    // `findFirst` returning nothing (an empty library) is a different case
    // from "returned a row" — `?.position ?? -1` is what keeps the very first
    // entry at 0 instead of the whole expression producing `NaN` from
    // `undefined + 1`.
    vi.mocked(prisma.patternLibrary.findFirst).mockResolvedValue({
      id: 'lib-empty',
      title: 'New library',
    } as never);
    vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.libraryEntry.create).mockResolvedValue({ id: 'entry-1' } as never);

    await createEntry('new-library', entryInput, ACTOR);

    expect(prisma.libraryEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 0 }) })
    );
  });

  it('writes a null note when the caller sends none — not the string "undefined"', async () => {
    vi.mocked(prisma.patternLibrary.findFirst).mockResolvedValue({
      id: 'lib-1',
      title: 'Famous breaks',
    } as never);
    vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue({ position: 3 } as never);
    vi.mocked(prisma.libraryEntry.create).mockResolvedValue({ id: 'entry-9' } as never);

    const { note: _note, ...withoutNote } = entryInput;
    void _note;

    await createEntry('famous-breaks', withoutNote, ACTOR);

    expect(prisma.libraryEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ note: null }) })
    );
  });
});

describe('patchEntry', () => {
  it('returns false for an id that does not exist', async () => {
    vi.mocked(prisma.libraryEntry.findUnique).mockResolvedValue(null);

    const result = await patchEntry('ghost', { title: 'New title' }, ACTOR);

    expect(result).toBe(false);
    expect(prisma.libraryEntry.update).not.toHaveBeenCalled();
  });

  it('corrects a field and audits it — D10, a correction landing without a deploy', async () => {
    vi.mocked(prisma.libraryEntry.findUnique).mockResolvedValue({ title: 'Old title' } as never);
    vi.mocked(prisma.libraryEntry.update).mockResolvedValue({} as never);

    const result = await patchEntry('entry-1', { title: 'Corrected title' }, ACTOR);

    expect(result).toBe(true);
    expect(prisma.libraryEntry.update).toHaveBeenCalledWith({
      where: { id: 'entry-1' },
      data: { title: 'Corrected title' },
    });
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalogue.entry.update' })
    );
    expect(invalidateCatalogue).toHaveBeenCalledTimes(1);
  });

  it('writes an explicit null when a note is cleared — distinct from "not sent"', async () => {
    // `patchStyle`'s sibling: `note !== undefined` is what tells "clear the
    // note" (send `null`) apart from "leave the note alone" (don't send the
    // key). Collapsing that to a plain `??` would make a cleared note
    // impossible to write — every clear would look identical to "no change".
    vi.mocked(prisma.libraryEntry.findUnique).mockResolvedValue({ title: 'Some title' } as never);
    vi.mocked(prisma.libraryEntry.update).mockResolvedValue({} as never);

    const result = await patchEntry('entry-1', { note: null }, ACTOR);

    expect(result).toBe(true);
    expect(prisma.libraryEntry.update).toHaveBeenCalledWith({
      where: { id: 'entry-1' },
      data: { note: null },
    });
  });

  it('replaces the pattern body when doc is part of the patch — D10, correcting the pattern itself', async () => {
    const doc = testLibrary().entries[0]?.doc;
    if (!doc) throw new Error('seed library has no entries to build a fixture from');
    vi.mocked(prisma.libraryEntry.findUnique).mockResolvedValue({ title: 'Some title' } as never);
    vi.mocked(prisma.libraryEntry.update).mockResolvedValue({} as never);

    const result = await patchEntry('entry-1', { doc }, ACTOR);

    expect(result).toBe(true);
    expect(prisma.libraryEntry.update).toHaveBeenCalledWith({
      where: { id: 'entry-1' },
      data: { doc },
    });
  });
});

describe('deleteEntry', () => {
  it('returns false for an id that does not exist, and does not touch the audit log', async () => {
    vi.mocked(prisma.libraryEntry.findUnique).mockResolvedValue(null);

    const result = await deleteEntry('ghost', ACTOR);

    expect(result).toBe(false);
    expect(prisma.libraryEntry.delete).not.toHaveBeenCalled();
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  it('is a real delete — the row is gone, and the removal is itself audited', async () => {
    vi.mocked(prisma.libraryEntry.findUnique).mockResolvedValue({
      title: 'Funky Drummer',
    } as never);
    vi.mocked(prisma.libraryEntry.delete).mockResolvedValue({} as never);

    const result = await deleteEntry('entry-1', ACTOR);

    expect(result).toBe(true);
    expect(prisma.libraryEntry.delete).toHaveBeenCalledWith({ where: { id: 'entry-1' } });
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalogue.entry.delete' })
    );
    expect(invalidateCatalogue).toHaveBeenCalledTimes(1);
  });
});

describe('patchKit', () => {
  it('returns false for a key that does not exist', async () => {
    vi.mocked(prisma.kit.findFirst).mockResolvedValue(null);

    const result = await patchKit('ghost', { credit: 'Someone' }, ACTOR);

    expect(result).toBe(false);
    expect(prisma.kit.update).not.toHaveBeenCalled();
  });

  it('updates the credit CC BY 4.0 asks for, and audits it', async () => {
    vi.mocked(prisma.kit.findFirst).mockResolvedValue({
      id: 'kit-1',
      label: "Studio '70s",
    } as never);
    vi.mocked(prisma.kit.update).mockResolvedValue({} as never);

    const result = await patchKit('studio70', { credit: 'Recorded by Someone' }, ACTOR);

    expect(result).toBe(true);
    expect(prisma.kit.update).toHaveBeenCalledWith({
      where: { id: 'kit-1' },
      data: { credit: 'Recorded by Someone' },
    });
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalogue.kit.update' })
    );
    expect(invalidateCatalogue).toHaveBeenCalledTimes(1);
  });

  it('writes an explicit null when a credit is cleared — the CC BY 4.0 line taken away, not left stale', async () => {
    vi.mocked(prisma.kit.findFirst).mockResolvedValue({
      id: 'kit-1',
      label: "Studio '70s",
    } as never);
    vi.mocked(prisma.kit.update).mockResolvedValue({} as never);

    const result = await patchKit('studio70', { credit: null }, ACTOR);

    expect(result).toBe(true);
    expect(prisma.kit.update).toHaveBeenCalledWith({
      where: { id: 'kit-1' },
      data: { credit: null },
    });
  });

  it('leaves the credit key out entirely when the patch does not mention it', async () => {
    // The other half of the `credit !== undefined` check: a patch that only
    // moves the kit's label must not overwrite the credit with `null` just
    // because the field was absent from the request.
    vi.mocked(prisma.kit.findFirst).mockResolvedValue({
      id: 'kit-1',
      label: "Studio '70s",
    } as never);
    vi.mocked(prisma.kit.update).mockResolvedValue({} as never);

    await patchKit('studio70', { label: 'New label' }, ACTOR);

    expect(prisma.kit.update).toHaveBeenCalledWith({
      where: { id: 'kit-1' },
      data: { label: 'New label' },
    });
  });

  it("writes the engine's own numbers when params are part of the patch", async () => {
    vi.mocked(prisma.kit.findFirst).mockResolvedValue({
      id: 'kit-1',
      label: "Studio '70s",
    } as never);
    vi.mocked(prisma.kit.update).mockResolvedValue({} as never);

    await patchKit('studio70', { params: KIT_PARAMS }, ACTOR);

    expect(prisma.kit.update).toHaveBeenCalledWith({
      where: { id: 'kit-1' },
      data: { params: KIT_PARAMS },
    });
  });

  it('writes new sample slots when samples are part of the patch', async () => {
    vi.mocked(prisma.kit.findFirst).mockResolvedValue({
      id: 'kit-1',
      label: "Studio '70s",
    } as never);
    vi.mocked(prisma.kit.update).mockResolvedValue({} as never);

    await patchKit('studio70', { samples: KIT_SAMPLES }, ACTOR);

    expect(prisma.kit.update).toHaveBeenCalledWith({
      where: { id: 'kit-1' },
      data: { samples: KIT_SAMPLES },
    });
  });
});
