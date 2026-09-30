// @vitest-environment happy-dom

/**
 * Settings → Drummer profile, the server component the account-sections seam
 * registers: it reads the profile for the user it is given and hands it to the
 * form — or `null` when there is no username yet, which the form shows as
 * "Choose username".
 *
 * @see components/app/account/drummer-profile-section.tsx
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/community/profile', () => ({ getDrummerProfile: vi.fn() }));
vi.mock('@/lib/api/client', () => ({
  apiClient: { put: vi.fn() },
  APIClientError: class extends Error {},
}));

import { DrummerProfileSection } from '@/components/app/account/drummer-profile-section';
import { getDrummerProfile } from '@/lib/app/breaks/community/profile';

beforeEach(() => vi.clearAllMocks());

describe('DrummerProfileSection', () => {
  it('reads the profile for the user it was given and fills the form with it', async () => {
    vi.mocked(getDrummerProfile).mockResolvedValue({
      username: 'ghostnotes',
      bio: 'Funk, mostly.',
      nextChangeAt: null,
    });
    render(await DrummerProfileSection({ userId: 'user-1' }));

    expect(getDrummerProfile).toHaveBeenCalledWith('user-1');
    expect(screen.getByText('Drummer profile')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Username/ })).toHaveValue('ghostnotes');
    expect(screen.getByRole('textbox', { name: /Bio/ })).toHaveValue('Funk, mostly.');
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeInTheDocument();
  });

  it('offers to choose a username when there is none yet', async () => {
    vi.mocked(getDrummerProfile).mockResolvedValue(null);
    render(await DrummerProfileSection({ userId: 'user-2' }));

    expect(screen.getByRole('textbox', { name: /Username/ })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Choose username' })).toBeInTheDocument();
  });
});
