/**
 * `scripts/lineage/check-song-links.ts` — the oEmbed check on a recording's
 * song links. The network is an injected fetcher; the backoff uses fake timers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkRecordingLinks,
  oembedTitle,
  titleNamesSong,
} from '@/scripts/lineage/check-song-links';

function reply(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

describe('titleNamesSong', () => {
  it('matches the song title folded, as whole words', () => {
    expect(titleNamesSong('How Soon Is Now?', 'The Smiths - How Soon Is Now? (Official)')).toBe(
      true
    );
    expect(titleNamesSong('Beyoncé', 'beyonce live')).toBe(true);
    expect(titleNamesSong('Now', 'Knowledge is power')).toBe(false);
    expect(titleNamesSong('Now', 'Right Now')).toBe(true);
  });

  it('accepts the title without its bracketed part, and rejects another song', () => {
    expect(titleNamesSong('Voodoo Child (Slight Return)', 'Jimi Hendrix - Voodoo Child')).toBe(
      true
    );
    expect(titleNamesSong('Voodoo Child (Slight Return)', 'Purple Haze')).toBe(false);
  });

  it('does not match on an empty bare title', () => {
    expect(titleNamesSong('(Live)', 'anything at all')).toBe(false);
  });
});

describe('oembedTitle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('asks the provider’s endpoint for the url and returns the title', async () => {
    const fetcher = vi.fn().mockResolvedValue(reply(200, { title: 'A Song' }));
    await expect(oembedTitle('spotify', 'https://open.spotify.com/track/x', fetcher)).resolves.toBe(
      'A Song'
    );
    const called = new URL(fetcher.mock.calls[0][0] as string);
    expect(called.origin + called.pathname).toBe('https://open.spotify.com/oembed');
    expect(called.searchParams.get('url')).toBe('https://open.spotify.com/track/x');
  });

  it('is null on a 404 without retrying', async () => {
    const fetcher = vi.fn().mockResolvedValue(reply(404));
    await expect(oembedTitle('youtube', 'u', fetcher)).resolves.toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('is null on a body without a title', async () => {
    const fetcher = vi.fn().mockResolvedValue(reply(200, { nope: 1 }));
    await expect(oembedTitle('youtube', 'u', fetcher)).resolves.toBeNull();
  });

  it('retries a 429 and a 5xx with a growing wait, then answers', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(reply(429))
      .mockResolvedValueOnce(reply(503))
      .mockResolvedValueOnce(reply(200, { title: 'Third time' }));
    const result = oembedTitle('youtube', 'u', fetcher);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(3999);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('Third time');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('counts a network error, and a body that is not JSON, as unreachable', async () => {
    const thrown = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    const run = oembedTitle('youtube', 'u', thrown);
    await vi.runAllTimersAsync();
    await expect(run).resolves.toBeUndefined();
    expect(thrown).toHaveBeenCalledTimes(3);
    const html = vi.fn().mockResolvedValue(new Response('<html>', { status: 200 }));
    await expect(oembedTitle('youtube', 'u', html)).resolves.toBeUndefined();
  });

  it('gives up as unreachable, not as a failed link, after three busy answers', async () => {
    const fetcher = vi.fn().mockResolvedValue(reply(500));
    const result = oembedTitle('youtube', 'u', fetcher);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});

describe('checkRecordingLinks', () => {
  const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const SP = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC';

  function json() {
    return {
      id: 'rec:r',
      tracks: [{ title: 'How Soon Is Now?', youtube: YT, spotify: SP, extra: 'kept' }],
    };
  }
  /** YouTube answers with the right song, Spotify with another. */
  const fetcher = vi.fn((input: string) =>
    Promise.resolve(
      input.includes('youtube')
        ? reply(200, { title: 'The Smiths - How Soon Is Now?' })
        : reply(200, { title: 'Something Else' })
    )
  ) as unknown as typeof fetch;

  it('passes a matching title and reports a mismatch with what came back, changing nothing', async () => {
    const data = json();
    const r = await checkRecordingLinks('recordings/r.json', data, { fix: false, fetcher });
    expect(r.passed).toBe(1);
    expect(r.changed).toBe(false);
    expect(r.failures).toEqual([
      {
        file: 'recordings/r.json',
        song: 'How Soon Is Now?',
        provider: 'spotify',
        url: SP,
        got: 'Something Else',
        unreachable: false,
      },
    ]);
    expect(data).toEqual(json());
  });

  it('reports a link it could not ask about, and never removes it', async () => {
    vi.useFakeTimers();
    const busy = vi.fn().mockResolvedValue(reply(429)) as unknown as typeof fetch;
    const data = json();
    const run = checkRecordingLinks('f', data, { fix: true, fetcher: busy });
    await vi.runAllTimersAsync();
    const r = await run;
    vi.useRealTimers();
    expect(r.failures.map((f) => [f.provider, f.unreachable])).toEqual([
      ['youtube', true],
      ['spotify', true],
    ]);
    expect(r.changed).toBe(false);
    expect(data).toEqual(json());
  });

  it('fails a link that gets no answer', async () => {
    const none = vi.fn().mockResolvedValue(reply(404)) as unknown as typeof fetch;
    const r = await checkRecordingLinks('f', json(), { fix: false, fetcher: none });
    expect(r.passed).toBe(0);
    expect(r.failures.map((f) => [f.provider, f.got])).toEqual([
      ['youtube', null],
      ['spotify', null],
    ]);
  });

  it('with fix, removes only the failed link from the json in place', async () => {
    const data = json();
    const r = await checkRecordingLinks('f', data, { fix: true, fetcher });
    expect(r.changed).toBe(true);
    expect(data.tracks[0]).toEqual({ title: 'How Soon Is Now?', youtube: YT, extra: 'kept' });
  });

  it('with fix and nothing failing, changes nothing', async () => {
    const data = { tracks: [{ title: 'How Soon Is Now?', youtube: YT }] };
    const r = await checkRecordingLinks('f', data, { fix: true, fetcher });
    expect(r).toMatchObject({ passed: 1, changed: false, failures: [] });
    expect(data.tracks[0].youtube).toBe(YT);
  });

  it('skips a recording that does not read, and tracks without links', async () => {
    const spy = vi.fn() as unknown as typeof fetch;
    expect(await checkRecordingLinks('f', 'junk', { fix: true, fetcher: spy })).toEqual({
      failures: [],
      passed: 0,
      changed: false,
    });
    await checkRecordingLinks(
      'f',
      { tracks: [{ title: 'No links' }] },
      { fix: true, fetcher: spy }
    );
    expect(spy).not.toHaveBeenCalled();
  });
});
