// @vitest-environment happy-dom

/**
 * The email a pattern's owner gets when a moderator unpublishes it (task
 * 6.11): which pattern, why, that it is still theirs, and how to ask about
 * it — and never who reported it.
 *
 * @see components/app/emails/pattern-unpublished.tsx
 */

import { render } from '@react-email/render';
import { describe, expect, it } from 'vitest';

import PatternUnpublishedEmail from '@/components/app/emails/pattern-unpublished';

describe('PatternUnpublishedEmail', () => {
  it('names the pattern and the reason, and says it is still saved', async () => {
    const html = await render(
      <PatternUnpublishedEmail title="Cold Carpet" reason="bad or misleading link" />
    );
    expect(html).toContain('Your pattern was unpublished');
    expect(html).toContain('Cold Carpet');
    expect(html).toContain('bad or misleading link');
    expect(html).toContain('still saved in your account');
    expect(html).toContain('Copies other people had already saved stay with them');
  });

  it('escapes a title that looks like markup', async () => {
    const html = await render(
      <PatternUnpublishedEmail title={'<script>alert(1)</script>'} reason="spam" />
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
