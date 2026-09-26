// @vitest-environment happy-dom

/**
 * `YourSampleSource` — your own kits, played from your account (D20,
 * `lib/app/breaks/audio/your-samples.ts`).
 *
 * `engine.init()` runs for real, on `engine.test.ts`'s `FakeAudioContext`,
 * with a stubbed `decodeAudioData` added below. `fetch` is stubbed per test:
 * what is under test is which URLs are asked for, what happens when one fails,
 * and what plays once the buffers are in.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BreakAudio } from '@/lib/app/breaks/audio/engine';
import { RETRY_DELAYS_MS, YourSampleSource } from '@/lib/app/breaks/audio/your-samples';
import type { ResolvedKit } from '@/lib/app/breaks/kit';
import { yourKitToCatalogue } from '@/lib/app/breaks/samples/your-kit';
import { testKit } from '@/tests/helpers/catalogue';
import { FakeAudioBuffer, FakeAudioContext } from '@/tests/helpers/fake-audio-context';

const { loggerWarn } = vi.hoisted(() => ({ loggerWarn: vi.fn() }));
vi.mock('@/lib/logging', () => ({
  logger: { warn: loggerWarn, info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

class DecodingContext extends FakeAudioContext {
  decodeAudioData = vi.fn(
    async (_data: ArrayBuffer): Promise<AudioBuffer> =>
      new FakeAudioBuffer(1, 4410, 44100) as unknown as AudioBuffer
  );
}

const KICK = 'csmp00000000000000000001';
const SNARE = 'csmp00000000000000000002';
const HAT = 'csmp00000000000000000003';

/** A kit of yours with the given slot → sample id. */
function kitWith(slots: Record<string, string>): ResolvedKit {
  return yourKitToCatalogue({
    id: 'ckit00000000000000000001',
    key: 'yours-a',
    label: 'Mine',
    slots: Object.fromEntries(
      Object.entries(slots).map(([slot, sampleId]) => [
        slot,
        { sampleId, name: `${slot}.wav`, audioUrl: '' },
      ])
    ),
  });
}

function initEngine(kit: ResolvedKit | null): { audio: BreakAudio; ctx: DecodingContext } {
  const audio = new BreakAudio();
  audio.setKit(kit, null);
  const ctx = audio.init() as unknown as DecodingContext;
  return { audio, ctx };
}

const fetchMock = vi.fn();

