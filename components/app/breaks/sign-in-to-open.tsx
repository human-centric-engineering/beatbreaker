'use client';

import { useEffect } from 'react';

import { stashPendingLink } from '@/lib/app/breaks/pending-link';

/**
 * What a signed-out visitor to `/breaks` gets: the shared break in the URL's
 * fragment is stashed, then they are sent to sign in. The fragment never
 * reaches the server, so this has to happen in the browser — a proxy redirect
 * would lose it (H5). The console takes it back after sign-in.
 */
export function SignInToOpen({ loginHref }: { loginHref: string }) {
  useEffect(() => {
    try {
      stashPendingLink(window.localStorage, window.location.hash);
    } catch {
      // storage blocked — they still get to sign in, just onto a fresh break
    }
    window.location.replace(loginHref);
  }, [loginHref]);

  return (
    <p className="text-muted-foreground py-16 text-center text-sm" role="status">
      Taking you to sign in…
    </p>
  );
}
