import Link from 'next/link';

import { sessionPath } from '@/components/app/practice/session-api';
import { ClientDate } from '@/components/ui/client-date';
import type { SessionSummary } from '@/lib/validations/practice-sessions';

/** How many pattern titles a row names before "and N more". */
const TITLES_SHOWN = 3;

/** The titles in a session, as one line. */
export function titleLine(titles: string[]): string {
  if (!titles.length) return 'No patterns yet';
  const shown = titles.slice(0, TITLES_SHOWN).join(', ');
  const more = titles.length - TITLES_SHOWN;
  return more > 0 ? `${shown} and ${more} more` : shown;
}

/**
 * Your practice sessions as a list (Phase 7D, task 7D.5), each linking to its
 * editor. A server component drawing what `listSessions()` returned — the
 * titles, total, sharing and last run come with the list, so no row asks for
 * anything. Home's _Your sessions_ draws the same rows.
 */
export function SessionList({ sessions }: { sessions: SessionSummary[] }) {
  return (
    <ul className="divide-y rounded-md border">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link
            href={sessionPath(s.id)}
            className="hover:bg-muted flex min-h-11 items-center justify-between gap-4 px-4 py-2"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{s.name}</span>
              <span className="text-muted-foreground block truncate text-xs">
                {titleLine(s.titles)}
              </span>
            </span>
            <span className="text-muted-foreground shrink-0 text-right text-xs">
              {s.totalMinutes} min
              {s.visibility === 'link' ? ' · Shared' : ''}
              <span className="block">
                {s.lastRunAt ? (
                  <>
                    Ran <ClientDate date={s.lastRunAt} />
                  </>
                ) : (
                  'Not run yet'
                )}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
