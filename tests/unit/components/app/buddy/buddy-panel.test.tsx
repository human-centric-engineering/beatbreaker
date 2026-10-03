// @vitest-environment happy-dom

/**
 * The BeatBuddy drawer (7.12) and its apply loop (7.13), driven through the
 * real `useBuddyChat` hook. The network is a fake `fetch` streaming Sunrise's
 * SSE frames, and the Studio is a fake holding a pattern and an undo stack.
 * What is asserted is what reached the Studio — which documents were
 * applied, pushed on the undo stack or dropped — and what the drummer reads.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn() } };
});

import { BuddyPanel } from '@/components/app/buddy/buddy-panel';
import { useBuddyChat } from '@/components/app/buddy/use-buddy-chat';
import type { Studio } from '@/components/app/studio/studio-provider';
import { apiClient } from '@/lib/api/client';
import type { SharePayload } from '@/lib/app/breaks/schema';
import { type BreakDoc, breakDocFromPayload, breakPayload } from '@/lib/app/breaks/share';
import { expectNoContent, recordEvents } from '@/tests/helpers/analytics';
import { funkPayload } from '@/tests/helpers/buddy';

const START = funkPayload(1);
const FIRST = funkPayload(2);
const SECOND = funkPayload(3);

/**
 * A Studio with just what the drawer touches. `payload` is a new function
 * after every change, as the console's `useCallback` is after a render.
 */
function fakeStudio() {
  const state = {
    doc: START,
    undoStack: [] as SharePayload[],
  };
  const studio = {
    editing: 'A' as const,
    payload: () => state.doc,
    get canUndo() {
      return state.undoStack.length > 0;
    },
    applyAssistant: vi.fn((doc: SharePayload, push: boolean): BreakDoc => {
      if (push) state.undoStack.push(state.doc);
      state.doc = breakPayload(breakDocFromPayload(doc));
      studio.payload = () => state.doc;
      return breakDocFromPayload(doc);
    }),
    undo: vi.fn(() => {
      const prev = state.undoStack.pop();
      if (prev) state.doc = prev;
      studio.payload = () => state.doc;
    }),
    /** A manual edit on the stage. */
    edit(doc: SharePayload) {
      state.doc = doc;
      studio.payload = () => state.doc;
    },
  };
  return { studio, state };
}

let fake: ReturnType<typeof fakeStudio>;

function Harness() {
  const chat = useBuddyChat(fake.studio as unknown as Studio);
  return <BuddyPanel chat={chat} />;
}

type Frame = Record<string, unknown> & { type: string };

/**
 * A streamed response. Frames go out one per chunk; `between` runs before a
 * given frame is sent, so a test can edit the stage mid-turn.
 */
function sse(frames: Frame[], between: Record<number, () => void> = {}) {
  const encoder = new TextEncoder();
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= frames.length) {
        controller.close();
        return;
      }
      between[i]?.();
      const f = frames[i++];
      controller.enqueue(encoder.encode(`event: ${f.type}\ndata: ${JSON.stringify(f)}\n\n`));
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function result(doc: SharePayload, rev: number, summary: string): Frame {
  return {
    type: 'capability_result',
    capabilitySlug: 'apply_doctor_move',
    result: { success: true, data: { doc, rev, summary, changes: [], sections: [] } },
  };
}

const ALLOWANCE = { limit: 30, used: 3, remaining: 27, resetsAt: '2026-09-30T00:00:00.000Z' };

beforeEach(() => {
  fake = fakeStudio();
  vi.mocked(apiClient.get).mockReset().mockResolvedValue(ALLOWANCE);
  vi.mocked(apiClient.post).mockReset();
  vi.stubGlobal('fetch', vi.fn());
});

async function say(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Message BeatBuddy'), text);
  await user.click(screen.getByRole('button', { name: /send/i }));
}

