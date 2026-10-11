import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { z } from 'zod';

import { buildLineage } from '@/lib/app/lineage/build';
import { checkCorpus, checkGraph } from '@/lib/app/lineage/check';
import type { Corpus } from '@/lib/app/lineage/corpus';
import type { SeedContext, SeedUnit } from '@/prisma/runner';
import { corpusFiles, readCorpus } from '@/scripts/lineage/read-corpus';

/**
 * The drummer model into the lineage tables (Phase 11, D48).
 *
 * The records under `data/drummer-model/` are the source; the three tables are
 * what the map and the drummer pages read. Each run makes the tables say
 * exactly what the records say by **replacing them whole**, in one
 * transaction: three deletes and three bulk inserts. Nothing of a previous run
 * survives — not an edge's old confidence, not the record of a drummer who is
 * now only a stub. The tables are system content with no user FK pointing at
 * them, so there is nothing a replace could orphan; ids are model ids and
 * hashes of what an edge connects, so running it twice writes the same rows.
 *
 * It refuses to write a corpus that fails `checkCorpus` or a graph that fails
 * `checkGraph`: a dangling reference, a masked performer's real identity or a
 * slug two nodes share must stop the seed with the files named, not reach a
 * public page or fail on a constraint half-way.
 */

const here = dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = join(here, 'data', 'drummer-model');

/** A record as a JSON object Prisma will store: checked, not cast. */
const jsonObject = z.record(z.string(), z.json());

/** Write a parsed corpus. Exported for the seed test. */
export async function seedLineage({ prisma, logger }: SeedContext, corpus: Corpus): Promise<void> {
  const graph = buildLineage(corpus);
  const errors = [...checkCorpus(corpus), ...checkGraph(graph)];
  if (errors.length > 0) {
    throw new Error(`The drummer model has ${errors.length} problem(s):\n${errors.join('\n')}`);
  }
  const records = new Map<string, unknown>([
    ...corpus.drummers.map(({ record }) => [record.meta.id, record] as const),
    ...corpus.styles.map(({ record }) => [record.id, record] as const),
  ]);

  await prisma.$transaction(async (tx) => {
    // edges first: they reference the nodes
    await tx.lineageEdge.deleteMany({});
    await tx.lineageNode.deleteMany({});
    await tx.lineageRecording.deleteMany({});

    await tx.lineageNode.createMany({
      data: graph.nodes.map((n) => {
        const record = records.get(n.id);
        return {
          id: n.id,
          slug: n.slug,
          kind: n.kind,
          label: n.label,
          modelled: n.modelled,
          activeFrom: n.activeFrom,
          activeTo: n.activeTo,
          styleKey: n.styleKey,
          genres: n.genres,
          tags: n.tags,
          summary: n.summary,
          // a stub has no record: the column is left NULL
          ...(record === undefined ? {} : { record: jsonObject.parse(record) }),
        };
      }),
    });
    await tx.lineageEdge.createMany({
      data: graph.edges.map((e) => ({
        id: e.id,
        fromId: e.from,
        toId: e.to,
        relation: e.relation,
        kind: e.kind,
        directed: e.directed,
        strength: e.strength,
        confidence: e.confidence,
        scope: e.scope,
        declaredBy: e.declaredBy,
        recordingId: e.recordingId,
      })),
    });
    await tx.lineageRecording.createMany({
      data: corpus.recordings.map(({ record: r }) => ({
        id: r.id,
        title: r.title,
        artist: r.artist,
        year: r.year,
        drummerIds: [...new Set(r.drum_performances.map((p) => p.drummer_id))],
        record: jsonObject.parse(r),
      })),
    });
  });

  const modelled = graph.nodes.filter((n) => n.kind === 'drummer' && n.modelled).length;
  logger.info(
    `✅ Lineage: ${modelled} drummers modelled, ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${corpus.recordings.length} recordings`
  );
}

const unit: SeedUnit = {
  name: 'app-beatbreaker/004-lineage',
  /* Every record, and the code that turns them into rows: editing a record
     re-runs the unit. Listed when the module loads, so a new file counts. */
  hashInputs: [
    ...corpusFiles(MODEL_DIR).map((f) => `data/drummer-model/${f}`),
    '../../../lib/app/lineage/build.ts',
    '../../../lib/app/lineage/check.ts',
    '../../../lib/app/lineage/corpus.ts',
    '../../../lib/app/lineage/types.ts',
    '../../../scripts/lineage/read-corpus.ts',
  ],
  async run(ctx) {
    await seedLineage(ctx, readCorpus(MODEL_DIR));
  },
};

export default unit;
