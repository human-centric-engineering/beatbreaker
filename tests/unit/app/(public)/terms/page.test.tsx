// @vitest-environment happy-dom

/**
 * `/terms` — the platform's placeholder terms, with BeatBreaker's own
 * "Patterns You Publish" section (D9's licence, pending the review D7 calls
 * for).
 *
 * A light test, on purpose: most of this page is still the template's
 * placeholder copy. What is worth pinning is that the section exists, under
 * its own heading, and states the licence and the moderation warning.
 *
 * @see app/(public)/terms/page.tsx
 */

import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import TermsOfServicePage from '@/app/(public)/terms/page';

it('has a "Patterns You Publish" section', () => {
  render(<TermsOfServicePage />);
  expect(screen.getByRole('heading', { name: 'Patterns You Publish' })).toBeInTheDocument();
});

it('states the licence: everyone may play, copy, change and republish a credited pattern', () => {
  render(<TermsOfServicePage />);
  const body = document.body.textContent ?? '';
  expect(body).toMatch(
    /let\s*\n?\s*everyone who uses the service play it, save a copy, change it and publish what they/
  );
  expect(body).toMatch(/as long as it keeps the credit to you/);
  expect(body).toMatch(/You can\s*\n?\s*unpublish it whenever you like/);
});

it('warns that a pattern breaking the rules may be unpublished, and the owner told', () => {
  render(<TermsOfServicePage />);
  const body = document.body.textContent ?? '';
  expect(body).toMatch(/We may unpublish a pattern that breaks these rules/);
  expect(body).toMatch(/we will\s*\n?\s*tell you when we do/);
});
