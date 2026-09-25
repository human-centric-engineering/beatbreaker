// @vitest-environment happy-dom

/**
 * The pattern on the stage as a document — autosave, offline, first save,
 * letting go.
 *
 * Driven with fake timers and a mocked `apiClient`, keeping the real
 * `APIClientError` so the hook's reading of "network" versus "refused" versus
 * "gone" is tested against the error the client actually throws. Every
 * assertion is on what was sent, when, and what the status and address bar
 * say afterwards.
 *
 * @see components/app/studio/use-pattern-document.ts
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { patch: vi.fn(), post: vi.fn() } };
});

import type { InitialPattern } from '@/components/app/breaks/use-break-console';
import {
  AUTOSAVE_MS,
  RETRY_MS,
  usePatternDocument,
} from '@/components/app/studio/use-pattern-document';
import { APIClientError, apiClient } from '@/lib/api/client';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import type { SharePayload } from '@/lib/app/breaks/schema';
import { readScratch } from '@/lib/app/breaks/scratch';
import { breakPayload } from '@/lib/app/breaks/share';
import { testStyle } from '@/tests/helpers/catalogue';

const ID = 'cbrk00000000000000000001';

/** A real payload, as the console builds one; `bpm` is how the tests "edit" it. */
function payloadAt(bpm: number): SharePayload {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 3,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  return breakPayload({
    bpm,
    swing: 0,
    level: 5,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  });
}

function opened(mine = true): InitialPattern {
  return { id: ID, title: 'Cold Carpet', payload: payloadAt(90), mine };
}

type Props = { payload: SharePayload | null; title: string };

function mount(
  initial?: InitialPattern,
  first: Props = { payload: payloadAt(90), title: 'Cold Carpet' }
) {
  const say = vi.fn();
  const hook = renderHook((p: Props) => usePatternDocument({ ...p, initial, say }), {
    initialProps: first,
  });
  const edit = (bpm: number, title = 'Cold Carpet') =>
    hook.rerender({ payload: payloadAt(bpm), title });
  return { ...hook, say, edit };
}

/** Let timers and the promise chain behind them run. */
async function pass(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const network = () => new APIClientError('Failed to fetch', 'NETWORK_ERROR');
const patchBody = (n: number) => vi.mocked(apiClient.patch).mock.calls[n]?.[1]?.body;

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(apiClient.patch).mockReset().mockResolvedValue({});
  vi.mocked(apiClient.post).mockReset().mockResolvedValue({ id: 'cbrk00000000000000000002' });
  localStorage.clear();
  window.history.replaceState(null, '', '/studio');
});
afterEach(() => {
  vi.useRealTimers();
});

