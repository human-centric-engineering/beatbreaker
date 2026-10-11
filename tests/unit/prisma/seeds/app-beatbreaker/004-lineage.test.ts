/**
 * The lineage seed.
 *
 * Against an in-memory stand-in for the three tables, like the catalogue
 * seed's test: what matters is what the unit decides to write. The claims:
 *
 * 1. **The tables say what the records say** — every node, edge and
 *    recording, and nothing a record no longer holds. That includes a changed
 *    confidence on an edge that already exists, and a drummer whose record
 *    went (now a stub) losing the record the row used to carry. Both survived
 *    re-seeds in the first build, which upserted and skipped duplicates.
 * 2. **Running it twice writes the same rows.**
 * 3. **A corpus or graph that fails the checks is not written**, and the
 *    tables are left as they were: a masked performer's real name must not
 *    reach a public page, and a slug two nodes share must be named, not fail
 *    on a constraint half-way.
 */

import { describe, expect, it } from 'vitest';

import { buildLineage } from '@/lib/app/lineage/build';
import { logger } from '@/lib/logging';
import unit, { seedLineage } from '@/prisma/seeds/app-beatbreaker/004-lineage';
import { corpusOf, drummer, recording } from '@/tests/helpers/lineage';
import { DRUMMER_MODEL_DIR, readCorpus } from '@/scripts/lineage/read-corpus';

interface Row {
  id: string;
  [key: string]: unknown;
}

/** One table: unique ids (and slugs, where a row has one), bulk insert, delete. */
function table() {
  let rows: Row[] = [];
  return {
    get rows() {
      return rows;
    },
    restore(saved: Row[]) {
      rows = saved;
    },
    createMany: ({ data }: { data: Row[] }) => {
      for (const d of data) {
        if (rows.some((r) => r.id === d.id || (d.slug !== undefined && r.slug === d.slug))) {
          throw new Error(`unique constraint: ${d.id}`);
        }
        rows.push({ ...d });
      }
      return Promise.resolve({ count: data.length });
    },
    deleteMany: ({ where }: { where?: { id?: { notIn?: string[] } } } = {}) => {
      const keep = where?.id?.notIn;
      const before = rows.length;
      rows = keep ? rows.filter((r) => keep.includes(r.id)) : [];
      return Promise.resolve({ count: before - rows.length });
    },
  };
}

function fakePrisma() {
  const tables = { lineageNode: table(), lineageEdge: table(), lineageRecording: table() };
  return {
    ...tables,
    /* A transaction that rolls back: on a throw, every table is put back. */
    $transaction: async <T>(fn: (tx: typeof tables) => Promise<T>) => {
      const saved = Object.values(tables).map((t) => t.rows.map((r) => ({ ...r })));
      try {
        return await fn(tables);
      } catch (err) {
        Object.values(tables).forEach((t, i) => t.restore(saved[i]));
        throw err;
      }
    },
  };
}

type Fake = ReturnType<typeof fakePrisma>;

const run = (prisma: Fake, corpus: Parameters<typeof seedLineage>[1]) =>
  seedLineage({ prisma: prisma as never, logger }, corpus);

const influence = (confidence: string) => ({
  type: 'cites_as_influence',
  target: { name: 'B', id: 'drummer:b', kind: 'drummer' },
  evidence: { confidence },
});

const small = (confidence = 'likely') =>
  corpusOf({
    drummers: [
      drummer('a', { relationships: [influence(confidence)], key_recording_ids: ['rec:r'] }),
    ],
    recordings: [recording('r', ['a', 'c'])],
  });

const snapshot = (prisma: Fake) =>
  JSON.stringify([prisma.lineageNode.rows, prisma.lineageEdge.rows, prisma.lineageRecording.rows]);

