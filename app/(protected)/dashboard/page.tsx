import type { Metadata } from 'next';

import { AboutCard } from '@/components/app/home/about-card';
import { HomeView } from '@/components/app/home/home-view';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { readHome } from '@/lib/app/breaks/saved/home';
import { clearInvalidSession } from '@/lib/auth/clear-session';
import { getServerSession } from '@/lib/auth/utils';

/**
 * Home — the signed-in landing page (task 4.9).
 *
 * The path stays `/dashboard` (the platform's post-login route and the nav's
 * "Home"); the body is BeatBreaker's: the Practising shelf as cards with
 * engraved thumbnails, what you opened lately, and New pattern. Until you
 * answer or skip them, the three About-you questions sit above it (7B).
 *
 * Read server-side through `readHome()`, the function `GET /api/v1/home`
 * answers from, so the page and the endpoint show the same Home. The style
 * names come from the catalogue, which is cached.
 */

export const metadata: Metadata = { title: 'Home' };

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    clearInvalidSession('/dashboard');
  }

  const [home, styles] = await Promise.all([readHome(session.user.id), listStyles()]);
  const labels = new Map(styles.map((s) => [s.key, s.params.label]));

  const view = <HomeView home={home} styleLabel={(key) => labels.get(key) ?? key} />;
  if (!home.askAbout) return view;
  return (
    <div className="space-y-8">
      <AboutCard styles={styles.map((s) => ({ key: s.key, label: s.params.label }))} />
      {view}
    </div>
  );
}
