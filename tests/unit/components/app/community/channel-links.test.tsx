// @vitest-environment happy-dom

/**
 * ChannelLinks (Phase 7B, task 7B.4) — a drummer's channel links on their
 * public page. Outbound links only: `rel="me noopener noreferrer nofollow
 * ugc"`, `target="_blank"`, in the order given, with a drum mark only on the
 * ones the drummer marked as about drumming. Nothing renders for an empty list.
 *
 * @see components/app/community/channel-links.tsx
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChannelLinks } from '@/components/app/community/channel-links';
import type { ChannelView } from '@/lib/app/breaks/community/channels';

const youtube: ChannelView = {
  kind: 'youtube',
  url: 'https://www.youtube.com/@ghostnotes',
  drumming: true,
  display: '@ghostnotes',
};
const website: ChannelView = {
  kind: 'website',
  url: 'https://ghostnotes.dev',
  drumming: false,
  display: 'ghostnotes.dev',
};

describe('ChannelLinks', () => {
  it('renders nothing for an empty list', () => {
    const { container } = render(<ChannelLinks channels={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sets rel, target and order exactly as given', () => {
    render(<ChannelLinks channels={[youtube, website]} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'https://www.youtube.com/@ghostnotes',
      'https://ghostnotes.dev',
    ]);
    for (const a of links) {
      expect(a).toHaveAttribute('rel', 'me noopener noreferrer nofollow ugc');
      expect(a).toHaveAttribute('target', '_blank');
    }
  });

  it('shows the drum mark only on channels marked about drumming', () => {
    render(<ChannelLinks channels={[youtube, website]} />);

    const youtubeLink = screen.getByRole('link', { name: /YouTube/ });
    const websiteLink = screen.getByRole('link', { name: /ghostnotes\.dev/ });
    expect(youtubeLink.querySelector('[aria-label="About drumming"]')).not.toBeNull();
    expect(websiteLink.querySelector('[aria-label="About drumming"]')).toBeNull();
  });

  it('shows the platform label and the handle for a platform link, and the bare host for a website', () => {
    render(<ChannelLinks channels={[youtube, website]} />);

    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('@ghostnotes')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('ghostnotes.dev')).toBeInTheDocument();
  });
});
