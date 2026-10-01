// @vitest-environment happy-dom

/**
 * ReportButton (Phase 6, task 6.10) — for a signed-in reader who does not own
 * the pattern. A collapsed button, then an inline form: a reason, an optional
 * note, and a thank-you. The owner never sees who reported it (nothing here
 * sends who is asking beyond the session the request itself carries).
 *
 * @see components/app/community/report-button.tsx
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { post: vi.fn() } };
});

import { ReportButton } from '@/components/app/community/report-button';
import { APIClientError, apiClient } from '@/lib/api/client';

const SLUG = 'cold000001';

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset();
});

it('starts collapsed, as a plain Report button', () => {
  render(<ReportButton slug={SLUG} />);
  expect(screen.getByRole('button', { name: 'Report' })).toBeInTheDocument();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
});

describe('once opened', () => {
  it('keeps Send disabled until a reason is chosen', async () => {
    const user = userEvent.setup();
    render(<ReportButton slug={SLUG} />);
    await user.click(screen.getByRole('button', { name: 'Report' }));

    const send = screen.getByRole('button', { name: 'Send report' });
    expect(send).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Spam' }));
    expect(send).toBeEnabled();
  });

  it('cancels back to the collapsed button, asking nothing of the server', async () => {
    const user = userEvent.setup();
    render(<ReportButton slug={SLUG} />);
    await user.click(screen.getByRole('button', { name: 'Report' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Report' })).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled(); // test-review:accept no_arg_called — cancelled, not sent
  });

  it('posts the reason and a trimmed note to the pattern’s own report route', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({ id: 'rpt1', status: 'open' });
    render(<ReportButton slug={SLUG} />);
    await user.click(screen.getByRole('button', { name: 'Report' }));

    await user.click(screen.getByRole('radio', { name: 'Bad or misleading link' }));
    await user.type(
      screen.getByLabelText('Anything we should know? (optional)'),
      '  the link is dead  '
    );
    await user.click(screen.getByRole('button', { name: 'Send report' }));

    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/public/patterns/${SLUG}/report`, {
      body: { reason: 'bad-link', note: 'the link is dead' },
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/Thanks/);
  });

  it('sends no note field at all when none was written', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({ id: 'rpt1', status: 'open' });
    render(<ReportButton slug={SLUG} />);
    await user.click(screen.getByRole('button', { name: 'Report' }));

    await user.click(screen.getByRole('radio', { name: 'Spam' }));
    await user.click(screen.getByRole('button', { name: 'Send report' }));

    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/public/patterns/${SLUG}/report`, {
      body: { reason: 'spam' },
    });
  });

  it('shows the server’s refusal and stays open to try again', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockRejectedValue(
      new APIClientError('That’s a lot of reports in one day.', 'REPORT_LIMIT', 429)
    );
    render(<ReportButton slug={SLUG} />);
    await user.click(screen.getByRole('button', { name: 'Report' }));
    await user.click(screen.getByRole('radio', { name: 'Spam' }));

    await user.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That’s a lot of reports in one day.'
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send report' })).toBeInTheDocument();
  });

  it('shows a generic message for a non-API failure', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockRejectedValue(new Error('boom'));
    render(<ReportButton slug={SLUG} />);
    await user.click(screen.getByRole('button', { name: 'Report' }));
    await user.click(screen.getByRole('radio', { name: 'Spam' }));

    await user.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That did not send. Try again.');
  });
});

describe('the username variant (Phase 7B, task 7B.5) — reporting a profile', () => {
  const USERNAME = 'ghostnotes';

  it('posts to the drummer’s own report route, not the pattern one', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({ id: 'rpt1', status: 'open' });
    render(<ReportButton username={USERNAME} />);
    await user.click(screen.getByRole('button', { name: 'Report' }));
    await user.click(screen.getByRole('radio', { name: 'Spam' }));

    await user.click(screen.getByRole('button', { name: 'Send report' }));

    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/public/drummers/${USERNAME}/report`, {
      body: { reason: 'spam' },
    });
  });

  it('offers the four profile reasons, and not the pattern-only "not-theirs" reason', async () => {
    const user = userEvent.setup();
    render(<ReportButton username={USERNAME} />);
    await user.click(screen.getByRole('button', { name: 'Report' }));

    expect(screen.getByRole('radio', { name: 'Spam' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Offensive username or bio' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Bad or misleading link' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Something else' })).toBeInTheDocument();
    expect(
      screen.queryByRole('radio', { name: "Someone else's work passed off as theirs" })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('asks "What is wrong with this profile?"', async () => {
    const user = userEvent.setup();
    render(<ReportButton username={USERNAME} />);
    await user.click(screen.getByRole('button', { name: 'Report' }));

    expect(screen.getByText('What is wrong with this profile?')).toBeInTheDocument();
  });
});

describe('the speedId variant (Phase 7C) — reporting a row on a speed table', () => {
  const SPEED_ID = 'cspd00000000000000000001';

  it('asks "What is wrong with this speed?"', async () => {
    const user = userEvent.setup();
    render(<ReportButton speedId={SPEED_ID} />);
    await user.click(screen.getByRole('button', { name: 'Report' }));

    expect(screen.getByText('What is wrong with this speed?')).toBeInTheDocument();
  });

  it('offers the three speed reasons, and no others', async () => {
    const user = userEvent.setup();
    render(<ReportButton speedId={SPEED_ID} />);
    await user.click(screen.getByRole('button', { name: 'Report' }));

    expect(screen.getByRole('radio', { name: "Speed doesn't look right" })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Bad or misleading link' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Something else' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('posts to the speed’s own report route, not the pattern or profile one', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({ id: 'rpt1', status: 'open' });
    render(<ReportButton speedId={SPEED_ID} />);
    await user.click(screen.getByRole('button', { name: 'Report' }));
    await user.click(screen.getByRole('radio', { name: "Speed doesn't look right" }));

    await user.click(screen.getByRole('button', { name: 'Send report' }));

    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/public/speeds/${SPEED_ID}/report`, {
      body: { reason: 'wrong-speed' },
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/Thanks/);
  });
});
