// @vitest-environment happy-dom

/**
 * The email a drummer gets when a moderator takes one of their speeds off a
 * public table (Phase 7C): which speed, why, that the record is still
 * theirs, and how to ask about it — and never who reported it.
 *
 * @see components/app/emails/speed-unlisted.tsx
 */

import { render } from '@react-email/render';
import { describe, expect, it } from 'vitest';

import SpeedUnlistedEmail from '@/components/app/emails/speed-unlisted';

describe('SpeedUnlistedEmail', () => {
  it('names the title, bpm, layer and reason', async () => {
    const html = await render(
      <SpeedUnlistedEmail title="Cold Carpet" bpm={140} level={2} reason="bad or misleading link" />
    );
    expect(html).toContain('Your speed was taken off the table');
    expect(html).toContain('Cold Carpet');
    expect(html).toContain('140');
    expect(html).toMatch(/layer\s*(<!--\s*-->\s*)?2/);
    expect(html).toContain('bad or misleading link');
  });

  it('says the record is still theirs', async () => {
    const html = await render(
      <SpeedUnlistedEmail title="Cold Carpet" bpm={140} level={2} reason="spam" />
    );
    expect(html).toContain('still in your history');
    expect(html).toContain('only you can see it now');
  });

  it('names no reporter', async () => {
    const html = await render(
      <SpeedUnlistedEmail title="Cold Carpet" bpm={140} level={2} reason="spam" />
    );
    expect(html).not.toMatch(/reported by|reporter/i);
  });

  it('escapes a title that looks like markup', async () => {
    const html = await render(
      <SpeedUnlistedEmail title={'<script>alert(1)</script>'} bpm={140} level={2} reason="spam" />
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
