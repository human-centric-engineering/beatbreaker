import safeRegex from 'safe-regex2';
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

export type CompileRegexResult = { ok: true; regex: RegExp } | { ok: false; error: string };

// strip_lines_matching / strip_matches let the cleanup agent pick a regex from
// natural-language instructions and run it against the document. Node's
// RegExp engine has no built-in guard against catastrophic backtracking, and
// a synchronous `.test()` / `.replace()` already in flight cannot be timed
// out — so a crafted or hallucinated pattern (e.g. `(a+)+b`) must be rejected
// before it ever runs, not caught after it hangs the process.
export function compileSafeRegex(pattern: string, flags: string): CompileRegexResult {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (err) {
    return { ok: false, error: `Invalid regex: ${(err as Error).message}` };
  }
  if (!safeRegex(regex)) {
    return {
      ok: false,
      error: 'Regex rejected: pattern is vulnerable to catastrophic backtracking.',
    };
  }
  return { ok: true, regex };
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
