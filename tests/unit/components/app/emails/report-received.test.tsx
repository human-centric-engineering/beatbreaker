// @vitest-environment happy-dom

/**
 * The email the admins get when something is reported (Phase 8, task 8.4):
 * what kind of thing, which one, why, and a link to the queue, and never who
 * reported it.
 *
 * @see components/app/emails/report-received.tsx
 */

import { render } from '@react-email/render';
import { describe, expect, it } from 'vitest';

import ReportReceivedEmail from '@/components/app/emails/report-received';

const props = {
  kind: 'pattern',
  subject: 'The pattern “Cold Sweat”',
  reason: 'spam',
  queueUrl: 'https://beatbreaker.app/admin/patterns',
};

/** The rendered text, without React's `<!-- -->` separators between text segments. */
async function text(element: React.ReactElement): Promise<string> {
  return (await render(element)).replace(/<!--\s*-->/g, '');
}

describe('ReportReceivedEmail', () => {
  it('names the kind of thing, which one and why, and links to the queue', async () => {
    const html = await text(<ReportReceivedEmail {...props} />);
    expect(html).toContain('A pattern was reported');
    expect(html).toContain('Cold Sweat');
    expect(html).toContain('reported as: spam');
    expect(html).toContain('href="https://beatbreaker.app/admin/patterns"');
  });

  it('says further reports within the hour send nothing, and names no reporter', async () => {
    const html = await text(<ReportReceivedEmail {...props} kind="speed" />);
    expect(html).toMatch(/same speed within the hour won(&#x27;|')t send/);
    expect(html).not.toMatch(/reported by|reporter/i);
  });
});
