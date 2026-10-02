import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * `/s/[slug]` for a session that is not shared any more — unshared, deleted,
 * or an address that never existed. One page for all three, so a visitor
 * learns nothing about which.
 */
export default function SharedSessionNotFound() {
  return (
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">This practice session isn&apos;t shared any more</h1>
      <p className="text-muted-foreground">
        The person who made it may have stopped sharing it or deleted it.
      </p>
      <Button asChild variant="outline">
        <Link href="/explore">Browse the community library</Link>
      </Button>
    </div>
  );
}
