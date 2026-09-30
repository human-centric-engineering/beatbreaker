'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { APIClientError, apiClient } from '@/lib/api/client';
import type { ProfileModerationAction } from '@/lib/app/breaks/community/moderation';

/**
 * What a moderator can do about a reported profile (Phase 7B, task 7B.6):
 * strip its channel links, or dismiss the reports. Neither emails anyone, so
 * neither asks twice.
 */
export function ProfileModerationActions({
  subjectId,
  links,
}: {
  subjectId: string;
  links: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: ProfileModerationAction) => {
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/api/v1/admin/drummers/${subjectId}`, { body: { action } });
      router.refresh();
    } catch (e) {
      setError(e instanceof APIClientError ? e.message : 'That did not go through.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {links ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void act('strip-links')}>
          Strip links
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act('dismiss')}>
        Dismiss
      </Button>
      {error ? (
        <span className="text-destructive text-sm" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
