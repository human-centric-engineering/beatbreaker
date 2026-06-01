import { prisma } from '@/lib/db/client';

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
}
