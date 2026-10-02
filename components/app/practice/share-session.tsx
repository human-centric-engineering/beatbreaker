'use client';

import { Link2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { setSessionShared } from '@/components/app/practice/session-api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { APIClientError } from '@/lib/api/client';
import { sharedSessionPath } from '@/lib/app/practice/items';
import {
  type SessionView,
  type ShareBlocked,
  shareBlockedSchema,
  type ShareState,
} from '@/lib/validations/practice-sessions';

/**
 * _Share_ in the session editor (Phase 7D, D32): share a session with a
 * link, copy the link, stop sharing.
 *
 * A session can be shared only when every pattern in it is one anyone could
 * open. When one is not, the server refuses and names them, and the dialog
 * lists them — your own private ones with a link to the Studio, where each is
 * shared; ones that are gone, to remove. The link shares what is saved, so
 * unsaved edits have to be saved first.
 */
export function ShareSession({
  session,
  dirty,
  onChange,
}: {
  session: SessionView;
  /** Edits not saved yet: the link would share the saved session, not these. */
  dirty: boolean;
  onChange: (state: ShareState) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<ShareBlocked | null>(null);
  const [copied, setCopied] = useState(false);

  const path =
    session.visibility === 'link' && session.slug ? sharedSessionPath(session.slug) : null;

  const change = async (shared: boolean) => {
    setBusy(true);
    setError(null);
    setBlocked(null);
    setCopied(false);
    try {
      onChange(await setSessionShared(session.id, shared));
    } catch (err) {
      const items =
        err instanceof APIClientError && err.code === 'ITEMS_NOT_SHARED'
          ? shareBlockedSchema.safeParse(err.details?.items)
          : null;
      if (items?.success) setBlocked(items.data);
      else
        setError(
          err instanceof APIClientError && err.code !== 'NETWORK_ERROR'
            ? err.message
            : 'That did not work. Try again.'
        );
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(new URL(link, window.location.origin).toString());
      setCopied(true);
    } catch {
      setError('Copy blocked — select the link and copy it.');
    }
  };

  /** The Studio address of a blocked pattern of yours, read from the editor's items. */
  const studioPath = (position: number): string | null => {
    const target = session.items.find((i) => i.position === position)?.target;
    return target?.kind === 'break' && target.mine ? `/studio/${target.id}` : null;
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setBlocked(null);
          setError(null);
          setCopied(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Link2 className="mr-2 h-4 w-4" aria-hidden />
          {path ? 'Shared' : 'Share'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share with a link</DialogTitle>
          <DialogDescription>
            Anyone with the link sees the patterns, their minutes, targets and climb, and can save a
            copy of their own. Your targets show as numbers, including ones taken from your best
            speeds. The session isn&apos;t listed anywhere.
          </DialogDescription>
        </DialogHeader>

        {path ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <a
                className="font-mono text-sm break-all"
                href={path}
                target="_blank"
                rel="noopener noreferrer"
              >
                {path}
              </a>
              <Button type="button" size="sm" variant="outline" onClick={() => void copyLink(path)}>
                Copy link
              </Button>
            </div>
            {copied ? (
              <p className="text-muted-foreground text-sm" role="status">
                Link copied.
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void change(false)}
            >
              Stop sharing
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {dirty ? (
              <p className="text-muted-foreground text-sm">
                Save your changes first — the link shares the session as it is saved.
              </p>
            ) : null}
            <Button type="button" disabled={busy || dirty} onClick={() => void change(true)}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Share with a link
            </Button>
          </div>
        )}

        {blocked ? (
          <div className="space-y-2" role="alert">
            <p className="text-sm font-medium">
              Share {blocked.length === 1 ? 'this pattern' : 'these patterns'} first — someone
              without your account couldn&apos;t open {blocked.length === 1 ? 'it' : 'them'}:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {blocked.map((item) => {
                const studio = studioPath(item.position);
                return (
                  <li key={item.position}>
                    <strong>{item.title}</strong> —{' '}
                    {item.reason === 'gone' ? (
                      'no longer shared by its owner; remove it from the session'
                    ) : studio ? (
                      <>
                        only you can open it.{' '}
                        <Link href={studio} className="underline">
                          Share it from the Studio
                        </Link>
                      </>
                    ) : (
                      'only you can open it'
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
