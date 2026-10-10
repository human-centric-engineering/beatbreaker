// @vitest-environment happy-dom

/**
 * Building a kit of your own in the Kit drawer (9.18).
 *
 * The real `KitPanel`, `KitBuilder`, `StudioProvider` and `useYourSounds`
 * run; the network is a small router over `fetch` answering as the routes do.
 * There is no Web Audio here, so `BreakAudio.preview` is watched rather than
 * played: what is under test is which recording the builder asks for, and
 * what it sends the server, never that a sound came out (`engine.test.ts`
 * holds `preview` to its graph).
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KitPanel } from '@/components/app/studio/panels/kit-panel';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { BreakAudio } from '@/lib/app/breaks/audio/engine';
import type { PieceView } from '@/lib/app/breaks/kit-builder';
import type { SampleList, YourKitView } from '@/lib/validations/samples';
import { testCatalogue } from '@/tests/helpers/catalogue';
import { openMenu, pickOption } from '@/tests/helpers/select-menu';

/* ---- the catalogue's pieces -------------------------------------------- */

const take = (folder: string, name: string, v: number) => ({
  velocity: v,
  urls: [`/kits/${folder}/${name}-${v}.m4a`],
});

const PIECES: PieceView[] = [
  {
    key: 'muldjord-s',
    label: 'Muldjord kit · Snare',
    role: 'snare',
    source: 'muldjord',
    credit: null,
    slots: {
      s: { layers: [take('muldjord', 's', 0.3), take('muldjord', 's', 0.8)], trim: 1.1 },
      sGhost: { layers: [take('muldjord', 'sg', 0.1)], trim: 1 },
    },
  },
  {
    key: 'bigrusty-s',
    label: 'Big Rusty · Snare',
    role: 'snare',
    source: 'bigrusty',
    credit: null,
    slots: {
      s: { layers: [take('bigrusty', 's', 0.5), take('bigrusty', 's', 0.9)], trim: 0.8 },
      sRim: { layers: [take('bigrusty', 'srim', 0.9)], trim: 1 },
    },
  },
  {
    key: 'muldjord-k',
    label: 'Muldjord kit · Kick',
    role: 'kick',
    source: 'muldjord',
    credit: null,
    slots: { k: { layers: [take('muldjord', 'k', 0.9)], trim: 1 } },
  },
];

const SPEC = { layers: [{ v: 0.8, files: ['s-0.8.m4a'] }], folder: 'muldjord' };

/** What `POST /api/v1/kits { from: 'muldjord' }` makes: the recorded kit's pieces. */
const COPY: YourKitView = {
  id: 'ckit00000000000000000002',
  key: 'yours-copy',
  label: 'My Muldjord kit',
  slots: {
    k: { piece: 'muldjord-k', label: 'Muldjord kit · Kick', spec: SPEC },
    s: { piece: 'muldjord-s', label: 'Muldjord kit · Snare', spec: SPEC },
    sGhost: { piece: 'muldjord-s', label: 'Muldjord kit · Snare', spec: SPEC },
  },
};

const YOUR_KIT: YourKitView = {
  id: 'ckit00000000000000000001',
  key: 'yours-a',
  label: 'Garage kit',
  slots: {
    s: { piece: 'muldjord-s', label: 'Muldjord kit · Snare', spec: SPEC, tune: -300 },
    sGhost: { piece: 'muldjord-s', label: 'Muldjord kit · Snare', spec: SPEC, tune: -300 },
  },
};

/* ---- the network --------------------------------------------------------- */

interface Sent {
  method: string;
  url: string;
  body: unknown;
}
let sent: Sent[];
/** What the next `POST /api/v1/kits` answers, when a test wants a refusal. */
let createAnswer: { status: number; body: unknown } | null;