beforeEach(() => {
  FakeAudioContext.instances.length = 0;
  FakeAudioContext.throwOnConstruct = false;
  window.AudioContext = DecodingContext as unknown as typeof AudioContext;
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response(new Uint8Array(8)));
  vi.stubGlobal('fetch', fetchMock);
  loggerWarn.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('load()', () => {
  it('fetches each sample in the kit from its owner-checked audio route, once', async () => {
    const kit = kitWith({ k: KICK, s: SNARE });
    const { audio } = initEngine(kit);
    const onChange = vi.fn();
    const source = new YourSampleSource(onChange);

    await source.load(audio, kit);
    await source.load(audio, kit);

    expect(fetchMock.mock.calls.map((c) => c[0]).sort()).toEqual([
      `/api/v1/samples/${KICK}/audio`,
      `/api/v1/samples/${SNARE}/audio`,
    ]);
    expect(source.count(kit)).toBe(2);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('fetches only the new sample when a slot changes', async () => {
    const before = kitWith({ k: KICK });
    const { audio } = initEngine(before);
    const source = new YourSampleSource();
    await source.load(audio, before);
    fetchMock.mockClear();

    await source.load(audio, kitWith({ k: KICK, s: SNARE }));

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([`/api/v1/samples/${SNARE}/audio`]);
  });

  it('leaves a sample that will not load as an empty slot, says so once, and does not retry it', async () => {
    const kit = kitWith({ k: KICK, s: SNARE });
    const { audio } = initEngine(kit);
    fetchMock.mockImplementation(async (url: string) =>
      url.includes(KICK) ? new Response(null, { status: 404 }) : new Response(new Uint8Array(8))
    );
    const source = new YourSampleSource();

    await source.load(audio, kit);
    await source.load(audio, kit);

    expect(source.count(kit)).toBe(1);
    expect(loggerWarn).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // the kick falls through to the synthesised voice
    expect(source.hit(audio, 0, 'k', 1)).toBe(false);
    expect(source.failedCount(kit)).toBe(1);
  });

  it('tries a sample that failed for now again after a wait, and plays it once it lands', async () => {
    vi.useFakeTimers();
    const kit = kitWith({ k: KICK });
    const { audio } = initEngine(kit);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    const onChange = vi.fn();
    const source = new YourSampleSource(onChange);

    await source.load(audio, kit);
    expect(source.count(kit)).toBe(0);
    // still on its way, not given up on
    expect(source.failedCount(kit)).toBe(0);
    // a kit change while it waits does not ask a second time
    await source.load(audio, kit);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(source.count(kit)).toBe(1);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(source.hit(audio, 0, 'k', 1)).toBe(true);
    expect(loggerWarn).not.toHaveBeenCalled();
  });

  it('gives up on a sample whose connection keeps dropping once its retries are spent, and says so', async () => {
    vi.useFakeTimers();
    const kit = kitWith({ k: KICK });
    const { audio } = initEngine(kit);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const source = new YourSampleSource();

    await source.load(audio, kit);
    for (const delay of RETRY_DELAYS_MS) await vi.advanceTimersByTimeAsync(delay);

    expect(fetchMock).toHaveBeenCalledTimes(1 + RETRY_DELAYS_MS.length);
    expect(source.failedCount(kit)).toBe(1);
    expect(loggerWarn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    await source.load(audio, kit);
    expect(fetchMock).toHaveBeenCalledTimes(1 + RETRY_DELAYS_MS.length);
  });

  it('retries a 429, but not a file that will not decode', async () => {
    vi.useFakeTimers();
    const kit = kitWith({ k: KICK, s: SNARE });
    const { audio, ctx } = initEngine(kit);
    fetchMock.mockImplementation(async (url: string) =>
      url.includes(KICK) ? new Response(null, { status: 429 }) : new Response(new Uint8Array(8))
    );
    ctx.decodeAudioData.mockRejectedValueOnce(new DOMException('bad data', 'EncodingError'));
    const source = new YourSampleSource();

    await source.load(audio, kit);

    // the snare did not decode: given up on at once
    expect(source.failedCount(kit)).toBe(1);
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);
    const asked = fetchMock.mock.calls.map((c) => c[0]);
    expect(asked.filter((u) => u.includes(KICK))).toHaveLength(2);
    expect(asked.filter((u) => u.includes(SNARE))).toHaveLength(1);
  });

  it('does not retry for an engine that has been closed while it waited', async () => {
    vi.useFakeTimers();
    const kit = kitWith({ k: KICK });
    const { audio } = initEngine(kit);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const source = new YourSampleSource();

    await source.load(audio, kit);
    audio.close();
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks for nothing on a kit that is not yours', async () => {
    const pack = testKit('muldjord');
    const { audio } = initEngine(pack);
    const source = new YourSampleSource();

    source.refresh(audio);
    await source.load(audio, pack);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(source.count(pack)).toBe(0);
  });
});

describe('hit()', () => {
  it('plays the slot’s sample with the kit’s speed and level', async () => {
    const kit = kitWith({ k: KICK });
    const { audio } = initEngine(kit);
    const source = new YourSampleSource();
    await source.load(audio, kit);
    const playBuf = vi.spyOn(audio, 'playBuf');

    expect(source.hit(audio, 0.1, 'k', 0.8)).toBe(true);

    const [, , gain, voice, rate] = playBuf.mock.calls[0];
    expect(voice).toBe('k');
    expect(rate).toBeCloseTo(kit.k.rate, 9);
    expect(gain).toBeCloseTo(0.8 * kit.k.level, 9);
  });

  it('does not play once the engine has moved to a kit that is not yours', async () => {
    const kit = kitWith({ k: KICK });
    const { audio } = initEngine(kit);
    const source = new YourSampleSource();
    await source.load(audio, kit);

    audio.setKit(testKit('muldjord'), null);
    expect(source.hit(audio, 0, 'k', 1)).toBe(false);
  });

  it('falls back to the slot it stands in for: an open hat from the closed one, with its tail noted', async () => {
    const kit = kitWith({ h: HAT });
    const { audio } = initEngine(kit);
    const source = new YourSampleSource();
    await source.load(audio, kit);
    const noteHatTail = vi.spyOn(audio, 'noteHatTail');

    expect(source.hit(audio, 0, 'hOpen', 1)).toBe(true);
    expect(noteHatTail).toHaveBeenCalledTimes(1);
  });

  it('plays a ghost snare quieter from the snare when there is no ghost sample', async () => {
    const kit = kitWith({ s: SNARE });
    const { audio } = initEngine(kit);
    const source = new YourSampleSource();
    await source.load(audio, kit);
    const playBuf = vi.spyOn(audio, 'playBuf');

    expect(source.hit(audio, 0, 'sGhost', 1)).toBe(true);
    expect(playBuf.mock.calls[0][2]).toBeCloseTo(kit.s.level * 0.62, 9);
  });

  it('returns false for an empty slot with nothing to fall back to, and for a slot that is not one', () => {
    const kit = kitWith({});
    const { audio } = initEngine(kit);
    const source = new YourSampleSource();

    expect(source.hit(audio, 0, 'k', 1)).toBe(false);
    expect(source.hit(audio, 0, 'not-a-slot', 1)).toBe(false);
  });
});
