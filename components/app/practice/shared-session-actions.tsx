'use client';

import { Loader2, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { saveSharedSession, sessionPath } from '@/components/app/practice/session-api';
import { Button } from '@/components/ui/button';
import { APIClientError } from '@/lib/api/client';

/**
 * What a signed-in reader can do with someone's shared session (Phase 7D,
 * D32): _Save to my sessions_, which makes a copy of their own and opens it
 * in the editor, and _Run it_, which makes the same copy and runs it — a
 * session runs from your own sessions, with your own targets.
 */
export function SharedSessionActions({ slug, runnable }: { slug: string; runnable: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'save' | 'run' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (then: 'save' | 'run') => {
    setBusy(then);
    setError(null);
    try {
      const copy = await saveSharedSession(slug);
      router.push(then === 'run' ? `/studio?session=${copy.id}` : sessionPath(copy.id));
    } catch (err) {
      setError(
        err instanceof APIClientError && err.code !== 'NETWORK_ERROR'
          ? err.message
          : 'That did not save. Try again.'
      );
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" disabled={busy !== null} onClick={() => void save('save')}>
        {busy === 'save' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        Save to my sessions
      </Button>
      {runnable ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={() => void save('run')}
        >
          {busy === 'run' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Play className="mr-2 h-4 w-4" aria-hidden />
          )}
          Run it
        </Button>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
