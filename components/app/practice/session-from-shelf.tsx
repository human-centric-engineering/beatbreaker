'use client';

import { ListMusic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  createSessionWith,
  type NewItem,
  sessionPath,
} from '@/components/app/practice/session-api';
import { Button } from '@/components/ui/button';
import { APIClientError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { SESSION_ITEMS_MAX } from '@/lib/validations/practice-sessions';

/**
 * _Make a session from this shelf_ (Phase 7D, task 7D.6): a new practice
 * session of the shelf's patterns, in shelf order — the first twelve, five
 * minutes each — opened in the editor.
 *
 * One request: the patterns are already on the page, so nothing is read
 * first. Their targets are worked out on the server.
 */
export function SessionFromShelf({
  shelf,
  items,
  compact = false,
  className,
}: {
  /** The shelf's name, which names the session. */
  shelf: string;
  items: NewItem[];
  /** The Studio drawer's small button rather than Home's. */
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!items.length) return null;

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await createSessionWith(shelf, items);
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

  const over = items.length > SESSION_ITEMS_MAX;
  const label = 'Make a session from this shelf';
  const hint = over ? `${label} — the first ${SESSION_ITEMS_MAX} patterns` : label;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {compact ? (
        <button
          type="button"
          className="mini"
          onClick={() => void make()}
          disabled={busy}
          title={hint}
        >
          {label}
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void make()}
          disabled={busy}
        >
          <ListMusic className="mr-2 h-4 w-4" aria-hidden />
          {label}
        </Button>
      )}
      {over ? (
        <span className={compact ? 'hint' : 'text-muted-foreground text-xs'}>
          The first {SESSION_ITEMS_MAX}
        </span>
      ) : null}
      {error ? (
        <span role="alert" className={compact ? 'hint' : 'text-destructive text-sm'}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
