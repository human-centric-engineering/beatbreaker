import { prisma } from '@/lib/db/client';
import type { CapabilityContext } from '@/lib/orchestration/capabilities/types';

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

export async function writeCleanupContent(documentId: string, content: string): Promise<void> {
  await prisma.aiKnowledgeDocument.update({
    where: { id: documentId },
    data: { processedContent: content },
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
