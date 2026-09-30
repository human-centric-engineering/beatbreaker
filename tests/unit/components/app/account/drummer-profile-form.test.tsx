// @vitest-environment happy-dom

/**
 * DrummerProfileForm (Phase 6, task 6.2): choosing or changing a username,
 * with the same rules the server runs checked client-side first, and the
 * server's own 409 shown verbatim when it refuses.
 *
 * @see components/app/account/drummer-profile-form.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { ...actual.apiClient, put: vi.fn() } };
});

import { DrummerProfileForm } from '@/components/app/account/drummer-profile-form';
import { APIClientError, apiClient } from '@/lib/api/client';
import type { DrummerProfileView } from '@/lib/app/breaks/community/profile';

beforeEach(() => {
  vi.mocked(apiClient.put).mockReset();
});

describe('DrummerProfileForm — no profile yet', () => {
  it('starts empty, and offers to choose a username', () => {
    render(<DrummerProfileForm profile={null} />);
    expect(screen.getByRole('textbox', { name: /Username/ })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /Bio/ })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Choose username' })).toBeInTheDocument();
  });
});

describe('DrummerProfileForm — an existing profile', () => {
  const profile: DrummerProfileView = {
    username: 'ginger_baker',
    bio: 'Funk drummer',
    nextChangeAt: null,
  };

  it('starts filled in, and offers to save rather than choose', () => {
    render(<DrummerProfileForm profile={profile} />);
    expect(screen.getByRole('textbox', { name: /Username/ })).toHaveValue('ginger_baker');
    expect(screen.getByRole('textbox', { name: /Bio/ })).toHaveValue('Funk drummer');
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeInTheDocument();
  });

  it('says when the name may change again, from the row it was given', () => {
    render(
      <DrummerProfileForm profile={{ ...profile, nextChangeAt: '2026-10-27T00:00:00.000Z' }} />
    );
    expect(screen.getByText(/You can change it again from 2026-10-27\./)).toBeInTheDocument();
  });
});

describe('DrummerProfileForm — client-side refusal', () => {
  it('refuses a reserved word without ever calling the API', async () => {
    const user = userEvent.setup();
    render(<DrummerProfileForm profile={null} />);

    await user.type(screen.getByRole('textbox', { name: /Username/ }), 'admin');
    await user.click(screen.getByRole('button', { name: 'Choose username' }));

    expect(await screen.findByText("That username isn't available.")).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the form's own schema short-circuits
  });

  it('refuses a name that is too short, with the site’s own rule text', async () => {
    const user = userEvent.setup();
    render(<DrummerProfileForm profile={null} />);

    await user.type(screen.getByRole('textbox', { name: /Username/ }), 'ab');
    await user.click(screen.getByRole('button', { name: 'Choose username' }));

    expect(
      await screen.findByText(
        'Use 3–24 letters, numbers, - or _, starting with a letter or number.'
      )
    ).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the form's own schema short-circuits
  });

  it('refuses a disguised look-alike the same way the server would', async () => {
    const user = userEvent.setup();
    render(<DrummerProfileForm profile={null} />);

    await user.type(screen.getByRole('textbox', { name: /Username/ }), '4dm1n');
    await user.click(screen.getByRole('button', { name: 'Choose username' }));

    expect(await screen.findByText("That username isn't available.")).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the form's own schema short-circuits
  });
});

describe('DrummerProfileForm — submitting', () => {
  it('PUTs the username and bio, and shows Saved on success', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue({
      username: 'ginger_baker',
      bio: 'Funk drummer',
      nextChangeAt: null,
    });
    render(<DrummerProfileForm profile={null} />);

    await user.type(screen.getByRole('textbox', { name: /Username/ }), 'Ginger_Baker');
    await user.type(screen.getByRole('textbox', { name: /Bio/ }), 'Funk drummer');
    await user.click(screen.getByRole('button', { name: 'Choose username' }));

    await waitFor(() => expect(apiClient.put).toHaveBeenCalledTimes(1));
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/drummer-profile', {
      body: { username: 'ginger_baker', bio: 'Funk drummer' },
    });
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    // the button now reads Save, not Choose, once there is a profile
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeInTheDocument();
  });

  it('shows the server’s 409 message, and leaves what was typed in place', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockRejectedValue(
      new APIClientError(
        'You can change your username once every 30 days. The next change can be made on 2026-10-27.',
        'CONFLICT',
        409
      )
    );
    render(<DrummerProfileForm profile={{ username: 'old_name', bio: '', nextChangeAt: null }} />);

    const usernameField = screen.getByRole('textbox', { name: /Username/ });
    await user.clear(usernameField);
    await user.type(usernameField, 'new_name');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(
      await screen.findByText(
        'You can change your username once every 30 days. The next change can be made on 2026-10-27.'
      )
    ).toBeInTheDocument();
    expect(usernameField).toHaveValue('new_name');
  });

  it('shows a generic message for a failure that is not an APIClientError', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockRejectedValue(new Error('network down'));
    render(<DrummerProfileForm profile={null} />);

    await user.type(screen.getByRole('textbox', { name: /Username/ }), 'ginger_baker');
    await user.click(screen.getByRole('button', { name: 'Choose username' }));

    expect(await screen.findByText('That did not save. Try again.')).toBeInTheDocument();
  });
});
