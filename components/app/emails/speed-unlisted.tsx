import * as React from 'react';
import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components';

import { BRAND } from '@/lib/brand';

/**
 * Sent to a drummer when a moderator takes one of their speeds off a public
 * table (Phase 7C). It says which speed, that the record is still theirs, and
 * how to ask about it — not who reported it.
 */
export interface SpeedUnlistedProps {
  /** What the record is on. */
  title: string;
  bpm: number;
  level: number;
  /** Why, as the report reason's label. */
  reason: string;
}

export default function SpeedUnlistedEmail({ title, bpm, level, reason }: SpeedUnlistedProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your ${bpm} bpm on “${title}” is no longer on its table`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={heading}>Your speed was taken off the table</Text>
            <Text style={text}>
              Your {bpm} bpm at layer {level} on “{title}” is no longer on its speed table on{' '}
              {BRAND.name}, after a report. The reason given: {reason}.
            </Text>
            <Text style={text}>
              The record is still in your history, and only you can see it now. Records on{' '}
              {BRAND.name} are self-reported; a video of you playing it is what backs one up.
            </Text>
            <Text style={text}>
              If you think this was a mistake, reply through the contact page on {BRAND.name} and
              say which speed it was.
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
