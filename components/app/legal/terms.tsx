import Link from 'next/link';

import { OwnerField } from '@/components/app/legal/owner-field';

/**
 * BeatBreaker's terms (task 8.9), per `site-copy.md` §7. The licence on
 * published patterns is D9's; the rest is plain English for what the service
 * does. Facts only the owner has are `<OwnerField>`s, and the liability and
 * governing-law wording is for D7's reviewer to settle — it is the part a
 * template cannot be trusted with.
 */

export const TERMS_UPDATED = '3 October 2026';

export function Terms() {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <p className="text-muted-foreground lead">Last updated: {TERMS_UPDATED}</p>

      <section className="mt-8">
        <h2>Who these are with</h2>
        <p>
          These terms are between you and{' '}
          <OwnerField>legal entity name and registered address</OwnerField>, which runs BeatBreaker.
          By making an account you agree to them. You must be at least{' '}
          <OwnerField>minimum age</OwnerField> to make one. Our{' '}
          <Link href="/privacy">privacy policy</Link> says what we keep and why.
        </p>
      </section>

      <section className="mt-8">
        <h2>Your account</h2>
        <p>
          Keep your password to yourself; you are responsible for what is done with your account.
          You can delete it at any time from Settings, and everything in it goes with it.
        </p>
      </section>

      <section className="mt-8">
        <h2>Patterns you write</h2>
        <p>
          A pattern you write is yours. Keeping it private, or sharing it with a link, gives nobody
          any rights in it beyond opening it and saving a copy for their own practice.
        </p>
        <p>
          When you publish one to the community library, you let everyone who uses the service play
          it, save a copy, change it and publish what they make from it, as long as it keeps the
          credit to you that the service shows. You can unpublish it whenever you like; that stops
          new copies, and copies people have already saved stay with them.
        </p>
      </section>

      <section className="mt-8">
        <h2>What you may not do</h2>
        <ul>
          <li>
            Publish someone else&apos;s pattern as your own. Build on a published pattern, and it
            keeps the credit to its author.
          </li>
          <li>
            Use a title, a description, a username or what you say about yourself to abuse or harass
            anyone, or for anything offensive.
          </li>
          <li>
            Add links that are not about the pattern. A pattern&apos;s links must point to the video
            or song it is about — not to adverts, shops or anything unrelated.
          </li>
          <li>Spam the community library, or flood the service with requests.</li>
          <li>
            Upload samples or attach files you have no right to use, or try to get into accounts or
            parts of the service that are not yours.
          </li>
        </ul>
        <p>
          We may unpublish a pattern, remove a pattern&apos;s or a profile&apos;s links, or take a
          speed off a public table when it breaks these rules, and we email you when we unpublish a
          pattern of yours or take a speed of yours off a table. We may close an account that keeps
          breaking them. Anyone can report something they think breaks them; a moderator looks at
          every report.
        </p>
      </section>

      <section className="mt-8">
        <h2>The famous breaks</h2>
        <p>
          The famous grooves in the library are study versions, written out by us and credited to
          the drummers and records they come from. They are for learning to play them. If one is
          wrong, or credited wrongly, please <Link href="/contact">tell us</Link>.
        </p>
      </section>

      <section className="mt-8">
        <h2>BeatBuddy</h2>
        <p>
          BeatBuddy has a daily allowance of turns, shown in its drawer, so it stays available to
          everyone. It can be wrong. BeatBreaker checks every pattern it writes for playability, but
          check its explanations yourself — especially about drummers and records.
        </p>
      </section>

      <section className="mt-8">
        <h2>The service</h2>
        <p>
          BeatBreaker is free and provided as it is. We work to keep it running and your patterns
          safe, but we cannot promise it will always be available or free of errors, and we may
          change or stop parts of it. Download your data from Settings if you want a copy of your
          own.
        </p>
        <p>
          <OwnerField>
            limitation of liability, and the consumer rights it does not affect, worded for the
            governing law
          </OwnerField>
        </p>
      </section>

      <section className="mt-8">
        <h2>Changes and the law</h2>
        <p>
          When we change these terms we will update the date at the top, and tell you by email
          before a change that affects your rights takes effect. These terms are governed by the law
          of <OwnerField>governing law and courts</OwnerField>.
        </p>
        <p>
          Questions about these terms: <OwnerField>contact email</OwnerField>.
        </p>
      </section>
    </div>
  );
}
