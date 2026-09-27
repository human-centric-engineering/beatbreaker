// @vitest-environment happy-dom

/**
 * `/privacy` — the platform's placeholder policy, with BeatBreaker's own
 * Phase 6 section on what sharing and the community library make public, and
 * what erasure does to it.
 *
 * A light test, on purpose: this page is mostly the template's placeholder
 * copy, pending the review D7 calls for. What is worth pinning is the one
 * fact D20/erasure depends on getting right in front of a reader — that
 * deleting an account removes published patterns, and that other people's
 * copies of them stay, without the name.
 *
 * @see app/(public)/privacy/page.tsx
 */

import { render } from '@testing-library/react';
import { expect, it } from 'vitest';

import PrivacyPolicyPage from '@/app/(public)/privacy/page';

it('says deleting an account removes published patterns, and that copies stay without your name', () => {
  render(<PrivacyPolicyPage />);

  const body = document.body.textContent ?? '';
  expect(body).toMatch(/delete your account, your patterns.*published ones included.*are deleted/);
  expect(body).toMatch(/Copies other people saved of your published patterns are theirs and stay/);
  expect(body).toMatch(/without your name/);
});

it('says a report survives your account’s deletion but no longer names you', () => {
  render(<PrivacyPolicyPage />);
  const body = document.body.textContent ?? '';
  expect(body).toMatch(/the report is kept after your account is deleted/);
  expect(body).toMatch(/it no longer says who made it/);
});

it('says who anything public is shown under — never the account name or email', () => {
  render(<PrivacyPolicyPage />);
  const body = document.body.textContent ?? '';
  expect(body).toMatch(/never your account name or\s*\n?\s*email address/);
});
