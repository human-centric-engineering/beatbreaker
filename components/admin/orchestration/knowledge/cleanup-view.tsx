'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, FileText, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { z } from 'zod';

import { ChatInterface } from '@/components/admin/orchestration/chat/chat-interface';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api/client';
import { API } from '@/lib/api/endpoints';

interface CleanupViewProps {
  documentId: string;
  documentName: string;
  fileName: string;
  originalContent: string;
  initialProcessedContent: string;
  sizeClass: 'small' | 'medium' | 'large' | 'too-large';
  sizeTokens: number;
  llmRewriteAllowed: boolean;
}

const docResponseSchema = z.object({
  document: z.object({
    id: z.string(),
    status: z.string(),
    originalContent: z.string().nullable(),
    processedContent: z.string().nullable(),
  }),
});

const SIZE_CLASS_LABEL: Record<CleanupViewProps['sizeClass'], string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  'too-large': 'Too large for whole-doc LLM rewrite',
};

const SIZE_CLASS_TONE: Record<CleanupViewProps['sizeClass'], string> = {
  small: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
  medium: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200',
  large: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  'too-large': 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200',
};

export function CleanupView({
  documentId,
  documentName,
  fileName,
  originalContent,
  initialProcessedContent,
  sizeClass,
  sizeTokens,
  llmRewriteAllowed,
}: CleanupViewProps) {
  const router = useRouter();
  const [processedContent, setProcessedContent] = useState(initialProcessedContent);
  const [pendingAction, setPendingAction] = useState<'commit' | 'use-original' | 'delete' | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Re-fetch the doc after each chat turn so the preview pane reflects any
  // mutations the agent applied via its capabilities. The cleanup capabilities
  // write to processedContent in-place; the chat doesn't echo content back.
  const refetchDoc = useCallback(async () => {
    try {
      const body = await apiClient.get<unknown>(
        API.ADMIN.ORCHESTRATION.knowledgeDocumentById(documentId)
      );
      const parsed = docResponseSchema.safeParse(body);
      if (!parsed.success) return;
      const next =
        parsed.data.document.processedContent ?? parsed.data.document.originalContent ?? '';
      setProcessedContent(next);
    } catch {
      // Best-effort refresh; the chat continues to work even if this fails.
    }
  }, [documentId]);

  const charsRemoved = originalContent.length - processedContent.length;
  const reductionPct =
    originalContent.length === 0 ? 0 : Math.max(0, (charsRemoved / originalContent.length) * 100);

  const finalise = useCallback(
    async (action: 'commit' | 'use-original' | 'delete') => {
      setPendingAction(action);
      setError(null);
      try {
        const res = await fetch(
          `${API.ADMIN.ORCHESTRATION.knowledgeDocumentById(documentId)}/cleanup/finalise`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          }
        );
        if (!res.ok) {
          const errBody = (await res.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(errBody?.error?.message ?? `Failed (${res.status})`);
        }
        router.push('/admin/orchestration/knowledge');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed');
      } finally {
        setPendingAction(null);
      }
    },
    [documentId, router]
  );

  const sizeLabel = useMemo(() => SIZE_CLASS_LABEL[sizeClass], [sizeClass]);
  const sizeTone = useMemo(() => SIZE_CLASS_TONE[sizeClass], [sizeClass]);

  // Initial nudge for the agent — sent as the first user turn so the agent
  // calls estimate_size and proposes a starting plan. Only used as a starter
  // chip; the admin can type instead.
  const starterPrompts = useMemo(
    () => [
      `Take a look at this document. Suggest what to clean up.`,
      `Strip timestamps and speaker labels, then collapse whitespace.`,
      ...(llmRewriteAllowed
        ? ['Remove filler words and tighten the language.']
        : ['The document is large — use deterministic strips and then re-check size.']),
    ],
    [llmRewriteAllowed]
  );

  return (
    <div className="space-y-4">
      <header className="bg-background sticky top-0 z-30 -mx-6 border-b px-6 pt-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="text-muted-foreground h-5 w-5" />
              <h1 className="truncate text-xl font-semibold" title={documentName}>
                {documentName}
              </h1>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${sizeTone}`}
                title={`~${sizeTokens.toLocaleString()} tokens`}
              >
                {sizeLabel}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 truncate text-xs" title={fileName}>
              {fileName} · {processedContent.length.toLocaleString()} chars
              {charsRemoved !== 0 ? ` · ${reductionPct.toFixed(1)}% reduction` : null}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void finalise('delete')}
              disabled={pendingAction !== null}
              className="text-destructive hover:text-destructive"
            >
              {pendingAction === 'delete' ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3 w-3" />
              )}
              Discard &amp; delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void finalise('use-original')}
              disabled={pendingAction !== null}
            >
              {pendingAction === 'use-original' ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : null}
              Use original
            </Button>
            <Button
              size="sm"
              onClick={() => void finalise('commit')}
              disabled={pendingAction !== null}
            >
              {pendingAction === 'commit' ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              )}
              Mark cleaned
            </Button>
          </div>
        </div>
        {!llmRewriteAllowed ? (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300/40 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              This document is too large for a whole-document LLM rewrite. Deterministic strips and
              per-section rewrites still work. Run deterministic cleanups first, then re-check the
              size with <code>estimate_size</code>.
            </span>
          </div>
        ) : null}
        {error ? <p className="text-destructive mt-3 text-sm">{error}</p> : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border">
          <Tabs defaultValue="cleaned" className="w-full">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <div className="flex items-center gap-2">
                <FileText className="text-muted-foreground h-4 w-4" />
                <span className="text-sm font-medium">Document preview</span>
              </div>
              <TabsList>
                <TabsTrigger value="cleaned">Cleaned</TabsTrigger>
                <TabsTrigger value="original">Original</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="cleaned" className="m-0">
              <pre className="max-h-[60vh] overflow-auto p-3 text-xs whitespace-pre-wrap">
                {processedContent || '(empty)'}
              </pre>
            </TabsContent>
            <TabsContent value="original" className="m-0">
              <pre className="text-muted-foreground max-h-[60vh] overflow-auto p-3 text-xs whitespace-pre-wrap">
                {originalContent || '(empty)'}
              </pre>
            </TabsContent>
          </Tabs>
        </section>

        <section className="bg-card flex h-[70vh] flex-col rounded-lg border">
          <ChatInterface
            agentSlug="cleanup-agent"
            contextType="knowledge_document"
            contextId={documentId}
            persistenceKey={`kb-cleanup-${documentId}`}
            starterPrompts={starterPrompts}
            onStreamComplete={() => void refetchDoc()}
            onCapabilityResult={() => void refetchDoc()}
            embedded
            className="flex-1"
          />
        </section>
      </div>
    </div>
  );
}
