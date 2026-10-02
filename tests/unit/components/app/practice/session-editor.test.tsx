// @vitest-environment happy-dom

/**
 * The practice-session editor (Phase 7D, task 7D.5).
 *
 * The real editor and the real `splitMinutes` / `nudgeMinutes` over a mocked
 * `apiClient`: what is pinned is that the minutes shown always add up to the
 * total as you nudge, that the keyboard can reorder and keeps its place, and
 * that Save sends the list the server takes — kept items by id, in order.
 *
 * @see components/app/practice/session-editor.tsx
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { patch: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

import { SessionEditor } from '@/components/app/practice/session-editor';
import { APIClientError, apiClient } from '@/lib/api/client';
import { item, SESSION_ID, sessionView } from '@/tests/unit/components/app/practice/fixtures';

beforeEach(() => {
  vi.mocked(apiClient.patch).mockReset();
  vi.mocked(apiClient.put).mockReset();
  vi.mocked(apiClient.delete).mockReset();
  push.mockClear();
  refresh.mockClear();
});

/*
 * Fields are found with `selector: 'input'`: each label holds its ⓘ
 * FieldHelp button too, which a bare label query would also match.
 */

/** Each item's minutes, in the order shown. */
function minutesShown(): number[] {
  return screen
    .getAllByLabelText('Minutes', { selector: 'input' })
    .map((input) => Number((input as HTMLInputElement).value));
}

function titlesShown(): string[] {
  return within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((li) => li.querySelector('p')?.textContent ?? '');
}

