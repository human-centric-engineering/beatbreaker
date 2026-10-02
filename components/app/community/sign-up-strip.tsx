import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * What a signed-out reader of a shared page is offered: an account, or
 * signing in, and back to this page after. On `/p/` and `/s/`. The sentence
 * above the buttons is the page's own — what an account would let them do
 * with this thing.
 */
export function SignUpStrip({ path, children }: { path: string; children: React.ReactNode }) {
  const back = encodeURIComponent(path);
  return (
    <aside className="bg-muted/50 space-y-3 rounded-lg border p-4">
      <p>{children}</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/signup?callbackUrl=${back}`}>Create a free account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/login?callbackUrl=${back}`}>Sign in</Link>
        </Button>
      </div>
    </aside>
  );
}