const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** A kit of yours after a `PATCH`, the way the route resolves it: pieces by key, `null` to empty. */
function patched(kit: YourKitView, body: Record<string, unknown>): YourKitView {
  const slots = { ...kit.slots };
  const given = (body.slots ?? {}) as Record<string, Record<string, unknown> | null>;
  for (const [slot, v] of Object.entries(given)) {
    if (!v) {
      delete slots[slot];
      continue;
    }
    const { piece, from, level, tune, decay } = v as {
      piece: string;
      from?: string;
      level?: number;
      tune?: number;
      decay?: number;
    };
    const label = PIECES.find((p) => p.key === piece)?.label ?? piece;
    slots[slot] = { piece, ...(from ? { from } : {}), label, spec: SPEC, level, tune, decay };
  }
  const pan = { ...kit.pan };
  for (const [lane, v] of Object.entries((body.pan ?? {}) as Record<string, number | null>)) {
    if (v === null) delete pan[lane as keyof typeof pan];
    else pan[lane as keyof typeof pan] = v;
  }
  return { ...kit, slots, pan };
}

let yourKit: YourKitView;
/** Set when the pieces route should fail. */
let piecesDown: boolean;

async function route(url: string, init: RequestInit = {}): Promise<Response> {
  const method = init.method ?? 'GET';
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
  sent.push({ method, url, body });

  if (method === 'GET' && url === '/api/v1/catalogue/pieces') {
    if (piecesDown) {
      return new Response(JSON.stringify({ success: false, error: { message: 'down' } }), {
        status: 503,
      });
    }
    return ok(PIECES);
  }
  if (method === 'POST' && url === '/api/v1/kits') {
    if (createAnswer) {
      return new Response(JSON.stringify(createAnswer.body), { status: createAnswer.status });
    }
    return ok(COPY, 201);
  }
  if (method === 'PATCH' && url === `/api/v1/kits/${yourKit.id}`) {
    yourKit = patched(yourKit, body as Record<string, unknown>);
    return ok(yourKit);
  }
  return new Response(JSON.stringify({ success: false, error: { message: 'no route' } }), {
    status: 404,
  });
}

/* ---- rendering ------------------------------------------------------------ */

const NO_SAMPLES: SampleList = {
  samples: [],
  usage: { count: 0, bytes: 0, maxCount: 150, maxBytes: 50 * 1024 * 1024 },
};

function ToastProbe() {
  return <div role="status">{useStudio().notice?.message}</div>;
}

function renderDrawer() {
  render(
    <StudioProvider
      catalogue={testCatalogue()}
      yourKits={[YOUR_KIT]}
      yourSamples={NO_SAMPLES}
      settings={undefined}
    >
      <KitPanel />
      <ToastProbe />
    </StudioProvider>
  );
}

const kitPicker = () =>
  within(
    screen.getByRole('heading', { name: 'Kit' }).closest('.card')!
  ).getByLabelText<HTMLButtonElement>('Kit');

const builder = () => screen.getByRole('heading', { name: 'Build your kit' }).closest('.card')!;
const rowPicker = (label: string) =>
  within(builder() as HTMLElement).getByLabelText<HTMLButtonElement>(label);

let preview: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  sent = [];
  createAnswer = null;
  piecesDown = false;
  yourKit = YOUR_KIT;
  vi.stubGlobal('fetch', vi.fn(route));
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  preview = vi.spyOn(BreakAudio.prototype, 'preview').mockResolvedValue(true);
});

afterEach(() => {
  preview.mockRestore();
  vi.unstubAllGlobals();
});

describe('Make my own from this kit', () => {
  it('copies a recorded kit into one of yours with the same pieces, and picks it', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await pickOption(user, kitPicker(), 'muldjord');

    await user.click(screen.getByRole('button', { name: 'Make my own from this kit' }));

    await waitFor(() => expect(kitPicker().value).toBe('yours-copy'));
    expect(sent.find((s) => s.method === 'POST')?.body).toEqual({ from: 'muldjord' });
    // the builder shows the copy's pieces, row by row
    await waitFor(() => expect(rowPicker('Snare').value).toBe('muldjord-s'));
    expect(rowPicker('Kick').value).toBe('muldjord-k');
    expect(rowPicker('Ride').value).toBe('');
    expect(screen.getByLabelText('Name')).toHaveValue('My Muldjord kit');
  });

  it('is not offered on a synthesised kit, which has no pieces', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await pickOption(user, kitPicker(), 'studio70');
    expect(screen.queryByRole('button', { name: 'Make my own from this kit' })).toBeNull();
  });

  it('shows the server’s KIT_LIMIT sentence on the 21st kit, and stays on the kit you were on', async () => {
    createAnswer = {
      status: 409,
      body: {
        success: false,
        error: { code: 'KIT_LIMIT', message: 'You can keep 20 kits of your own' },
      },
    };
    const user = userEvent.setup();
    renderDrawer();
    await pickOption(user, kitPicker(), 'muldjord');

    await user.click(screen.getByRole('button', { name: 'Make my own from this kit' }));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('You can keep 20 kits of your own')
    );
    expect(kitPicker().value).toBe('muldjord');
  });
});

