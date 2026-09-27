import * as React from 'react';
import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components';

import { BRAND } from '@/lib/brand';

/**
 * Sent to a pattern's owner when a moderator unpublishes it (Phase 6, task
 * 6.11). It says which pattern, that it is still theirs and still saved, and
 * how to ask about it — not who reported it.
 */
export interface PatternUnpublishedProps {
  title: string;
  /** Why, in the moderator's words or the report reason's label. */
  reason: string;
}

export default function PatternUnpublishedEmail({ title, reason }: PatternUnpublishedProps) {
  return (
    <Html>
      <Head />
      <Preview>{`“${title}” is no longer in the community library`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={heading}>Your pattern was unpublished</Text>
            <Text style={text}>
              “{title}” has been taken out of the {BRAND.name} community library after a report. The
              reason given: {reason}.
            </Text>
            <Text style={text}>
              It is still saved in your account, and only you can open it now. Copies other people
              had already saved stay with them.
            </Text>
            <Text style={text}>
              If you think this was a mistake, reply through the contact page on {BRAND.name} and
              say which pattern it was.
            </Text>
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
