import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CleanupView } from '@/components/admin/orchestration/knowledge/cleanup-view';
import { prisma } from '@/lib/db/client';
import { parseDocumentMetadata } from '@/lib/orchestration/knowledge/document-manager';

export const metadata: Metadata = {
  title: 'Document Clean Up · Knowledge Base',
  description: 'Interactively clean up an uploaded document before chunking.',
};

export default async function CleanupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const document = await prisma.aiKnowledgeDocument.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      fileName: true,
      status: true,
      originalContent: true,
      processedContent: true,
      metadata: true,
    },
  });

  if (!document) notFound();

  // Already-finalised docs shouldn't be reachable via this URL — kick the
  // admin back to the main KB page rather than rendering a stale chat.
  if (document.status !== 'cleaning') {
    redirect('/admin/orchestration/knowledge');
  }

  // The cleanup chat session was created at upload time. Find it so the
  // ChatInterface can hydrate prior turns. Using contextType + contextId
  // (indexed on AiConversation) so the lookup stays cheap.
  const conversation = await prisma.aiConversation.findFirst({
    where: { contextType: 'knowledge_document', contextId: id },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  const meta = parseDocumentMetadata(document.metadata);

  return (
    <div className="space-y-4">
      <nav className="text-muted-foreground -mb-2 text-xs">
        <Link href="/admin/orchestration" className="hover:underline">
          AI Orchestration
        </Link>
        {' / '}
        <Link href="/admin/orchestration/knowledge" className="hover:underline">
          Knowledge Base
        </Link>
        {' / '}
        <span>Document Clean Up</span>
      </nav>

      <CleanupView
        documentId={document.id}
        documentName={document.name}
        fileName={document.fileName}
        originalContent={document.originalContent ?? ''}
        initialProcessedContent={document.processedContent ?? document.originalContent ?? ''}
        sizeClass={meta?.sizeClass ?? 'small'}
        sizeTokens={meta?.sizeTokens ?? 0}
        llmRewriteAllowed={meta?.llmRewriteAllowed ?? true}
        conversationId={conversation?.id ?? null}
      />
    </div>
  );
}
