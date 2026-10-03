// @vitest-environment happy-dom

/**
 * `/privacy` — BeatBreaker's policy (task 8.9).
 *
 * Three kinds of check. The page has nothing of the template left: no
 * "placeholder", no `example.com`, outside the `[OWNER: …]` fields D7's review
 * fills in. Every part of the account export is named, read from the same
 * manifests the export is built from — so a source the page filtered out, or
 * one added to the export and never shown, fails here. And the facts a reader
 * relies on are stated: OpenAI and what it keeps, the 90-day window,
 * analytics only with consent, R2, download and deletion.
 *
 * @see components/app/legal/privacy-policy.tsx
 */

import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PrivacyPolicyPage from '@/app/(public)/privacy/page';
import { attributionSources, exportedSources } from '@/lib/privacy/export-sources';
import { getAppSubjectSources } from '@/lib/privacy/subject-source-registry';
import { ownerFields, textWithoutOwnerFields } from '@/tests/helpers/policy';

function page() {
  render(<PrivacyPolicyPage />);
  return textWithoutOwnerFields();
}

describe('nothing of the template is left', () => {
  it('has no placeholder text or example.com outside the owner’s fields', () => {
    const text = page();
    expect(text).not.toMatch(/placeholder/i);
    expect(text.toLowerCase()).not.toContain('example.com');
    expect(text).not.toMatch(/Replace (this|with)/i);
    expect(text).not.toMatch(/January 19, 2026/);
  });

  it('marks every fact only the owner has, and they are the ones the plan lists', () => {
    page();
    const fields = ownerFields();
    expect(fields.every((f) => /^\[OWNER: .+\]$/.test(f))).toBe(true);
    const all = fields.join(' ');
    for (const fact of ['legal entity', 'region', 'minimum age', 'contact']) {
      expect(all).toContain(fact);
    }
  });
});

describe('every part of the export is named', () => {
  it('lists each of the app’s export sections with its description', () => {
    render(<PrivacyPolicyPage />);
    const list = within(document.querySelector<HTMLElement>('[data-testid="sources-app"]')!);
    const sources = getAppSubjectSources();
    expect(sources.length).toBeGreaterThan(10);
    for (const source of sources) {
      expect(list.getByText(source.section)).toBeInTheDocument();
      expect(list.getByText(source.section).parentElement?.textContent).toContain(
        source.description
      );
    }
  });

  it('lists each of SUBJECT_DATA_SOURCES — exported with its description, attribution by name', () => {
    render(<PrivacyPolicyPage />);
    const platform = within(
      document.querySelector<HTMLElement>('[data-testid="sources-platform"]')!
    );
    for (const source of exportedSources()) {
      expect(platform.getByText(source.section).parentElement?.textContent).toContain(
        source.description
      );
    }
    const attribution = within(
      document.querySelector<HTMLElement>('[data-testid="sources-attribution"]')!
    );
    for (const source of attributionSources()) {
      expect(attribution.getByText(source.section)).toBeInTheDocument();
    }
  });
});

describe('what a reader relies on', () => {
  it('names OpenAI, what is sent to it, and that it does not train on it and keeps logs 30 days', () => {
    const text = page();
    expect(text).toMatch(/BeatBuddy is answered by a model from OpenAI/);
    expect(text).toMatch(/your message, the pattern you have open/);
    expect(text).toMatch(/not used to train or improve its models/);
    expect(text).toMatch(/up to 30 days/);
    expect(text).toMatch(/Photos and PDFs you attach .* are not kept by BeatBreaker/);
  });

  it('states the 90-day window for conversations', () => {
    expect(page()).toMatch(/delete it automatically 90 days after it was last used/);
  });

  it('says analytics run only with consent and carry no title, notes or id', () => {
    const text = page();
    expect(text).toMatch(/If you accept optional cookies/);
    expect(text).toMatch(/no pattern title, no notes, no message and no id/);
  });

  it('names where samples are stored', () => {
    expect(page()).toMatch(/Cloudflare R2 — stores the drum samples you upload, privately/);
  });

  it('says how to download everything and delete the account, and what deletion leaves', () => {
    const text = page();
    expect(text).toMatch(/Download your data/);
    expect(text).toMatch(/deletes your account and everything in it, published patterns included/);
    expect(text).toMatch(/are theirs and stay with them, without your name/);
    expect(text).toMatch(/A report you filed is kept .* no longer says who made it/);
  });

  it('says who anything public is shown under — never the account name or email', () => {
    expect(page()).toMatch(/never your account name or email address/);
  });
});