describe('the BeatBuddy drawer', () => {
  it('opens on the allowance and the suggested prompts', async () => {
    render(<Harness />);

    expect(await screen.findByText('27 of 30 turns left today')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tidy this up' })).toBeInTheDocument();
  });

  it('sends the message, the pattern on the stage and the section showing', async () => {
    vi.mocked(fetch).mockResolvedValue(sse([{ type: 'done' }]));
    render(<Harness />);

    await say('Make it swing');

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/v1/buddy/stream');
    const body: unknown = JSON.parse(typeof init?.body === 'string' ? init.body : '');
    expect(body).toEqual({ message: 'Make it swing', doc: START, section: 'A' });
  });

  it('applies the change, shows the reply and the chip, and one Undo puts the stage back', async () => {
    vi.mocked(fetch).mockResolvedValue(
      sse([
        { type: 'start', conversationId: 'c1' },
        result(FIRST, 4, 'Strip ghosts: A bars 1, 2'),
        { type: 'content', delta: 'Took the ghosts out of A.' },
        { type: 'done' },
      ])
    );
    render(<Harness />);

    await say('Strip the ghosts');

    expect(await screen.findByText('Took the ghosts out of A.')).toBeInTheDocument();
    expect(fake.studio.applyAssistant).toHaveBeenCalledTimes(1);
    expect(fake.studio.applyAssistant).toHaveBeenCalledWith(FIRST, true);
    expect(screen.getByText('Strip ghosts: A bars 1, 2')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: /undo/i }));
    expect(fake.studio.undo).toHaveBeenCalledTimes(1);
    expect(fake.state.doc).toEqual(START);
    expect(screen.getByText('Undone')).toBeInTheDocument();
  });

  it('applies a second change in the turn in place, so the turn is one undo step', async () => {
    vi.mocked(fetch).mockResolvedValue(
      sse([result(FIRST, 4, 'first'), result(SECOND, 5, 'second'), { type: 'done' }])
    );
    render(<Harness />);

    await say('Two things');

    await screen.findByText('second');
    expect(vi.mocked(fake.studio.applyAssistant).mock.calls.map((c) => c[1])).toEqual([
      true,
      false,
    ]);
    expect(fake.state.undoStack).toHaveLength(1);
  });

  it('applies the newest rev of a batch, and never an older one after it', async () => {
    vi.mocked(fetch).mockResolvedValue(
      sse([
        {
          type: 'capability_results',
          results: [
            { capabilitySlug: 'apply_doctor_move', result: result(SECOND, 6, 'b').result },
            { capabilitySlug: 'apply_doctor_move', result: result(FIRST, 5, 'a').result },
          ],
        },
        result(FIRST, 5, 'late'),
        { type: 'done' },
      ])
    );
    render(<Harness />);

    await say('Batch');

    await screen.findByText('b');
    await waitFor(() => expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument());
    expect(fake.studio.applyAssistant).toHaveBeenCalledTimes(1);
    expect(fake.studio.applyAssistant).toHaveBeenCalledWith(SECOND, true);
    expect(screen.queryByText('late')).not.toBeInTheDocument();
  });

  it('drops a change that lands after the drummer edited the pattern, and says so', async () => {
    const edited = funkPayload(9);
    vi.mocked(fetch).mockResolvedValue(
      /* Frame 0 is pulled when the stream is built, before the turn reads the
         stage; the edit goes in before frame 1, once the turn is under way. */
      sse(
        [
          { type: 'start', conversationId: 'c1' },
          result(FIRST, 4, 'Strip ghosts'),
          { type: 'done' },
        ],
        {
          1: () => fake.studio.edit(edited),
        }
      )
    );
    render(<Harness />);

    await say('Strip the ghosts');

    expect(await screen.findByText(/its change was not applied/)).toBeInTheDocument();
    expect(fake.studio.applyAssistant).not.toHaveBeenCalled();
    expect(fake.state.doc).toBe(edited);
  });

  it('shows a provider error in the drawer and leaves the Studio alone', async () => {
    vi.mocked(fetch).mockResolvedValue(
      sse([{ type: 'error', code: 'provider_unavailable', message: 'x' }])
    );
    render(<Harness />);

    await say('Hello');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(fake.studio.applyAssistant).not.toHaveBeenCalled();
    expect(fake.state.doc).toEqual(START);
  });

  it('survives the network failing outright', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    render(<Harness />);

    await say('Hello');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Everything else in the Studio still works'
    );
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('says so and closes the composer when the day’s turns are spent', async () => {
    const spent = { ...ALLOWANCE, used: 30, remaining: 0 };
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'BUDDY_ALLOWANCE_SPENT',
            message: 'That is all of today.',
            details: spent,
          },
        }),
        { status: 429 }
      )
    );
    vi.mocked(apiClient.get).mockResolvedValueOnce(ALLOWANCE).mockResolvedValue(spent);
    render(<Harness />);

    await say('One more');

    expect(await screen.findByText('That is all of today.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Message BeatBuddy')).toBeDisabled());
    expect(screen.getByText('0 of 30 turns left today')).toBeInTheDocument();
  });

  it('opens a MIDI file on the stage through the import endpoint and tells BeatBuddy with the next message', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ source: 'midi', doc: FIRST, notes: [] });
    vi.mocked(fetch).mockResolvedValue(sse([{ type: 'done' }]));
    const { container } = render(<Harness />);

    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('no file input');
    const file = new File([new Uint8Array([0x4d, 0x54, 0x68, 0x64])], 'groove.mid', {
      type: 'audio/midi',
    });
    await act(async () => {
      await userEvent.setup().upload(input, file);
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/breaks/import', {
      body: { kind: 'midi', data: 'TVRoZA==', fileName: 'groove.mid' },
    });
    expect(fake.studio.applyAssistant).toHaveBeenCalledWith(FIRST, true);
    expect(await screen.findByText('Opened groove.mid')).toBeInTheDocument();

    await say('Tidy it');
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string) as {
      message: string;
    };
    expect(body.message).toBe(
      '(I opened groove.mid in the Studio: 2 bars of 4/4 at 94 bpm.)\nTidy it'
    );
  });

  it('sends the pattern a link in the message opened, and applies the turn on top of it', async () => {
    /* As in the Studio: the stage takes the import at once, but `payload`
       only sees it after React renders — which does not happen between the
       import and the request. */
    const apply = fake.studio.applyAssistant.getMockImplementation();
    fake.studio.applyAssistant.mockImplementationOnce((doc, push) => {
      const was = fake.studio.payload();
      const applied = apply!(doc, push);
      const after = fake.studio.payload;
      fake.studio.payload = () => was;
      setTimeout(() => {
        fake.studio.payload = after;
      }, 0);
      return applied;
    });
    vi.mocked(apiClient.post).mockResolvedValue({ source: 'beatbreaker', doc: FIRST, notes: [] });
    // The reply comes back over the network, after that render.
    vi.mocked(fetch).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return sse([
        { type: 'start', conversationId: 'c1' },
        result(SECOND, 4, 'Tidied'),
        { type: 'done' },
      ]);
    });
    render(<Harness />);

    await say('Tidy https://beatbreaker.app/studio#b=abc123');

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string) as {
      doc: SharePayload;
    };
    expect(body.doc).toEqual(breakPayload(breakDocFromPayload(FIRST)));
    await waitFor(() => expect(fake.studio.applyAssistant).toHaveBeenCalledWith(SECOND, true));
    expect(screen.queryByText(/its change was not applied/)).not.toBeInTheDocument();
  });

  it('flattens a transparent photo onto white before sending it as JPEG', async () => {
    const calls: string[] = [];
    const ctx = {
      set fillStyle(v: string) {
        calls.push(`fillStyle ${v}`);
      },
      fillRect: vi.fn(() => calls.push('fillRect')),
      drawImage: vi.fn(() => calls.push('drawImage')),
    };
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 100, height: 50, close: vi.fn() })
    );
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/jpeg;base64,AAAA');
    const { container } = render(<Harness />);

    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('no file input');
    await act(async () => {
      await userEvent
        .setup()
        .upload(input, new File([new Uint8Array([1])], 'chart.png', { type: 'image/png' }));
    });

    await waitFor(() => expect(ctx.drawImage).toHaveBeenCalled());
    expect(calls).toEqual(['fillStyle #fff', 'fillRect', 'drawImage']);
    getContext.mockRestore();
    toDataURL.mockRestore();
  });
});

