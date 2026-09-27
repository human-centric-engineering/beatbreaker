'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { APIClientError, apiClient } from '@/lib/api/client';
import {
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  type ReportReason,
} from '@/lib/app/breaks/community/report-reasons';

/**
 * Report a shared or published pattern (Phase 6, task 6.10) — for a
 * signed-in reader who is not its owner. An inline form, not a browser
 * dialog: a reason, an optional note, and a thank-you. The owner never sees
 * who reported it.
 */
export function ReportButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <p className="text-sm" role="status">
        Thanks — we&apos;ll take a look.
      </p>
    );
  }
  if (!open) {
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Report
      </Button>
    );
  }

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/api/v1/public/patterns/${slug}/report`, {
        body: { reason, ...(note.trim() ? { note: note.trim() } : {}) },
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof APIClientError ? e.message : 'That did not send. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="w-full space-y-3 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <fieldset className="space-y-2">
        <legend className="font-medium">What is wrong with this pattern?</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
            />
            {REPORT_REASON_LABELS[r]}
          </label>
        ))}
      </fieldset>
      <label className="block space-y-1 text-sm">
        <span>Anything we should know? (optional)</span>
        <textarea
          className="border-input bg-background w-full rounded-md border p-2"
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={!reason || busy}>
          Send report
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
