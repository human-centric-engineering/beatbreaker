// @vitest-environment happy-dom

/**
 * Settings → About you, the server component the account-sections seam
 * registers (Phase 7B, task 7B.7): it reads About you for the user it is
 * given, and the catalogue's styles, and hands both to the form.
 *
 * @see components/app/account/about-you-section.tsx
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/about', () => ({ getAbout: vi.fn() }));
vi.mock('@/lib/app/breaks/catalogue/data', () => ({ listStyles: vi.fn() }));
vi.mock('@/lib/api/client', () => ({
  apiClient: { put: vi.fn() },
  APIClientError: class extends Error {},
}));

import { AboutYouSection } from '@/components/app/account/about-you-section';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { getAbout } from '@/lib/app/breaks/community/about';
import { testStyle } from '@/tests/helpers/catalogue';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listStyles).mockResolvedValue([testStyle('funk'), testStyle('rock')]);
});

describe('AboutYouSection', () => {
  it('reads About you for the user it was given and fills the form with it', async () => {
    vi.mocked(getAbout).mockResolvedValue({
      purposes: ['teaching'],
      styles: ['funk'],
      ability: 'advanced',
      styleAbility: {},
      channels: [
        {
          kind: 'x',
          url: 'https://x.com/ghostnotes',
          drumming: true,
          display: '@ghostnotes',
        },
      ],
      public: { purposes: false, styles: false, ability: false, channels: true },
      askedAt: null,
    });
    render(await AboutYouSection({ userId: 'user-1' }));

    expect(getAbout).toHaveBeenCalledWith('user-1');
    expect(screen.getByText('About you')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Teaching drums' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: /How well you play/ })).toHaveValue('advanced');
    expect(screen.getByRole('textbox', { name: 'Channel link 1' })).toHaveValue(
      'https://x.com/ghostnotes'
    );
  });

  it('offers each catalogue style by its label, the chosen ones ticked', async () => {
    vi.mocked(getAbout).mockResolvedValue({
      purposes: [],
      styles: ['rock'],
      ability: null,
      styleAbility: {},
      channels: [],
      public: { purposes: false, styles: false, ability: false, channels: true },
      askedAt: null,
    });
    render(await AboutYouSection({ userId: 'user-2' }));

    const funk = testStyle('funk').params.label;
    const rock = testStyle('rock').params.label;
    expect(screen.getByRole('checkbox', { name: funk })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: rock })).toBeChecked();
  });
});
