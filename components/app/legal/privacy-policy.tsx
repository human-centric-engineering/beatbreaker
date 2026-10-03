import Link from 'next/link';

import { OwnerField } from '@/components/app/legal/owner-field';
import { attributionSources, exportedSources } from '@/lib/privacy/export-sources';
import { getAppSubjectSources } from '@/lib/privacy/subject-source-registry';

/**
 * BeatBreaker's privacy policy (task 8.9), written from what the app actually
 * stores rather than from a template.
 *
 * **What is kept** is not written out by hand. The list under _Everything in
 * your download_ is rendered from the same manifests the account export is
 * built from — Sunrise's `SUBJECT_DATA_SOURCES` and the app's declared
 * sources — with each one's own description, so a table added to the export
 * appears here with nothing else to remember, and the page test fails if one
 * is ever filtered out.
 *
 * Facts only the owner has are `<OwnerField>`s; D7's review fills them in.
 * OpenAI's terms were read from its "Your data" page (2026-10-03): API data
 * is not used for training unless the customer opts in, and abuse-monitoring
 * logs are kept for up to 30 days. Re-read it when the model provider changes.
 */

export const PRIVACY_UPDATED = '3 October 2026';

export function PrivacyPolicy() {
  const platform = exportedSources();
  const app = getAppSubjectSources();
  const attribution = attributionSources();

  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <p className="text-muted-foreground lead">Last updated: {PRIVACY_UPDATED}</p>

      <section className="mt-8">
        <h2>Who we are</h2>
        <p>
          BeatBreaker is run by <OwnerField>legal entity name and registered address</OwnerField>,
          which is the controller of your personal data. For anything about this policy or your
          data, write to <OwnerField>privacy contact email</OwnerField>.
        </p>
        <p>
          You must be at least <OwnerField>minimum age</OwnerField> to make an account.
        </p>
      </section>

      <section className="mt-8">
        <h2>The short version</h2>
        <ul>
          <li>
            We keep what you make and do in BeatBreaker — your account, your patterns, your practice
            — so it is there when you come back, on any device.
          </li>
          <li>
            Nothing is public unless you make it so. What you publish shows your username, never
            your name or email.
          </li>
          <li>
            When you ask BeatBuddy something, your message and the pattern you have open go to
            OpenAI to be answered. Conversations are deleted after 90 days.
          </li>
          <li>
            Analytics run only if you accept optional cookies, and never carry your patterns&apos;
            titles or notes.
          </li>
          <li>
            You can download everything we hold about you, and delete your account and all of it,
            from Settings.
          </li>
          <li>We do not sell your data, and we do not show adverts.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2>What we keep, and why</h2>
        <p>
          <strong>Your account</strong> — your name, email address and password (stored only as a
          hash), and the sessions you are signed in with, including the IP address and browser each
          one came from. We need these to let you in and keep your account safe.
        </p>
        <p>
          <strong>What you make</strong> — the patterns you save, with their notes, description and
          links; the shelves you pin them to; your practice sessions and the runs you play through
          them; the speeds you record; the Studio settings you choose; the drum samples you upload;
          and your drummer profile and what you say about yourself. This is the service: we keep it
          so you can use it.
        </p>
        <p>
          <strong>What you open</strong> — the newest 200 patterns and library entries you opened in
          the Studio, with the layer and tempo you left each at, so <em>Back</em> and{' '}
          <em>Recent</em> can take you back to them.
        </p>
        <p>
          <strong>BeatBuddy</strong> — your conversations with it, and the pattern you last had open
          with it. See <a href="#beatbuddy">BeatBuddy and OpenAI</a> below.
        </p>
        <p>
          <strong>Reports and messages</strong> — reports you file about patterns, profiles or
          speeds, and anything you send through the contact form, so we can act on them and answer
          you.
        </p>
        <p>
          We use this data to run BeatBreaker for you, which is the contract between us. We keep
          your account secure and the community library free of abuse because we have a legitimate
          interest in doing so. Analytics run only with your consent.
        </p>
      </section>

      <section className="mt-8">
        <h2>What is public</h2>
        <p>
          Your patterns are private until you share them. A pattern shared with a link can be opened
          by anyone who has the link; it is not listed anywhere and is hidden from search engines. A
          pattern you publish is listed in the community library and on your public page, and other
          people can play it, save a copy and build on it with credit to you.
        </p>
        <p>
          Anything public is shown under the username you choose, never your account name or email
          address. Your username and what you write about yourself are public; a username you give
          up is held for 30 days so nobody else can take it while old links still point to it.
        </p>
        <p>
          In Settings you can also say what you use BeatBreaker for, the styles you play and how
          well, and link your channels elsewhere. All of it is optional. BeatBreaker uses it to
          start you in the right place, and gives it to BeatBuddy when you ask it something. Your
          channel links are public on your page unless you switch them off; the rest is private
          unless you switch it on.
        </p>
        <p>
          When you record your speed on a pattern, BeatBreaker keeps the tempo, the layer, the date
          and any video link or note you add, and only you see them. On a published pattern or a
          famous break you can choose to put your best on its public table, under your username,
          with the tempo, the date and your video link; your note is never shown.
        </p>
        <p>
          Your practice sessions are private until you share one with a link. Anyone with the link
          sees its patterns, their minutes and its target tempos, including targets taken from your
          speeds, and can save a copy of their own; it is not listed anywhere and is hidden from
          search engines.
        </p>
        <p>
          A pattern&apos;s video and song links are shown as buttons. Nothing is loaded from
          YouTube, Vimeo or Spotify until a visitor presses one; after that, that service&apos;s own
          privacy policy applies and it may set its own cookies.
        </p>
      </section>

      <section className="mt-8" id="beatbuddy">
        <h2>BeatBuddy and OpenAI</h2>
        <p>
          BeatBuddy is answered by a model from OpenAI. When you send it a message, we send OpenAI
          your message, the pattern you have open, the conversation so far, what you told us about
          yourself in Settings, and any photo or PDF you attach. OpenAI sends back the answer and
          any change to the pattern.
        </p>
        <p>
          OpenAI&apos;s terms for its API say that what we send is not used to train or improve its
          models, and that it keeps records of API use for up to 30 days to watch for abuse. Its own
          privacy policy applies to that processing. We will update this page if BeatBuddy is ever
          answered by a different provider.
        </p>
        <p>
          We keep the conversation — your messages and BeatBuddy&apos;s answers — so it can follow
          what you said earlier, and delete it automatically 90 days after it was last used. Photos
          and PDFs you attach are sent to OpenAI to answer that message and are not kept by
          BeatBreaker. We also keep the pattern you last had open with BeatBuddy, until it is
          replaced by the next one or you delete your account.
        </p>
        <p>
          BeatBuddy can be wrong. Check what it tells you, especially about famous drummers and
          records.
        </p>
      </section>

      <section className="mt-8">
        <h2>Cookies, your browser and analytics</h2>
        <p>
          <strong>Essential.</strong> A cookie keeps you signed in, and another remembers your
          cookie choice. BeatBreaker also keeps a few things in your browser&apos;s local storage:
          the pattern you are working on before you save it, so a reload does not lose it, and
          display choices such as the grid size and whether you have seen the Studio tour. None of
          it leaves your browser.
        </p>
        <p>
          <strong>Optional.</strong> If you accept optional cookies, we count how BeatBreaker is
          used with <OwnerField>analytics provider — Plausible recommended</OwnerField>: the pages
          you visit, and a handful of events — a pattern created, saved, opened (with how many days
          old it is), published or copied, and a BeatBuddy turn or undo. These events carry no
          pattern title, no notes, no message and no id of yours or of a pattern. The page addresses
          recorded can include the address of a pattern you opened.{' '}
          <OwnerField>
            confirm the provider is not told who you are; Plausible is not, GA4 and PostHog are
            given your account id by the platform and this sentence would change
          </OwnerField>
        </p>
        <p>
          You can change your choice at any time from <em>Cookie Preferences</em> in the footer.
        </p>
      </section>

      <section className="mt-8">
        <h2>Who else handles it</h2>
        <p>We use these services to run BeatBreaker, each only for its part:</p>
        <ul>
          <li>
            <strong>Render</strong> — hosts the app and its database, in{' '}
            <OwnerField>hosting region</OwnerField>.
          </li>
          <li>
            <strong>Cloudflare R2</strong> — stores the drum samples you upload, privately.
          </li>
          <li>
            <strong>Resend</strong> — sends account emails: verifying your address, resetting your
            password, and telling you when a moderator acts on something of yours.
          </li>
          <li>
            <strong>OpenAI</strong> — answers BeatBuddy, as above.
          </li>
          <li>
            <strong>Sentry</strong> — receives error reports when something breaks, so we can fix
            it.
          </li>
          <li>
            <OwnerField>analytics provider</OwnerField> — analytics, only with your consent.
          </li>
        </ul>
        <p>
          Some of these are based outside <OwnerField>your region</OwnerField>. Where data leaves
          it, the transfer is covered by <OwnerField>transfer mechanism</OwnerField>.
        </p>
        <p>
          We do not sell your data or share it with anyone else, except where the law requires us
          to.
        </p>
      </section>

      <section className="mt-8">
        <h2>How long we keep it</h2>
        <ul>
          <li>Your account and what you made: until you delete them, or your account.</li>
          <li>BeatBuddy conversations: 90 days after they were last used.</li>
          <li>The patterns you opened: the newest 200.</li>
          <li>A username you give up: held for 30 days.</li>
          <li>
            Backups of the database: <OwnerField>backup retention period</OwnerField>, after which
            anything you deleted is gone from them too.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2>Your rights</h2>
        <p>
          <strong>Download it.</strong> <em>Download your data</em> in{' '}
          <Link href="/settings">Settings</Link> gives you a copy of everything listed below, as one
          file.
        </p>
        <p>
          <strong>Delete it.</strong> <em>Delete account</em> in Settings deletes your account and
          everything in it, published patterns included. Copies other people saved of your published
          patterns, or of sessions you shared, are theirs and stay with them, without your name: the
          credit line that named you is removed. A report you filed is kept so moderators can act on
          it, but no longer says who made it. The person you report is never told who reported them.
        </p>
        <p>
          <strong>Correct it.</strong> You can change your name, email, username and everything you
          wrote from Settings and the Studio.
        </p>
        <p>
          You can also ask us to restrict or stop using your data, or object to how we use it, by
          writing to <OwnerField>privacy contact email</OwnerField>, and you can complain to{' '}
          <OwnerField>data protection authority</OwnerField>.
        </p>
      </section>

      <section className="mt-8">
        <h2>Everything in your download</h2>
        <p>
          This is the complete list of what we hold about a person, part by part, as your download
          names it. Most of the platform parts stay empty unless you administer the site.
        </p>
        <h3>BeatBreaker</h3>
        <ul data-testid="sources-app">
          {app.map((source) => (
            <li key={source.section}>
              <code>{source.section}</code> — {source.description}
            </li>
          ))}
        </ul>
        <h3>Your account and the platform</h3>
        <ul data-testid="sources-platform">
          {platform.map((source) => (
            <li key={source.section}>
              <code>{source.section}</code> — {source.description}
            </li>
          ))}
        </ul>
        <h3>If you administer the site</h3>
        <p>
          Settings you created as an administrator belong to the site, not to you, so they stay when
          your account is deleted. Your download lists each one you created by name and date:
        </p>
        <p data-testid="sources-attribution">
          {attribution.map((source, i) => (
            <span key={source.section}>
              {i > 0 ? ', ' : ''}
              <code>{source.section}</code>
            </span>
          ))}
          .
        </p>
      </section>

      <section className="mt-8">
        <h2>Changes to this policy</h2>
        <p>
          When we change this policy we will update the date at the top, and tell you by email
          before a change that affects how your data is used takes effect.
        </p>
      </section>
    </div>
  );
}
