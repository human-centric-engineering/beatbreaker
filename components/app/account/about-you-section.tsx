import { AboutYouForm } from '@/components/app/account/about-you-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { getAbout } from '@/lib/app/breaks/community/about';
import type { AccountSectionProps } from '@/lib/account-sections/registry';

/**
 * Settings → About you (Phase 7B, task 7B.7): what you use BeatBreaker for,
 * what you play and how well, and your channel links.
 *
 * Registered through the `account-sections` seam next to _Drummer profile_. It
 * needs no username: you can fill it in without ever publishing. A server
 * component: it reads your row and the catalogue's styles with the page.
 */
export async function AboutYouSection({ userId }: AccountSectionProps) {
  const [about, styles] = await Promise.all([getAbout(userId), listStyles()]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>About you</CardTitle>
        <CardDescription>
          All optional. BeatBreaker uses it to start you in the right place; your public page shows
          only what you switch on.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AboutYouForm
          about={about}
          styles={styles.map((s) => ({ key: s.key, label: s.params.label }))}
        />
      </CardContent>
    </Card>
  );
}
