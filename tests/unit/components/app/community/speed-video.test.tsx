// @vitest-environment jsdom
// jsdom, not happy-dom: mounting a real cross-origin <iframe src> makes
// happy-dom actually attempt navigation, which tests/setup.ts's network
// guard then throws on (an unhandled DOMException outside the test's control).
// jsdom does not auto-navigate iframes, so the src attribute can be asserted
// without a real request ever being attempted. See reference-embeds.test.tsx.

/**
 * `SpeedVideo` (Phase 7C, D29) — the one thing that backs a self-reported
 * speed up. YouTube and Vimeo are click-to-load: nothing is fetched from
 * either until _Play_ is pressed. Instagram, TikTok and X are outbound links
 * only, so the page's frame list does not grow.
 *
 * @see components/app/community/speed-video.tsx
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SpeedVideo } from '@/components/app/community/speed-video';

describe('YouTube and Vimeo — click-to-load', () => {
  it.each([
    [
      'YouTube',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'YouTube',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    ['Vimeo', 'https://vimeo.com/76979871', 'Vimeo', 'https://player.vimeo.com/video/76979871'],
  ])(
    '%s shows a Play button and no iframe until pressed, then an embed url built from the id',
    async (_name, url, platform, embedUrl) => {
      const user = userEvent.setup();
      render(<SpeedVideo url={url} title="@ghostnotes · Cold Carpet" />);

      const playBtn = screen.getByRole('button', { name: `Play video from ${platform}` });
      expect(playBtn).toBeInTheDocument();
      expect(screen.queryByTitle(/video from/)).not.toBeInTheDocument();
      expect(document.querySelector('iframe')).not.toBeInTheDocument();

      await user.click(playBtn);

      expect(
        screen.queryByRole('button', { name: `Play video from ${platform}` })
      ).not.toBeInTheDocument();
      const iframe = document.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', embedUrl);
    }
  );
});

describe('Instagram, TikTok and X — outbound only', () => {
  it.each([
    [
      'Instagram',
      'https://www.instagram.com/p/Cabc12345/',
      'https://www.instagram.com/p/Cabc12345/',
    ],
    [
      'TikTok',
      'https://www.tiktok.com/@jo.drums/video/7123456789012345678',
      'https://www.tiktok.com/@jo.drums/video/7123456789012345678',
    ],
    [
      'X',
      'https://x.com/jodrums/status/1234567890123456789',
      'https://x.com/jodrums/status/1234567890123456789',
    ],
  ])('%s renders an outbound link and never an iframe', (platform, url, canonical) => {
    render(<SpeedVideo url={url} title="@ghostnotes · Cold Carpet" />);

    const link = screen.getByRole('link', { name: `Video on ${platform}` });
    expect(link).toHaveAttribute('href', canonical);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');
    expect(document.querySelector('iframe')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Play video/ })).not.toBeInTheDocument();
  });
});

describe('an unparseable link', () => {
  it('renders nothing', () => {
    const { container } = render(
      <SpeedVideo url="https://example.com/video/1" title="@ghostnotes · Cold Carpet" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
