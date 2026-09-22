import type { Metadata } from 'next';
import { Anton, Chivo, IBM_Plex_Mono } from 'next/font/google';

import { BreakConsole } from '@/components/app/breaks/break-console';
import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { getServerSession } from '@/lib/auth/utils';

/**
 * The BeatBreaker console.
 *
 * A thin server shell: it owns the metadata and the fonts, and everything else
 * is the client component below it. There is nothing to fetch — the generator,
 * the critic and the engraver all run in the browser from a seed, which is why
 * the page can be useful before a single request goes out.
 *
 * **It gates itself rather than sitting behind the proxy's edge redirect.** A
 * shared link carries its break in the `#b=` fragment, which a server redirect
 * cannot forward and the login form drops, so a signed-out visitor with a link
 * would sign in and land on a fresh break (H5). Signed out, the page renders
 * {@link SignInToOpen}, which stashes the fragment in the browser before going
 * to the login page.
 */

/*
 * Self-hosted through `next/font`, not a <link> to Google. The prototype loaded
 * them from fonts.googleapis.com, which costs a connection to a third party on
 * every visit and a flash of fallback text while it resolves. `next/font`
 * downloads them at build time and serves them from this origin, so there is no
 * third-party request and no layout shift — and the console's look depends on
 * these three faces in a way a fallback stack cannot carry.
 */
const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--bb-display',
  display: 'swap',
});
const chivo = Chivo({ subsets: ['latin'], variable: '--bb-body', display: 'swap' });
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--bb-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Break generator',
  description: 'Generate a drum break, read it as notation, and practise it against a click.',
};

const LOGIN_HREF = `/login?callbackUrl=${encodeURIComponent('/breaks')}`;

export default async function BreaksPage() {
  const session = await getServerSession();
  if (!session) return <SignInToOpen loginHref={LOGIN_HREF} />;

  return (
    <div className={`${anton.variable} ${chivo.variable} ${plexMono.variable}`}>
      <BreakConsole />
    </div>
  );
}