describe('a saved pattern of yours', () => {
  beforeEach(() => window.history.replaceState(null, '', `/studio/${ID}`));

  it('opens as saved — re-encoding what was loaded is not an edit', async () => {
    const { result } = mount(opened());
    await pass(AUTOSAVE_MS * 3);
    expect(result.current.status).toBe('saved');
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — an unedited pattern must not save
  });

  it('autosaves once, AUTOSAVE_MS after the last of several edits, with the last one', async () => {
    const { result, edit } = mount(opened());
    await pass(0);
    edit(91);
    expect(result.current.status).toBe('unsaved');
    await pass(AUTOSAVE_MS - 500);
    edit(92);
    await pass(AUTOSAVE_MS - 1);
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — still inside the wait
    await pass(1);
    expect(apiClient.patch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.patch).mock.calls[0][0]).toBe(`/api/v1/breaks/${ID}`);
    expect(patchBody(0)).toEqual({ doc: payloadAt(92), title: 'Cold Carpet' });
    expect(result.current.status).toBe('saved');
  });

  it('saves an edit made while a save is in flight, after it, never alongside it', async () => {
    let land!: () => void;
    vi.mocked(apiClient.patch).mockImplementationOnce(
      () => new Promise((resolve) => (land = () => resolve({})))
    );
    const { result, edit } = mount(opened());
    await pass(0);
    edit(91);
    await pass(AUTOSAVE_MS);
    expect(result.current.status).toBe('saving');
    edit(95);
    await pass(AUTOSAVE_MS * 2);
    // the second has not gone: the first is still out
    expect(apiClient.patch).toHaveBeenCalledTimes(1);
    // the first lands; React commits that, which is what arms the next save
    land();
    await pass(0);
    await pass(AUTOSAVE_MS);
    expect(apiClient.patch).toHaveBeenCalledTimes(2);
    expect(patchBody(1)).toEqual({ doc: payloadAt(95), title: 'Cold Carpet' });
    expect(result.current.status).toBe('saved');
  });

  it('waits out a dropped connection and retries when the browser is back online', async () => {
    vi.mocked(apiClient.patch).mockRejectedValueOnce(network());
    const { result, edit } = mount(opened());
    await pass(0);
    edit(91);
    await pass(AUTOSAVE_MS);
    expect(result.current.status).toBe('offline');

    // edits made offline are not dropped, and not sent until there is a way to send them
    edit(93);
    await pass(AUTOSAVE_MS);
    expect(apiClient.patch).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(apiClient.patch).toHaveBeenCalledTimes(2);
    expect(patchBody(1)).toEqual({ doc: payloadAt(93), title: 'Cold Carpet' });
    expect(result.current.status).toBe('saved');
  });

  it('retries on a timer when the browser never says it is back', async () => {
    vi.mocked(apiClient.patch).mockRejectedValueOnce(network());
    const { result, edit } = mount(opened());
    await pass(0);
    edit(91);
    await pass(AUTOSAVE_MS);
    expect(result.current.status).toBe('offline');
    await pass(RETRY_MS);
    expect(apiClient.patch).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('saved');
  });

  it('becomes scratch, not nothing, when the pattern was deleted elsewhere', async () => {
    vi.mocked(apiClient.patch).mockRejectedValueOnce(
      new APIClientError('Break not found', 'NOT_FOUND', 404)
    );
    const { result, edit, say } = mount(opened());
    await pass(0);
    edit(91);
    await pass(AUTOSAVE_MS);
    expect(result.current.id).toBeNull();
    expect(result.current.status).toBe('scratch');
    expect(window.location.pathname).toBe('/studio');
    expect(say).toHaveBeenCalledWith('That pattern was deleted elsewhere — it is unsaved here now');
    // and what is on the stage is kept, as scratch is
    expect(readScratch(localStorage)).toEqual(payloadAt(91));
  });

  it('does not resend a refused pattern on a timer — only an edit tries again', async () => {
    vi.mocked(apiClient.patch).mockRejectedValue(
      new APIClientError('Invalid request body', 'VALIDATION_ERROR', 400)
    );
    const { result, edit } = mount(opened());
    await pass(0);
    edit(91);
    await pass(AUTOSAVE_MS);
    expect(result.current.status).toBe('error');
    // the refusal itself must not re-arm the autosave
    await pass(AUTOSAVE_MS * 10);
    expect(apiClient.patch).toHaveBeenCalledTimes(1);
    edit(92);
    await pass(AUTOSAVE_MS);
    expect(apiClient.patch).toHaveBeenCalledTimes(2);
  });

  it('says a refused save is refused, and tries again on the next edit', async () => {
    vi.mocked(apiClient.patch).mockRejectedValueOnce(
      new APIClientError('Invalid request body', 'VALIDATION_ERROR', 400)
    );
    const { result, edit } = mount(opened());
    await pass(0);
    edit(91);
    await pass(AUTOSAVE_MS);
    expect(result.current.status).toBe('error');
    edit(92);
    await pass(AUTOSAVE_MS);
    expect(apiClient.patch).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('saved');
  });

  it('saves now on Save, without the wait', async () => {
    const { result, edit } = mount(opened());
    await pass(0);
    edit(91);
    await act(async () => {
      await result.current.save();
    });
    expect(apiClient.patch).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saved');
  });

  it('warns before the page is left with an edit the server does not have yet', async () => {
    const { edit } = mount(opened());
    await pass(0);
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    edit(91);
    await pass(0);
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});

describe('letting go (detach)', () => {
  beforeEach(() => window.history.replaceState(null, '', `/studio/${ID}`));

  it('saves the last edit of the pattern being left at once, then starts scratch at /studio', async () => {
    const { result, edit, rerender } = mount(opened());
    await pass(0);
    edit(91);
    act(() => result.current.detach());
    // the stage now holds something else
    rerender({ payload: payloadAt(120), title: 'A fresh roll' });
    await pass(0);

    expect(apiClient.patch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.patch).mock.calls[0][0]).toBe(`/api/v1/breaks/${ID}`);
    expect(patchBody(0)).toEqual({ doc: payloadAt(91), title: 'Cold Carpet' });
    expect(result.current).toMatchObject({ id: null, status: 'scratch' });
    expect(window.location.pathname).toBe('/studio');

    // the new pattern is never PATCHed into the old one's row
    await pass(AUTOSAVE_MS * 3);
    expect(apiClient.patch).toHaveBeenCalledTimes(1);
  });

  it('does not let a failed last save of the old pattern paint the new one', async () => {
    vi.mocked(apiClient.patch).mockRejectedValueOnce(network());
    const { result, edit, rerender } = mount(opened());
    await pass(0);
    edit(91);
    act(() => result.current.detach());
    rerender({ payload: payloadAt(120), title: 'A fresh roll' });
    await pass(0);
    expect(result.current.status).toBe('scratch');
    expect(result.current.needsPrompt).toBe(false);
  });

  it('sends nothing on Don’t save — discard means the edits go nowhere', async () => {
    const { result, edit } = mount(opened());
    await pass(0);
    edit(91);
    act(() => result.current.detach({ discard: true }));
    await pass(AUTOSAVE_MS * 3);
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — discarded edits must not be sent
    expect(result.current).toMatchObject({ id: null, status: 'scratch' });
  });

  it('does not bind the next pattern to a first save that answers after the stage moved on', async () => {
    window.history.replaceState(null, '', '/studio');
    let answer!: (v: unknown) => void;
    vi.mocked(apiClient.post).mockImplementationOnce(
      () => new Promise((resolve) => (answer = resolve))
    );
    const { result, rerender } = mount(undefined);
    await pass(0);
    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.save();
    });
    // N, before the POST answers: a new roll goes on the stage
    act(() => result.current.detach());
    rerender({ payload: payloadAt(140), title: 'A new roll' });

    answer({ id: 'cbrk00000000000000000002' });
    await act(async () => {
      expect(await saving).toBe(true);
    });

    // the pattern that was saved is saved; the one on the stage is still scratch
    expect(result.current).toMatchObject({ id: null, status: 'scratch' });
    expect(window.location.pathname).toBe('/studio');
    expect(readScratch(localStorage)).toEqual(payloadAt(140));
    await pass(AUTOSAVE_MS * 3);
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the new roll must never reach the saved row
  });

  it('saves nothing when the pattern being left had no edits', async () => {
    const { result } = mount(opened());
    await pass(0);
    act(() => result.current.detach());
    await pass(AUTOSAVE_MS);
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to save
  });
});

