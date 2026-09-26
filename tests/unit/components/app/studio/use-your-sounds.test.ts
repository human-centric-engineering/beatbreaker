// @vitest-environment happy-dom

/**
 * `useYourSounds` — your samples and kits in the Studio (D20), and what each
 * one says when the server, the network or the file lets it down.
 *
 * The happy paths run through the whole drawer in `your-sounds.test.tsx`; this
 * is the hook alone, with `fetch` stubbed per test, for the failures a drawer
 * test would need a scene to reach. `encodeWav` is mocked here: the encoder is
 * `encode-wav.test.ts`'s, and this is about what happens after it.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useYourSounds } from '@/components/app/studio/use-your-sounds';
import type { SampleList, YourKitView } from '@/lib/validations/samples';

const { encode } = vi.hoisted(() => ({ encode: vi.fn() }));
vi.mock('@/lib/app/breaks/audio/encode-wav', () => ({ encodeWav: encode }));
vi.mock('@/lib/logging', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const KIT: YourKitView = {
  id: 'ckit00000000000000000001',
  key: 'yours-a',
  label: 'Garage kit',
  slots: { k: { sampleId: 'csmp00000000000000000001', name: 'kick.wav', audioUrl: '' } },
};
const SAMPLES: SampleList = {
  samples: [
    {
      id: 'csmp00000000000000000001',
      name: 'kick.wav',
      slot: 'k',
      bytes: 100,
      durationMs: 200,
      createdAt: '2026-09-26T12:00:00.000Z',
      audioUrl: '',
    },
  ],
  usage: { count: 1, bytes: 100, maxCount: 150, maxBytes: 1000 },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const refuse = (message: string, status = 400) =>
  json({ success: false, error: { code: 'NOPE', message } }, status);

const fetchMock = vi.fn();
const say = vi.fn();

function mount(initial: { kits?: YourKitView[]; samples?: SampleList } = {}) {
  return renderHook(() => useYourSounds(initial, say));
}

const file = new File([new Uint8Array(4)], 'snare.mp3');

beforeEach(() => {
  fetchMock.mockReset();
  say.mockReset();
  encode.mockReset();
  encode.mockResolvedValue({ ok: true, wav: new Blob([new Uint8Array(44)]), durationMs: 10 });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('what it starts with', () => {
  it('is empty with nothing handed in', () => {
    const { result } = mount();
    expect(result.current.kits).toEqual([]);
    expect(result.current.samples).toEqual([]);
    expect(result.current.usage.count).toBe(0);
  });
});

describe('uploadToSlot', () => {
  it('says why a file cannot be encoded, and sends nothing', async () => {
    encode.mockResolvedValue({ ok: false, message: 'Could not decode that file' });
    const { result } = mount({ kits: [KIT] });

    let err = '';
    await act(async () => {
      err = await result.current.uploadToSlot(KIT.id, 's', file);
    });

    expect(err).toBe('Could not decode that file');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says the connection failed when the upload cannot be sent', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = mount({ kits: [KIT] });

    let err = '';
    await act(async () => {
      err = await result.current.uploadToSlot(KIT.id, 's', file);
    });
    expect(err).toBe('Could not upload that — check your connection and try again');
  });

  it('says so when the upload answers with something that is not a sample', async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: { nope: 1 } }, 201));
    const { result } = mount({ kits: [KIT] });

    let err = '';
    await act(async () => {
      err = await result.current.uploadToSlot(KIT.id, 's', file);
    });
    expect(err).toBe('The upload answered with something unexpected');
  });

  it('keeps the upload and says so when it cannot be put in the kit', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json(
          {
            success: true,
            data: {
              sample: { ...SAMPLES.samples[0], id: 'csmp00000000000000000002', slot: 's' },
              usage: { ...SAMPLES.usage, count: 2 },
            },
          },
          201
        )
      )
      .mockResolvedValueOnce(refuse('Not one of your samples'));
    const { result } = mount({ kits: [KIT], samples: SAMPLES });

    let err = '';
    await act(async () => {
      err = await result.current.uploadToSlot(KIT.id, 's', file);
    });

    expect(err).toBe('Uploaded, but not put in the kit: Not one of your samples');
    expect(result.current.samples).toHaveLength(2);
    expect(result.current.usage.count).toBe(2);
    expect(result.current.kits[0].slots.s).toBeUndefined();
  });
});

describe('the kit calls, when they fail', () => {
  it.each([
    ['createKit', (h: ReturnType<typeof useYourSounds>) => h.createKit('x'), 'Too many kits'],
    [
      'renameKit',
      (h: ReturnType<typeof useYourSounds>) => h.renameKit(KIT.id, 'x'),
      'Too many kits',
    ],
    ['deleteKit', (h: ReturnType<typeof useYourSounds>) => h.deleteKit(KIT.id), 'Too many kits'],
    [
      'clearSlot',
      (h: ReturnType<typeof useYourSounds>) => h.clearSlot(KIT.id, 'k'),
      'Too many kits',
    ],
    [
      'deleteSample',
      (h: ReturnType<typeof useYourSounds>) => h.deleteSample(KIT.slots.k.sampleId),
      'Too many kits',
    ],
  ])('%s says the server’s reason and changes nothing', async (_name, call, message) => {
    fetchMock.mockResolvedValue(refuse(message, 409));
    const { result } = mount({ kits: [KIT], samples: SAMPLES });

    let answer: unknown;
    await act(async () => {
      answer = await call(result.current);
    });

    expect(answer === false || answer === null).toBe(true);
    expect(say).toHaveBeenCalledWith(message);
    expect(result.current.kits).toEqual([KIT]);
    expect(result.current.samples).toEqual(SAMPLES.samples);
  });

  it('says its own sentence when the network, not the server, failed', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = mount({ kits: [KIT] });

    await act(async () => {
      await result.current.deleteKit(KIT.id);
    });
    expect(say).toHaveBeenCalledWith('Could not delete the kit — try again');
  });
});

describe('the kit calls, when they work', () => {
  it('renames and empties a slot from the kit the server answers with', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ success: true, data: { ...KIT, label: 'Renamed' } }))
      .mockResolvedValueOnce(
        json({ success: true, data: { ...KIT, label: 'Renamed', slots: {} } })
      );
    const { result } = mount({ kits: [KIT] });

    await act(async () => {
      expect(await result.current.renameKit(KIT.id, 'Renamed')).toBe(true);
    });
    expect(result.current.kits[0].label).toBe('Renamed');

    await act(async () => {
      expect(await result.current.clearSlot(KIT.id, 'k')).toBe(true);
    });
    expect(result.current.kits[0].slots).toEqual({});
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({ slots: { k: null } });
  });

  it('makes a kit with no label by sending none', async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          success: true,
          data: { id: 'ckit00000000000000000002', key: 'yours-b', label: 'My kit', slots: {} },
        },
        201
      )
    );
    const { result } = mount();

    await act(async () => {
      await result.current.createKit();
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({});
    expect(result.current.kits.map((k) => k.key)).toEqual(['yours-b']);
  });

  it('empties the slots a deleted sample was in', async () => {
    fetchMock.mockResolvedValue(
      json({
        success: true,
        data: {
          id: KIT.slots.k.sampleId,
          deleted: true,
          usage: { ...SAMPLES.usage, count: 0, bytes: 0 },
        },
      })
    );
    const { result } = mount({ kits: [KIT], samples: SAMPLES });

    await act(async () => {
      expect(await result.current.deleteSample(KIT.slots.k.sampleId)).toBe(true);
    });

    expect(result.current.kits[0].slots).toEqual({});
    expect(result.current.samples).toEqual([]);
    expect(result.current.usage.count).toBe(0);
  });
});
