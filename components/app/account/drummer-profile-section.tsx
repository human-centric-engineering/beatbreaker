import { DrummerProfileForm } from '@/components/app/account/drummer-profile-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDrummerProfile } from '@/lib/app/breaks/community/profile';
import type { AccountSectionProps } from '@/lib/account-sections/registry';

/**
 * Settings → Drummer profile (Phase 6, task 6.2): the username your published
 * patterns appear under, and what you say about yourself on your public page.
 *
 * Registered through the `account-sections` seam (`lib/app/account-sections.ts`),
 * so it renders at the foot of `/settings` without a platform edit. A server
 * component: it reads the profile with the page and hands it to the form.
 */
export async function DrummerProfileSection({ userId }: AccountSectionProps) {
  const profile = await getDrummerProfile(userId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Drummer profile</CardTitle>
        <CardDescription>
          The name on anything you publish. Your account name and email are never public.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DrummerProfileForm profile={profile} />
      </CardContent>
    </Card>
  );
}
