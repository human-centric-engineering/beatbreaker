import type { Metadata } from 'next';
import Link from 'next/link';

import { ModerationActions } from '@/components/app/admin/patterns/moderation-actions';
import { ProfileModerationActions } from '@/components/app/admin/patterns/profile-moderation-actions';
import { publicPath } from '@/lib/app/breaks/community/visibility';
import {
  moderationQueue,
  PROFILE_REPORT_REASON_LABELS,
  PROFILE_REPORT_REASONS,
  profileQueue,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
} from '@/lib/app/breaks/community/reports';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { PUBLISHING_FLAG } from '@/lib/app/breaks/community/publish';

/**
 * The moderation queue — `/admin/patterns` (Phase 6, task 6.11): every shared
 * or published pattern with an open report, oldest first, and what to do
 * about each. From Phase 7B, the reported profiles below them.
 *
 * Rendered on the server from `moderationQueue` and `profileQueue`, the same
 * reads `GET /api/v1/admin/patterns` and `GET /api/v1/admin/drummers` answer
 * with, for the reason the catalogue page
 * gives: it is a query in the same process. Not cached — this is the page a
 * moderator reloads to see their action land.
 *
 * Authentication is `app/admin/layout.tsx`.
 */

export const metadata: Metadata = {
  title: 'Reports',
  description: "Reports on shared and published BeatBreaker patterns and on drummers' profiles.",
};

function reasonLabel(reason: string): string {
  const known = REPORT_REASONS.find((r) => r === reason);
  return known ? REPORT_REASON_LABELS[known] : reason;
}

function profileReasonLabel(reason: string): string {
  const known = PROFILE_REPORT_REASONS.find((r) => r === reason);
  return known ? PROFILE_REPORT_REASON_LABELS[known] : reason;
}

function ReportLines({
  reports,
  label,
}: {
  reports: Array<{ id: string; reason: string; note: string | null; createdAt: string }>;
  label: (reason: string) => string;
}) {
  return (
    <ul className="space-y-1 text-sm">
      {reports.map((r) => (
        <li key={r.id}>
          <span className="font-medium">{label(r.reason)}</span>
          <span className="text-muted-foreground"> · {r.createdAt.slice(0, 10)}</span>
          {r.note ? <span> — {r.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export default async function AdminPatternsPage() {
  const [queue, profiles, publishing] = await Promise.all([
    moderationQueue(),
    profileQueue(),
    isFeatureEnabled(PUBLISHING_FLAG),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Reported patterns</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Unpublishing makes a pattern private and emails its owner; their copy stays saved.
          Stripping links removes its video and song links and leaves it published. Dismissing
          closes the reports and changes nothing else. Publishing site-wide is{' '}
          <strong>{publishing ? 'on' : 'off'}</strong> — the{' '}
          <Link href="/admin/features" className="underline">
            {PUBLISHING_FLAG}
          </Link>{' '}
          flag.
        </p>
      </header>

      {queue.length ? (
        <ul className="space-y-4">
          {queue.map((item) => (
            <li key={item.breakId} className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="font-semibold">
                    {item.slug ? (
                      <Link href={publicPath(item.slug)} target="_blank" className="underline">
                        {item.title}
                      </Link>
                    ) : (
                      item.title
                    )}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {item.owner.username ? `@${item.owner.username}` : 'no username'} ·{' '}
                    {item.owner.email} · {item.visibility} · {item.links} link
                    {item.links === 1 ? '' : 's'}
                  </p>
                </div>
                <ModerationActions breakId={item.breakId} links={item.links} />
              </div>
              <ReportLines reports={item.reports} label={reasonLabel} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No open reports.</p>
      )}

      <section className="space-y-4" aria-labelledby="reported-profiles">
        <div className="space-y-2">
          <h2 id="reported-profiles" className="text-xl font-bold">
            Reported profiles
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Stripping links removes a drummer&apos;s channel links and leaves the rest of their
            profile. Dismissing closes the reports and changes nothing else.
          </p>
        </div>
        {profiles.length ? (
          <ul className="space-y-4">
            {profiles.map((item) => (
              <li key={item.subjectId} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">
                      {item.username ? (
                        <Link href={`/u/${item.username}`} target="_blank" className="underline">
                          @{item.username}
                        </Link>
                      ) : (
                        'no username'
                      )}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {item.email} · {item.links} link{item.links === 1 ? '' : 's'}
                    </p>
                    {item.bio ? <p className="text-sm whitespace-pre-line">{item.bio}</p> : null}
                  </div>
                  <ProfileModerationActions subjectId={item.subjectId} links={item.links} />
                </div>
                <ReportLines reports={item.reports} label={profileReasonLabel} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No open reports on profiles.</p>
        )}
      </section>
    </div>
  );
}