describe('analytics events (task 8.8)', () => {
  it('counts an answered turn that changed the chart, and its Undo', async () => {
    const rec = recordEvents();
    vi.mocked(fetch).mockResolvedValue(
      sse([
        { type: 'start', conversationId: 'c1' },
        result(FIRST, 4, 'Strip ghosts: A bars 1, 2'),
        { type: 'content', delta: 'Took the ghosts out of A.' },
        { type: 'done' },
      ])
    );
    render(<Harness />, { wrapper: rec.wrapper });

    await say('Strip the ghosts');
    await screen.findByText('Took the ghosts out of A.');
    await waitFor(() => expect(rec.names()).toEqual(['buddy_turn']));
    expect(rec.tracked[0].props).toEqual({ changed: true });

    await userEvent.setup().click(screen.getByRole('button', { name: /undo/i }));
    expect(rec.names()).toEqual(['buddy_turn', 'buddy_undo']);
    expectNoContent(rec.tracked, ['Strip the ghosts', 'Took the ghosts', 'c1']);
  });

  it('counts a turn that only talked as unchanged', async () => {
    const rec = recordEvents();
    vi.mocked(fetch).mockResolvedValue(
      sse([{ type: 'content', delta: 'It already swings.' }, { type: 'done' }])
    );
    render(<Harness />, { wrapper: rec.wrapper });

    await say('Does it swing?');
    await screen.findByText('It already swings.');
    await waitFor(() =>
      expect(rec.tracked).toEqual([{ event: 'buddy_turn', props: { changed: false } }])
    );
  });

  it('counts no turn the server refused', async () => {
    const rec = recordEvents();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'BUDDY_ALLOWANCE_SPENT', message: 'That is all of today.' },
        }),
        { status: 429 }
      )
    );
    render(<Harness />, { wrapper: rec.wrapper });

    await say('One more');
    await screen.findByText('That is all of today.');
    expect(rec.names()).toEqual([]);
  });

  it('does not count undoing an imported file as undoing BeatBuddy', async () => {
    const rec = recordEvents();
    vi.mocked(apiClient.post).mockResolvedValue({ source: 'midi', doc: FIRST, notes: [] });
    const { container } = render(<Harness />, { wrapper: rec.wrapper });
    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('no file input');
    await act(async () => {
      await userEvent
        .setup()
        .upload(input, new File([new Uint8Array([0x4d, 0x54, 0x68, 0x64])], 'groove.mid'));
    });
    await screen.findByText('Opened groove.mid');

    await userEvent.setup().click(screen.getByRole('button', { name: /undo/i }));
    expect(fake.studio.undo).toHaveBeenCalledTimes(1);
    expect(rec.names()).toEqual([]);
  });
});
