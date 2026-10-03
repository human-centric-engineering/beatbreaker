'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { forgetTour } from '@/lib/app/breaks/tour-seen';

/** Forget that this browser has had the tour, and go to the Studio, where it opens. */
export function ShowTourAgain() {
  return (
    <Button asChild variant="outline">
      <Link href="/studio" onClick={() => forgetTour(window.localStorage)}>
        Show the tour again
      </Link>
    </Button>
  );
}
