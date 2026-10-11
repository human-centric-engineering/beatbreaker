/**
 * The lineage seed.
 *
 * Against an in-memory stand-in for the three tables, like the catalogue
 * seed's test: what matters is what the unit decides to write. Three claims:
 *
 * 1. **The tables say what the records say.** Every node, edge and recording,
 *    and nothing a record no longer holds.
 * 2. **Running it twice changes nothing** — no duplicated edges, no churned ids.
 * 3. **A corpus that fails the checks is not written.** A dangling reference
 *    or a masked performer's real name must not reach a public page.
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

function table() {
  const rows: Row[] = [];
  const notIn = (where: { id?: { notIn?: string[] } }) => (r: Row) =>
    !(where.id?.notIn ?? []).includes(r.id);
  return {
    rows,
    upsert: ({
      where,
      create,
      update,
    }: {
      where: { id: string };
      create: Row;
      update: Record<string, unknown>;
    }) => {
      const row = rows.find((r) => r.id === where.id);
      if (row) Object.assign(row, update);
      else rows.push({ ...create });
      return Promise.resolve(row);
    },
    createMany: ({ data, skipDuplicates }: { data: Row[]; skipDuplicates?: boolean }) => {
      for (const d of data) {
        if (rows.some((r) => r.id === d.id)) {
          if (!skipDuplicates) throw new Error(`duplicate ${d.id}`);
          continue;
        }
        rows.push({ ...d });
      }
      return Promise.resolve({ count: data.length });
    },
    deleteMany: ({ where }: { where: { id?: { notIn?: string[] } } }) => {
      const doomed = rows.filter(notIn(where));
      for (const r of doomed) rows.splice(rows.indexOf(r), 1);
      return Promise.resolve({ count: doomed.length });
    },
  };
}

function fakePrisma() {
  const tables = { lineageNode: table(), lineageEdge: table(), lineageRecording: table() };
  return {
    ...tables,
    $transaction: <T>(fn: (tx: typeof tables) => Promise<T>) => fn(tables),
  };
}

type Fake = ReturnType<typeof fakePrisma>;

const run = (prisma: Fake, corpus: Parameters<typeof seedLineage>[1]) =>
  seedLineage({ prisma: prisma as never, logger }, corpus);

const small = () =>
  corpusOf({
    drummers: [
      drummer('a', {
        relationships: [
          { type: 'cites_as_influence', target: { name: 'B', id: 'drummer:b', kind: 'drummer' } },
        ],
        key_recording_ids: ['rec:r'],
      }),
    ],
    recordings: [recording('r', ['a', 'c'])],
  });

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

    expect(prisma.lineageNode.rows.find((r) => r.id === 'drummer:b')).toMatchObject({
      modelled: false,
      record: undefined,
    });
    expect(prisma.lineageRecording.rows).toEqual([
      expect.objectContaining({ id: 'rec:r', drummerIds: ['drummer:a', 'drummer:c'] }),
    ]);
  });

  it('changes nothing when run twice', async () => {
    const prisma = fakePrisma();
    await run(prisma, small());
    const before = JSON.stringify([
      prisma.lineageNode.rows,
      prisma.lineageEdge.rows,
      prisma.lineageRecording.rows,
    ]);
    await run(prisma, small());
    expect(
      JSON.stringify([
        prisma.lineageNode.rows,
        prisma.lineageEdge.rows,
        prisma.lineageRecording.rows,
      ])
    ).toBe(before);
  });

  it('removes what a record no longer says', async () => {
    const prisma = fakePrisma();
    await run(prisma, small());
    await run(prisma, corpusOf({ drummers: [drummer('a')] }));

    expect(prisma.lineageNode.rows.map((r) => r.id).sort()).toEqual(['drummer:a', 'style:funk']);
    expect(prisma.lineageEdge.rows).toEqual([]);
    expect(prisma.lineageRecording.rows).toEqual([]);
  });

  it('writes nothing from a corpus that fails the checks', async () => {
    const prisma = fakePrisma();
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
    expect(prisma.lineageNode.rows).toEqual([]);
  });

  it('re-runs when any record changes: every model file is a hash input', () => {
    const inputs = unit.hashInputs ?? [];
    expect(inputs).toContain('data/drummer-model/drummers/bernard-purdie.json');
    expect(inputs).toContain('data/drummer-model/sources/core.json');
    expect(inputs).toContain('../../../lib/app/lineage/build.ts');
  });
});
