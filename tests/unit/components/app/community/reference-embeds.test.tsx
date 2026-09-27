// @vitest-environment jsdom
// jsdom, not happy-dom: mounting a real cross-origin <iframe src> makes
// happy-dom actually attempt navigation, which tests/setup.ts's network
// guard then throws on (an unhandled DOMException outside the test's control).
// jsdom does not auto-navigate iframes, so the src attribute can be asserted
// without a real request ever being attempted.

/**
 * `ReferenceEmbeds` — click-to-load embeds for a pattern's reference links
 * (Phase 6, task 6.7). The whole point is that nothing is requested from
 * YouTube, Vimeo or Spotify until a placeholder is pressed, and that the
 * iframe's `src` is always the parsed, rebuilt `embedUrl` — never the raw
 * stored string.
 *
 * @see components/app/community/reference-embeds.tsx
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ReferenceEmbeds } from '@/components/app/community/reference-embeds';
import { parseReferenceLink, type StoredLink } from '@/lib/app/breaks/links';

const VIDEO: StoredLink = { kind: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };
const SONG: StoredLink = {
  kind: 'song',
  url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
};
const NO_LONGER_PARSES: StoredLink = { kind: 'video', url: 'https://example.com/gone' };

describe('ReferenceEmbeds', () => {
  it('renders nothing when there are no links', () => {
    const { container } = render(<ReferenceEmbeds links={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a placeholder, not an iframe, until pressed', () => {
    const { container } = render(<ReferenceEmbeds links={[VIDEO]} />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('button', { name: /play video from youtube/i })).toBeInTheDocument();
  });

  it('loads an iframe whose src is the parsed embedUrl, never the stored string, once pressed', async () => {
    const user = userEvent.setup();
    const { container } = render(<ReferenceEmbeds links={[VIDEO]} />);
    await user.click(screen.getByRole('button', { name: /play video from youtube/i }));

    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    const expected = parseReferenceLink(VIDEO.url)?.embedUrl;
    expect(expected).toBeDefined();
    expect(iframe?.getAttribute('src')).toBe(expected);
    expect(iframe?.getAttribute('src')).not.toBe(VIDEO.url);
  });

  it('gives the outbound link the full nofollow/ugc/noopener/noreferrer rel', () => {
    render(<ReferenceEmbeds links={[SONG]} />);
    const link = screen.getByRole('link', { name: /open on spotify/i });
    const tokens = (link.getAttribute('rel') ?? '').split(' ');
    expect(tokens).toEqual(expect.arrayContaining(['nofollow', 'ugc', 'noopener', 'noreferrer']));
  });

  it('does not draw a stored link that no longer parses', () => {
    render(<ReferenceEmbeds links={[NO_LONGER_PARSES, VIDEO]} />);
    // only the one link that still parses gets a placeholder
    expect(screen.getAllByRole('button', { name: /play video|listen on/i })).toHaveLength(1);
  });
});
