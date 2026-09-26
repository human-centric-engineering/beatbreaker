// @vitest-environment happy-dom

/**
 * Your own kits and samples in the Kit drawer (D20, 4A.9).
 *
 * The real `KitPanel`, `StudioProvider`, `useYourSounds` and `encodeWav` run;
 * the network is a small router over `fetch` that answers the way the routes
 * do, and Web Audio's `OfflineAudioContext` is faked (nearest-neighbour
 * resampling) so an "mp3" can be decoded and re-encoded. What is under test is
 * what goes over the wire — a WAV, whatever was picked — and what the drawer
 * shows from the answers: the file in its slot, the server's refusal, the
 * usage after an upload and after a delete.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KitPanel } from '@/components/app/studio/panels/kit-panel';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { parseWav } from '@/lib/app/breaks/samples/wav';
import type { SampleList, YourKitView } from '@/lib/validations/samples';
import { testCatalogue } from '@/tests/helpers/catalogue';

/* ---- Web Audio, offline ------------------------------------------------ */

class FakeBuffer {
  readonly channels: Float32Array[];
  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number
  ) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  getChannelData(c: number) {
    return this.channels[c];
  }
  copyToChannel(src: Float32Array, c: number) {
    this.channels[c].set(src);
  }
}

/** Every file decodes to half a second of stereo 48 kHz: 0.1 s of silence, then a hit. */
class FakeOfflineAudioContext {
  destination = {};
  private playing: FakeBuffer | null = null;
  constructor(
    private readonly ch: number,
    private readonly len: number,
    private readonly rate: number
  ) {}
  decodeAudioData() {
    const b = new FakeBuffer(2, 24_000, 48_000);
    for (let i = 4_800; i < b.length; i++) b.channels[0][i] = b.channels[1][i] = 0.5;
    return Promise.resolve(b);
  }
  createBuffer(c: number, n: number, rate: number) {
    return new FakeBuffer(c, n, rate);
  }
  createBufferSource() {
    const node = {
      buffer: null as FakeBuffer | null,
      connect: () => node,
      start: () => {
        this.playing = node.buffer;
      },
    };
    return node;
  }
  startRendering() {
    const out = new FakeBuffer(this.ch, this.len, this.rate);
    const src = this.playing!;
    for (let i = 0; i < this.len; i++) {
      const j = Math.floor((i * src.sampleRate) / this.rate);
      out.channels[0][i] = j < src.length ? src.channels[0][j] : 0;
    }
    return Promise.resolve(out);
  }
}

/* ---- the network --------------------------------------------------------- */

const KIT_ID = 'ckit00000000000000000001';
const KICK_ID = 'csmp00000000000000000001';

interface Sent {
  method: string;
  url: string;
  body: unknown;
}
let sent: Sent[];
/** What the next sample upload answers, when a test wants a refusal. */
let uploadAnswer: { status: number; body: unknown } | null;
let usage: SampleList['usage'];

const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function route(url: string, init: RequestInit = {}): Promise<Response> {
  const method = init.method ?? 'GET';
  const body =
    init.body instanceof FormData
      ? init.body
      : typeof init.body === 'string'
        ? JSON.parse(init.body)
        : undefined;
  sent.push({ method, url, body });

  if (method === 'POST' && url === '/api/v1/samples') {
    if (uploadAnswer) {
      return new Response(JSON.stringify(uploadAnswer.body), { status: uploadAnswer.status });
    }
    const form = body as FormData;
    const file = form.get('file') as Blob;
    usage = { ...usage, count: usage.count + 1, bytes: usage.bytes + file.size };
    return ok(
      {
        sample: {
          id: 'csmp00000000000000000009',
          name: form.get('name'),
          slot: form.get('slot'),
          bytes: file.size,
          durationMs: 400,
          createdAt: '2026-09-26T12:00:00.000Z',
          audioUrl: '/api/v1/samples/csmp00000000000000000009/audio',
        },
        usage,
      },
      201
    );
  }
  if (method === 'PATCH' && url === `/api/v1/kits/${KIT_ID}`) {
    const { slots = {} } = body as { slots?: Record<string, string | null> };
    const filled: YourKitView['slots'] = {};
    for (const [slot, id] of Object.entries(slots)) {
      if (id) filled[slot] = { sampleId: id, name: 'kick.mp3', audioUrl: '' };
    }
    return ok({ ...YOUR_KIT, slots: filled });
  }
  if (method === 'DELETE' && url === `/api/v1/samples/${KICK_ID}`) {
    usage = { ...usage, count: usage.count - 1, bytes: usage.bytes - 2_048 };
    return ok({ id: KICK_ID, deleted: true, usage });
  }
  if (method === 'POST' && url === '/api/v1/kits') {
    return ok(
      { id: 'ckit00000000000000000002', key: 'yours-new', label: 'My kit', slots: {} },
      201
    );
  }
  if (method === 'DELETE' && url === `/api/v1/kits/${KIT_ID}`) {
    return ok({ id: KIT_ID, deleted: true });
  }
  return new Response(JSON.stringify({ success: false, error: { message: 'no route' } }), {
    status: 404,
  });
}

