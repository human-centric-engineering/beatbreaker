// @vitest-environment happy-dom

/**
 * A practice session running in the Studio (Phase 7D, tasks 7D.9–7D.10).
 *
 * The real hook and the real runner over a fake console: the transport's
 * clock is the listener the hook hands the console, fired here with
 * audio-clock times as the engine would. What is pinned is what the hook
 * does with the runner's answers — opens each pattern at its layer and start
 * tempo, plays the tempo the climb asks for, holds and releases the trainer,
 * offers to record each slot, and posts the run once.
 *
 * @see components/app/practice/use-session-run.ts
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { post: vi.fn() } };
});

import type { BreakConsole, ClockListener } from '@/components/app/breaks/use-break-console';
import { useSessionRun } from '@/components/app/practice/use-session-run';
import { apiClient } from '@/lib/api/client';
import { item, SESSION_ID, sessionView } from '@/tests/unit/components/app/practice/fixtures';

const ENTRY = 'centry000000000000000001';

/** Two one-minute slots: one of your patterns, then a famous break. */
const session = sessionView({
  totalMinutes: 2,
  items: [
    item(1, { minutes: 1, targetBpm: 100, startBpm: 80 }),
    item(2, {
      minutes: 1,
      level: 3,
      targetBpm: 120,
      startBpm: 96,
      target: { kind: 'entry', id: ENTRY, title: 'Funky Drummer', meter: '4/4', bpm: 94 },
      title: 'Funky Drummer',
    }),
  ],
});

function fakeConsole() {
  let listener: ClockListener | null = null;
  const c = {
    playing: false,
    play: vi.fn(() => {
      c.playing = true;
      return true;
    }),
    stopPlaying: vi.fn(() => {
      c.playing = false;
    }),
    primeAudio: vi.fn(),
    playAt: vi.fn(),
    audioNow: vi.fn(() => 0),
    setClockListener: vi.fn((l: ClockListener | null) => {
      listener = l;
    }),
    setSessionHold: vi.fn(),
    setLevel: vi.fn(),
  };
  return {
    c,
    asConsole: c as unknown as BreakConsole,
    clock: () => listener,
  };
}

function mount(
  over: { stageUnrecordable?: boolean; stageWillPrompt?: boolean; session?: typeof session } = {}
) {
  const fake = fakeConsole();
  const openTarget = vi.fn(async () => 'opened' as const);
  const say = vi.fn();
  const props = {
    session: over.session ?? session,
    console: fake.asConsole,
    openTarget,
    stageUnrecordable: over.stageUnrecordable ?? false,
    stageWillPrompt: over.stageWillPrompt ?? false,
    say,
  };
  const hook = renderHook((p: typeof props) => useSessionRun(p), { initialProps: props });
  return { ...fake, openTarget, say, hook, props };
}

/**
 * The listener the hook gave the console, once the slot is in its count-in —
 * the earliest a real transport could report a downbeat.
 */
async function clockOf(
  clock: () => ClockListener | null,
  hook?: { result: { current: ReturnType<typeof useSessionRun> } }
): Promise<ClockListener> {
  await waitFor(() => expect(clock()).not.toBeNull());
  if (hook) await waitFor(() => expect(hook.result.current?.run?.phase).toBe('counting'));
  return clock()!;
}

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset().mockResolvedValue({});
});

