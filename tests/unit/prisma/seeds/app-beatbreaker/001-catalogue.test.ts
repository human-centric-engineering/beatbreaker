import { describe, expect, it, vi } from 'vitest';

import { logger } from '@/lib/logging';
import unit, { seedKeyOf } from '@/prisma/seeds/app-beatbreaker/001-catalogue';
import { KITS } from '@/prisma/seeds/app-beatbreaker/data/kits';
import { LIBRARY } from '@/prisma/seeds/app-beatbreaker/data/library';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { packedPatternSchema } from '@/lib/app/breaks/schema';
import { styleParamsSchema } from '@/lib/app/breaks/catalogue/schemas';

/**
 * The catalogue seed.
 *
 * Run against an in-memory stand-in for Prisma rather than a database: what is
 * worth testing here is the **decisions** the unit makes, and every one of them
 * is a decision about what to write, not about whether Postgres accepted it.
 *
 * Three of those decisions are load-bearing, and all three fail quietly:
 *
 * 1. **Re-seeding is a no-op.** A seed that wrote a new style version on every
 *    run would grow the table by 37 rows per deploy, and nothing would notice
 *    until somebody opened the version history.
 * 2. **A changed style gets a NEW version, never an overwrite.** Overwriting
 *    version 1 changes every break already generated from it. The symptom is
 *    somebody's saved break sounding different, months later, with no event to
 *    correlate it to.
 * 3. **A library entry is stored as a document, not as a bar string.** If the
 *    conversion were skipped the rows would still be there and the seed would
 *    still report 47 — and every client would need the bar-string parser this
 *    phase removed from them.
 *
 * The fake below is deliberately small: it records writes and answers reads
 * from what it has recorded. It is not a database and does not pretend to be —
 * it enforces the one constraint the seed's logic depends on, which is that
 * `styleVersion.findFirst` ordered by version descending returns the latest.
 */

interface Row {
  id: string;
  [key: string]: unknown;
}

/**
 * A stand-in for one Prisma delegate, backed by an array.
 *
 * `defaults` are the columns Postgres fills in for a row created without them.
 * Only one matters here and it matters a lot: a system row's `ownerId` is NULL,
 * and the seed finds every one of its rows by `{ key, ownerId: null }`. A fake
 * that left the column absent would miss on every lookup, and the seed would
 * create a second copy of the catalogue instead of upserting the first — which
 * is a green bar for a run that doubled the table.
 */
