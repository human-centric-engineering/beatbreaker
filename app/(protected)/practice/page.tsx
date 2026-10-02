import type { Metadata } from 'next';

import { NewSessionButton } from '@/components/app/practice/new-session-button';
import { SessionList } from '@/components/app/practice/session-list';
import { listSessions } from '@/lib/app/breaks/saved/sessions';
import { clearInvalidSession } from '@/lib/auth/clear-session';
import { getServerSession } from '@/lib/auth/utils';

/**
 * `/practice` — your practice sessions (Phase 7D, task 7D.5).
 *
 * Read server-side through `listSessions()`, the function
 * `GET /api/v1/practice-sessions` answers from: one query for the whole list,
 * with each session's titles, total and last run. Signed out, the proxy sends
 * you to sign in (`appProtectedRoutes`).
 */

export const metadata: Metadata = { title: 'Practice sessions' };

export default async function PracticePage() {
  const session = await getServerSession();
  if (!session) clearInvalidSession('/practice');

  const sessions = await listSessions(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Practice sessions</h1>
        <NewSessionButton />
      </div>
      {sessions.length ? (
        <SessionList sessions={sessions} />
      ) : (
        <p className="text-muted-foreground max-w-prose">
          A session is a timed run through patterns: each starts below its target tempo, climbs to
          it and holds it, then the next begins. Make one here, or with{' '}
          <strong>Add to a session</strong> beside any pattern in the Studio.
        </p>
      )}
    </div>
  );
}
