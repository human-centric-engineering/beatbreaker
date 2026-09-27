'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { APIClientError, apiClient } from '@/lib/api/client';
import type { ModerationAction } from '@/lib/app/breaks/community/moderation';

const LABELS: Record<ModerationAction, string> = {
  unpublish: 'Unpublish',
  'strip-links': 'Strip links',
  dismiss: 'Dismiss',
};

/**
 * The three things a moderator can do about a reported pattern. Unpublishing
 * asks once more in place — it emails the owner — rather than through a
 * browser dialog.
 */
export function ModerationActions({ breakId, links }: { breakId: string; links: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: ModerationAction) => {
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/api/v1/admin/patterns/${breakId}`, { body: { action } });
      router.refresh();
    } catch (e) {
      setError(e instanceof APIClientError ? e.message : 'That did not go through.');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {confirming ? (
        <>
          <span className="text-sm">Unpublish and email the owner?</span>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => void act('unpublish')}
          >
            Yes, unpublish
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            {LABELS.unpublish}
          </Button>
          {links ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void act('strip-links')}
            >
              {LABELS['strip-links']}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act('dismiss')}>
            {LABELS.dismiss}
          </Button>
        </>
      )}
      {error ? (
        <span className="text-destructive text-sm" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
