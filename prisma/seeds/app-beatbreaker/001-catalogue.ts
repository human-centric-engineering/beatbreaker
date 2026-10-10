import { readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { z } from 'zod';

import {
  kitParamsSchema,
  kitSampleSlotSchema,
  kitSamplesSchema,
  styleParamsSchema,
} from '@/lib/app/breaks/catalogue/schemas';
import { kitEngine } from '@/lib/app/breaks/kit';
import { KIT_CREDITS } from '@/lib/app/breaks/kit-credits.generated';
import { patternFromLibrary } from '@/lib/app/breaks/library';
import { packPattern } from '@/lib/app/breaks/share';
import type { ResolvedStyle } from '@/lib/app/breaks/types';
import { KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';
import { LIBRARY } from '@/prisma/seeds/app-beatbreaker/data/library';
import { STYLES, STYLE_GROUPS } from '@/prisma/seeds/app-beatbreaker/data/styles';
import type { SeedContext, SeedUnit } from '@/prisma/runner';
import { type Manifest, derivePieces, packPieceMap } from '@/scripts/kits/pieces';
import { RECIPES } from '@/scripts/kits/recipes';

/**
 * The catalogue: 70 styles, 47 famous breaks, 24 kits and the pieces they are made of.
 *
 * This is where content became data (D13). The three tables it fills used to be
 * three TypeScript constants compiled into the app; the constants are still the
 * source, but they live under `data/` now and **only this file imports them**.
 *
 * Three rules it is built around:
 *
 * 1. **Re-seeding is a no-op.** Everything is upserted by key. The runner also
 *    skips a unit whose content hash has not moved, but that is an
 *    optimisation, not the guarantee — the guarantee is that running this twice
 *    leaves the database in the same state as running it once.
 *
 * 2. **A style is never edited in place.** Changing a style's parameters here
 *    adds a **new version** and moves `currentVersion`. The old version stays,
 *    because breaks people saved point at it and immutable versions are what
 *    makes "the same seed gives the same break" true across a retune.
 *
 * 3. **A library entry is stored as a document, not as a bar string.** The bar
 *    strings in `data/library.ts` are parsed once, here, and what lands in the
 *    row is a wire-v4 packed pattern with its style's snapshot baked in. So a
 *    client shows an entry without the parser, and editing a style later does
 *    not silently change how Funky Drummer plays.
 */

const here = dirname(fileURLToPath(import.meta.url));

/** Where the recorded kits' audio lives, and the map of what is in each pack. */
const MANIFEST = join(here, '..', '..', '..', 'public', 'kits', 'manifest.json');

/** Which heading a style files under, and where in it. Presentation only. */
function shelfOf(key: string): { group: string; position: number } {
  for (const [group, keys] of STYLE_GROUPS) {
    const position = keys.indexOf(key);
    if (position >= 0) return { group, position };
  }
  /* A style not named in STYLE_GROUPS still ships — under "Other", at the end.
     That has always been the rule and it matters more now: a fork adds a style
     to the table without having to edit the grouping. */
  return { group: 'Other', position: 999 };
}

/** The one library the famous breaks live in. */
const LIBRARY_KEY = 'famous-breaks';

/**
 * Find a system row by key.
 *
 * Not `upsert({ where: { ownerId_key: { ownerId: null, key } } })`, which is
 * what you reach for and which does not work: Prisma types a compound unique's
 * fields as non-null, and Postgres would not match on it either, because NULLs
 * are distinct in a unique index. Uniqueness among system rows is the partial
 * index `<table>_system_key_key` — see the migration — and a find-then-write is
 * how you use one.
 */
type SystemDelegate<Row> = {
  findFirst(args: {
    where: { key: string; ownerId: null };
    select: { id: true };
  }): Promise<{ id: string } | null>;
  create(args: { data: Row; select: { id: true } }): Promise<{ id: string }>;
  update(args: {
    where: { id: string };
    data: Partial<Row>;
    select: { id: true };
  }): Promise<{ id: string }>;
};

async function upsertSystemRow<Row extends { key: string }>(
  table: SystemDelegate<Row>,
  key: string,
  create: Row,
  update: Partial<Row>
): Promise<string> {
  const found = await table.findFirst({ where: { key, ownerId: null }, select: { id: true } });
  if (!found) return (await table.create({ data: create, select: { id: true } })).id;
  return (await table.update({ where: { id: found.id }, data: update, select: { id: true } })).id;
}

async function seedStyles({ prisma, logger }: SeedContext): Promise<Map<string, ResolvedStyle>> {
  const resolved = new Map<string, ResolvedStyle>();
  let added = 0;
  let versioned = 0;

  for (const [key, style] of Object.entries(STYLES)) {
    /* Validated on the way in as well as on the way out. The seed data is
       ours and type-checked, so this is not about catching a hostile value —
       it is about the schema and the table being held to each other. A field
       added to `Style` and forgotten here fails the seed rather than shipping
       a style the generator silently reads less of. */
    const params = styleParamsSchema.parse(style);
    const { group, position } = shelfOf(key);

    const shared = {
      key,
      label: params.label,
      hint: params.hint,
      meter: params.meter ?? '4/4',
      group,
      position,
    };
    const styleId = await upsertSystemRow(
      prisma.style as never,
      key,
      { ...shared, visibility: 'system', currentVersion: 1 },
      shared
    );

    /* The latest version, not `currentVersion`'s: if a previous seed was
       interrupted between writing a version and moving the pointer, reading
       the pointer would write version 2 twice and hit the unique constraint. */
    const current = await prisma.styleVersion.findFirst({
      where: { styleId },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, params: true },
    });

    /* Same parameters — nothing to do. Different parameters — a NEW version,
       never an update: the existing one is what saved breaks were generated
       from, and rewriting it would change patterns nobody touched. */
    if (current && sameJson(current.params, params)) {
      resolved.set(key, {
        key,
        versionId: current.id,
        version: current.version,
        params: styleParamsSchema.parse(current.params),
      });
      continue;
    }

    const version = (current?.version ?? 0) + 1;
    const created = await prisma.styleVersion.create({
      data: {
        styleId,
        version,
        params,
        note: current ? 'Seeded — parameters changed upstream.' : '',
      },
      select: { id: true, version: true },
    });
    await prisma.style.update({ where: { id: styleId }, data: { currentVersion: version } });

    resolved.set(key, { key, versionId: created.id, version: created.version, params });
    if (current) versioned++;
    else added++;
  }

  logger.info(
    `🥁 Styles: ${resolved.size} in place (${added} new, ${versioned} given a new version)`
  );
  return resolved;
}

/**
 * The seed's identity for a library entry: a slug of its title. The backfill
 * in 20260924170000_library_entry_seed_key computes the same thing in SQL —
 * change one, change both.
 */
export function seedKeyOf(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** Positions are parked this far up while a library is reordered. */
const PARKED = 100_000;

async function seedLibrary(
  { prisma, logger }: SeedContext,
  styles: Map<string, ResolvedStyle>
): Promise<void> {
  const libraryId = await upsertSystemRow(
    prisma.patternLibrary as never,
    LIBRARY_KEY,
    {
      key: LIBRARY_KEY,
      title: 'Famous breaks',
      description: LIBRARY_DESCRIPTION,
      visibility: 'system',
      position: 0,
    },
    { title: 'Famous breaks', description: LIBRARY_DESCRIPTION }
  );

  /* Entries are matched by `seedKey`, not by position. A pin holds an entry's
     id, so keyed by slot, inserting a break mid-list would hand every later
     row — and every pin on it — a different break. Two titles with one slug
     would make two data-file entries fight over one row, so that stops the
     seed rather than shipping. */
  const keys = LIBRARY.map((item) => seedKeyOf(item.title));
  const clash = keys.find((key, i) => keys.indexOf(key) !== i);
  if (clash) throw new Error(`Two library entries share the seed key "${clash}"`);

  /* A seeded entry the data file no longer has goes, and pins on it go with
     it — that break is not in the library any more. An entry an admin added
     (no seedKey) is not the data file's to remove, and stays. */
  const { count } = await prisma.libraryEntry.deleteMany({
    where: { libraryId, AND: [{ seedKey: { not: null } }, { seedKey: { notIn: keys } }] },
  });

  /* `(libraryId, position)` is unique, so a reorder done row by row collides
     with itself. When a seeded row is moving, or an admin-added row sits in a
     slot a seeded one needs, every row is parked out of the way first — which
     leaves admin-added rows after the seeded ones, in their own order. When
     nothing needs to move, nothing is written, which keeps a re-seed a no-op. */
  const placed = await prisma.libraryEntry.findMany({
    where: { libraryId },
    select: { seedKey: true, position: true },
  });
  const inTheWay = placed.some((row) =>
    row.seedKey === null ? row.position < keys.length : row.position !== keys.indexOf(row.seedKey)
  );
  if (inTheWay) {
    await prisma.libraryEntry.updateMany({
      where: { libraryId },
      data: { position: { increment: PARKED } },
    });
  }

  for (const [index, item] of LIBRARY.entries()) {
    const style = styles.get(item.style);
    /* The index is the seed the pattern is built from, so an entry's notes are
       stable across re-seeds — `patternFromLibrary` uses `1000 + index` and
       nothing about it is random anyway. */
    const doc = packPattern(patternFromLibrary(item, index, style));

    const fields = {
      position: index,
      group: item.group,
      title: item.title,
      artist: item.artist,
      note: item.note ?? null,
      bpm: item.bpm,
      styleKey: item.style,
      styleVersionId: style?.versionId ?? null,
      meter: doc.mt ?? '4/4',
      doc: doc,
    };

    await prisma.libraryEntry.upsert({
      where: { libraryId_seedKey: { libraryId, seedKey: keys[index] } },
      update: fields,
      create: { libraryId, seedKey: keys[index], ...fields },
    });
  }

  logger.info(`🥁 Famous breaks: ${LIBRARY.length} entries${count ? ` (${count} removed)` : ''}`);
}

/**
 * The pieces (Phase 9-v): every instrument the recipes build, from the
 * recipes and the manifest (`scripts/kits/pieces.ts`). Upserted by key; a
 * piece no recipe builds any more goes, and a kit slot naming it reads as
 * empty.
 */
async function seedPieces({ prisma, logger }: SeedContext, manifest: Manifest): Promise<void> {
  const packLabels: Record<string, string> = {};
  for (const kit of Object.values(KITS)) if (kit.pack) packLabels[kit.pack] ??= kit.label;
  const pieces = derivePieces(RECIPES, manifest, packLabels);
  const credits = new Map(
    KIT_CREDITS.map((c) => [c.id, `${c.title} by ${c.author} · ${c.licence}`])
  );

  for (const [position, piece] of pieces.entries()) {
    const fields = {
      label: piece.label,
      role: piece.role,
      source: piece.source,
      folder: piece.folder,
      slots: pieceSlotsSchema.parse(piece.slots),
      credit: credits.get(piece.source) ?? null,
      position,
    };
    await prisma.kitPiece.upsert({
      where: { key: piece.key },
      update: fields,
      create: { key: piece.key, ...fields },
    });
  }
  const gone = await prisma.kitPiece.deleteMany({
    where: { key: { notIn: pieces.map((p) => p.key) } },
  });
  logger.info(
    `🥁 Pieces: ${pieces.length} in place${gone.count ? ` (${gone.count} removed)` : ''}`
  );
}

async function seedKits({ prisma, logger }: SeedContext, manifest: Manifest): Promise<void> {
  const recipes = new Map(RECIPES.map((r) => [r.pack, r]));
  let position = 0;

  for (const [key, kit] of Object.entries(KITS)) {
    /* `engine` is pulled out to keep it out of `...params` — it is a column,
     not a parameter. `kitEngine` supplies the default for a row that names none. */
    const { label, hint, engine: _engine, credit, ...params } = kit;
    const parsed = kitParamsSchema.parse(params);

    /* A pack kit is a map of pieces (9-v): each slot names the piece that
       fills it in the kit's own recipe, and the catalogue resolves it to that
       piece's recordings when it reads the row. A piece's copy of a slot is
       the pack's own (`derivePieces` checks it), so the kit plays what it
       played when the row held the manifest's slots. The shared percussion
       stays as the manifest has it: it is not pieces. */
    const pack = parsed.pack ? manifest[parsed.pack] : undefined;
    const recipe = parsed.pack ? recipes.get(parsed.pack) : undefined;
    const samples = kitSamplesSchema.parse(
      pack && recipe
        ? {
            sampleRate: pack.sampleRate,
            slots: Object.fromEntries(
              Object.entries(packPieceMap(recipe, manifest)).map(([slot, piece]) => [
                slot,
                { piece },
              ])
            ),
            ...(pack.perc ? { perc: pack.perc } : {}),
          }
        : (pack ?? {})
    );

    const fields = {
      engine: kitEngine(kit),
      label,
      hint,
      group: GROUP_LABELS[kitEngine(kit)],
      credit: credit ?? null,
      params: parsed,
      samples: samples,
      position: position++,
    };

    await upsertSystemRow(
      prisma.kit as never,
      key,
      { key, visibility: 'system', ...fields },
      fields
    );
  }

  /* The system "Your samples" kit kept one-shots in the browser. Your own kits
     are rows you own now (D20), so a system row on the `user` engine is one a
     seed before Phase 4A wrote, and it goes. A setting that named it reads as
     its default. */
  const retired = await prisma.kit.deleteMany({ where: { ownerId: null, engine: 'user' } });

  logger.info(
    `🥁 Kits: ${Object.keys(KITS).length} in place${retired.count ? ` (${retired.count} retired)` : ''}`
  );
}

/** What the picker calls each engine. `pack` and `user` share a heading. */
const GROUP_LABELS: Record<string, string> = {
  synth: 'Synthesised',
  drift: 'Drum machines',
  pack: 'Sampled Recordings',
  user: 'Sampled Recordings',
};

const LIBRARY_DESCRIPTION =
  'The main groove off each record, a bar or two of it, in the meter it was played in. ' +
  'Practice approximations — the thing you would be taught, not a transcription of a particular take.';

/** The manifest: each pack's slots, read through the slot schema. */
const manifestSchema = z.record(
  z.string(),
  z.object({
    sampleRate: z.number().int().optional(),
    slots: z.record(z.string(), kitSampleSlotSchema),
    perc: z.record(z.string(), kitSampleSlotSchema).optional(),
  })
);

/** A piece's slots, read through the same schema a kit's are. */
const pieceSlotsSchema = z.record(z.string(), kitSampleSlotSchema);

async function readManifest(): Promise<Manifest> {
  return manifestSchema.parse(JSON.parse(await readFile(MANIFEST, 'utf8')));
}

/**
 * Whether a stored version says the same thing as the source.
 *
 * Key order differs between what Zod returns and what Postgres stores, so a
 * string comparison would call every style changed on every seed and the table
 * would grow a version per run. Sorting the keys first is what makes "nothing
 * changed" mean nothing changed.
 */
function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
        .map(([k, x]) => [k, sortKeys(x)])
    );
  }
  return v;
}

const unit: SeedUnit = {
  name: 'app-beatbreaker/001-catalogue',
  /* The three data files and the manifest are the unit's real input, so editing
     one has to re-run it. Without these the runner hashes this file alone and a
     changed style would be skipped. */
  hashInputs: [
    'data/styles.ts',
    'data/library.ts',
    'data/kits.ts',
    '../../../public/kits/manifest.json',
    '../../../scripts/kits/pieces.ts',
    // each piece's credit (`seedPieces`), so a corrected credit re-runs the unit
    '../../../lib/app/breaks/kit-credits.generated.ts',
    '../../../scripts/kits/sources.ts',
    ...readdirSync(join(here, '..', '..', '..', 'scripts', 'kits', 'recipes'))
      .sort()
      .map((file) => `../../../scripts/kits/recipes/${file}`),
  ],
  async run(ctx) {
    ctx.logger.info('🥁 Seeding the BeatBreaker catalogue...');
    const styles = await seedStyles(ctx);
    await seedLibrary(ctx, styles);
    const manifest = await readManifest();
    await seedPieces(ctx, manifest);
    await seedKits(ctx, manifest);
    ctx.logger.info('✅ Catalogue seeded');
  },
};

export default unit;
