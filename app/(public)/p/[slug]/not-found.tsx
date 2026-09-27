import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * `/p/[slug]` for a pattern that is not shared any more — made private,
 * deleted, or an address that never existed. One page for all three, so a
 * visitor learns nothing about which (site-copy §5).
 */
export default function PatternNotFound() {
  return (
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">This pattern isn&apos;t shared any more</h1>
      <p className="text-muted-foreground">
        The person who made it may have made it private or deleted it.
      </p>
      <Button asChild variant="outline">
        <Link href="/explore">Browse the community library</Link>
      </Button>
    </div>
  );
}
