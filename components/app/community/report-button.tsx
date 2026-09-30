'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { APIClientError, apiClient } from '@/lib/api/client';
import {
  PROFILE_REPORT_REASON_LABELS,
  REPORT_REASON_LABELS,
} from '@/lib/app/breaks/community/report-reasons';

type Target = { slug: string } | { username: string };

function targetOf(target: Target): {
  endpoint: string;
  question: string;
  labels: Record<string, string>;
} {
  if ('slug' in target) {
    return {
      endpoint: `/api/v1/public/patterns/${encodeURIComponent(target.slug)}/report`,
      question: 'What is wrong with this pattern?',
      labels: REPORT_REASON_LABELS,
    };
  }
  return {
    endpoint: `/api/v1/public/drummers/${encodeURIComponent(target.username)}/report`,
    question: 'What is wrong with this profile?',
    labels: PROFILE_REPORT_REASON_LABELS,
  };
}

/**
 * Report a shared or published pattern (Phase 6, task 6.10), or a drummer's
 * public profile (Phase 7B, task 7B.5) — for a signed-in reader who is not
 * its owner. An inline form, not a browser dialog: a reason, an optional
 * note, and a thank-you. The owner never sees who reported it.
 */
export function ReportButton(target: Target) {
  const { endpoint, question, labels } = targetOf(target);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
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
      await apiClient.post(endpoint, {
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
        <legend className="font-medium">{question}</legend>
        {Object.entries(labels).map(([r, label]) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
            />
            {label}
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
