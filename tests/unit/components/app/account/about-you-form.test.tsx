// @vitest-environment happy-dom

/**
 * AboutYouForm (Phase 7B, task 7B.7) — Settings → About you: what you use
 * BeatBreaker for, the styles you play and how well, your channel links, and
 * which of these your public page shows.
 *
 * @see components/app/account/about-you-form.tsx
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { ...actual.apiClient, put: vi.fn() } };
});

import {
  type AboutAnswer,
  AboutYouForm,
  type StyleOption,
} from '@/components/app/account/about-you-form';
import { CHANNEL_RULE } from '@/lib/app/breaks/community/channels';
import { APIClientError, apiClient } from '@/lib/api/client';

const EMPTY_ABOUT: AboutAnswer = {
  purposes: [],
  styles: [],
  ability: null,
  styleAbility: {},
  channels: [],
  public: { purposes: false, styles: false, ability: false, channels: true },
  askedAt: null,
};

const STYLES: StyleOption[] = [
  { key: 'funk', label: 'Funk' },
  { key: 'rock', label: 'Rock' },
];

const MANY_STYLES: StyleOption[] = Array.from({ length: 9 }, (_, i) => ({
  key: `style-${i}`,
  label: `Style ${i}`,
}));

beforeEach(() => {
  vi.mocked(apiClient.put).mockReset();
});

describe('every field is sent in the PUT body', () => {
  it('sends purposes, ability, styles, per-style ability, channels and public switches', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue({
      ...EMPTY_ABOUT,
      purposes: ['learning'],
      ability: 'advanced',
      styles: ['funk', 'rock'],
      styleAbility: { funk: 'professional' },
      channels: [
        {
          kind: 'youtube',
          url: 'https://www.youtube.com/@ghostnotes',
          drumming: true,
          display: '@ghostnotes',
        },
      ],
      public: { purposes: true, styles: false, ability: false, channels: true },
    });

    render(<AboutYouForm about={EMPTY_ABOUT} styles={STYLES} />);

    await user.click(screen.getByRole('checkbox', { name: 'Learning to play' }));
    await user.selectOptions(
      screen.getByRole('combobox', { name: /How well you play/ }),
      'Advanced'
    );
    await user.click(screen.getByRole('checkbox', { name: 'Funk' }));
    await user.click(screen.getByRole('checkbox', { name: 'Rock' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Funk' }), 'Professional');
    await user.click(screen.getByRole('button', { name: 'Add a link' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Channel link 1' }),
      'https://www.youtube.com/@ghostnotes'
    );
    await user.click(screen.getByRole('switch', { name: 'What you use BeatBreaker for' }));

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/drummer-about', {
      body: {
        purposes: ['learning'],
        ability: 'advanced',
        styles: ['funk', 'rock'],
        styleAbility: { funk: 'professional' },
        channels: [{ url: 'https://www.youtube.com/@ghostnotes', drumming: true }],
        public: { purposes: true, styles: false, ability: false, channels: true },
        // saving here counts as answering Home's three questions
        asked: true,
      },
    });
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('sends ability: null when nothing was chosen', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue(EMPTY_ABOUT);

    render(<AboutYouForm about={EMPTY_ABOUT} styles={STYLES} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(apiClient.put).toHaveBeenCalledWith(
      '/api/v1/drummer-about',
      expect.objectContaining({ body: expect.objectContaining({ ability: null }) })
    );
  });
});

describe('styleAbility filtering', () => {
  it('drops a stale entry for a style no longer chosen, and "Same as overall" for one that is', async () => {
    const user = userEvent.setup();
    const about: AboutAnswer = {
      ...EMPTY_ABOUT,
      styles: ['funk'],
      // rock is stale: present in styleAbility but not in styles
      styleAbility: { rock: 'advanced' },
    };
    vi.mocked(apiClient.put).mockResolvedValue(about);

    render(<AboutYouForm about={about} styles={STYLES} />);
    // funk's own select is untouched, so it reads "Same as overall" (empty)
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(apiClient.put).toHaveBeenCalledWith(
      '/api/v1/drummer-about',
      expect.objectContaining({ body: expect.objectContaining({ styleAbility: {} }) })
    );
  });
});

describe('the styles cap (MAX_STYLES = 8)', () => {
  it('disables the boxes past the eighth once 8 are chosen', async () => {
    const user = userEvent.setup();
    render(<AboutYouForm about={EMPTY_ABOUT} styles={MANY_STYLES} />);

    for (let i = 0; i < 8; i++) {
      await user.click(screen.getByRole('checkbox', { name: `Style ${i}` }));
    }

    const ninth = screen.getByRole('checkbox', { name: 'Style 8' });
    expect(ninth).toBeDisabled();
    expect(ninth).not.toBeChecked();
  });
});

describe('channel links', () => {
  it('shows the CHANNEL_RULE message and does not submit for an off-list URL', async () => {
    const user = userEvent.setup();
    render(<AboutYouForm about={EMPTY_ABOUT} styles={STYLES} />);

    await user.click(screen.getByRole('button', { name: 'Add a link' }));
    await user.type(screen.getByRole('textbox', { name: 'Channel link 1' }), 'http://example.com');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // the persistent helper text plus the inline field error both read CHANNEL_RULE
    expect(await screen.findAllByText(CHANNEL_RULE)).toHaveLength(2);
    expect(apiClient.put).not.toHaveBeenCalled(); // test-review:accept no_arg_called — client-side validation short-circuits
  });

  it('adds and removes a channel link, and lets "About drumming" be switched off', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue({
      ...EMPTY_ABOUT,
      channels: [
        {
          kind: 'youtube',
          url: 'https://www.youtube.com/@ghostnotes',
          drumming: false,
          display: '@ghostnotes',
        },
      ],
    });

    render(<AboutYouForm about={EMPTY_ABOUT} styles={STYLES} />);
    await user.click(screen.getByRole('button', { name: 'Add a link' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Channel link 1' }),
      'https://www.youtube.com/@ghostnotes'
    );
    await user.click(screen.getByRole('checkbox', { name: 'About drumming' }));

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(apiClient.put).toHaveBeenCalledWith(
      '/api/v1/drummer-about',
      expect.objectContaining({
        body: expect.objectContaining({
          channels: [{ url: 'https://www.youtube.com/@ghostnotes', drumming: false }],
        }),
      })
    );
  });

  it('removes a channel row with its Remove button, before any save', async () => {
    const user = userEvent.setup();
    render(<AboutYouForm about={EMPTY_ABOUT} styles={STYLES} />);

    await user.click(screen.getByRole('button', { name: 'Add a link' }));
    expect(screen.getByRole('textbox', { name: 'Channel link 1' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove channel link 1' }));
    expect(screen.queryByRole('textbox', { name: 'Channel link 1' })).not.toBeInTheDocument();
  });

  it('shows the canonical URL the server returned after a save, not what was typed', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue({
      ...EMPTY_ABOUT,
      channels: [
        {
          kind: 'youtube',
          url: 'https://www.youtube.com/@Ghost',
          drumming: true,
          display: '@Ghost',
        },
      ],
    });

    render(<AboutYouForm about={EMPTY_ABOUT} styles={STYLES} />);
    await user.click(screen.getByRole('button', { name: 'Add a link' }));
    // typed without "www." — the server rebuilds the canonical form
    await user.type(
      screen.getByRole('textbox', { name: 'Channel link 1' }),
      'https://youtube.com/@Ghost'
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Channel link 1' })).toHaveValue(
      'https://www.youtube.com/@Ghost'
    );
  });
});

describe('a server error', () => {
  it('is shown, from an APIClientError', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockRejectedValue(
      new APIClientError('That did not save.', 'SERVER_ERROR', 500)
    );
    render(<AboutYouForm about={EMPTY_ABOUT} styles={STYLES} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('That did not save.')).toBeInTheDocument();
  });

  it('falls back to a generic message for a failure that is not an APIClientError', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockRejectedValue(new Error('network down'));
    render(<AboutYouForm about={EMPTY_ABOUT} styles={STYLES} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('That did not save. Try again.')).toBeInTheDocument();
  });
});

describe('the public switches', () => {
  it('reflects what is already public from the row it was given', () => {
    render(
      <AboutYouForm
        about={{
          ...EMPTY_ABOUT,
          public: { purposes: true, styles: true, ability: false, channels: true },
        }}
        styles={STYLES}
      />
    );
    expect(screen.getByRole('switch', { name: 'What you use BeatBreaker for' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Your styles' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'How well you play' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Your channel links' })).toBeChecked();
  });
});

describe('multiple channel rows', () => {
  it('sends each row’s own URL independently, in order', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue(EMPTY_ABOUT);
    render(<AboutYouForm about={EMPTY_ABOUT} styles={STYLES} />);

    await user.click(screen.getByRole('button', { name: 'Add a link' }));
    await user.click(screen.getByRole('button', { name: 'Add a link' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Channel link 1' }),
      'https://www.youtube.com/@ghostnotes'
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Channel link 2' }),
      'https://www.instagram.com/ghostnotes'
    );
    // typing into the second row must not leak into the first
    expect(screen.getByRole('textbox', { name: 'Channel link 1' })).toHaveValue(
      'https://www.youtube.com/@ghostnotes'
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(apiClient.put).toHaveBeenCalledWith(
      '/api/v1/drummer-about',
      expect.objectContaining({
        body: expect.objectContaining({
          channels: [
            { url: 'https://www.youtube.com/@ghostnotes', drumming: true },
            { url: 'https://www.instagram.com/ghostnotes', drumming: true },
          ],
        }),
      })
    );
  });
});
