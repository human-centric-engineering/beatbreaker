'use client';

import { ListPlus } from 'lucide-react';
import { useState } from 'react';

import {
  addToSession,
  createSessionWith,
  hasRoom,
  listMySessions,
} from '@/components/app/practice/session-api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { APIClientError } from '@/lib/api/client';
import { FULL_LAYER } from '@/lib/app/breaks/layers';
import { logger } from '@/lib/logging';
import { cn } from '@/lib/utils';
import type { PinTarget } from '@/lib/validations/pins';
import type { SessionSummary } from '@/lib/validations/practice-sessions';

type Loaded =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ready'; sessions: SessionSummary[] }
  | { state: 'failed' };

/**
 * _Add to a session_ (Phase 7D, task 7D.6): put this pattern at the end of
 * one of your practice sessions, or start a new one with it.
 *
 * Your sessions are read with **one** request when the menu opens, not when
 * the row draws — a drawer list of forty rows asks nothing until one is
 * used. A session already holding twelve patterns, or one per minute, is
 * shown but cannot be chosen. The new item's target is worked out on the
 * server: your best at its layer, else the pattern's tempo.
 */
export function AddToSession({
  target,
  title,
  level = FULL_LAYER,
  variant = 'icon',
  className,
  onResult,
}: {
  target: PinTarget;
  /** The pattern's title — the accessible name, and a new session's name. */
  title: string;
  /** The layer the item plays at. */
  level?: number;
  /** A small icon in a list row, or a labelled button on a page. */
  variant?: 'icon' | 'button';
  className?: string;
  /** What happened, in words — the Studio's notice, or a line on the page. */
  onResult: (message: string, error?: boolean) => void;
}) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'idle' });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoaded({ state: 'loading' });
    try {
      setLoaded({ state: 'ready', sessions: await listMySessions() });
    } catch (err) {
      logger.warn('Practice sessions could not be listed', {
        error: err instanceof Error ? err.message : err,
      });
      setLoaded({ state: 'failed' });
    }
  }

  async function run(action: () => Promise<{ name: string }>, created: boolean) {
    setBusy(true);
    try {
      const session = await action();
      onResult(
        created ? `Made the session “${session.name}”` : `Added to “${session.name}”`,
        false
      );
    } catch (err) {
      onResult(
        err instanceof APIClientError && err.code !== 'NETWORK_ERROR'
          ? err.message
          : 'Could not add that — try again',
        true
      );
    } finally {
      setBusy(false);
      setLoaded({ state: 'idle' });
    }
  }

  const name = `Add ${title} to a practice session`;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) void load();
      }}
    >
      <DropdownMenuTrigger asChild>
        {variant === 'icon' ? (
          <button
            type="button"
            className={cn('pin', className)}
            aria-label={name}
            title={name}
            disabled={busy}
          >
            <ListPlus className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <Button type="button" variant="outline" className={className} disabled={busy}>
            <ListPlus className="mr-2 h-4 w-4" aria-hidden />
            Add to a session
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Add to a practice session</DropdownMenuLabel>
        {loaded.state === 'loading' || loaded.state === 'idle' ? (
          <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
        ) : loaded.state === 'failed' ? (
          <DropdownMenuItem disabled>Could not load your sessions</DropdownMenuItem>
        ) : (
          loaded.sessions.map((s) => (
            <DropdownMenuItem
              key={s.id}
              disabled={!hasRoom(s)}
              onSelect={() => void run(() => addToSession(s.id, { target, level }), false)}
            >
              <span className="truncate">{s.name}</span>
              <span className="text-muted-foreground ml-auto pl-3 text-xs">
                {hasRoom(s) ? `${s.itemCount} · ${s.totalMinutes} min` : 'Full'}
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void run(() => createSessionWith(title, [{ target, level }]), true)}
        >
          New session with this pattern
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
