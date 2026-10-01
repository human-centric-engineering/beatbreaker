// @vitest-environment happy-dom

/**
 * `/practice` and `/practice/[id]` (Phase 7D, task 7D.5).
 *
 * The real pages over a mocked data layer. `listSessions` and `readSession`
 * are tested through the routes that share them; what is pinned here is that
 * the list is one read for the session user, that signed out is sent to sign
 * in before anything is read, and that a session that is not yours is the
 * not-found page.
 *
 * @see app/(protected)/practice/page.tsx
 * @see app/(protected)/practice/[id]/page.tsx
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/utils', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth/clear-session', () => ({
  clearInvalidSession: vi.fn((returnUrl: string) => {
    throw new Error(`NEXT_REDIRECT:${returnUrl}`);
  }),
}));
vi.mock('@/lib/app/breaks/saved/sessions', () => ({
  listSessions: vi.fn(),
  readSession: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import PracticePage from '@/app/(protected)/practice/page';
import PracticeSessionPage from '@/app/(protected)/practice/[id]/page';
import { listSessions, readSession } from '@/lib/app/breaks/saved/sessions';
import { getServerSession } from '@/lib/auth/utils';
import { createMockAuthSession } from '@/tests/helpers/auth';
import { SESSION_ID, sessionView } from '@/tests/unit/components/app/practice/fixtures';

const USER_ID = createMockAuthSession().user.id;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
});

describe('/practice', () => {
  it('sends a request with no session to sign in, before reading anything', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    await expect(PracticePage()).rejects.toThrow('NEXT_REDIRECT:/practice');
    expect(listSessions).not.toHaveBeenCalled(); // test-review:accept no_arg_called — redirect must short-circuit
  });

  it('reads the whole list once, for the session user, and links each to its editor', async () => {
    vi.mocked(listSessions).mockResolvedValue([
      {
        id: SESSION_ID,
        name: 'Warm-up',
        description: null,
        totalMinutes: 20,
        visibility: 'link',
        slug: 'abc123',
        updatedAt: '2026-10-01T09:00:00.000Z',
        itemCount: 2,
        titles: ['Cold Carpet', 'Funky Drummer'],
        lastRunAt: '2026-10-01T10:00:00.000Z',
      },
    ]);
    render(await PracticePage());

    expect(listSessions).toHaveBeenCalledTimes(1);
    expect(listSessions).toHaveBeenCalledWith(USER_ID);
    const link = screen.getByRole('link', { name: /Warm-up/ });
    expect(link.getAttribute('href')).toBe(`/practice/${SESSION_ID}`);
    expect(link.textContent).toContain('Cold Carpet, Funky Drummer');
    expect(link.textContent).toContain('20 min · Shared');
  });

  it('explains sessions when there are none, with New session', async () => {
    vi.mocked(listSessions).mockResolvedValue([]);
    render(await PracticePage());
    expect(screen.getByText(/A session is a timed run through patterns/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New session' })).toBeInTheDocument();
  });
});

describe('/practice/[id]', () => {
  const page = (id: string) => PracticeSessionPage({ params: Promise.resolve({ id }) });

  it('sends a request with no session to sign in, back to this session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    await expect(page(SESSION_ID)).rejects.toThrow(`NEXT_REDIRECT:/practice/${SESSION_ID}`);
    expect(readSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — redirect must short-circuit
  });

  it('opens your session in the editor', async () => {
    vi.mocked(readSession).mockResolvedValue(sessionView());
    render(await page(SESSION_ID));
    expect(readSession).toHaveBeenCalledWith(USER_ID, SESSION_ID);
    expect(screen.getByRole('heading', { level: 1, name: 'Warm-up' })).toBeInTheDocument();
  });

  it('is not found for a session that is not yours', async () => {
    vi.mocked(readSession).mockResolvedValue(null);
    await expect(page(SESSION_ID)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('is not found for an id that is not an id, without asking the database', async () => {
    await expect(page('../admin')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(readSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — bad id must short-circuit
  });
});
