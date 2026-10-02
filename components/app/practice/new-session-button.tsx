'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createSessionWith, sessionPath } from '@/components/app/practice/session-api';
import { Button } from '@/components/ui/button';
import { APIClientError } from '@/lib/api/client';

/**
 * _New session_: an empty practice session, opened in the editor. Patterns
 * are added from where you find them — _Add to a session_ in the Studio's
 * drawer and on a pattern's page.
 */
export function NewSessionButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await createSessionWith('New session', []);
      router.push(sessionPath(session.id));
    } catch (err) {
      setError(
        err instanceof APIClientError && err.code !== 'NETWORK_ERROR'
          ? err.message
          : 'Could not make the session — try again'
      );
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={() => void make()} disabled={busy}>
        <Plus className="mr-2 h-4 w-4" aria-hidden />
        New session
      </Button>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
