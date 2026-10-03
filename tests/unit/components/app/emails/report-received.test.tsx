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

/** The rendered email as a document, so its text reads without React's `<!-- -->` separators. */
async function rendered(element: React.ReactElement): Promise<Document> {
  return new DOMParser().parseFromString(await render(element), 'text/html');
}

describe('ReportReceivedEmail', () => {
  it('names the kind of thing, which one and why, and links to the queue', async () => {
    const doc = await rendered(<ReportReceivedEmail {...props} />);
    const text = doc.body.textContent;
    expect(text).toContain('A pattern was reported');
    expect(text).toContain('Cold Sweat');
    expect(text).toContain('reported as: spam');
    expect(doc.querySelector('a[href="https://beatbreaker.app/admin/patterns"]')).not.toBeNull();
  });

  it('says further reports within the hour send nothing, and names no reporter', async () => {
    const text = (await rendered(<ReportReceivedEmail {...props} kind="speed" />)).body.textContent;
    expect(text).toMatch(/same speed within the hour won['’]t send/);
    expect(text).not.toMatch(/reported by|reporter/i);
  });
});
