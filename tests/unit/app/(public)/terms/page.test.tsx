// @vitest-environment happy-dom

/**
 * `/terms` — BeatBreaker's terms (task 8.9): nothing of the template left
 * outside the `[OWNER: …]` fields, D9's licence on published patterns, and
 * the rules the moderation tools enforce.
 *
 * @see components/app/legal/terms.tsx
 */

import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import TermsOfServicePage from '@/app/(public)/terms/page';
import { ownerFields, textWithoutOwnerFields } from '@/tests/helpers/policy';

function page() {
  render(<TermsOfServicePage />);
  return textWithoutOwnerFields();
}

it('has no placeholder text or example.com outside the owner’s fields', () => {
  const text = page();
  expect(text).not.toMatch(/placeholder/i);
  expect(text.toLowerCase()).not.toContain('example.com');
  expect(text).not.toMatch(/If applicable|Payment Terms/);
  const all = ownerFields().join(' ');
  for (const fact of ['legal entity', 'minimum age', 'contact']) expect(all).toContain(fact);
});

it('states the licence: everyone may play, copy, change and republish a credited pattern', () => {
  const text = page();
  expect(screen.getByRole('heading', { name: 'Patterns you write' })).toBeInTheDocument();
  expect(text).toMatch(
    /let everyone who uses the service play it, save a copy, change it and publish what they make from it, as long as it keeps the credit to you/
  );
  expect(text).toMatch(/You can unpublish it whenever you like/);
  expect(text).toMatch(/copies people have already saved stay with them/);
});

it('says what moderation does, and when the owner is emailed', () => {
  const text = page();
  expect(text).toMatch(/We may unpublish a pattern/);
  expect(text).toMatch(/we email you when we unpublish a pattern of yours/);
  expect(text).toMatch(/must point to the video or song it is about/);
});

it('says the famous breaks are credited study versions, with a way to correct one', () => {
  page();
  expect(screen.getByRole('link', { name: 'tell us' })).toHaveAttribute('href', '/contact');
});