describe('useSessionRun', () => {
  it('is nothing without a session', () => {
    const { result } = renderHook(() =>
      useSessionRun({
        session: undefined,
        console: fakeConsole().asConsole,
        openTarget: vi.fn(),
        stageUnrecordable: false,
        stageWillPrompt: false,
        say: vi.fn(),
      })
    );
    expect(result.current).toBeNull();
  });

  it('holds the trainer, opens each slot at its layer and start tempo, and plays the climb', async () => {
    const { c, clock, openTarget, hook } = mount();
    expect(hook.result.current?.run).toBeNull();

    act(() => hook.result.current?.start());
    expect(c.setSessionHold).toHaveBeenLastCalledWith(true);

    await waitFor(() => expect(c.play).toHaveBeenCalledTimes(1));
    expect(openTarget).toHaveBeenCalledWith({ breakId: item(1).target!.id }, { level: 5, bpm: 80 });
    expect(c.setLevel).toHaveBeenLastCalledWith(5);
    expect(c.playAt).toHaveBeenLastCalledWith(80);
    expect(hook.result.current?.run?.phase).toBe('counting');

    const listener = await clockOf(clock, hook);
    act(() => listener.onDownbeat?.(10));
    expect(hook.result.current?.run?.phase).toBe('playing');

    // 20s in: a third of the way up a 40.2s climb from 80 to 100
    act(() => listener.onLoop?.(30));
    expect(hook.result.current?.run?.bpm).toBe(90);
    expect(c.playAt).toHaveBeenLastCalledWith(90);

    // past the minute: the next slot opens at its own layer and start
    act(() => listener.onLoop?.(60));
    act(() => listener.onLoop?.(71));
    await waitFor(() => expect(c.play).toHaveBeenCalledTimes(2));
    expect(openTarget).toHaveBeenLastCalledWith({ libraryEntryId: ENTRY }, { level: 3, bpm: 96 });
    expect(c.setLevel).toHaveBeenLastCalledWith(3);
  });

  it('takes a downbeat the transport reports from inside start(), with no count-in', async () => {
    const { c, clock, hook } = mount();
    c.play.mockImplementation(() => {
      c.playing = true;
      clock()?.onDownbeat?.(5); // what Transport.start() does when countIn is 0
      return true;
    });
    act(() => hook.result.current?.start());
    await waitFor(() => expect(hook.result.current?.run?.phase).toBe('playing'));
  });

  it('offers to record the tempo reached at the item’s layer, and records it there', async () => {
    const { clock, hook } = mount();
    act(() => hook.result.current?.start());
    const listener = await clockOf(clock, hook);
    act(() => listener.onDownbeat?.(0));
    act(() => listener.onLoop?.(50));
    act(() => listener.onLoop?.(61));

    await waitFor(() => expect(hook.result.current?.prompt).not.toBeNull());
    expect(hook.result.current?.prompt?.result).toMatchObject({ reachedBpm: 100, level: 5 });

    await act(async () => {
      await hook.result.current?.record();
    });
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/speed-records', {
      body: { breakId: item(1).target!.id, level: 5, bpm: 100 },
    });
    expect(hook.result.current?.prompt).toBeNull();
  });

  it('does not offer it when the stage held an edited famous break or an unsaved variation', async () => {
    const { clock, hook, props } = mount();
    act(() => hook.result.current?.start());
    const listener = await clockOf(clock, hook);
    act(() => listener.onDownbeat?.(0));
    hook.rerender({ ...props, stageUnrecordable: true });
    act(() => listener.onLoop?.(61));
    await waitFor(() => expect(hook.result.current?.run?.played).toHaveLength(1));
    expect(hook.result.current?.prompt).toBeNull();
  });

  it('posts the run once when it ends, with the slots played, and lets go of the trainer', async () => {
    const { c, clock, hook, props } = mount();
    act(() => hook.result.current?.start());
    const listener = await clockOf(clock, hook);
    act(() => listener.onDownbeat?.(0));
    act(() => listener.onLoop?.(61));
    await waitFor(() => expect(c.play).toHaveBeenCalledTimes(2));

    act(() => hook.result.current?.stop());
    await waitFor(() => expect(c.setSessionHold).toHaveBeenLastCalledWith(false));

    const runPosts = vi
      .mocked(apiClient.post)
      .mock.calls.filter(([url]) => url === `/api/v1/practice-sessions/${SESSION_ID}/runs`);
    expect(runPosts).toHaveLength(1);
    const body = runPosts[0][1]?.body as { startedAt: string; items: unknown[] };
    expect(body.items).toEqual([
      { title: 'Pattern 1', level: 5, targetBpm: 100, reachedBpm: 80, seconds: 61 },
    ]);
    expect(Date.parse(body.startedAt)).not.toBeNaN();

    hook.rerender({ ...props });
    expect(
      vi.mocked(apiClient.post).mock.calls.filter(([url]) => String(url).endsWith('/runs'))
    ).toHaveLength(1);
  });

  it('does not log a run stopped before its first slot finished', async () => {
    const { c, clock, hook } = mount();
    act(() => hook.result.current?.start());
    const listener = await clockOf(clock, hook);
    act(() => listener.onDownbeat?.(0));
    act(() => listener.onLoop?.(20));
    act(() => hook.result.current?.stop());
    await waitFor(() => expect(c.setSessionHold).toHaveBeenLastCalledWith(false));
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('pauses when the transport is stopped under it, and resumes the same pattern without reopening it', async () => {
    const { c, clock, openTarget, hook, props } = mount();
    act(() => hook.result.current?.start());
    const listener = await clockOf(clock, hook);
    act(() => listener.onDownbeat?.(0));

    c.playing = false;
    hook.rerender({ ...props });
    await waitFor(() => expect(hook.result.current?.run?.phase).toBe('paused'));

    act(() => hook.result.current?.resume());
    await waitFor(() => expect(c.play).toHaveBeenCalledTimes(2));
    expect(openTarget).toHaveBeenCalledTimes(1);
  });

  it('skips a slot whose pattern would not open, and says so', async () => {
    const { openTarget, say, hook } = mount();
    openTarget.mockResolvedValueOnce('gone' as never);
    act(() => hook.result.current?.start());
    await waitFor(() =>
      expect(openTarget).toHaveBeenLastCalledWith({ libraryEntryId: ENTRY }, expect.anything())
    );
    expect(say).toHaveBeenCalledWith('“Pattern 1” would not open — skipped', { error: true });
  });

  describe('review fixes', () => {
    /** A promise the test settles. */
    function deferred<T>() {
      let resolve!: (v: T) => void;
      const promise = new Promise<T>((r) => (resolve = r));
      return { promise, resolve };
    }

    it('wakes the audio inside the Start click, before anything loads', () => {
      const { c, hook } = mount();
      act(() => hook.result.current?.start());
      expect(c.primeAudio).toHaveBeenCalledTimes(1);
    });

    it('waits, paused, when the swap is held behind "Save your changes?"', async () => {
      const { c, say, hook } = mount({ stageWillPrompt: true });
      act(() => hook.result.current?.start());
      await waitFor(() => expect(hook.result.current?.run?.phase).toBe('paused'));
      expect(c.play).not.toHaveBeenCalled();
      expect(say).toHaveBeenCalledWith('Save or discard your changes, then press Resume');
    });

    it('restarts the transport on Resume even if it was started meanwhile, so the downbeat comes', async () => {
      const { c, clock, hook } = mount();
      act(() => hook.result.current?.start());
      await clockOf(clock, hook);
      act(() => hook.result.current?.pause());
      await waitFor(() => expect(hook.result.current?.run?.phase).toBe('paused'));
      c.playing = true; // Space, while paused
      c.stopPlaying.mockClear();

      act(() => hook.result.current?.resume());
      await waitFor(() => expect(c.play).toHaveBeenCalledTimes(2));
      // stopped first, so play() really starts it, with its count-in and downbeat
      expect(c.stopPlaying.mock.invocationCallOrder[0]).toBeLessThan(
        c.play.mock.invocationCallOrder[1]
      );
    });

    it('opens the next slot only once a skipped slot’s open has landed', async () => {
      const { openTarget, hook } = mount();
      const first = deferred<'opened'>();
      openTarget.mockImplementationOnce(() => first.promise);
      act(() => hook.result.current?.start());
      await waitFor(() => expect(openTarget).toHaveBeenCalledTimes(1));

      act(() => hook.result.current?.skip());
      await new Promise((r) => setTimeout(r, 20));
      expect(openTarget).toHaveBeenCalledTimes(1); // still waiting on the first

      await act(async () => first.resolve('opened'));
      await waitFor(() =>
        expect(openTarget).toHaveBeenLastCalledWith({ libraryEntryId: ENTRY }, expect.anything())
      );
    });

    it('does not start a slot paused while its pattern loaded', async () => {
      const { c, openTarget, hook } = mount();
      const first = deferred<'opened'>();
      openTarget.mockImplementationOnce(() => first.promise);
      act(() => hook.result.current?.start());
      await waitFor(() => expect(openTarget).toHaveBeenCalledTimes(1));

      act(() => hook.result.current?.pause());
      await act(async () => first.resolve('opened'));
      await new Promise((r) => setTimeout(r, 20));
      expect(c.play).not.toHaveBeenCalled();
      expect(hook.result.current?.run?.phase).toBe('paused');
    });

    it('logs what was played when the Studio is left mid-session', async () => {
      const { c, clock, hook } = mount();
      act(() => hook.result.current?.start());
      const listener = await clockOf(clock, hook);
      act(() => listener.onDownbeat?.(0));
      act(() => listener.onLoop?.(61));
      await waitFor(() => expect(c.play).toHaveBeenCalledTimes(2));

      hook.unmount();

      const runPosts = vi
        .mocked(apiClient.post)
        .mock.calls.filter(([url]) => url === `/api/v1/practice-sessions/${SESSION_ID}/runs`);
      expect(runPosts).toHaveLength(1);
      expect(runPosts[0][1]).toEqual(expect.objectContaining({ options: { keepalive: true } }));
      expect(c.setSessionHold).toHaveBeenLastCalledWith(false);
    });
  });
});
