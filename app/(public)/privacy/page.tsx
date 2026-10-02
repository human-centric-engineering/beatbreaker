import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';

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
 * Placeholder privacy policy page.
 * Replace with your actual privacy policy content.
 *
 * Phase 3.5: Landing Page & Marketing
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl font-bold tracking-tight">Privacy Policy</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="text-muted-foreground lead">Last updated: January 19, 2026</p>

          <section className="mt-8">
            <h2>Introduction</h2>
            <p>
              This is a placeholder privacy policy. Replace this content with your actual privacy
              policy that complies with applicable laws and regulations (GDPR, CCPA, etc.).
            </p>
          </section>

          <section className="mt-8">
            <h2>Information We Collect</h2>
            <p>Describe what personal information you collect, such as:</p>
            <ul>
              <li>Account information (name, email address)</li>
              <li>Usage data and analytics</li>
              <li>Cookies and tracking technologies</li>
              <li>Information from third-party services</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2>How We Use Your Information</h2>
            <p>Explain how you use the collected information:</p>
            <ul>
              <li>Providing and improving our services</li>
              <li>Communicating with you</li>
              <li>Security and fraud prevention</li>
              <li>Legal compliance</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2>Data Sharing and Disclosure</h2>
            <p>
              Describe when and with whom you share user data, including third-party service
              providers, legal requirements, and business transfers.
            </p>
          </section>

          {/* FORK (BeatBreaker, Phase 6): what sharing and the community library
              make public, and what erasure does to it. The rest of this page is
              still the platform's placeholder, pending the review in D7. */}
          <section className="mt-8">
            <h2>Sharing and the Community Library</h2>
            <p>
              Your patterns are private until you share them. A pattern shared with a link can be
              opened by anyone who has the link; it is not listed anywhere and is hidden from search
              engines. A pattern you publish is listed in the community library and on your public
              page.
            </p>
            <p>
              Anything public is shown under the username you choose, never your account name or
              email address. Your username and what you write about yourself are public; a username
              you give up is held for 30 days so nobody else can take it while old links still point
              to it.
            </p>
            {/* FORK (BeatBreaker, Phase 7B): the optional About-you fields. */}
            <p>
              In Settings you can also say what you use BeatBreaker for, the styles you play and how
              well, and link your channels elsewhere. All of it is optional. BeatBreaker uses it to
              start you in the right place, and gives it to BeatBuddy when you ask it something.
              Your channel links are public on your page unless you switch them off; the rest is
              private unless you switch it on. Channel links go to the other site as plain links,
              and nothing is loaded from it unless a visitor follows one.
            </p>
            {/* FORK (BeatBreaker, Phase 7C): speed records and their tables. */}
            <p>
              When you mark your speed on a pattern, BeatBreaker keeps the tempo, the layer, the
              date and time, and any video link or note you add. Every speed is kept, so you can see
              your progress, and only you see them. On a published pattern or a famous break you can
              choose to put your best on its public table, under your username, with the tempo, the
              date and your video link; your note is never shown. You can delete a speed, and
              deleting your account removes you from every table.
            </p>
            {/* FORK (BeatBreaker, Phase 7D): practice sessions shared by link. */}
            <p>
              Your practice sessions are private until you share one with a link. Anyone with the
              link sees its patterns, their minutes and its target tempos, including targets taken
              from your speeds, and can save a copy of their own; it is not listed anywhere and is
              hidden from search engines. Deleting your account deletes your sessions; copies other
              people saved stay theirs, without your name.
            </p>
            <p>
              A pattern&apos;s video and song links are shown as buttons. Nothing is loaded from
              YouTube, Vimeo or Spotify until a visitor presses one; after that, that service may
              set its own cookies.
            </p>
            <p>
              When you delete your account, your patterns — published ones included — are deleted
              with it. Copies other people saved of your published patterns are theirs and stay with
              them, without your name: the credit line that named you is removed. If you report a
              pattern, the report is kept after your account is deleted so moderators can act on it,
              but it no longer says who made it. The person you report is never told who reported
              them.
            </p>
          </section>

          <section className="mt-8">
            <h2>Your Rights</h2>
            <p>Outline the rights users have regarding their data:</p>
            <ul>
              <li>Access and portability</li>
              <li>Correction and deletion</li>
              <li>Opt-out of marketing</li>
              <li>Withdraw consent</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@example.com" className="text-primary hover:underline">
                privacy@example.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