describe('the lineage seed', () => {
  it('writes the whole model the repo holds', async () => {
    const prisma = fakePrisma();
    const corpus = readCorpus(DRUMMER_MODEL_DIR);
    await run(prisma, corpus);

    const graph = buildLineage(corpus);
    expect(prisma.lineageNode.rows).toHaveLength(graph.nodes.length);
    expect(prisma.lineageEdge.rows).toHaveLength(graph.edges.length);
    expect(prisma.lineageRecording.rows).toHaveLength(corpus.recordings.length);

    const purdie = prisma.lineageNode.rows.find((r) => r.id === 'drummer:bernard-purdie');
    expect(purdie).toMatchObject({ slug: 'bernard-purdie', modelled: true, kind: 'drummer' });
    expect(purdie?.record).toMatchObject({ identity: { name: 'Bernard Purdie' } });
  });

  it('stores a stub with no record, and a recording with its drummers', async () => {
    const prisma = fakePrisma();
    await run(prisma, small());

    const b = prisma.lineageNode.rows.find((r) => r.id === 'drummer:b');
    expect(b).toMatchObject({ modelled: false });
    expect(b && 'record' in b).toBe(false);
    expect(prisma.lineageRecording.rows).toEqual([
      expect.objectContaining({ id: 'rec:r', drummerIds: ['drummer:a', 'drummer:c'] }),
    ]);
  });

  it('writes the same rows when run twice', async () => {
    const prisma = fakePrisma();
    await run(prisma, small());
    const before = snapshot(prisma);
    await run(prisma, small());
    expect(snapshot(prisma)).toBe(before);
  });

  it('updates an edge whose evidence changed, keeping its id', async () => {
    const prisma = fakePrisma();
    await run(prisma, small('likely'));
    const [before] = prisma.lineageEdge.rows.filter((r) => r.kind === 'influence');
    await run(prisma, small('verified'));
    const [after] = prisma.lineageEdge.rows.filter((r) => r.kind === 'influence');

    expect(after.id).toBe(before.id);
    expect(after.confidence).toBe('verified');
  });

  it('drops the record of a drummer who is now only a stub', async () => {
    const prisma = fakePrisma();
    const b = drummer('b');
    await run(
      prisma,
      corpusOf({ drummers: [drummer('a', { relationships: [influence('likely')] }), b] })
    );
    expect(prisma.lineageNode.rows.find((r) => r.id === 'drummer:b')?.record).toBeDefined();

    await run(
      prisma,
      corpusOf({ drummers: [drummer('a', { relationships: [influence('likely')] })] })
    );
    const stub = prisma.lineageNode.rows.find((r) => r.id === 'drummer:b');
    expect(stub).toMatchObject({ modelled: false });
    expect(stub?.record).toBeUndefined();
  });

  it('removes what a record no longer says', async () => {
    const prisma = fakePrisma();
    await run(prisma, small());
    await run(prisma, corpusOf({ drummers: [drummer('a')] }));

    expect(prisma.lineageNode.rows.map((r) => r.id).sort()).toEqual(['drummer:a', 'style:funk']);
    expect(prisma.lineageEdge.rows).toEqual([]);
    expect(prisma.lineageRecording.rows).toEqual([]);
  });

  it('writes nothing from a corpus that fails the checks, and leaves the tables as they were', async () => {
    const prisma = fakePrisma();
    await run(prisma, small());
    const before = snapshot(prisma);
    const masked = corpusOf({
      drummers: [
        drummer('masked', {
          identity: {
            name: 'Masked',
            born: { date: '1990-01-01' },
            persona: { real_identity_policy: 'private_do_not_research' },
          },
        }),
      ],
    });
    await expect(run(prisma, masked)).rejects.toThrow(/must not be stored for a private persona/);
    expect(snapshot(prisma)).toBe(before);
  });

  it('names a slug two nodes share instead of failing on the constraint', async () => {
    const prisma = fakePrisma();
    const clash = corpusOf({ drummers: [drummer('style-funk')] });
    await expect(run(prisma, clash)).rejects.toThrow(/slug style-funk is both/);
    expect(prisma.lineageNode.rows).toEqual([]);
  });

  it('re-runs when any record or the code that reads them changes', () => {
    const inputs = unit.hashInputs ?? [];
    expect(inputs).toContain('data/drummer-model/drummers/bernard-purdie.json');
    expect(inputs).toContain('data/drummer-model/sources/core.json');
    expect(inputs).toEqual(
      expect.arrayContaining([
        '../../../lib/app/lineage/build.ts',
        '../../../lib/app/lineage/check.ts',
        '../../../lib/app/lineage/corpus.ts',
        '../../../lib/app/lineage/types.ts',
        '../../../scripts/lineage/read-corpus.ts',
      ])
    );
  });
});