/** Type into a number field and leave it, which is when it takes effect. */
function commit(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

describe('SessionEditor — the split', () => {
  it('shows each item’s share and the total they make', () => {
    render(<SessionEditor initial={sessionView()} />);
    expect(minutesShown()).toEqual([5, 5, 5]);
    expect(screen.getByText('15 of 15 minutes')).toBeInTheDocument();
  });

  it('re-splits the rest when one item is nudged, and the total holds', () => {
    render(<SessionEditor initial={sessionView()} />);

    commit(screen.getAllByLabelText('Minutes', { selector: 'input' })[0], '9');

    expect(minutesShown()).toEqual([9, 3, 3]);
    expect(screen.getByText('15 of 15 minutes')).toBeInTheDocument();
    // the nudged one is pinned now, and says so
    expect(screen.getByRole('button', { name: "Unpin Pattern 1's minutes" })).toBeEnabled();
  });

  it('holds a nudge to what leaves the others a minute each', () => {
    render(<SessionEditor initial={sessionView()} />);
    commit(screen.getAllByLabelText('Minutes', { selector: 'input' })[1], '40');
    expect(minutesShown()).toEqual([1, 13, 1]);
    expect(screen.getByText('15 of 15 minutes')).toBeInTheDocument();
  });

  it('keeps a pinned item when the total changes; the free ones take the difference', () => {
    render(<SessionEditor initial={sessionView()} />);
    commit(screen.getAllByLabelText('Minutes', { selector: 'input' })[0], '9');
    commit(screen.getByLabelText('Total minutes', { selector: 'input' }), '21');
    expect(minutesShown()).toEqual([9, 6, 6]);
    expect(screen.getByText('21 of 21 minutes')).toBeInTheDocument();
  });

  it('lets a pinned item go back to an equal share', async () => {
    const user = userEvent.setup();
    render(<SessionEditor initial={sessionView()} />);
    commit(screen.getAllByLabelText('Minutes', { selector: 'input' })[0], '9');

    await user.click(screen.getByRole('button', { name: "Unpin Pattern 1's minutes" }));

    expect(minutesShown()).toEqual([5, 5, 5]);
  });

  it('will not cut the total below a minute per pattern', () => {
    render(<SessionEditor initial={sessionView({ totalMinutes: 15 })} />);
    commit(screen.getByLabelText('Total minutes', { selector: 'input' }), '1');
    // five is the session's floor, and three patterns fit in it
    expect(screen.getByText('5 of 5 minutes')).toBeInTheDocument();
    expect(minutesShown()).toEqual([2, 2, 1]);
  });

  it('re-splits when an item is removed', async () => {
    const user = userEvent.setup();
    render(<SessionEditor initial={sessionView()} />);
    await user.click(screen.getByRole('button', { name: 'Remove Pattern 2' }));
    expect(titlesShown()).toEqual(['1. Pattern 1', '2. Pattern 3']);
    expect(minutesShown()).toEqual([8, 7]);
  });
});

describe('SessionEditor — reordering by keyboard', () => {
  it('moves an item down with Enter, and the focus follows it', async () => {
    const user = userEvent.setup();
    render(<SessionEditor initial={sessionView()} />);

    screen.getByRole('button', { name: 'Move Pattern 1 down' }).focus();
    await user.keyboard('{Enter}');

    expect(titlesShown()).toEqual(['1. Pattern 2', '2. Pattern 1', '3. Pattern 3']);
    expect(screen.getByRole('button', { name: 'Move Pattern 1 down' })).toHaveFocus();
  });

  it('hands the focus to the other arrow when an item reaches the top', async () => {
    const user = userEvent.setup();
    render(<SessionEditor initial={sessionView()} />);

    screen.getByRole('button', { name: 'Move Pattern 2 up' }).focus();
    await user.keyboard('{Enter}');

    expect(titlesShown()[0]).toBe('1. Pattern 2');
    expect(screen.getByRole('button', { name: 'Move Pattern 2 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Pattern 2 down' })).toHaveFocus();
  });
});

describe('SessionEditor — saving', () => {
  it('has nothing to save until something changes', () => {
    render(<SessionEditor initial={sessionView()} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('sends the whole list in the new order, kept items by id, and shows what the server kept', async () => {
    const initial = sessionView();
    const answer = sessionView({
      items: [item(2, { position: 0 }), item(1, { position: 1, title: 'Renamed' }), item(3)],
    });
    vi.mocked(apiClient.put).mockResolvedValue(answer);
    const user = userEvent.setup();
    render(<SessionEditor initial={initial} />);

    await user.click(screen.getByRole('button', { name: 'Move Pattern 1 down' }));
    commit(screen.getAllByLabelText('Minutes', { selector: 'input' })[1], '7');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(apiClient.patch).not.toHaveBeenCalled();
    expect(apiClient.put).toHaveBeenCalledTimes(1);
    const [path, options] = vi.mocked(apiClient.put).mock.calls[0];
    expect(path).toBe(`/api/v1/practice-sessions/${SESSION_ID}/items`);
    const body = options?.body as { items: Array<Record<string, unknown>> };
    expect(body.items.map((i) => [i.id, i.minutes, i.minutesPinned])).toEqual([
      [item(2).id, 4, false],
      [item(1).id, 7, true],
      [item(3).id, 4, false],
    ]);
    // a kept item names no pattern: its pattern cannot change
    expect(body.items.every((i) => !('breakId' in i) && !('target' in i))).toBe(true);

    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(titlesShown()[1]).toBe('2. Renamed');
  });

  it('sends the session’s own fields with PATCH, and only those when only they changed', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue(sessionView({ name: 'Ghost notes' }));
    const user = userEvent.setup();
    render(<SessionEditor initial={sessionView()} />);

    await user.clear(screen.getByLabelText('Name', { selector: 'input' }));
    await user.type(screen.getByLabelText('Name', { selector: 'input' }), 'Ghost notes');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(apiClient.put).not.toHaveBeenCalled();
    expect(apiClient.patch).toHaveBeenCalledWith(`/api/v1/practice-sessions/${SESSION_ID}`, {
      body: expect.objectContaining({ name: 'Ghost notes', totalMinutes: 15, description: null }),
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Ghost notes' })).toBeTruthy();
  });

  it('sends a shorter list before a total cut below the patterns still saved', async () => {
    // eight patterns in eight minutes; two go, and the total drops to six
    const eight = Array.from({ length: 8 }, (_, k) => item(k + 1, { minutes: 1 }));
    const order: string[] = [];
    vi.mocked(apiClient.put).mockImplementation(async () => {
      order.push('items');
      return sessionView({ totalMinutes: 8, items: eight.slice(0, 6) });
    });
    vi.mocked(apiClient.patch).mockImplementation(async () => {
      order.push('fields');
      return sessionView({ totalMinutes: 6, items: eight.slice(0, 6) });
    });
    const user = userEvent.setup();
    render(<SessionEditor initial={sessionView({ totalMinutes: 8, items: eight })} />);

    await user.click(screen.getByRole('button', { name: 'Remove Pattern 8' }));
    await user.click(screen.getByRole('button', { name: 'Remove Pattern 7' }));
    commit(screen.getByLabelText('Total minutes', { selector: 'input' }), '6');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(order).toEqual(['items', 'fields']);
  });

  it('sends a bigger total before the list, so pins sized for it are kept', async () => {
    const order: string[] = [];
    vi.mocked(apiClient.patch).mockImplementation(async () => {
      order.push('fields');
      return sessionView({ totalMinutes: 30 });
    });
    vi.mocked(apiClient.put).mockImplementation(async () => {
      order.push('items');
      return sessionView({ totalMinutes: 30 });
    });
    const user = userEvent.setup();
    render(<SessionEditor initial={sessionView()} />);

    commit(screen.getByLabelText('Total minutes', { selector: 'input' }), '30');
    commit(screen.getAllByLabelText('Minutes', { selector: 'input' })[0], '20');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(order).toEqual(['fields', 'items']);
    const { items } = vi.mocked(apiClient.put).mock.calls[0][1]?.body as {
      items: Array<{ minutes: number; minutesPinned: boolean }>;
    };
    expect(items[0]).toEqual(expect.objectContaining({ minutes: 20, minutesPinned: true }));
  });

  it('sends a cleared goal as null — your best, else the pattern’s tempo', async () => {
    vi.mocked(apiClient.put).mockResolvedValue(sessionView());
    const user = userEvent.setup();
    render(<SessionEditor initial={sessionView({ items: [item(1, { goalBpm: 120 })] })} />);

    commit(screen.getByLabelText('Goal BPM', { selector: 'input' }), '');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const body = vi.mocked(apiClient.put).mock.calls[0][1]?.body as {
      items: Array<{ goalBpm: number | null }>;
    };
    expect(body.items[0].goalBpm).toBeNull();
  });

  it('shows what the server said when it refuses', async () => {
    vi.mocked(apiClient.put).mockRejectedValue(
      new APIClientError('A goal of 250 is past this meter’s 190', 'VALIDATION_ERROR', 400)
    );
    const user = userEvent.setup();
    render(<SessionEditor initial={sessionView()} />);

    await user.click(screen.getByRole('button', { name: 'Remove Pattern 3' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('past this meter’s 190');
  });

  it('says a gap is skipped rather than showing a tempo', () => {
    render(
      <SessionEditor
        initial={sessionView({
          items: [item(1, { target: null, targetBpm: null, startBpm: null, title: 'Gone' })],
        })}
      />
    );
    expect(screen.getByText(/No longer available — skipped/)).toBeInTheDocument();
  });
});

describe('SessionEditor — deleting', () => {
  it('deletes after asking, then goes back to the list', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SessionEditor initial={sessionView()} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(apiClient.delete).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' })
    );

    expect(apiClient.delete).toHaveBeenCalledWith(`/api/v1/practice-sessions/${SESSION_ID}`);
    expect(push).toHaveBeenCalledWith('/practice');
  });
});

describe('SessionEditor — running it (7D-iii)', () => {
  it('links to the Studio to run the session as saved', () => {
    render(<SessionEditor initial={sessionView()} />);
    expect(screen.getByRole('link', { name: 'Run it' }).getAttribute('href')).toBe(
      `/studio?session=${SESSION_ID}`
    );
  });

  it('offers no run when nothing in it can be played', () => {
    render(
      <SessionEditor
        initial={sessionView({
          items: [item(1, { target: null, targetBpm: null, startBpm: null })],
        })}
      />
    );
    expect(screen.queryByRole('link', { name: 'Run it' })).toBeNull();
  });
});
