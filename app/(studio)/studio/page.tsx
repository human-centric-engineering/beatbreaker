import type { Metadata } from 'next';

import { readStudioDrawer } from '@/components/app/shell/studio-address';
import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { listHistory } from '@/lib/app/breaks/saved/history';
import { listPins } from '@/lib/app/breaks/saved/pins';
import { readStudioSettings } from '@/lib/app/breaks/saved/settings';
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
 * from the first note.
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
 */

export const metadata: Metadata = {
  title: 'Studio',
  description: 'Generate a drum break, read it as notation, and practise it against a click.',
};

const LOGIN_HREF = `/login?callbackUrl=${encodeURIComponent('/studio')}`;

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{
    entry?: string | string[];
    drawer?: string | string[];
    tab?: string | string[];
  }>;
}) {
  const session = await getServerSession();
  if (!session) return <SignInToOpen loginHref={LOGIN_HREF} />;

  const query = await searchParams;
  const entry = cuidSchema.safeParse(query.entry);

  const [catalogue, pins, history, settings] = await Promise.all([
    studioCatalogue(),
    listPins(session.user.id),
    listHistory(session.user.id),
    readStudioSettings(session.user.id),
  ]);

  return (
    <StudioProvider
      catalogue={catalogue}
      pins={pins}
      history={history}
      settings={settings}
      openEntry={entry.success ? entry.data : undefined}
      openDrawer={readStudioDrawer(query)}
    >
      <StudioFrame />
    </StudioProvider>
  );
}
