'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { APIClientError, apiClient } from '@/lib/api/client';

const copied = z.object({ id: z.string().min(1) });

/**
 * What a signed-in reader can do with a shared pattern (task 6.6): _Save a
 * copy_ — a private pattern of their own, credited to this one — and _Open in
 * the editor_. Report arrives with moderation (6.10).
 */
export function PatternActions({ id, children }: { id: string; children?: React.ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveCopy = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = copied.parse(await apiClient.post(`/api/v1/breaks/${id}/copy`, { body: {} }));
      router.push(`/studio/${data.id}`);
    } catch (e) {
      setError(
        e instanceof APIClientError && e.code === 'NETWORK_ERROR'
          ? 'Could not reach the server — not saved.'
          : 'That did not save. Try again.'
      );
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={() => void saveCopy()} disabled={busy}>
        Save a copy
      </Button>
      <Button asChild variant="outline">
        <Link href={`/studio/${id}`}>Open in the editor</Link>
      </Button>
      {children}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