function table(name: string, defaults: Record<string, unknown> = {}) {
  const rows: Row[] = [];
  let next = 0;

  /* The filter shapes the seed actually sends — `gte`, `not`, `notIn`, and
     `AND` over them — and nothing more. `notIn` follows SQL, where
     `NULL NOT IN (…)` is not true: that is what keeps an admin-added entry
     (no seedKey) out of the seed's delete even without the `not: null`. */
  const matches = (row: Row, where: Record<string, unknown> | undefined): boolean =>
    Object.entries(where ?? {}).every(([k, v]) => {
      if (k === 'AND') {
        return (v as Record<string, unknown>[]).every((part) => matches(row, part));
      }
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        const op = v as { gte?: number; not?: unknown; notIn?: unknown[] };
        if ('gte' in op) return (row[k] as number) >= (op.gte as number);
        if ('not' in op) return row[k] !== op.not;
        if ('notIn' in op) return row[k] !== null && !(op.notIn ?? []).includes(row[k]);
      }
      return row[k] === v;
    });

  return {
    rows,
    create: ({ data }: { data: Record<string, unknown> }) => {
      const row: Row = { id: `${name}-${next++}`, ...defaults, ...data };
      rows.push(row);
      return Promise.resolve(row);
    },
    update: ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = rows.find((r) => r.id === where.id);
      if (!row) throw new Error(`no ${name} ${where.id}`);
      Object.assign(row, data);
      return Promise.resolve(row);
    },
    upsert: ({
      where,
      create,
      update,
    }: {
      where: Record<string, unknown>;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      /* The composite `libraryId_position` key arrives nested, the way Prisma
         takes it. Flattening it here is what lets the same `matches` run for
         both key shapes. */
      const flat = Object.values(where).reduce<Record<string, unknown>>(
        (acc, v) => (typeof v === 'object' && v !== null ? { ...acc, ...v } : acc),
        {}
      );
      const row = rows.find((r) => matches(r, flat));
      if (row) {
        Object.assign(row, update);
        return Promise.resolve(row);
      }
      const made: Row = { id: `${name}-${next++}`, ...defaults, ...create };
      rows.push(made);
      return Promise.resolve(made);
    },
    findFirst: ({
      where,
      orderBy,
    }: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, 'asc' | 'desc'>;
    }) => {
      let found = rows.filter((r) => matches(r, where));
      const [key, dir] = Object.entries(orderBy ?? {})[0] ?? [];
      if (key) {
        found = [...found].sort((a, b) =>
          dir === 'desc'
            ? (b[key] as number) - (a[key] as number)
            : (a[key] as number) - (b[key] as number)
        );
      }
      return Promise.resolve(found[0] ?? null);
    },
    findMany: ({ where }: { where?: Record<string, unknown> }) =>
      Promise.resolve(rows.filter((r) => matches(r, where))),
    updateMany: ({
      where,
      data,
    }: {
      where: Record<string, unknown>;
      data: Record<string, { increment: number }>;
    }) => {
      const hit = rows.filter((r) => matches(r, where));
      for (const row of hit) {
        for (const [k, change] of Object.entries(data)) {
          row[k] = (row[k] as number) + change.increment;
        }
      }
      return Promise.resolve({ count: hit.length });
    },
    deleteMany: ({ where }: { where: Record<string, unknown> }) => {
      const doomed = rows.filter((r) => matches(r, where));
      for (const row of doomed) rows.splice(rows.indexOf(row), 1);
      return Promise.resolve({ count: doomed.length });
    },
  };
}

function fakePrisma() {
  return {
    /* Style, PatternLibrary and Kit are the three tables with a nullable
       `ownerId` — the seeded rows are the ones where it is NULL. */
    style: table('style', { ownerId: null }),
    styleVersion: table('style_version'),
    patternLibrary: table('pattern_library', { ownerId: null }),
    libraryEntry: table('library_entry'),
    kit: table('kit', { ownerId: null }),
  };
}

type Fake = ReturnType<typeof fakePrisma>;

async function seed(prisma: Fake): Promise<void> {
  await unit.run({ prisma: prisma as never, logger });
}

