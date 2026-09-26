import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { openSavedBreak } from '@/lib/app/breaks/saved/data';
import { listHistory } from '@/lib/app/breaks/saved/history';
import { listPins } from '@/lib/app/breaks/saved/pins';
import { readStudioSettings } from '@/lib/app/breaks/saved/settings';
import { listSamples } from '@/lib/app/breaks/samples/data';
import { listYourKits } from '@/lib/app/breaks/samples/kits';
import { getServerSession } from '@/lib/auth/utils';
import { cuidSchema } from '@/lib/validations/common';

/**
 * One saved pattern, open in the Studio.
 *
 * The pattern is read server-side through the same `openSavedBreak` the API's
 * `GET /api/v1/breaks/:id` uses — so the page and the endpoint agree on who
 * may open what, and opening your own pattern here puts it under "Recent" the
 * same way. It reaches the console as its initial state, so the Studio mounts
 * on the saved pattern rather than rolling a fresh one and replacing it.
 *
 * A malformed id, someone else's private pattern and a pattern that was never
 * saved are all the same not-found page, for the reason the API answers 404
 * rather than 403: anything else confirms that an id exists.
 */

export const metadata: Metadata = { title: 'Studio' };

export default async function StudioPatternPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) {
    return <SignInToOpen loginHref={`/login?callbackUrl=${encodeURIComponent(`/studio/${id}`)}`} />;
  }

  const parsedId = cuidSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const [opened, catalogue, pins, history, settings, yourKits, yourSamples] = await Promise.all([
    openSavedBreak(parsedId.data, session.user.id),
    studioCatalogue(),
    listPins(session.user.id),
    listHistory(session.user.id),
    readStudioSettings(session.user.id),
    listYourKits(session.user.id),
    listSamples(session.user.id),
  ]);
  if (!opened) notFound();

  return (
    <StudioProvider
      catalogue={catalogue}
      pins={pins}
      history={history}
      settings={settings}
      yourKits={yourKits}
      yourSamples={yourSamples}
      initial={{
        id: opened.row.id,
        title: opened.row.title,
        payload: opened.payload,
        mine: opened.mine,
        details: { description: opened.row.description ?? '', links: opened.links },
      }}
    >
      <StudioFrame />
    </StudioProvider>
  );
}
