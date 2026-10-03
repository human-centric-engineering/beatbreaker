import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { readStudioDrawer } from '@/components/app/shell/studio-address';
import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioTour } from '@/components/app/shell/studio-tour';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { listHistory } from '@/lib/app/breaks/saved/history';
import { readSession } from '@/lib/app/breaks/saved/sessions';
import { listPins } from '@/lib/app/breaks/saved/pins';
import { readStudioSettings } from '@/lib/app/breaks/saved/settings';
import { preferStyles } from '@/lib/app/breaks/catalogue/prefer';
import { getAbout } from '@/lib/app/breaks/community/about';
import { listSamples } from '@/lib/app/breaks/samples/data';
import { listYourKits } from '@/lib/app/breaks/samples/kits';
import { getServerSession } from '@/lib/auth/utils';
import { cuidSchema } from '@/lib/validations/common';

/**
 * The Studio.
 *
 * A thin server shell: it owns the metadata, the session check and **the
 * catalogue**, and the frame below it is the app. The catalogue is read here,
 * server-side, through the data layer rather than by fetching this app's own
 * API — same functions, one fewer hop, and no render waiting on its own server.
 * It is three cached queries, so the Studio loads with its styles, kits and
 * famous breaks already in the markup and makes no per-item request (the
 * "no N+1 client-side fetches" rule, and this phase's done-when). The practice
 * shelves and history come the same way, so every ★ and Back is right on
 * first paint, and so do your settings (D19), so the kit and tuning are yours
 * from the first note. So do your own kits (D20): they are read per request,
 * never through the catalogue's shared cache, and the provider adds them to
 * the catalogue it hands the console.
 *
 * **It gates itself rather than sitting behind the proxy's edge redirect**, and
 * `/studio` is deliberately absent from `lib/app/protected-routes.ts` for the
 * same reason `/breaks` was (H5): a shared link carries its break in the `#b=`
 * fragment, which a server redirect cannot forward and the login form drops, so
 * a signed-out visitor with a link would sign in and land on a fresh break.
 * {@link SignInToOpen} stashes the fragment in the browser first.
 *
 * `?entry=<id>` opens a library entry once the Studio is up — Home's Continue
 * on a pinned famous break. An id that is not one is ignored, and one the
 * catalogue does not hold is said so in the Studio, not a 404: the Studio
 * itself is still there to use.
 *
 * `?drawer=<tool>` (and, for the Patterns drawer, `&tab=<tab>`) opens that
 * drawer once the Studio is up — Home's "Browse the famous grooves". Values
 * that are not a tool or a tab are ignored (`studio-address.ts`).
 *
 * `?session=<id>` runs one of your practice sessions (7D): the session is read
 * here with the page, and the Studio shows its bar above the stage. Unlike
 * `?entry=`, a session that is not one of yours — or not an id at all — is the
 * not-found page: there is nothing to run, and a Studio that quietly ignored
 * the link would look as if the session had nothing in it.
 */

export const metadata: Metadata = {
  title: 'Studio',
  description: 'Generate a drum break, read it as notation, and practise it against a click.',
};

/**
 * Where sign-in comes back to. A session link keeps its `?session=`, and a
 * library link its `?entry=` — each is a query, which the login form carries,
 * unlike a fragment — so a signed-out drummer lands back on the session or the
 * break, not a bare Studio. Only a well-formed id is carried; anything else is
 * dropped.
 */
function loginHref(query: { session?: string | string[]; entry?: string | string[] }): string {
  const back = new URLSearchParams();
  const session = cuidSchema.safeParse(query.session);
  if (session.success) back.set('session', session.data);
  const entry = cuidSchema.safeParse(query.entry);
  if (entry.success) back.set('entry', entry.data);
  const qs = back.toString();
  return `/login?callbackUrl=${encodeURIComponent(qs ? `/studio?${qs}` : '/studio')}`;
}

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{
    entry?: string | string[];
    session?: string | string[];
    drawer?: string | string[];
    tab?: string | string[];
  }>;
}) {
  const session = await getServerSession();
  const query = await searchParams;
  if (!session) return <SignInToOpen loginHref={loginHref(query)} />;

  const entry = cuidSchema.safeParse(query.entry);
  let practice;
  if (query.session !== undefined) {
    const id = cuidSchema.safeParse(query.session);
    practice = id.success ? await readSession(session.user.id, id.data) : null;
    if (!practice) notFound();
  }

  const [catalogue, pins, history, settings, about, yourKits, yourSamples] = await Promise.all([
    studioCatalogue(),
    listPins(session.user.id),
    listHistory(session.user.id),
    readStudioSettings(session.user.id),
    getAbout(session.user.id),
    listYourKits(session.user.id),
    listSamples(session.user.id),
  ]);

  return (
    <StudioProvider
      catalogue={preferStyles(catalogue, about.styles)}
      pins={pins}
      history={history}
      settings={settings}
      yourKits={yourKits}
      yourSamples={yourSamples}
      openEntry={entry.success ? entry.data : undefined}
      openDrawer={readStudioDrawer(query)}
      session={practice}
    >
      <StudioFrame />
      <StudioTour />
    </StudioProvider>
  );
}