describe('when letting go should ask first (needsPrompt)', () => {
  it('does not ask about a saved pattern of yours with a connection — nothing would be lost', async () => {
    const { result, edit } = mount(opened());
    await pass(0);
    edit(91);
    expect(result.current.needsPrompt).toBe(false);
  });

  it('asks when edits to your own could not reach the server', async () => {
    vi.mocked(apiClient.patch).mockRejectedValue(network());
    const { result, edit } = mount(opened());
    await pass(0);
    edit(91);
    await pass(AUTOSAVE_MS);
    expect(result.current.needsPrompt).toBe(true);
  });

  it('asks about an edited copy of someone else’s pattern, and never autosaves it', async () => {
    const { result, edit } = mount(opened(false));
    await pass(0);
    expect(result.current.needsPrompt).toBe(false);
    edit(91);
    await pass(AUTOSAVE_MS * 3);
    expect(result.current.needsPrompt).toBe(true);
    expect(result.current.status).toBe('scratch');
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — not theirs to PATCH
  });

  it('never asks about a scratch pattern — rolling one after another is the workflow', async () => {
    const { result, edit } = mount(undefined);
    edit(91);
    edit(99);
    expect(result.current.needsPrompt).toBe(false);
  });
});

describe('a scratch pattern', () => {
  it('is kept in localStorage as it changes, and never PATCHed', async () => {
    const { edit } = mount(undefined);
    await pass(0);
    expect(readScratch(localStorage)).toEqual(payloadAt(90));
    edit(97);
    await pass(0);
    expect(readScratch(localStorage)).toEqual(payloadAt(97));
    await pass(AUTOSAVE_MS * 3);
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — scratch has no row
  });

  it('is created on Save — given an id and an address, and forgotten locally', async () => {
    const { result, say } = mount(undefined, { payload: payloadAt(90), title: 'First one' });
    await pass(0);
    await act(async () => {
      expect(await result.current.save()).toBe(true);
    });
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/breaks', {
      // a scratch pattern has no details: no description, and no links to carry
      body: { title: 'First one', doc: payloadAt(90), links: [] },
    });
    expect(result.current).toMatchObject({
      id: 'cbrk00000000000000000002',
      mine: true,
      status: 'saved',
    });
    expect(window.location.pathname).toBe('/studio/cbrk00000000000000000002');
    expect(readScratch(localStorage)).toBeNull();
    expect(say).toHaveBeenCalledWith('Saved to your account — under Patterns › All');
  });

  it('creates one pattern however many times Save is pressed before the first answers', async () => {
    let answer!: (v: unknown) => void;
    vi.mocked(apiClient.post).mockImplementationOnce(
      () => new Promise((resolve) => (answer = resolve))
    );
    const { result } = mount(undefined);
    await pass(0);
    let first!: Promise<boolean>;
    act(() => {
      first = result.current.save();
    });
    // on its way: it says so, which is what takes the Save button away
    expect(result.current.status).toBe('saving');
    let again!: boolean;
    await act(async () => {
      again = await result.current.save();
    });
    expect(again).toBe(false);
    expect(apiClient.post).toHaveBeenCalledTimes(1);

    answer({ id: 'cbrk00000000000000000002' });
    await act(async () => {
      expect(await first).toBe(true);
    });
    expect(result.current.id).toBe('cbrk00000000000000000002');
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it('gets a name the API will take when it has none', async () => {
    const { result } = mount(undefined, { payload: payloadAt(90), title: '   ' });
    await pass(0);
    await act(async () => {
      await result.current.save();
    });
    expect(vi.mocked(apiClient.post).mock.calls[0][1]?.body).toMatchObject({
      title: 'Untitled pattern',
    });
  });

  it('stays scratch, and says so, when the first save cannot reach the server', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(network());
    const { result, say } = mount(undefined);
    await pass(0);
    await act(async () => {
      expect(await result.current.save()).toBe(false);
    });
    expect(result.current.id).toBeNull();
    expect(readScratch(localStorage)).toEqual(payloadAt(90));
    expect(say).toHaveBeenCalledWith('Could not reach the server — not saved yet');
  });

  it('refuses a create answer without an id rather than trusting it', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ nope: true });
    const { result } = mount(undefined);
    await pass(0);
    await act(async () => {
      expect(await result.current.save()).toBe(false);
    });
    expect(result.current.id).toBeNull();
  });
});

