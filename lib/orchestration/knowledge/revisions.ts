import { prisma } from '@/lib/db/client';
import { DEFAULT_REVISION_RETENTION } from '@/lib/orchestration/knowledge/revision-retention';

export { DEFAULT_REVISION_RETENTION };

// Append-only revision history for the Document Clean Up flow. Every mutator
// of processedContent — capabilities, human edits, restores, the final
// commit/use-original — writes one row here. See the
// AiKnowledgeDocumentRevision model header for the `source` taxonomy.
//
// version numbers are per-document monotonic and allocated by nextVersion
// inside the same call. There's no global lock around nextVersion+create
// because the cooperative edit lock (see edit-lock.ts) is acquired by
// every mutator before it gets here — the lock serialises writers, so
// version collisions can't happen in practice. The (documentId, version)
// UNIQUE index is the defence-in-depth backstop.

// Default retention cap is shared with the client-side drawer via
// `revision-retention.ts` so the server prune and the UI hint stay in sync.
// Bounded retention exists because each revision stores the full document
// content (no diff storage), so an unbounded history scales linearly with
// document size × edit count.

// Lower bound — pruning below this loses meaningful undo history. Upper
// bound — beyond this, the storage cost outweighs the diagnostic value.
const MIN_RETENTION = 10;
const MAX_RETENTION = 500;

/**
 * Resolve the per-document revision retention cap. Reads
 * `KB_REVISION_RETENTION` from the environment when set, otherwise falls
 * back to DEFAULT_REVISION_RETENTION. Clamped to a sensible range so a
 * misconfigured env value can't disable history (0) or unbound it (1_000_000).
 */
export function getRevisionRetention(): number {
  const raw = process.env.KB_REVISION_RETENTION;
  if (!raw) return DEFAULT_REVISION_RETENTION;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return DEFAULT_REVISION_RETENTION;
  return Math.max(MIN_RETENTION, Math.min(MAX_RETENTION, parsed));
}

export interface WriteRevisionOpts {
  documentId: string;
  content: string;
  source: string;
  actorId: string | null;
  sectionMarker?: string;
  instructions?: string;
}

export async function nextVersion(documentId: string): Promise<number> {
  const latest = await prisma.aiKnowledgeDocumentRevision.findFirst({
    where: { documentId },
    select: { version: true },
    orderBy: { version: 'desc' },
  });
  return (latest?.version ?? 0) + 1;
}

export async function writeRevision(opts: WriteRevisionOpts): Promise<void> {
  const version = await nextVersion(opts.documentId);
  await prisma.aiKnowledgeDocumentRevision.create({
    data: {
      documentId: opts.documentId,
      version,
      content: opts.content,
      source: opts.source,
      actorId: opts.actorId,
      sectionMarker: opts.sectionMarker,
      instructions: opts.instructions,
    },
  });
  await pruneOldRevisions(opts.documentId);
}

// Prune revisions beyond the retention cap. Finds the version of the Nth
// most recent revision (where N is the cap) and deletes everything with a
// strictly lower version. Single round-trip per call; safe because the
// cooperative edit lock serialises writers per document.
async function pruneOldRevisions(documentId: string): Promise<void> {
  const retention = getRevisionRetention();
  const cutoff = await prisma.aiKnowledgeDocumentRevision.findMany({
    where: { documentId },
    select: { version: true },
    orderBy: { version: 'desc' },
    skip: retention - 1,
    take: 1,
  });
  if (cutoff.length === 0) return;
  await prisma.aiKnowledgeDocumentRevision.deleteMany({
    where: { documentId, version: { lt: cutoff[0].version } },
  });
}
