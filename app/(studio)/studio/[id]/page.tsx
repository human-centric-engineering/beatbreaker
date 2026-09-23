import type { Metadata } from 'next';

import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { getServerSession } from '@/lib/auth/utils';

/**
 * One saved pattern, open in the Studio.
 *
 * The id is accepted and nothing more until Phase 4 gives patterns a server-side
 * life — the route exists now so that every link the later phases hand out is a
 * link that already resolves, and so the frame is reviewed once rather than
 * twice. Loading the pattern behind the id is that phase's work.
 */

export const metadata: Metadata = { title: 'Studio' };

export default async function StudioPatternPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) {
    return <SignInToOpen loginHref={`/login?callbackUrl=${encodeURIComponent(`/studio/${id}`)}`} />;
  }

  const catalogue = await studioCatalogue();

  return (
    <StudioProvider catalogue={catalogue}>
      <StudioFrame />
    </StudioProvider>
  );
}
