import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `partialUniqueIndexExists` — the reason it exists instead of `indexExists`
 * (`.context/app/catalogue.md` §"Four things the schema does that Prisma
 * cannot express", point 3).
 *
 * `@@unique([ownerId, key])` does not stop two system styles sharing a key,
 * because Postgres treats NULLs as distinct — so `style_system_key_key` is a
 * partial index, `UNIQUE … WHERE "ownerId" IS NULL`, invisible to Prisma the
 * same way the hand-written FKs are. `indexExists` would pass on an index of
 * that name recreated *without* the predicate, which is a different and
 * weaker constraint: two system rows could then share a key and `getStyle`
 * would return whichever the planner picked. So the probe has to fail every
 * way an index can look present but not actually be this constraint —
 * missing, non-unique, and unique-but-unpredicated — and pass only for the
 * real thing.
 *
 * The function itself is not exported; every test below reaches it the only
 * way a caller can, through `registerAppDriftProbes()` and the probe it
 * registers for `style_system_key_key`.
 *
 * ---------------------------------------------------------------------------
 * FORK NOTE — this reads the real `lib/app/db-drift` seam
 * ---------------------------------------------------------------------------
 * `registerAppDriftProbes()` is not mocked here, because the probe's SQL is
 * the thing under test and a fake probe would only re-assert itself. Upstream
 * that seam registers nothing, so a fork without BeatBreaker's catalogue
 * schema gets `no partial-unique-index probe registered for table "style"`
 * from the first line of every test.
 *
 * That failure is the seam being empty, not the probe being wrong. **Re-point
 * `partialIndexProbe` at a partial unique index you actually have** rather
 * than deleting the cases: everything below the helper is about the shape of
 * the query — that it filters on `indisunique`, that it requires a non-null
 * predicate, that the index name is bound as a parameter — and none of that
 * is specific to `style`. A fork with no partial unique index at all has
 * nothing here to keep, and should drop the file whole.
 */

vi.mock('@/lib/db/client', () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { registerAppDriftProbes } from '@/lib/app/db-drift';
import { prisma } from '@/lib/db/client';
import { getAppDriftProbes, resetAppDriftProbes, type DriftObject } from '@/lib/db/drift-probes';

const queryRaw = vi.mocked(prisma.$queryRaw);

/** Static SQL of the most recent $queryRaw call — matches drift-probes.test.ts's own helper. */
function lastSql(): string {
  const call = queryRaw.mock.calls.at(-1);
  return (call?.[0] as unknown as TemplateStringsArray).join('');
}

function lastValues(): unknown[] {
  return queryRaw.mock.calls.at(-1)?.slice(1) ?? [];
}

function partialIndexProbe(table: string): DriftObject {
  resetAppDriftProbes();
  registerAppDriftProbes();
  const probe = getAppDriftProbes().find(
    (p) => p.kind === 'partial unique index' && p.table === table
  );
  if (!probe) throw new Error(`no partial-unique-index probe registered for table "${table}"`);
  return probe;
}

beforeEach(() => {
  queryRaw.mockReset();
});

describe('style_system_key_key', () => {
  const probe = () => partialIndexProbe('style');

  it('fails when the index is missing entirely', async () => {
    queryRaw.mockResolvedValue([]);

    const result = await probe().probe();

    expect(result.ok).toBe(false);
    expect(lastSql()).toContain('pg_indexes');
    expect(lastValues()).toEqual(['style_system_key_key']);
  });

  it('fails when an index of the same name exists but is not UNIQUE', async () => {
    // Same name, same table, no UNIQUE keyword — a plain index recreated in
    // its place would satisfy `indexExists` while not stopping the collision
    // it exists to prevent.
    queryRaw.mockResolvedValue([
      { indexdef: 'CREATE INDEX style_system_key_key ON public.style USING btree (key)' },
    ]);

    const result = await probe().probe();

    expect(result.ok).toBe(false);
    expect(result.note).toContain('not unique');
  });

  it('fails when the index is UNIQUE but is missing the WHERE "ownerId" IS NULL predicate', async () => {
    // The case that motivates this probe over `indexExists`: a UNIQUE index of
    // the right name, recreated without its predicate, now covers user rows
    // too — the first two people to name a style "funk" collide.
    queryRaw.mockResolvedValue([
      { indexdef: 'CREATE UNIQUE INDEX style_system_key_key ON public.style USING btree (key)' },
    ]);

    const result = await probe().probe();

    expect(result.ok).toBe(false);
    expect(result.note).toContain('predicate missing');
    expect(result.note).toContain('WHERE ("ownerId" IS NULL)');
  });

  it('passes for the real thing — UNIQUE and predicated on ownerId IS NULL', async () => {
    queryRaw.mockResolvedValue([
      {
        indexdef:
          'CREATE UNIQUE INDEX style_system_key_key ON public.style USING btree (key) WHERE ("ownerId" IS NULL)',
      },
    ]);

    const result = await probe().probe();

    expect(result).toEqual({ ok: true });
  });
});

describe('the same probe on the other two system tables', () => {
  it('asserts the identical predicate for pattern_library and kit, not just style', async () => {
    // Registered per table in a loop in db-drift.ts; a copy-paste that
    // narrowed the predicate for one table would only show up per-table.
    for (const table of ['pattern_library', 'kit']) {
      queryRaw.mockResolvedValue([
        {
          indexdef: `CREATE UNIQUE INDEX ${table}_system_key_key ON public.${table} USING btree (key)`,
        },
      ]);

      const result = await partialIndexProbe(table).probe();

      expect(result.ok).toBe(false);
      expect(result.note).toContain('WHERE ("ownerId" IS NULL)');
    }
  });
});
