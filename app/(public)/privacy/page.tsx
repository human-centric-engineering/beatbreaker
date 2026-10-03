import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
// FORK (BeatBreaker, task 8.9): the policy is the app's, not the template's.
import { PrivacyPolicy } from '@/components/app/legal/privacy-policy';

const description = `Privacy Policy for ${BRAND.name}. Learn how we collect, use, and protect your data.`;

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description,
  openGraph: {
    title: `Privacy Policy - ${BRAND.name}`,
    description,
  },
  twitter: {
    card: 'summary',
    title: `Privacy Policy - ${BRAND.name}`,
    description,
  },
};

/**
 * Privacy Policy Page
 *
 * FORK (BeatBreaker, task 8.9): the platform's placeholder is replaced by the
 * app's own text, kept in `components/app/legal/` so this file stays the
 * template's shell — the title, metadata and layout — and an upstream change
 * to it merges with a small conflict, not a rewrite.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <PrivacyPolicy />
      </div>
    </div>
  );
}