describe('the builder, on a kit of yours', () => {
  it('auditions a piece as you choose it, from its loudest take, then puts it in the row', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await pickOption(user, kitPicker(), 'yours-a');
    // the pieces arrive, grouped by the library they came from
    await waitFor(async () =>
      expect(
        within(await openMenu(user, rowPicker('Snare'))).getByRole('group', {
          name: 'Big Rusty Drums',
        })
      ).toBeTruthy()
    );

    await pickOption(user, rowPicker('Snare'), 'bigrusty-s');

    // the row's tune comes with it: −300 cents, on the new piece's file
    expect(preview).toHaveBeenCalledWith('/kits/bigrusty/s-0.9.m4a', 's', {
      gain: expect.closeTo((0.95 / 0.9) * 0.8, 6),
      tune: -300,
      decay: 1,
    });
    await waitFor(() =>
      expect(sent.find((s) => s.method === 'PATCH')?.body).toEqual({
        slots: {
          s: { piece: 'bigrusty-s', tune: -300 },
          sGhost: null,
          sCross: null,
          sRim: { piece: 'bigrusty-s', tune: -300 },
        },
      })
    );
    await waitFor(() => expect(rowPicker('Snare').value).toBe('bigrusty-s'));
    expect(screen.getByRole('status').textContent).toBe('Snare: Big Rusty · Snare');
  });

  it('empties a row on None, and does not audition anything', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await pickOption(user, kitPicker(), 'yours-a');
    await waitFor(() => expect(rowPicker('Snare').value).toBe('muldjord-s'));

    await pickOption(user, rowPicker('Snare'), '');

    await waitFor(() =>
      expect(sent.find((s) => s.method === 'PATCH')?.body).toEqual({
        slots: { s: null, sGhost: null, sCross: null, sRim: null },
      })
    );
    expect(preview).not.toHaveBeenCalled();
  });

  it('writes a knob to every filled slot of the row when the drag ends, and Reset puts them back', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await pickOption(user, kitPicker(), 'yours-a');
    const snareRow = rowPicker('Snare').closest('.build-row') as HTMLElement;

    await user.click(within(snareRow).getByRole('button', { name: 'Adjust' }));
    const level = within(snareRow).getByLabelText<HTMLInputElement>('Level');
    // a drag is changes, then the pointer or key going up
    fireEvent.change(level, { target: { value: '99' } });
    fireEvent.keyUp(level);

    await waitFor(() =>
      expect(sent.find((s) => s.method === 'PATCH')?.body).toEqual({
        slots: {
          s: { piece: 'muldjord-s', level: 0.99, tune: -300 },
          sGhost: { piece: 'muldjord-s', level: 0.99, tune: -300 },
        },
      })
    );

    await user.click(within(snareRow).getByRole('button', { name: 'Reset to kit' }));
    await waitFor(() =>
      expect(sent.filter((s) => s.method === 'PATCH').at(-1)?.body).toEqual({
        slots: { s: { piece: 'muldjord-s' }, sGhost: { piece: 'muldjord-s' } },
        pan: { s: null },
      })
    );
    await waitFor(() =>
      expect(within(snareRow).getByRole('button', { name: 'Reset to kit' })).toBeDisabled()
    );
  });

  it('pans the row’s lanes: the hats and the foot together', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await pickOption(user, kitPicker(), 'yours-a');
    const hatsRow = rowPicker('Hats').closest('.build-row') as HTMLElement;

    await user.click(within(hatsRow).getByRole('button', { name: 'Adjust' }));
    const pan = within(hatsRow).getByLabelText<HTMLInputElement>('Pan');
    // the default is −30 from the stool
    expect(pan.value).toBe('-30');
    fireEvent.change(pan, { target: { value: '-29' } });
    fireEvent.pointerUp(pan);

    await waitFor(() =>
      expect(sent.find((s) => s.method === 'PATCH')?.body).toEqual({
        pan: { h: -0.29, hf: -0.29 },
      })
    );
  });

  it('hears the row’s piece on ▸ at the row’s settings, and says so when it will not play', async () => {
    preview.mockResolvedValue(false);
    const user = userEvent.setup();
    renderDrawer();
    await pickOption(user, kitPicker(), 'yours-a');
    await waitFor(async () =>
      expect(within(await openMenu(user, rowPicker('Snare'))).getAllByRole('group')).toHaveLength(2)
    );
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Hear the snare' }));

    expect(preview).toHaveBeenCalledWith('/kits/muldjord/s-0.8.m4a', 's', {
      gain: expect.closeTo((0.95 / 0.8) * 1.1, 6),
      tune: -300,
      decay: 1,
    });
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('Could not play Muldjord kit · Snare')
    );
  });

  it('plays the kit’s own voice on ▸ for a row with no piece, and offers it no settings', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await pickOption(user, kitPicker(), 'yours-a');
    const rideRow = rowPicker('Ride').closest('.build-row') as HTMLElement;

    await user.click(screen.getByRole('button', { name: 'Hear the ride' }));
    expect(preview).not.toHaveBeenCalled();

    await user.click(within(rideRow).getByRole('button', { name: 'Adjust' }));
    expect(within(rideRow).queryByLabelText('Level')).toBeNull();
    expect(within(rideRow).getByText(/Nothing in this row yet/)).toBeTruthy();
    expect(within(rideRow).getByRole('button', { name: 'Reset to kit' })).toBeDisabled();
  });

  it('gives the splash no Pan of its own: it pans with the crash', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await pickOption(user, kitPicker(), 'yours-a');
    const splashRow = rowPicker('Splash').closest('.build-row') as HTMLElement;

    await user.click(within(splashRow).getByRole('button', { name: 'Adjust' }));

    expect(within(splashRow).queryByLabelText('Pan')).toBeNull();
    expect(within(splashRow).getByText('The splash pans with the crash.')).toBeTruthy();
  });

  it('says the pieces did not load, and still shows what the kit holds', async () => {
    piecesDown = true;
    const user = userEvent.setup();
    renderDrawer();
    await pickOption(user, kitPicker(), 'yours-a');

    expect(await screen.findByText(/The pieces did not load/)).toBeTruthy();
    // the kit's own piece stays in the picker, named from the kit
    expect(rowPicker('Snare').value).toBe('muldjord-s');
    expect(within(rowPicker('Snare')).queryAllByRole('group')).toHaveLength(0);
  });

  it('does not write anything when a knob is let go without moving', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await pickOption(user, kitPicker(), 'yours-a');
    const snareRow = rowPicker('Snare').closest('.build-row') as HTMLElement;
    await user.click(within(snareRow).getByRole('button', { name: 'Adjust' }));

    fireEvent.keyUp(within(snareRow).getByLabelText<HTMLInputElement>('Tune'));
    fireEvent.pointerUp(within(snareRow).getByLabelText<HTMLInputElement>('Pan'));

    expect(sent.some((s) => s.method === 'PATCH')).toBe(false);
  });

  it('hears a sample of yours from its own file when a knob is let go, at the new setting', async () => {
    yourKit = {
      ...YOUR_KIT,
      slots: {
        k: { sampleId: 'csmp1', name: 'kick.wav', audioUrl: '/api/v1/samples/csmp1/audio' },
      },
    };
    const user = userEvent.setup();
    render(
      <StudioProvider
        catalogue={testCatalogue()}
        yourKits={[yourKit]}
        yourSamples={NO_SAMPLES}
        settings={undefined}
      >
        <KitPanel />
        <ToastProbe />
      </StudioProvider>
    );
    await pickOption(user, kitPicker(), 'yours-a');
    const kickRow = rowPicker('Kick').closest('.build-row') as HTMLElement;
    await user.click(within(kickRow).getByRole('button', { name: 'Adjust' }));

    const level = within(kickRow).getByLabelText<HTMLInputElement>('Level');
    fireEvent.change(level, { target: { value: '30' } });
    fireEvent.keyUp(level);

    expect(preview).toHaveBeenCalledWith('/api/v1/samples/csmp1/audio', 'k', {
      gain: 0.3,
      tune: 0,
      decay: 1,
    });
  });
});
