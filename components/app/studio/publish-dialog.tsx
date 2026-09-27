'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';

import { useStudio } from '@/components/app/studio/studio-provider';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { APIClientError, apiClient } from '@/lib/api/client';
import {
  USERNAME_RULE,
  usernameProblem,
  USERNAME_MESSAGES,
} from '@/lib/app/breaks/community/username';

/** What `GET /api/v1/drummer-profile` answers — checked, not cast. */
const profileAnswer = z.object({ username: z.string() }).nullable();

/**
 * Publish to the community library (Phase 6, task 6.9) — the dialog in
 * site-copy §6: who it will appear as, that the account name and email never
 * show, and the "I wrote this" tick. With no username yet, choosing one comes
 * first, in the same dialog, rather than sending you to Settings and losing
 * your place.
 *
 * Publish is a plain button, not `AlertDialogAction`: a refusal — the same
 * notes as someone else's pattern, a blocked word, the daily limit — must
 * leave the dialog open with the reason in it.
 */
export function PublishDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { doc, patterns } = useStudio();
  const title = patterns.A?.name || 'Untitled pattern';
  const [username, setUsername] = useState<string | null | undefined>(undefined);
  const [choice, setChoice] = useState('');
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTicked(false);
    setError(null);
    let live = true;
    apiClient
      .get('/api/v1/drummer-profile')
      .then((raw) => {
        const parsed = profileAnswer.safeParse(raw);
        if (live) setUsername(parsed.success ? (parsed.data?.username ?? null) : null);
      })
      .catch(() => {
        if (live) setUsername(null);
      });
    return () => {
      live = false;
    };
  }, [open]);

  const needsName = username === null;

  const submit = async () => {
    setError(null);
    if (needsName) {
      const problem = usernameProblem(choice);
      if (problem) {
        setError(USERNAME_MESSAGES[problem]);
        return;
      }
    }
    setBusy(true);
    try {
      if (needsName) {
        try {
          await apiClient.put('/api/v1/drummer-profile', { body: { username: choice } });
          setUsername(choice.trim().toLowerCase());
        } catch (e) {
          setError(e instanceof APIClientError ? e.message : 'That username did not save.');
          return;
        }
      }
      const result = await doc.publish();
      if (result.ok) onOpenChange(false);
      else setError(result.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Publish &ldquo;{title}&rdquo; to the community library
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {needsName ? (
                <>
                  <p>
                    <strong>Choose a username.</strong> This is the name other drummers will see on
                    anything you publish. It doesn&apos;t have to be your real name.
                  </p>
                  <label className="block space-y-1">
                    <span className="sr-only">Username</span>
                    <input
                      className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                      value={choice}
                      onChange={(e) => setChoice(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      aria-label="Username"
                    />
                    <span className="text-xs">{USERNAME_RULE}</span>
                  </label>
                </>
              ) : (
                <p>
                  Anyone will be able to find it, play it and save a copy. It will appear as{' '}
                  <strong>by @{username ?? '…'}</strong> —{' '}
                  <a href="/settings" target="_blank" rel="noopener noreferrer">
                    change
                  </a>
                  . Your account name and email are never shown.
                </p>
              )}
              <p>
                You can unpublish it whenever you like; copies people have already saved stay with
                them.
              </p>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={ticked}
                  onChange={(e) => setTicked(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I wrote this, or I built it from a pattern whose author is credited on it.
                </span>
              </label>
              {error ? (
                <p className="text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            onClick={() => void submit()}
            disabled={!ticked || busy || username === undefined || !doc.id}
          >
            Publish
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
