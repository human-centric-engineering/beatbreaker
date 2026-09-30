import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { ChannelLinks } from '@/components/app/community/channel-links';
import { PatternCard } from '@/components/app/community/pattern-card';
import { ReportButton } from '@/components/app/community/report-button';
import { Button } from '@/components/ui/button';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { usernameOf } from '@/lib/app/breaks/community/profile';
import {
  getPublicDrummer,
  listPublished,
  type PublicDrummer,
} from '@/lib/app/breaks/community/public';
import { getServerSession } from '@/lib/auth/utils';
import { ABILITY_LABELS, PURPOSE_LABELS } from '@/lib/validations/drummer-about';

/**
 * A drummer's public page — `/u/[username]` (Phase 6, task 6.8): the
 * username, what they wrote about themselves, and what they have published.
 * From Phase 7B, also the About-you fields they switched on, their channel
 * links, and a way for a signed-in reader to report the profile.
 *
 * What is shown about the person is exactly what `getPublicDrummer` returns:
 * never the account name or email (D3), and never a field switched off. Only
 * published patterns are listed; link shares are never on it. An unknown
 * username is a 404.
 */

const readProfile = cache((username: string) => getPublicDrummer(username));

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await readProfile((await params).username);
  if (!profile) return { title: 'Not found', robots: { index: false } };
  return {
    title: `@${profile.username}`,
    description: profile.bio ?? `Drum patterns published by @${profile.username} on BeatBreaker.`,
    alternates: { canonical: `/u/${profile.username}` },
  };
}

export default async function DrummerPage({ params, searchParams }: Props) {
  const profile = await readProfile((await params).username);
  if (!profile) notFound();
  const raw = (await searchParams).cursor;
  const cursor = typeof raw === 'string' ? raw : undefined;

  const [{ patterns, nextCursor }, catalogue, session] = await Promise.all([
    listPublished({ username: profile.username, sort: 'newest', limit: 24, cursor }),
    studioCatalogue(),
    getServerSession(),
  ]);
  const mine = session ? (await usernameOf(session.user.id)) === profile.username : false;
  const styleName = (key: string) => catalogue.styles[key]?.params.label ?? key;

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">@{profile.username}</h1>
        {profile.bio ? <p className="whitespace-pre-line">{profile.bio}</p> : null}
        {profile.channels ? <ChannelLinks channels={profile.channels} /> : null}
        <AboutFacts profile={profile} styleName={styleName} />
        {session && !mine ? <ReportButton username={profile.username} /> : null}
      </header>

      {patterns.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patterns.map((p) => (
            <PatternCard
              key={p.slug}
              pattern={p}
              styleLabel={catalogue.styles[p.style]?.params.label ?? p.style}
              showAuthor={false}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nothing published yet.</p>
      )}

      {nextCursor ? (
        <Button asChild variant="outline">
          <Link href={`/u/${profile.username}?cursor=${encodeURIComponent(nextCursor)}`}>
            More patterns
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

/** The About-you fields the drummer switched on, as a short list; nothing when none are. */
function AboutFacts({
  profile,
  styleName,
}: {
  profile: PublicDrummer;
  styleName: (key: string) => string;
}) {
  const facts: Array<[string, string]> = [];
  if (profile.purposes?.length) {
    facts.push(['Here for', profile.purposes.map((p) => PURPOSE_LABELS[p]).join(' · ')]);
  }
  if (profile.ability) facts.push(['Plays at', ABILITY_LABELS[profile.ability]]);
  if (profile.styles?.length) {
    facts.push([
      'Styles',
      profile.styles
        .map((key) => {
          const level = profile.styleAbility?.[key];
          return level
            ? `${styleName(key)} (${ABILITY_LABELS[level].toLowerCase()})`
            : styleName(key);
        })
        .join(', '),
    ]);
  }
  if (!facts.length) return null;
  return (
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
      {facts.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
