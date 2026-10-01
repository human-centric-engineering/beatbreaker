// @vitest-environment happy-dom

/**
 * _Add to a session_ and _Make a session from this shelf_ (Phase 7D, task 7D.6).
 *
 * The real components and the real `session-api` over a mocked `apiClient`.
 * The target an item lands with is the server's to work out — your best at
 * its layer, else the pattern's tempo, which the route tests pin — so what is
 * pinned here is the request that reaches it: the pattern named by id at its
 * layer, after every item already there, kept by id.
 *
 * @see components/app/practice/add-to-session.tsx
 * @see components/app/practice/session-from-shelf.tsx
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { get: vi.fn(), put: vi.fn(), post: vi.fn() } };
});

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { AddToSession } from '@/components/app/practice/add-to-session';
import { SessionFromShelf } from '@/components/app/practice/session-from-shelf';
import { APIClientError, apiClient } from '@/lib/api/client';
import type { SessionSummary } from '@/lib/validations/practice-sessions';
import { item, SESSION_ID, sessionView } from '@/tests/unit/components/app/practice/fixtures';

const ENTRY = 'centry000000000000000001';
const PUBLISHED = 'cbrk00000000000000000042';

function summary(over: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: SESSION_ID,
    name: 'Warm-up',
    description: null,
    totalMinutes: 15,
    visibility: 'private',
    slug: null,
    updatedAt: '2026-10-01T09:00:00.000Z',
    itemCount: 2,
    titles: ['Pattern 1', 'Pattern 2'],
    lastRunAt: null,
    ...over,
  };
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.put).mockReset();
  vi.mocked(apiClient.post).mockReset();
  push.mockClear();
});

describe('AddToSession', () => {
  it('reads your sessions only when the menu opens — not when the row draws', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([summary()]);
    const user = userEvent.setup();
    render(
      <AddToSession target={{ libraryEntryId: ENTRY }} title="Funky Drummer" onResult={vi.fn()} />
    );
    expect(apiClient.get).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: 'Add Funky Drummer to a practice session' })
    );

    expect(await screen.findByRole('menuitem', { name: /Warm-up/ })).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/practice-sessions');
  });

  it('adds a famous break to the end, keeping every item already there', async () => {
    const onResult = vi.fn();
    const current = sessionView({ items: [item(1), item(2, { minutes: 9, minutesPinned: true })] });
    vi.mocked(apiClient.get).mockResolvedValueOnce([summary()]).mockResolvedValueOnce(current);
    vi.mocked(apiClient.put).mockResolvedValue(sessionView());
    const user = userEvent.setup();
    render(
      <AddToSession
        target={{ libraryEntryId: ENTRY }}
        title="Funky Drummer"
        level={3}
        onResult={onResult}
      />
    );

    await user.click(screen.getByRole('button', { name: /Add Funky Drummer/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Warm-up/ }));

    expect(apiClient.get).toHaveBeenLastCalledWith(`/api/v1/practice-sessions/${SESSION_ID}`);
    const [path, options] = vi.mocked(apiClient.put).mock.calls[0];
    expect(path).toBe(`/api/v1/practice-sessions/${SESSION_ID}/items`);
    const { items } = options?.body as { items: Array<Record<string, unknown>> };
    expect(items).toHaveLength(3);
    expect(items[1]).toEqual(
      expect.objectContaining({ id: item(2).id, minutes: 9, minutesPinned: true })
    );
    // the new one names its pattern and its layer, and no target: the server works that out
    expect(items[2]).toEqual({ libraryEntryId: ENTRY, level: 3 });
    expect(onResult).toHaveBeenCalledWith('Added to “Warm-up”', false);
  });

  it('adds a published pattern by its break id', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce([summary()])
      .mockResolvedValueOnce(sessionView({ items: [] }));
    vi.mocked(apiClient.put).mockResolvedValue(sessionView());
    const user = userEvent.setup();
    render(<AddToSession target={{ breakId: PUBLISHED }} title="Cold Carpet" onResult={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Add Cold Carpet/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Warm-up/ }));

    const { items } = vi.mocked(apiClient.put).mock.calls[0][1]?.body as {
      items: Array<Record<string, unknown>>;
    };
    expect(items).toEqual([{ breakId: PUBLISHED, level: 5 }]);
  });

  it('starts a new session with the pattern, named after it', async () => {
    const onResult = vi.fn();
    vi.mocked(apiClient.get).mockResolvedValue([]);
    vi.mocked(apiClient.post).mockResolvedValue(sessionView({ name: 'Cold Carpet' }));
    const user = userEvent.setup();
    render(
      <AddToSession target={{ breakId: PUBLISHED }} title="Cold Carpet" onResult={onResult} />
    );

    await user.click(screen.getByRole('button', { name: /Add Cold Carpet/ }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'New session with this pattern' })
    );

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/practice-sessions', {
      body: { name: 'Cold Carpet', totalMinutes: 5, items: [{ breakId: PUBLISHED, level: 5 }] },
    });
    expect(onResult).toHaveBeenCalledWith('Made the session “Cold Carpet”', false);
  });

  it('will not offer a session that is full', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([
      summary({ id: 'cfull1', name: 'Twelve', itemCount: 12, totalMinutes: 60 }),
      summary({ id: 'cfull2', name: 'Tight', itemCount: 5, totalMinutes: 5 }),
    ]);
    const user = userEvent.setup();
    render(<AddToSession target={{ breakId: PUBLISHED }} title="Cold Carpet" onResult={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Add Cold Carpet/ }));

    expect(await screen.findByRole('menuitem', { name: /Twelve/ })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('menuitem', { name: /Tight/ })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('says what the server refused', async () => {
    const onResult = vi.fn();
    vi.mocked(apiClient.get).mockResolvedValue([]);
    vi.mocked(apiClient.post).mockRejectedValue(
      new APIClientError(
        'You have 100 practice sessions. Delete one to make another.',
        'SESSION_LIMIT',
        429
      )
    );
    const user = userEvent.setup();
    render(
      <AddToSession target={{ breakId: PUBLISHED }} title="Cold Carpet" onResult={onResult} />
    );

    await user.click(screen.getByRole('button', { name: /Add Cold Carpet/ }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'New session with this pattern' })
    );

    expect(onResult).toHaveBeenCalledWith(
      'You have 100 practice sessions. Delete one to make another.',
      true
    );
  });
});

describe('SessionFromShelf', () => {
  const shelf = Array.from({ length: 14 }, (_, i) =>
    i % 2
      ? {
          target: { libraryEntryId: `centry0000000000000000${String(i).padStart(2, '0')}` },
          level: 5,
        }
      : { target: { breakId: `cbrk00000000000000000${String(i).padStart(3, '0')}` }, level: 2 }
  );

  it('makes a session in shelf order, capped at twelve, and opens it', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(sessionView());
    const user = userEvent.setup();
    render(<SessionFromShelf shelf="Practising" items={shelf} />);
    expect(screen.getByText('The first 12')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Make a session from this shelf/ }));

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const body = vi.mocked(apiClient.post).mock.calls[0][1]?.body as {
      name: string;
      totalMinutes: number;
      items: unknown[];
    };
    expect(body.name).toBe('Practising');
    expect(body.items).toEqual(shelf.slice(0, 12).map((i) => ({ ...i.target, level: i.level })));
    expect(body.totalMinutes).toBe(60);
    expect(push).toHaveBeenCalledWith(`/practice/${SESSION_ID}`);
  });

  it('draws nothing for an empty shelf', () => {
    const { container } = render(<SessionFromShelf shelf="Later" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('stays put and says so when it fails', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new APIClientError('offline', 'NETWORK_ERROR'));
    const user = userEvent.setup();
    render(<SessionFromShelf shelf="Practising" items={shelf.slice(0, 2)} />);

    await user.click(screen.getByRole('button', { name: /Make a session from this shelf/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not make the session');
    expect(push).not.toHaveBeenCalled();
  });
});

describe('NewSessionButton', () => {
  it('makes an empty twenty-minute session and opens it', async () => {
    const { NewSessionButton } = await import('@/components/app/practice/new-session-button');
    vi.mocked(apiClient.post).mockResolvedValue(sessionView({ items: [] }));
    const user = userEvent.setup();
    render(<NewSessionButton />);

    await user.click(screen.getByRole('button', { name: 'New session' }));

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/practice-sessions', {
      body: { name: 'New session', totalMinutes: 20, items: [] },
    });
    expect(push).toHaveBeenCalledWith(`/practice/${SESSION_ID}`);
  });
});
