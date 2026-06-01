'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sha256Hex } from '@/lib/orchestration/knowledge/cleanup-client';
import type { Section } from '@/lib/orchestration/knowledge/section-detection';

interface EditableSectionProps {
  documentId: string;
  section: Section;
  /** Acquire the doc-level edit lock. Resolves true on success. */
  acquireLock: () => Promise<boolean>;
  /** Called when this section is saved successfully — host refetches the doc. */
  onSaved: () => void;
  /** Called when "Refine with agent" produces a pending change — host opens the diff modal. */
  onPendingChange: (pendingChangeId: string) => void;
}

interface ConflictState {
  currentBody: string;
  currentFingerprint: string;
}

// Single section view, with hover-to-reveal pencil that swaps to a textarea
// editor. On save, computes a SHA-256 of the section.body the editor opened
// against, POSTs to the cleanup/section endpoint, and surfaces 423 / 409
// errors with appropriate recovery UX.
export function EditableSection({
  documentId,
  section,
  acquireLock,
  onSaved,
  onPendingChange,
}: EditableSectionProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [refining, setRefining] = useState(false);
  const [refineInstructions, setRefineInstructions] = useState('');
  const [refinePromptOpen, setRefinePromptOpen] = useState(false);

  // Reset draft when section.body changes from underneath (capability fired
  // OR a refetch surfaced server-side updates) and we're NOT mid-edit.
  useEffect(() => {
    if (!editing) setDraft(section.body);
  }, [section.body, editing]);

  const startEdit = useCallback(async () => {
    setError(null);
    setConflict(null);
    // Acquire the lock first — bail if another admin holds it.
    const ok = await acquireLock();
    if (!ok) return;
    setDraft(section.body);
    setEditing(true);
  }, [acquireLock, section.body]);

  const cancel = useCallback(() => {
    setEditing(false);
    setDraft(section.body);
    setError(null);
    setConflict(null);
  }, [section.body]);

  const save = useCallback(
    async (overrideFingerprint?: string) => {
      setSaving(true);
      setError(null);
      try {
        const expectedFingerprint = overrideFingerprint ?? (await sha256Hex(section.body));
        const res = await fetch(
          `/api/v1/admin/orchestration/knowledge/documents/${documentId}/cleanup/section`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sectionMarker: section.marker,
              content: draft,
              expectedFingerprint,
            }),
          }
        );
        if (res.status === 423) {
          setError('Another admin is editing this document. Your changes were not saved.');
          return;
        }
        if (res.status === 409) {
          const body = (await res.json()) as {
            error?: { details?: { currentBody?: string[]; currentFingerprint?: string[] } };
          };
          const currentBody = body.error?.details?.currentBody?.[0] ?? '';
          const currentFingerprint = body.error?.details?.currentFingerprint?.[0] ?? '';
          setConflict({ currentBody, currentFingerprint });
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(body?.error?.message ?? `Save failed (${res.status})`);
        }
        setEditing(false);
        setConflict(null);
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [documentId, draft, section.body, section.marker, onSaved]
  );

  const keepMine = useCallback(() => {
    if (!conflict) return;
    // Re-save with the server's current fingerprint — overwrites the other
    // writer's change with the local draft.
    void save(conflict.currentFingerprint);
  }, [conflict, save]);

  const takeTheirs = useCallback(() => {
    if (!conflict) return;
    setDraft(conflict.currentBody);
    setConflict(null);
    setError(null);
    // Stay in edit mode so the admin can hand-merge if they want.
  }, [conflict]);

  const refineWithAgent = useCallback(async () => {
    if (refineInstructions.trim().length === 0) return;
    setRefining(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/admin/orchestration/knowledge/documents/${documentId}/cleanup/section/refine`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionMarker: section.marker,
            instructions: refineInstructions.trim(),
          }),
        }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? `Refine failed (${res.status})`);
      }
      const body = (await res.json()) as { data?: { pendingChangeId?: string } };
      if (body.data?.pendingChangeId) {
        onPendingChange(body.data.pendingChangeId);
      }
      setRefinePromptOpen(false);
      setRefineInstructions('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refine failed');
    } finally {
      setRefining(false);
    }
  }, [documentId, refineInstructions, section.marker, onPendingChange]);

  // Live diff strip — char/line delta vs. the saved baseline (section.body).
  const draftCharsDelta = draft.length - section.body.length;
  const draftLinesDelta = draft.split('\n').length - section.body.split('\n').length;

  if (!editing) {
    return (
      <div className="group relative border-b last:border-b-0">
        <button
          type="button"
          aria-label={`Edit section ${section.marker}`}
          onClick={() => void startEdit()}
          className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-2 right-2 hidden rounded-md p-1 opacity-0 transition group-hover:flex group-hover:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <pre className="overflow-auto p-3 text-xs whitespace-pre-wrap">{section.body}</pre>
      </div>
    );
  }

  return (
    <div className="bg-muted/20 border-b last:border-b-0">
      <div className="text-muted-foreground border-b px-3 py-1 text-xs font-medium">
        Editing: {section.marker}
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="bg-background block w-full resize-y p-3 font-mono text-xs whitespace-pre-wrap focus:outline-none"
        rows={Math.max(4, Math.min(20, draft.split('\n').length))}
        disabled={saving}
      />
      {error ? (
        <div className="border-destructive/20 bg-destructive/5 text-destructive flex items-start gap-2 border-t p-2 text-xs">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {conflict ? (
        <div className="border-t border-amber-300/40 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
          <div className="font-medium">Section changed since you started editing.</div>
          <div className="mt-1">
            Choose: <strong>Keep mine</strong> overwrites the new server version with your edit;{' '}
            <strong>Take theirs</strong> discards your edit and loads the new version into the
            textarea.
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={keepMine} disabled={saving}>
              Keep mine
            </Button>
            <Button size="sm" variant="outline" onClick={takeTheirs} disabled={saving}>
              Take theirs
            </Button>
          </div>
        </div>
      ) : null}
      {refinePromptOpen ? (
        <div className="bg-muted/40 border-t p-2">
          <label
            htmlFor="cleanup-refine-instructions"
            className="text-muted-foreground mb-1 block text-xs font-medium"
          >
            Tell the agent what to do with this section
          </label>
          <div className="flex gap-2">
            <Input
              id="cleanup-refine-instructions"
              value={refineInstructions}
              onChange={(e) => setRefineInstructions(e.target.value)}
              placeholder="e.g. shorten to one paragraph; remove filler words"
              disabled={refining}
              className="h-8 flex-1 text-xs"
            />
            <Button
              size="sm"
              onClick={() => void refineWithAgent()}
              disabled={refining || refineInstructions.trim().length === 0}
            >
              {refining ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Refine
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRefinePromptOpen(false)}
              disabled={refining}
            >
              Cancel
            </Button>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            The agent&apos;s rewrite opens as a diff card for you to Accept or Reject — it
            doesn&apos;t replace your edit until you do.
          </p>
        </div>
      ) : null}
      <div className="flex items-center justify-between border-t px-3 py-2">
        <span className="text-muted-foreground text-xs">
          {draft.length.toLocaleString()} chars · {draft.split('\n').length} lines
          {draftCharsDelta !== 0 ? (
            <>
              {' · '}
              <span
                className={
                  draftCharsDelta < 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-amber-700 dark:text-amber-300'
                }
              >
                {draftCharsDelta > 0 ? '+' : ''}
                {draftCharsDelta.toLocaleString()} chars
                {draftLinesDelta !== 0
                  ? `, ${draftLinesDelta > 0 ? '+' : ''}${draftLinesDelta} lines`
                  : ''}
              </span>
            </>
          ) : null}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRefinePromptOpen(true)}
            disabled={saving || refining || refinePromptOpen}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            Refine with agent
          </Button>
          <Button size="sm" variant="ghost" onClick={cancel} disabled={saving || refining}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving || refining}>
            {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
