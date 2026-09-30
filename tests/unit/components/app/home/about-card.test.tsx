// @vitest-environment happy-dom

/**
 * AboutCard (Phase 7B, task 7B.7) — Home's three quick questions: what you
 * use BeatBreaker for, how well you play, and your styles. Offered once —
 * Save or Skip both record `asked: true` and the card disappears either way.
 *
 * @see components/app/home/about-card.tsx
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { ...actual.apiClient, put: vi.fn() } };
});

import { AboutCard } from '@/components/app/home/about-card';
import type { StyleOption } from '@/components/app/account/about-you-form';
import { APIClientError, apiClient } from '@/lib/api/client';

const STYLES: StyleOption[] = [
  { key: 'funk', label: 'Funk' },
  { key: 'rock', label: 'Rock' },
];

beforeEach(() => {
  vi.mocked(apiClient.put).mockReset();
});

describe('Save', () => {
  it('sends purposes, ability and styles, plus asked: true', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue({});
    render(<AboutCard styles={STYLES} />);

    await user.click(screen.getByRole('checkbox', { name: 'Learning to play' }));
    await user.click(screen.getByRole('radio', { name: 'Advanced' }));
    await user.click(screen.getByRole('checkbox', { name: 'Funk' }));

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/drummer-about', {
      body: { purposes: ['learning'], styles: ['funk'], ability: 'advanced', asked: true },
    });
  });

  it('leaves ability out of the body entirely when none was chosen', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue({});
    render(<AboutCard styles={STYLES} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/drummer-about', {
      body: { purposes: [], styles: [], asked: true },
    });
  });

  it('disappears once the save succeeds', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue({});
    render(<AboutCard styles={STYLES} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await vi.waitFor(() =>
      expect(screen.queryByText('Three quick questions')).not.toBeInTheDocument()
    );
  });

  it('shows an error and stays on the card when the save fails', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockRejectedValue(
      new APIClientError('That did not save.', 'SERVER_ERROR', 500)
    );
    render(<AboutCard styles={STYLES} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('That did not save.')).toBeInTheDocument();
    expect(screen.getByText('Three quick questions')).toBeInTheDocument();
  });

  it('shows a generic error for a failure that is not an APIClientError', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockRejectedValue(new Error('network down'));
    render(<AboutCard styles={STYLES} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('That did not save. Try again.')).toBeInTheDocument();
  });
});

describe('Skip', () => {
  it('sends only asked: true', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue({});
    render(<AboutCard styles={STYLES} />);

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/drummer-about', {
      body: { asked: true },
    });
  });

  it('ignores anything already chosen — Skip never sends it', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue({});
    render(<AboutCard styles={STYLES} />);

    await user.click(screen.getByRole('checkbox', { name: 'Learning to play' }));
    await user.click(screen.getByRole('radio', { name: 'Advanced' }));
    await user.click(screen.getByRole('checkbox', { name: 'Funk' }));

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/drummer-about', {
      body: { asked: true },
    });
  });

  it('disappears once the skip succeeds', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue({});
    render(<AboutCard styles={STYLES} />);

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    await vi.waitFor(() =>
      expect(screen.queryByText('Three quick questions')).not.toBeInTheDocument()
    );
  });

  it('shows an error and stays on the card when the skip fails', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockRejectedValue(
      new APIClientError('That did not save.', 'SERVER_ERROR', 500)
    );
    render(<AboutCard styles={STYLES} />);

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(await screen.findByText('That did not save.')).toBeInTheDocument();
    expect(screen.getByText('Three quick questions')).toBeInTheDocument();
  });
});

describe('the ability choice', () => {
  it('can be taken back with "Not saying"', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.put).mockResolvedValue({});
    render(<AboutCard styles={STYLES} />);

    const advanced = screen.getByRole('radio', { name: 'Advanced' });
    await user.click(advanced);
    expect(advanced).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Not saying' }));
    expect(advanced).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/drummer-about', {
      body: { purposes: [], styles: [], asked: true },
    });
  });
});
