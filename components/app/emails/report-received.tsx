import * as React from 'react';
import { Body, Container, Head, Html, Link, Preview, Section, Text } from '@react-email/components';

import { BRAND } from '@/lib/brand';

/**
 * Sent to the admins when something is reported (Phase 8, task 8.4), so a
 * moderation rota of one hears about it without watching the queue. It says
 * what kind of thing was reported, which one, and why, and links to the
 * queue. It never says who reported it.
 */
export interface ReportReceivedProps {
  /** "pattern", "profile" or "speed". */
  kind: string;
  /** The pattern's title, the drummer's username, or the speed's pattern and tempo. */
  subject: string;
  /** The report reason's label. */
  reason: string;
  queueUrl: string;
}

export default function ReportReceivedEmail({
  kind,
  subject,
  reason,
  queueUrl,
}: ReportReceivedProps) {
  return (
    <Html>
      <Head />
      <Preview>{`A ${kind} was reported: ${subject}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={heading}>A {kind} was reported</Text>
            <Text style={text}>
              {subject}, reported as: {reason}.
            </Text>
            <Text style={text}>
              <Link href={queueUrl}>Open the reports queue</Link> to unpublish, strip its links or
              dismiss it. Further reports of the same {kind} within the hour won&apos;t send another
              email.
            </Text>
            <Text style={small}>Sent by {BRAND.name} to its admins.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container: React.CSSProperties = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const section: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '40px',
};

const heading: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#1d1b18',
  marginBottom: '16px',
};

const text: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#333333',
  marginBottom: '16px',
};

const small: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#6b6b6b',
};