describe('someone else’s shared pattern', () => {
  it('is saved as a copy of your own, which then autosaves', async () => {
    const { result, edit } = mount(opened(false));
    await pass(0);
    edit(91);
    await act(async () => {
      await result.current.save();
    });
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — never PATCH theirs
    expect(result.current).toMatchObject({ id: 'cbrk00000000000000000002', mine: true });

    edit(95);
    await pass(AUTOSAVE_MS);
    expect(vi.mocked(apiClient.patch).mock.calls[0][0]).toBe(
      '/api/v1/breaks/cbrk00000000000000000002'
    );
  });
});

describe('details — description and links (task 4.11)', () => {
  const VIDEO = {
    kind: 'video' as const,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=321s',
  };

  it('opens with the row’s details, and PATCHes new ones without the document', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ description: 'At 5:21', links: [VIDEO] });
    const { result } = mount({ ...opened(), details: { description: 'Old', links: [] } });
    await pass(0);
    expect(result.current.details).toEqual({ description: 'Old', links: [] });

    let ok = false;
    await act(async () => {
      ok = await result.current.saveDetails({ description: 'At 5:21', links: [VIDEO] });
    });

    expect(ok).toBe(true);
    expect(patchBody(0)).toEqual({ description: 'At 5:21', links: [VIDEO] });
    expect(result.current.details).toEqual({ description: 'At 5:21', links: [VIDEO] });
  });

  it('keeps the details it had, and says so, when the server refuses new ones', async () => {
    vi.mocked(apiClient.patch).mockRejectedValueOnce(
      new APIClientError('Bad', 'VALIDATION_ERROR', 400)
    );
    const { result, say } = mount({ ...opened(), details: { description: 'Old', links: [] } });
    await pass(0);

    let ok = true;
    await act(async () => {
      ok = await result.current.saveDetails({ description: 'New', links: [VIDEO] });
    });

    expect(ok).toBe(false);
    expect(say).toHaveBeenCalledWith('Those details did not save');
    expect(result.current.details).toEqual({ description: 'Old', links: [] });
  });

  it('sends nothing for a scratch pattern — there is no row to describe', async () => {
    const { result } = mount();
    let ok = true;
    await act(async () => {
      ok = await result.current.saveDetails({ description: 'x', links: [] });
    });
    expect(ok).toBe(false);
    expect(apiClient.patch).not.toHaveBeenCalled(); // test-review:accept no_arg_called — scratch has no row
  });

  it('lets them go with the pattern, and takes the next one’s on attach', async () => {
    const { result } = mount({ ...opened(), details: { description: 'Old', links: [VIDEO] } });
    await pass(0);

    act(() => result.current.detach());
    expect(result.current.details).toEqual({ description: '', links: [] });

    act(() =>
      result.current.attach('cbrk00000000000000000003', true, { description: 'Next', links: [] })
    );
    expect(result.current.details).toEqual({ description: 'Next', links: [] });
  });
});