describe('the catalogue seed', () => {
  it('writes every style, library entry and kit the data files hold', async () => {
    const prisma = fakePrisma();
    await seed(prisma);

    expect(prisma.style.rows).toHaveLength(Object.keys(STYLES).length);
    expect(prisma.styleVersion.rows).toHaveLength(Object.keys(STYLES).length);
    expect(prisma.libraryEntry.rows).toHaveLength(LIBRARY.length);
    expect(prisma.kit.rows).toHaveLength(Object.keys(KITS).length);
    expect(prisma.patternLibrary.rows).toHaveLength(1);
  });

  it('is a no-op the second time', async () => {
    /* The guarantee, and it is the seed's own rather than the runner's — the
       runner also skips a unit whose content hash has not moved, but that is
       an optimisation and it does not hold for `db:reset` or for a fork that
       calls the unit itself. */
    const prisma = fakePrisma();
    await seed(prisma);
    const before = JSON.stringify(prisma);

    await seed(prisma);
    expect(JSON.stringify(prisma)).toBe(before);
  });

  it('gives a changed style a new version rather than rewriting the old one', async () => {
    const prisma = fakePrisma();
    await seed(prisma);

    const funk = prisma.style.rows.find((r) => r.key === 'funk');
    const v1 = prisma.styleVersion.rows.find((r) => r.styleId === funk?.id);
    const v1Params = JSON.stringify(v1?.params);
    expect(funk?.currentVersion).toBe(1);

    /* Retune funk the way an upstream edit would, and re-seed. */
    const original = STYLES.funk.ghostBias;
    STYLES.funk.ghostBias = original + 0.5;
    try {
      await seed(prisma);
    } finally {
      STYLES.funk.ghostBias = original;
    }

    const versions = prisma.styleVersion.rows.filter((r) => r.styleId === funk?.id);
    expect(versions).toHaveLength(2);
    expect(funk?.currentVersion).toBe(2);
    /* Version 1 is untouched. This is the assertion the whole immutable-version
       design exists for: every break generated from v1 points at this row. */
    expect(JSON.stringify(v1?.params)).toBe(v1Params);
    expect((versions.find((v) => v.version === 2)?.params as { ghostBias: number }).ghostBias).toBe(
      original + 0.5
    );
    expect(versions.find((v) => v.version === 2)?.note).toContain('changed');
  });

  it('stores each library entry as a wire-format document, not as a bar string', async () => {
    const prisma = fakePrisma();
    await seed(prisma);

    for (const entry of prisma.libraryEntry.rows) {
      const parsed = packedPatternSchema.safeParse(entry.doc);
      expect(
        parsed.success,
        `${String(entry.title)}: ${JSON.stringify(entry.doc).slice(0, 80)}`
      ).toBe(true);
      /* And it carries the snapshot, which is what lets a client play it
         without the style — the point of converting at seed time at all. */
      expect(parsed.success && parsed.data.sa).toBeTruthy();
    }
  });

  it('validates every style on the way in, so a bad field fails the seed rather than shipping', async () => {
    const prisma = fakePrisma();
    await seed(prisma);
    for (const version of prisma.styleVersion.rows) {
      expect(styleParamsSchema.safeParse(version.params).success).toBe(true);
    }
  });

  it('removes a library entry that is no longer in the data file', async () => {
    /* Without the sweep the list keeps showing a pattern the source no longer
       has, and the only way to find out is to count. */
    const prisma = fakePrisma();
    await seed(prisma);

    const removed = LIBRARY.pop();
    try {
      await seed(prisma);
      expect(prisma.libraryEntry.rows).toHaveLength(LIBRARY.length);
    } finally {
      if (removed) LIBRARY.push(removed);
    }
  });

  it('keeps each entry’s row when a break is inserted mid-list, so a pin stays on its break', async () => {
    /* The reason entries are keyed by title rather than by slot. A pin holds
       the row id; keyed by position, inserting one break at the top would have
       rewritten row 0 as the new break and every row after it as its
       neighbour — every pin silently on a different record. */
    const prisma = fakePrisma();
    await seed(prisma);
    const idOf = (title: string) => prisma.libraryEntry.rows.find((r) => r.title === title)?.id;
    const before = Object.fromEntries(LIBRARY.map((item) => [item.title, idOf(item.title)]));

    LIBRARY.unshift({ ...LIBRARY[0], title: 'A New Break' });
    try {
      await seed(prisma);
      // one row per entry: the same rows, moved — not new rows beside parked old ones
      expect(prisma.libraryEntry.rows).toHaveLength(LIBRARY.length);
      for (const item of LIBRARY.slice(1)) expect(idOf(item.title)).toBe(before[item.title]);
      // and each sits in the slot the data file now gives it
      const positions = new Map(prisma.libraryEntry.rows.map((r) => [r.title, r.position]));
      expect(LIBRARY.map((item) => positions.get(item.title))).toEqual(LIBRARY.map((_, i) => i));
    } finally {
      LIBRARY.shift();
    }
  });

  it('leaves an entry an admin added, after the seeded ones', async () => {
    const prisma = fakePrisma();
    await seed(prisma);
    // appended the way `createEntry` does: the next free slot, no seedKey
    await prisma.libraryEntry.create({
      data: {
        libraryId: prisma.libraryEntry.rows[0].libraryId,
        position: LIBRARY.length,
        seedKey: null,
        title: 'Added by an admin',
      },
    });

    LIBRARY.push({ ...LIBRARY[0], title: 'One More From Upstream' });
    try {
      await seed(prisma);
      const added = prisma.libraryEntry.rows.find((r) => r.title === 'Added by an admin');
      expect(added).toBeDefined();
      // out of the slot the new seeded entry needed, and after every seeded one
      const seeded = prisma.libraryEntry.rows.filter((r) => r.seedKey !== null);
      expect(Math.max(...seeded.map((r) => r.position as number))).toBe(LIBRARY.length - 1);
      expect(added?.position as number).toBeGreaterThan(LIBRARY.length - 1);
    } finally {
      LIBRARY.pop();
    }
  });

  it('refuses two data-file entries whose titles make one key', async () => {
    const prisma = fakePrisma();
    LIBRARY.push({ ...LIBRARY[0], title: 'FUNKY   drummer!' });
    try {
      await expect(seed(prisma)).rejects.toThrow('share the seed key "funky-drummer"');
    } finally {
      LIBRARY.pop();
    }
  });

  it('keys an entry by a slug of its title — the same slug the migration backfilled', () => {
    /* The SQL in 20260924170000_library_entry_seed_key computes this too. The
       two must agree, or the first seed after that migration replaces every
       row and cascades away every pin on the library. */
    expect(seedKeyOf('Funky Drummer')).toBe('funky-drummer');
    expect(seedKeyOf('Ashley’s Roachclip')).toBe('ashley-s-roachclip');
    expect(seedKeyOf("Ashley's Roachclip")).toBe('ashley-s-roachclip');
    expect(seedKeyOf('  — 50 Ways to Leave Your Lover —  ')).toBe('50-ways-to-leave-your-lover');
    expect(seedKeyOf('x'.repeat(100))).toHaveLength(80);
  });

  it('files each style under its heading, and anything ungrouped under "Other"', async () => {
    const prisma = fakePrisma();
    await seed(prisma);

    const groups = new Set(prisma.style.rows.map((r) => r.group));
    expect(groups.has('Funk and breaks')).toBe(true);
    /* Every shipped style is named in STYLE_GROUPS, so "Other" should be empty
       — a style landing there is a style somebody added without deciding where
       it goes, which is worth seeing rather than shipping quietly. */
    expect(prisma.style.rows.filter((r) => r.group === 'Other')).toEqual([]);
  });

  it('reads each pack kit’s slot map out of the manifest', async () => {
    const prisma = fakePrisma();
    await seed(prisma);

    const pack = prisma.kit.rows.find((r) => r.engine === 'pack');
    expect(pack, 'the seed data ships at least one recorded kit').toBeTruthy();
    const samples = pack?.samples as { slots?: Record<string, unknown> };
    expect(Object.keys(samples.slots ?? {}).length).toBeGreaterThan(0);

    /* Exactly one kit carries the shared percussion set. `percussionSource`
       finds it by looking rather than by a hard-coded key, so a seed that
       dropped it would leave every percussion lane synthesised. */
    const withPerc = prisma.kit.rows.filter(
      (r) => Object.keys((r.samples as { perc?: object }).perc ?? {}).length > 0
    );
    expect(withPerc).toHaveLength(1);
  });

  it('declares the data files as hash inputs, so editing one re-runs it', () => {
    /* The runner hashes the seed's own source. Without these, changing a style
       would leave the unit looking unchanged and the edit would never reach a
       database that had already been seeded. */
    expect(unit.hashInputs).toEqual(
      expect.arrayContaining([
        'data/styles.ts',
        'data/library.ts',
        'data/kits.ts',
        '../../../public/kits/manifest.json',
      ])
    );
  });
});

vi.mock('@/lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
