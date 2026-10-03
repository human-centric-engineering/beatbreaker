import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Settings → Your data (task 8.9): download a copy of everything BeatBreaker
 * keeps about you — what the privacy policy promises, and the subject access
 * Sunrise's `GET /api/v1/users/me/export` already answers. A plain link: the
 * route sends the file as an attachment, so the browser saves it without a
 * line of script. Deleting the account is Sunrise's, in the Account tab above.
 *
 * Registered through the `account-sections` seam (`lib/app/account-sections.ts`).
 */
export function YourDataSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>
          A copy of everything BeatBreaker keeps about you — your patterns, sessions, speeds,
          settings and BeatBuddy conversations — as one JSON file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button asChild variant="outline">
          <a href="/api/v1/users/me/export" download>
            Download your data
          </a>
        </Button>
        <p className="text-muted-foreground text-sm">
          To delete your account and everything in it, use <strong>Delete account</strong> in the
          Account tab. See the <a href="/privacy">privacy policy</a> for what each part holds.
        </p>
      </CardContent>
    </Card>
  );
}