/* ---- rendering ------------------------------------------------------------ */

const YOUR_KIT: YourKitView = { id: KIT_ID, key: 'yours-a', label: 'Garage kit', slots: {} };

function ToastProbe() {
  return <div role="status">{useStudio().toast}</div>;
}

function renderDrawer(samples: SampleList) {
  render(
    <StudioProvider
      catalogue={testCatalogue()}
      yourKits={[YOUR_KIT]}
      yourSamples={samples}
      settings={undefined}
    >
      <KitPanel />
      <ToastProbe />
    </StudioProvider>
  );
}

const kitPicker = () =>
  within(screen.getByRole('heading', { name: 'Kit' }).closest('.card')!).getByLabelText('Kit');

function pick(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

const slotRow = (label: string) => screen.getByText(label, { selector: 'b' }).closest('.slot')!;

beforeEach(() => {
  localStorage.clear();
  sent = [];
  uploadAnswer = null;
  usage = { count: 1, bytes: 2_048, maxCount: 150, maxBytes: 50 * 1024 * 1024 };
  vi.stubGlobal('fetch', vi.fn(route));
  vi.stubGlobal('OfflineAudioContext', FakeOfflineAudioContext);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const START: SampleList = {
  samples: [
    {
      id: KICK_ID,
      name: 'old-kick.wav',
      slot: 'k',
      bytes: 2_048,
      durationMs: 300,
      createdAt: '2026-09-25T12:00:00.000Z',
      audioUrl: `/api/v1/samples/${KICK_ID}/audio`,
    },
  ],
  usage: { count: 1, bytes: 2_048, maxCount: 150, maxBytes: 50 * 1024 * 1024 },
};

describe('the Kit drawer, on a kit of yours', () => {
  it('sends an mp3 up as a mono 16-bit 44.1 kHz WAV, then puts it in the slot', async () => {
    const user = userEvent.setup();
    renderDrawer(START);
    await user.selectOptions(kitPicker(), 'yours-a');

    const input = slotRow('Kick').querySelector('input[type="file"]') as HTMLInputElement;
    pick(input, new File([new Uint8Array(512)], 'kick.mp3', { type: 'audio/mpeg' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Kick: kick.mp3'));

    const upload = sent.find((s) => s.method === 'POST' && s.url === '/api/v1/samples')!;
    const form = upload.body as FormData;
    expect(form.get('slot')).toBe('k');
    expect(form.get('name')).toBe('kick.mp3');
    const file = form.get('file') as Blob;
    expect(file.type).toBe('audio/wav');
    // the server's own reader accepts it: that is the whole contract
    expect(parseWav(new Uint8Array(await file.arrayBuffer()))).toMatchObject({ ok: true });

    const patch = sent.find((s) => s.method === 'PATCH')!;
    expect(patch.body).toEqual({ slots: { k: 'csmp00000000000000000009' } });
    expect(within(slotRow('Kick') as HTMLElement).getByText('kick.mp3')).toBeTruthy();
    expect(within(slotRow('Kick') as HTMLElement).getByText('Replace')).toBeTruthy();
  });

  it('shows the server’s refusal and leaves the slot empty', async () => {
    uploadAnswer = {
      status: 409,
      body: {
        success: false,
        error: {
          code: 'SAMPLE_LIMIT_COUNT',
          message:
            'You have 150 samples, which is the most an account can keep — delete one to make room',
        },
      },
    };
    const user = userEvent.setup();
    renderDrawer(START);
    await user.selectOptions(kitPicker(), 'yours-a');

    const input = slotRow('Snare').querySelector('input[type="file"]') as HTMLInputElement;
    pick(input, new File([new Uint8Array(64)], 'snare.mp3'));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        'You have 150 samples, which is the most an account can keep — delete one to make room'
      )
    );
    expect(sent.some((s) => s.method === 'PATCH')).toBe(false);
    expect(within(slotRow('Snare') as HTMLElement).getByText('Load')).toBeTruthy();
  });

  it('updates the usage after an upload, and again after a delete', async () => {
    const user = userEvent.setup();
    renderDrawer(START);
    await user.selectOptions(kitPicker(), 'yours-a');
    expect(screen.getByText(/^1 of 150 samples/)).toBeTruthy();

    const input = slotRow('Kick').querySelector('input[type="file"]') as HTMLInputElement;
    pick(input, new File([new Uint8Array(512)], 'kick.mp3'));
    expect(await screen.findByText(/^2 of 150 samples/)).toBeTruthy();

    // deleting asks once more before it goes
    await user.click(screen.getByRole('button', { name: 'Delete old-kick.wav' }));
    await user.click(screen.getByRole('button', { name: 'Delete old-kick.wav?' }));

    expect(await screen.findByText(/^1 of 150 samples/)).toBeTruthy();
    expect(screen.queryByText('old-kick.wav')).toBeNull();
    expect(sent.some((s) => s.method === 'DELETE' && s.url === `/api/v1/samples/${KICK_ID}`)).toBe(
      true
    );
  });

  it('makes a new kit of yours and picks it', async () => {
    const user = userEvent.setup();
    renderDrawer(START);

    await user.click(screen.getByRole('button', { name: 'New kit of your own' }));

    await waitFor(() => expect((kitPicker() as HTMLSelectElement).value).toBe('yours-new'));
    expect(screen.getByLabelText('Name')).toHaveValue('My kit');
  });

  it('deletes the kit you are on, after asking, and goes back to the default kit', async () => {
    const user = userEvent.setup();
    renderDrawer(START);
    await user.selectOptions(kitPicker(), 'yours-a');

    await user.click(screen.getByRole('button', { name: 'Delete this kit' }));
    await user.click(screen.getByRole('button', { name: 'Delete it?' }));

    await waitFor(() => expect((kitPicker() as HTMLSelectElement).value).toBe('studio70'));
    expect(screen.getByRole('status').textContent).toMatch(/Garage kit deleted/);
  });

  it('renames the kit on Enter, and puts back an empty or unchanged name without asking', async () => {
    const user = userEvent.setup();
    renderDrawer(START);
    await user.selectOptions(kitPicker(), 'yours-a');
    const name = screen.getByLabelText('Name');

    await user.clear(name);
    await user.tab();
    expect(name).toHaveValue('Garage kit');
    await user.click(name);
    await user.tab();
    expect(sent.some((s) => s.method === 'PATCH')).toBe(false);

    await user.clear(name);
    await user.type(name, 'Basement kit{Enter}');
    await waitFor(() =>
      expect(sent.find((s) => s.method === 'PATCH')?.body).toEqual({ label: 'Basement kit' })
    );
  });

  it('empties a filled slot with its clear button', async () => {
    const user = userEvent.setup();
    renderDrawer(START);
    await user.selectOptions(kitPicker(), 'yours-a');
    const input = slotRow('Kick').querySelector('input[type="file"]') as HTMLInputElement;
    pick(input, new File([new Uint8Array(512)], 'kick.mp3'));
    await screen.findByRole('button', { name: 'Clear Kick' });

    await user.click(screen.getByRole('button', { name: 'Clear Kick' }));

    await waitFor(() =>
      expect(sent.filter((s) => s.method === 'PATCH').at(-1)?.body).toEqual({ slots: { k: null } })
    );
    expect(await within(slotRow('Kick') as HTMLElement).findByText('Load')).toBeTruthy();
  });

  it('says nothing is uploaded yet when you have no samples', async () => {
    const user = userEvent.setup();
    renderDrawer({ samples: [], usage: START.usage });
    await user.selectOptions(kitPicker(), 'yours-a');
    expect(screen.getByText('Nothing uploaded yet.')).toBeTruthy();
  });
});
