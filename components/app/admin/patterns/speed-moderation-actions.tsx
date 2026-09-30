'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { APIClientError, apiClient } from '@/lib/api/client';
import type { SpeedModerationAction } from '@/lib/app/breaks/community/moderation';

/**
 * What a moderator can do about a reported speed (Phase 7C): take it off the
 * tables, or dismiss the reports. Unlisting asks once more in place — it
 * emails the drummer — as unpublishing a pattern does. A record already off
 * the tables offers only Dismiss.
 */
export function SpeedModerationActions({
  recordId,
  listed,
}: {
  recordId: string;
  listed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: SpeedModerationAction) => {
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/api/v1/admin/speeds/${recordId}`, { body: { action } });
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
          <span className="text-sm">Take it off the table and email the drummer?</span>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => void act('unlist')}
          >
            Yes, unlist
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          {listed ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              Unlist
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act('dismiss')}>
            Dismiss
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
