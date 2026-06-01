import { prisma } from '@/lib/db/client';
import type { CapabilityContext } from '@/lib/orchestration/capabilities/types';
import { writeRevision } from '@/lib/orchestration/knowledge/revisions';

export interface CleanupTarget {
  documentId: string;
  /** Current working state — `processedContent` if set, otherwise `originalContent`. */
  content: string;
  /** Immutable source-of-truth; never mutated by capabilities. */
  originalContent: string;
}

// Document Clean Up capabilities run inside a chat session bound to a single
// knowledge document via AiConversation.contextType='knowledge_document' +
// contextId. This helper resolves the target doc from the conversation, asserts
// the doc is in 'cleaning' status, and returns the current working content.
// Returns null when the context doesn't match (caller surfaces a clear error
// to the agent so the LLM tells the user "this isn't a cleanup session").
export async function resolveCleanupTarget(
  context: CapabilityContext
): Promise<CleanupTarget | null> {
  if (!context.conversationId) return null;
  const conv = await prisma.aiConversation.findUnique({
    where: { id: context.conversationId },
    select: { contextType: true, contextId: true },
  });
  if (conv?.contextType !== 'knowledge_document' || !conv.contextId) return null;
  const doc = await prisma.aiKnowledgeDocument.findUnique({
    where: { id: conv.contextId },
    select: {
      id: true,
      status: true,
      originalContent: true,
      processedContent: true,
    },
  });
  if (!doc || doc.status !== 'cleaning' || doc.originalContent === null) return null;
  return {
    documentId: doc.id,
    content: doc.processedContent ?? doc.originalContent,
    originalContent: doc.originalContent,
  };
}

export interface WriteCleanupContentOpts {
  /** Where the mutation came from — flows into AiKnowledgeDocumentRevision.source. */
  source: string;
  /** Caller principal (admin in chat session, null if internal). */
  actorId: string | null;
  /** Optional — section marker for per-section edits. */
  sectionMarker?: string;
  /** Optional — instructions for LLM-source rewrites. */
  instructions?: string;
}

// Mutate processedContent AND append a revision row in one logical step.
// Every callsite — capabilities, edit endpoints, finalise — flows through
// here so the revision history is always written. Callers MUST hold the
// edit lock (see requireEditableTarget); this helper does not check.
export async function writeCleanupContent(
  documentId: string,
  content: string,
  opts: WriteCleanupContentOpts
): Promise<void> {
  await prisma.aiKnowledgeDocument.update({
    where: { id: documentId },
    data: { processedContent: content },
  });
  await writeRevision({
    documentId,
    content,
    source: opts.source,
    actorId: opts.actorId,
    sectionMarker: opts.sectionMarker,
    instructions: opts.instructions,
  });
}

export interface MutationSummary {
  charsRemoved: number;
  charsAfter: number;
  linesRemoved: number;
  linesAfter: number;
}

export function summariseMutation(before: string, after: string): MutationSummary {
  return {
    charsRemoved: before.length - after.length,
    charsAfter: after.length,
    linesRemoved: before.split('\n').length - after.split('\n').length,
    linesAfter: after.split('\n').length,
  };
}
