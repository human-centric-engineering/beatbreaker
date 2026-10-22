// @vitest-environment jsdom
/**
 * `IndexFallback` — what the picker says when nothing in the crate matches:
 * the index's answer, asked a moment after typing stops, three characters up.
 */

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexFallback } from '@/components/app/studio/index-fallback';

const SMITHS = { slug: 'mike-joyce', label: 'Mike Joyce', candidate: true };

function answer(data: Record<string, unknown>) {
  return { success: true, data: { drummers: [], bands: [], songs: [], ...data } };
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

function ok(body: unknown) {
  fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });
}

describe('IndexFallback', () => {
  it('asks nothing under three characters', async () => {
    const { container } = render(<IndexFallback query=" ab " />);
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('waits for the typing to stop, then asks the index for the trimmed query', async () => {
    ok(answer({}));
    render(<IndexFallback query=" how soon " />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/catalogue/index?q=how+soon');
  });

  it('names an unscored song with its drummer, a band, and a drummer not built yet', async () => {
    ok(
      answer({
        songs: [
          {
            title: 'How Soon Is Now?',
            artist: 'The Smiths',
            year: 1985,
            drummers: [SMITHS],
            scored: null,
          },
          {
            title: 'Scored One',
            artist: 'Queen',
            year: 1978,
            drummers: [],
            scored: { styleKey: 's', songKey: 'k' },
          },
        ],
        bands: [{ name: 'The Smiths', drummers: [SMITHS] }],
        drummers: [SMITHS, { slug: 'built', label: 'Built One', candidate: false }],
      })
    );
    render(<IndexFallback query="smiths" />);
    await settle();
    expect(
      screen.getByText('The Smiths: How Soon Is Now? is not scored yet', { exact: false })
    ).toHaveTextContent('The Smiths: How Soon Is Now? is not scored yet — Mike Joyce');
    expect(screen.getByText('Queen: Scored One')).toBeInTheDocument();
    expect(screen.getByText('The Smiths: Mike Joyce')).toBeInTheDocument();
    expect(screen.getByText('Mike Joyce is on the long list, not built yet')).toBeInTheDocument();
    expect(screen.queryByText(/Built One/)).toBeNull();
  });

  it('shows nothing when the answer has nothing to add', async () => {
    ok(answer({ drummers: [{ slug: 'b', label: 'B', candidate: false }] }));
    const { container } = render(<IndexFallback query="abc" />);
    await settle();
    expect(fetchMock).toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('ignores a malformed response and a failed request', async () => {
    ok({ success: true, data: { songs: 'nope' } });
    const first = render(<IndexFallback query="abc" />);
    await settle();
    expect(first.container).toBeEmptyDOMElement();
    first.unmount();

    fetchMock.mockRejectedValue(new Error('offline'));
    const second = render(<IndexFallback query="abc" />);
    await settle();
    expect(second.container).toBeEmptyDOMElement();

    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve(answer({})) });
    const third = render(<IndexFallback query="abd" />);
    await settle();
    expect(third.container).toBeEmptyDOMElement();
  });

  it('does not show an answer for words no longer typed', async () => {
    ok(answer({ drummers: [SMITHS] }));
    const { rerender, container } = render(<IndexFallback query="mike" />);
    await settle();
    expect(screen.getByText(/long list/)).toBeInTheDocument();
    rerender(<IndexFallback query="mi" />);
    expect(container).toBeEmptyDOMElement();
  });
});
