'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, Loader2, RotateCcw } from 'lucide-react';

import { TextDiffViewer } from '@/components/admin/orchestration/knowledge/text-diff-viewer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/client';

interface RevisionRow {
  id: string;
  version: number;
  source: string;
  actorId: string | null;
  sectionMarker: string | null;
  instructions: string | null;
  createdAt: string;
  contentLength: number;
  charsDelta: number;
}

interface RevisionListResponse {
  revisions: RevisionRow[];
}

interface RevisionDrawerProps {
  documentId: string;
  currentContent: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
}

function formatSource(source: string): string {
  if (source.startsWith('capability:')) return `Agent: ${source.slice('capability:'.length)}`;
  if (source.startsWith('finalise:')) return `Finalise: ${source.slice('finalise:'.length)}`;
  if (source === 'human_full') return 'You: whole-doc edit';
  if (source === 'human_section') return 'You: section edit';
  if (source === 'restore') return 'You: restore';
  return source;
}

export function RevisionDrawer({
  documentId,
  currentContent,
  open,
  onOpenChange,
  onRestored,
}: RevisionDrawerProps) {
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchRevisions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await apiClient.get<RevisionListResponse>(
        `/api/v1/admin/orchestration/knowledge/documents/${documentId}/cleanup/revisions`
      );
      setRevisions(body.revisions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revisions');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (open) void fetchRevisions();
  }, [open, fetchRevisions]);

  // To diff a revision against current, we need its full content. The list
  // endpoint sends metadata only (revisions can be large). We fetch the full
  // content lazily via a separate GET per revision when the admin clicks to
  // preview — for v1 we approximate by replaying the diff against an empty
  // cache (showing a "loading preview" state). For v2 we'll add a dedicated
  // /revisions/:version GET endpoint that returns just `content`.
  //
  // For now, the simplest correct behaviour: the most recent revision's
  // content is currentContent (the live doc state). For older revisions we
  // show metadata + restore button, no live diff. The restore action itself
  // is the recovery path; preview-diff is a nice-to-have that we'll wire
  // up in Phase 8 alongside the live-diff strip.
  const previewableVersions = useMemo(
    () => new Set<number>(revisions.length > 0 ? [revisions[0].version] : []),
    [revisions]
  );

  const selected = useMemo(
    () => revisions.find((r) => r.version === selectedVersion) ?? null,
    [revisions, selectedVersion]
  );

  const restore = useCallback(
    async (version: number) => {
      setRestoring(version);
      setError(null);
      try {
        const res = await fetch(
          `/api/v1/admin/orchestration/knowledge/documents/${documentId}/cleanup/revisions/${version}/restore`,
          { method: 'POST' }
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(body?.error?.message ?? `Restore failed (${res.status})`);
        }
        // restore endpoint returns the restored content under data.newContent —
        // the parent re-fetches the doc on onRestored() so we don't need to
        // cache it here.
        onRestored();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Restore failed');
      } finally {
        setRestoring(null);
      }
    },
    [documentId, onRestored, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Revision history
          </DialogTitle>
          <DialogDescription>
            Every change to this document — your edits, agent capability calls, finalise events — in
            chronological order. Restoring any revision writes a new entry; older versions are never
            deleted.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            {loading ? (
              <div className="text-muted-foreground flex items-center justify-center p-6 text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : revisions.length === 0 ? (
              <p className="text-muted-foreground p-3 text-sm">No revisions yet.</p>
            ) : (
              <ul>
                {revisions.map((rev) => {
                  const active = selectedVersion === rev.version;
                  const sign = rev.charsDelta > 0 ? '+' : rev.charsDelta < 0 ? '' : '±';
                  return (
                    <li
                      key={rev.id}
                      className={`hover:bg-muted/40 border-b text-xs transition ${active ? 'bg-muted/60' : ''}`}
                    >
                      <button
                        type="button"
                        className="w-full cursor-pointer px-3 py-2 text-left"
                        onClick={() => setSelectedVersion(rev.version)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">v{rev.version}</span>
                          <span className="text-muted-foreground">
                            {new Date(rev.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-muted-foreground mt-1">{formatSource(rev.source)}</div>
                        {rev.sectionMarker ? (
                          <div className="text-muted-foreground mt-0.5">
                            Section: {rev.sectionMarker}
                          </div>
                        ) : null}
                        <div className="text-muted-foreground mt-0.5">
                          {rev.contentLength.toLocaleString()} chars ({sign}
                          {Math.abs(rev.charsDelta).toLocaleString()})
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {selected ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">v{selected.version} preview</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void restore(selected.version)}
                    disabled={restoring !== null}
                  >
                    {restoring === selected.version ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-1 h-3 w-3" />
                    )}
                    Restore this version
                  </Button>
                </div>
                {previewableVersions.has(selected.version) ? (
                  <TextDiffViewer before={currentContent} after={currentContent} />
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Side-by-side diff preview lands in Phase 8 along with the live-edit diff strip —
                    for now use <strong>Restore</strong> to load this version into the editor (the
                    restore action writes a new revision so nothing is lost).
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Select a revision to preview.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
