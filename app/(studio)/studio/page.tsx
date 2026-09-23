import type { Metadata } from 'next';

import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { getServerSession } from '@/lib/auth/utils';

/**
 * The Studio.
 *
 * A thin server shell: it owns the metadata, the session check and **the
 * catalogue**, and the frame below it is the app. The catalogue is read here,
 * server-side, through the data layer rather than by fetching this app's own
 * API — same functions, one fewer hop, and no render waiting on its own server.
 * It is three cached queries, so the Studio loads with its styles, kits and
 * famous breaks already in the markup and makes no per-item request (the
 * "no N+1 client-side fetches" rule, and this phase's done-when).
 *
 * **It gates itself rather than sitting behind the proxy's edge redirect**, and
 * `/studio` is deliberately absent from `lib/app/protected-routes.ts` for the
 * same reason `/breaks` was (H5): a shared link carries its break in the `#b=`
 * fragment, which a server redirect cannot forward and the login form drops, so
 * a signed-out visitor with a link would sign in and land on a fresh break.
 * {@link SignInToOpen} stashes the fragment in the browser first.
 */

export const metadata: Metadata = {
  title: 'Studio',
  description: 'Generate a drum break, read it as notation, and practise it against a click.',
};

const LOGIN_HREF = `/login?callbackUrl=${encodeURIComponent('/studio')}`;

export default async function StudioPage() {
  const session = await getServerSession();
  if (!session) return <SignInToOpen loginHref={LOGIN_HREF} />;

  const catalogue = await studioCatalogue();

  return (
    <StudioProvider catalogue={catalogue}>
      <StudioFrame />
    </StudioProvider>
  );
}
