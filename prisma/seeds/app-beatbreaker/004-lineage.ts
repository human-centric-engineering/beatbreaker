import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { z } from 'zod';

import { buildLineage } from '@/lib/app/lineage/build';
import { checkCorpus } from '@/lib/app/lineage/check';
import type { Corpus } from '@/lib/app/lineage/corpus';
import type { SeedContext, SeedUnit } from '@/prisma/runner';
import { corpusFiles, readCorpus } from '@/scripts/lineage/read-corpus';

/**
 * The drummer model into the lineage tables (Phase 11, D48).
 *
 * The records under `data/drummer-model/` are the source; the three tables are
 * what the map and the drummer pages read. Each run makes the tables say
 * exactly what the records say: rows are upserted by their model id, and a
 * row whose record has gone is deleted. Edge ids are hashes of what the edge
 * says, so running it twice changes nothing.
 *
 * It refuses to write a corpus that fails `checkCorpus`: a dangling reference
 * or a stored identity for a masked performer must not reach a public page.
 */

const here = dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = join(here, 'data', 'drummer-model');

/** A record as a JSON object Prisma will store: checked, not cast. */
const jsonObject = z.record(z.string(), z.json());

/** Write a parsed corpus. Exported for the seed test. */
export async function seedLineage({ prisma, logger }: SeedContext, corpus: Corpus): Promise<void> {
  const errors = checkCorpus(corpus);
  if (errors.length > 0) {
    throw new Error(`The drummer model has ${errors.length} problem(s):\n${errors.join('\n')}`);
  }
  const graph = buildLineage(corpus);
  const records = new Map(corpus.drummers.map(({ record }) => [record.meta.id, record]));
  const styles = new Map(corpus.styles.map(({ record }) => [record.id, record]));

  await prisma.$transaction(
    async (tx) => {
      for (const n of graph.nodes) {
        const record = records.get(n.id) ?? styles.get(n.id) ?? null;
        const row = {
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
          record: record ? jsonObject.parse(record) : undefined,
        };
        await tx.lineageNode.upsert({
          where: { id: n.id },
          create: { id: n.id, ...row },
          update: row,
        });
      }

      await tx.lineageEdge.deleteMany({ where: { id: { notIn: graph.edges.map((e) => e.id) } } });
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
        skipDuplicates: true,
      });
      /* Nodes last: deleting one cascades its edges, and every edge left is
         between nodes that are staying. */
      await tx.lineageNode.deleteMany({ where: { id: { notIn: graph.nodes.map((n) => n.id) } } });

      for (const { record: r } of corpus.recordings) {
        const row = {
          title: r.title,
          artist: r.artist,
          year: r.year,
          drummerIds: [...new Set(r.drum_performances.map((p) => p.drummer_id))],
          record: jsonObject.parse(r),
        };
        await tx.lineageRecording.upsert({
          where: { id: r.id },
          create: { id: r.id, ...row },
          update: row,
        });
      }
      await tx.lineageRecording.deleteMany({
        where: { id: { notIn: corpus.recordings.map(({ record }) => record.id) } },
      });
    },
    { timeout: 60_000 }
  );

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
  ],
  async run(ctx) {
    await seedLineage(ctx, readCorpus(MODEL_DIR));
  },
};

export default unit;
