import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
// FORK (BeatBreaker, task 8.9): the policy is the app's, not the template's.
import { Terms } from '@/components/app/legal/terms';

const description = `Terms of Service for ${BRAND.name}. Read our terms and conditions for using the service.`;

export const metadata: Metadata = {
  title: 'Terms of Service',
  description,
  openGraph: {
    title: `Terms of Service - ${BRAND.name}`,
    description,
  },
  twitter: {
    card: 'summary',
    title: `Terms of Service - ${BRAND.name}`,
    description,
  },
};

/**
 * Terms of Service Page
 *
 * FORK (BeatBreaker, task 8.9): the platform's placeholder is replaced by the
 * app's own text, kept in `components/app/legal/` so this file stays the
 * template's shell — the title, metadata and layout — and an upstream change
 * to it merges with a small conflict, not a rewrite.
 */
export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl font-bold tracking-tight">Terms of Service</h1>
        <Terms />
      </div>
    </div>
  );
}
