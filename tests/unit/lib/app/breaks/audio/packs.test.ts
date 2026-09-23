/**
 * `PackSource` — the recorded kits (`lib/app/breaks/audio/packs.ts`).
 *
 * Two things moved under this branch and both are worth pinning directly
 * rather than trusting the refactor: the slot map now arrives on the kit row
 * itself (`kit.samples.slots`) instead of a `/kits/manifest.json` fetch, and
 * the shared percussion set is found by reading `engine.percussion` instead of
 * the hard-coded `PERC_FROM = 'virtuosity'`. Get either wrong and nothing
 * throws — a lane just quietly falls through to the synthesised voice, which
 * reads as a mediocre kit rather than a bug.
 *
 * `FakeAudioContext` (`tests/helpers/fake-audio-context.ts`) stands in for Web
 * Audio, same as `engine.test.ts`. It has no decode step of its own — nothing
 * else needs one — so a small subclass here adds a stubbed
 * `decodeAudioData`, and `fetch` is stubbed per test since neither exists
 * outside a browser.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BreakAudio } from '@/lib/app/breaks/audio/engine';
import { onsetOf, PackSource } from '@/lib/app/breaks/audio/packs';
import type { KitSamples, ResolvedKit } from '@/lib/app/breaks/kit';
import { testKit } from '@/tests/helpers/catalogue';
import { FakeAudioBuffer, FakeAudioContext } from '@/tests/helpers/fake-audio-context';

class DecodingContext extends FakeAudioContext {
  decodeAudioData = vi.fn(
    async (_data: ArrayBuffer): Promise<AudioBuffer> =>
      new FakeAudioBuffer(1, 4410, 44100) as unknown as AudioBuffer
  );
}

/** A real pack kit from the seed data, with a slot map the test controls. */
function packKit(samples: KitSamples, overrides: Partial<ResolvedKit> = {}): ResolvedKit {
  return { ...testKit('muldjord'), samples, ...overrides };
}

let engine: BreakAudio;
let ctx: DecodingContext;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  ctx = new DecodingContext();
  engine = new BreakAudio();
  engine.ctx = ctx as unknown as AudioContext;
  fetchMock = vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) }));
  vi.stubGlobal('fetch', fetchMock);
  // every jitter formula in the engine is `1 + (Math.random() - 0.5) * k`,
  // which resolves to exactly 1 at 0.5 — deterministic numbers, no noise
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/* ---------------------------------------------------------------------- */
/* onsetOf: the mp3 encoder-delay trim                                    */
/* ---------------------------------------------------------------------- */

describe('onsetOf()', () => {
  it('finds the transient and backs off a millisecond so the attack survives', () => {
    const sampleRate = 44100;
    const buf = new FakeAudioBuffer(1, 4410, sampleRate);
    const onsetSample = 1000;
    const data = buf.getChannelData(0);
    for (let i = onsetSample; i < data.length; i++) data[i] = 1; // silence, then a transient

    const t = onsetOf(buf as unknown as AudioBuffer);
    const rawOnset = onsetSample / sampleRate;

    // the whole point of the 1ms back-off: earlier than the transient itself,
    // not exactly on it — playback that starts exactly on the peak clips the
    // front of the attack
    expect(t).toBeLessThan(rawOnset);
    expect(t).toBeCloseTo(rawOnset - 0.001, 4);
  });

  it('clamps to zero rather than going negative for a transient right at the start', () => {
    const buf = new FakeAudioBuffer(1, 100, 44100);
    buf.getChannelData(0)[2] = 1; // 2 samples in — a naive 1ms back-off would go negative
    expect(onsetOf(buf as unknown as AudioBuffer)).toBe(0);
  });

  it('returns 0 for silence — there is no transient to find', () => {
    const buf = new FakeAudioBuffer(1, 4410, 44100);
    expect(onsetOf(buf as unknown as AudioBuffer)).toBe(0);
  });
});

/* ---------------------------------------------------------------------- */
/* refresh(): the seam that replaced the manifest fetch                   */
/* ---------------------------------------------------------------------- */

describe('refresh()', () => {
  it("loads a pack kit, passing the kit row's own samples.slots", () => {
    const slots = { s: { v: null, files: ['s.mp3'] } };
    engine.kit = packKit({ slots });
    const source = new PackSource();
    const loadSpy = vi.spyOn(source, 'load').mockResolvedValue();

    source.refresh(engine);

    // the slot map came from the kit row, not from a fetched manifest
    expect(loadSpy).toHaveBeenCalledWith(engine, 'muldjord', slots);
  });

  it('does nothing for a kit whose engine is not pack', () => {
    engine.kit = testKit('studio70'); // engine: 'synth'
    const source = new PackSource();
    const loadSpy = vi.spyOn(source, 'load').mockResolvedValue();

    source.refresh(engine);

    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('does not half-load a pack kit that names no slot map', async () => {
    engine.kit = packKit({}); // no `slots` at all — a row with nothing to play
    const source = new PackSource();

    source.refresh(engine);
    await Promise.resolve();
    await Promise.resolve();

    expect(source.isReady('muldjord')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/* ---------------------------------------------------------------------- */
/* load(): idempotent, no duplicate decode work                          */
/* ---------------------------------------------------------------------- */

describe('load()', () => {
  it('does not redecode a pack that has already finished loading', async () => {
    const slots = { s: { v: null, files: ['s.mp3'] } };
    const source = new PackSource();

    await source.load(engine, 'muldjord', slots);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await source.load(engine, 'muldjord', slots);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no second round of fetches
  });

  it('does not start a second decode while one is already in flight', async () => {
    const slots = { s: { v: null, files: ['s.mp3'] } };
    const source = new PackSource();

    const first = source.load(engine, 'muldjord', slots);
    const second = source.load(engine, 'muldjord', slots); // fired before `first` settles
    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

/* ---------------------------------------------------------------------- */
/* hit()                                                                  */
/* ---------------------------------------------------------------------- */

describe('hit()', () => {
  it('returns false and kicks off the load when the pack has not decoded yet', () => {
    const slots = { s: { v: null, files: ['s.mp3'] } };
    engine.kit = packKit({ slots });
    const source = new PackSource();
    const loadSpy = vi.spyOn(source, 'load').mockResolvedValue();

    // the synthesised voice covers for this bar while the pack decodes
    expect(source.hit(engine, 0, 's', 1)).toBe(false);
    expect(loadSpy).toHaveBeenCalledWith(engine, 'muldjord', slots);
  });

  it('returns false outright for a kit that is not a pack kit at all', () => {
    engine.kit = testKit('studio70'); // engine: 'synth'
    const source = new PackSource();
    expect(source.hit(engine, 0, 's', 1)).toBe(false);
  });

  it('falls back to the fall slot, softened, when the requested slot has nothing of its own', async () => {
    const slots = { s: { v: null, files: ['s.mp3'] } }; // no sGhost recording
    engine.kit = packKit({ slots });
    const source = new PackSource();
    await source.load(engine, 'muldjord', slots);
    const playBuf = vi.spyOn(engine, 'playBuf');

    expect(source.hit(engine, 0.1, 's', 0.8)).toBe(true);
    const normalGain = playBuf.mock.calls[0][2];

    expect(source.hit(engine, 0.2, 'sGhost', 0.8)).toBe(true);
    const ghostGain = playBuf.mock.calls[1][2];

    // both calls play the same recording (sGhost falls back to s) at the same
    // velocity — the only difference is the documented 0.6x soften for a kit
    // with no rest strokes of its own
    expect(ghostGain).toBeCloseTo(normalGain * 0.6, 9);
  });
});

/* ---------------------------------------------------------------------- */
/* loadPerc(): the seam that replaced PERC_FROM = 'virtuosity'            */
/* ---------------------------------------------------------------------- */

describe('loadPerc()', () => {
  it('does nothing when the engine has no percussion source', async () => {
    engine.percussion = null;
    const source = new PackSource();

    await source.loadPerc(engine);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(source.percCount()).toBe(0);
  });

  it('reads engine.percussion for which kit carries the recordings, not a hard-coded pack', async () => {
    // deliberately not "virtuosity" — the constant this seam replaced. If
    // loadPerc() ever regresses back to a hard-coded pack name, this fetch
    // call would silently point at the wrong folder instead of failing loudly.
    engine.percussion = {
      pack: 'not-the-old-hardcoded-pack',
      slots: { tamb: { v: null, files: ['tamb.mp3'] } },
    };
    const source = new PackSource();

    await source.loadPerc(engine);

    expect(fetchMock).toHaveBeenCalledWith('/kits/not-the-old-hardcoded-pack/tamb.mp3', {
      redirect: 'error',
    });
    expect(source.percCount()).toBe(1);
  });
});

/* ---------------------------------------------------------------------- */
/* count(): the kit panel's "N of M loaded" status line                  */
/* ---------------------------------------------------------------------- */

describe('count()', () => {
  it('returns 0 for a pack that has not decoded, or even started to', () => {
    const source = new PackSource();
    expect(source.count('muldjord')).toBe(0);
  });

  it('counts only the slots that ended up with at least one decoded layer', async () => {
    // one file decodes fine, the other 404s. Per decode()'s docblock "a layer
    // that fails to decode is dropped rather than fatal" — but a slot whose
    // *every* layer was dropped is not a loaded slot, and should not inflate
    // the status line the kit panel shows.
    fetchMock = vi.fn(async (url: string) => {
      if (url.includes('missing.mp3')) throw new Error('404');
      return { arrayBuffer: async () => new ArrayBuffer(8) };
    });
    vi.stubGlobal('fetch', fetchMock);
    const slots = {
      s: { v: null, files: ['s.mp3'] },
      sGhost: { v: null, files: ['missing.mp3'] },
    };
    engine.kit = packKit({ slots });
    const source = new PackSource();

    await source.load(engine, 'muldjord', slots);

    expect(source.count('muldjord')).toBe(1); // sGhost decoded to zero layers
  });
});

/* ---------------------------------------------------------------------- */
/* hit(): branches the existing sGhost-fallback test doesn't reach        */
/* ---------------------------------------------------------------------- */

describe('hit() — additional branches', () => {
  it('returns false for a slot id the kit vocabulary does not know', async () => {
    const slots = { s: { v: null, files: ['s.mp3'] } };
    engine.kit = packKit({ slots });
    const source = new PackSource();
    await source.load(engine, 'muldjord', slots);

    expect(source.hit(engine, 0, 'bogus-slot', 1)).toBe(false);
  });

  it('returns false when neither the slot nor its fallback has any recording', async () => {
    const slots = { k: { v: null, files: ['k.mp3'] } }; // no 's' and no sGhost either
    engine.kit = packKit({ slots });
    const source = new PackSource();
    await source.load(engine, 'muldjord', slots);

    expect(source.hit(engine, 0, 'sGhost', 1)).toBe(false);
  });

  it('falls back for hOpen at full gain (no soften) and still flags the hat tail', async () => {
    const slots = { h: { v: null, files: ['h.mp3'] } }; // no hOpen recording of its own
    engine.kit = packKit({ slots });
    const source = new PackSource();
    await source.load(engine, 'muldjord', slots);
    const playBuf = vi.spyOn(engine, 'playBuf');
    const noteHatTail = vi.spyOn(engine, 'noteHatTail');

    expect(source.hit(engine, 0, 'h', 0.8)).toBe(true);
    const normalGain = playBuf.mock.calls[0][2];

    expect(source.hit(engine, 0.1, 'hOpen', 0.8)).toBe(true);
    const fallbackGain = playBuf.mock.calls[1][2];

    // the 0.6x soften is documented as specific to sGhost's fallback — an
    // open-hat fallback plays at the same gain as the closed-hat recording
    // it borrows
    expect(fallbackGain).toBeCloseTo(normalGain, 9);
    // and it is still recognised as an open-hat hit, so chokeHats() has
    // something to choke
    expect(noteHatTail).toHaveBeenCalledTimes(1);
  });

  it('does not divide by zero when a recorded layer is tagged at velocity 0', async () => {
    const slots = { s: { v: [0], files: ['s-soft.mp3'] } };
    engine.kit = packKit({ slots });
    const source = new PackSource();
    await source.load(engine, 'muldjord', slots);
    const playBuf = vi.spyOn(engine, 'playBuf');

    // a naive `vel / pick.v` would divide by zero here; `pick.v || 1` treats
    // a v:0 layer as reference velocity 1 rather than "infinitely loud"
    expect(source.hit(engine, 0, 's', 0.5)).toBe(true);
    const gain = playBuf.mock.calls[0][2];
    // clamp(0.5 / 1, .25, 1.8) * level(0.95) * trim(1.42) * soften(1)
    expect(gain).toBeCloseTo(0.6745, 9);
  });

  it('falls back to neutral level, trim and rate when the kit or voice does not set them', async () => {
    const slots = { s: { v: null, files: ['s.mp3'] } };
    engine.kit = packKit({ slots }, { trim: undefined, s: { room: 0.1 } });
    const source = new PackSource();
    await source.load(engine, 'muldjord', slots);
    const playBuf = vi.spyOn(engine, 'playBuf');

    expect(source.hit(engine, 0, 's', 0.6)).toBe(true);
    const [, , gain, , rate] = playBuf.mock.calls[0];
    // pick.v defaults to 1 (v: null), so with level/trim/soften all neutral
    // the gain is just the velocity that was asked for
    expect(gain).toBeCloseTo(0.6, 9);
    // rate ?? 1, times a jitter that resolves to exactly 1 at Math.random() = 0.5
    expect(rate).toBeCloseTo(1, 9);
  });
});

/* ---------------------------------------------------------------------- */
/* percHit(): the shared percussion voice                                 */
/* ---------------------------------------------------------------------- */

describe('percHit()', () => {
  it('returns false and never touches playBuf when the synthesised percussion voice is forced', async () => {
    engine.percussion = { pack: 'perc', slots: { tamb: { v: null, files: ['tamb.mp3'] } } };
    const source = new PackSource();
    source.usePercSamples = false;
    await source.loadPerc(engine);
    const playBuf = vi.spyOn(engine, 'playBuf');

    expect(source.percHit(engine, 0, 'tamb', 1, false)).toBe(false);
    expect(playBuf).not.toHaveBeenCalled();
  });

  it('returns false for an instrument that was never recorded', async () => {
    engine.percussion = { pack: 'perc', slots: { tamb: { v: null, files: ['tamb.mp3'] } } };
    const source = new PackSource();
    await source.loadPerc(engine);
    const playBuf = vi.spyOn(engine, 'playBuf');

    expect(source.percHit(engine, 0, 'cowbell', 1, false)).toBe(false);
    expect(playBuf).not.toHaveBeenCalled();
  });

  it('returns false when every recording for an instrument failed to decode', async () => {
    fetchMock.mockRejectedValueOnce(new Error('404'));
    engine.percussion = { pack: 'perc', slots: { broken: { v: null, files: ['broken.mp3'] } } };
    const source = new PackSource();
    await source.loadPerc(engine);
    expect(source.percCount()).toBe(0); // decode()'s catch dropped the only layer

    const playBuf = vi.spyOn(engine, 'playBuf');
    expect(source.percHit(engine, 0, 'broken', 1, false)).toBe(false);
    expect(playBuf).not.toHaveBeenCalled();
  });

  it('plays the only recording for both the normal stroke and the accent when just one exists', async () => {
    engine.percussion = { pack: 'perc', slots: { shaker: { v: null, files: ['shaker.mp3'] } } };
    const source = new PackSource();
    await source.loadPerc(engine);
    const playBuf = vi.spyOn(engine, 'playBuf');

    expect(source.percHit(engine, 0, 'shaker', 1, false)).toBe(true);
    expect(source.percHit(engine, 0.1, 'shaker', 1, true)).toBe(true);

    // one recording can't reach for a second one — list.length > 1 is false,
    // so accenting it never indexes into rec[1]
    expect(playBuf.mock.calls[0][1]).toBe(playBuf.mock.calls[1][1]);
  });

  it('picks the second recording for an accent and the first for a normal stroke, when both exist', async () => {
    // congas and the agogô record the accent as a different drum or bell
    // rather than the same one hit harder — this is the seam that plays it
    engine.percussion = {
      pack: 'perc',
      slots: { conga: { v: null, files: ['conga-normal.mp3', 'conga-accent.mp3'] } },
    };
    const source = new PackSource();
    await source.loadPerc(engine);
    const playBuf = vi.spyOn(engine, 'playBuf');

    source.percHit(engine, 0, 'conga', 1, false);
    source.percHit(engine, 0.1, 'conga', 1, true);

    const normalBuf = playBuf.mock.calls[0][1];
    const accentBuf = playBuf.mock.calls[1][1];
    expect(normalBuf).not.toBe(accentBuf);
  });

  it("reads gain, pitch jitter and brightness from the live 'p' voice, defaulting to neutral when a knob is unset", async () => {
    engine.percussion = { pack: 'perc', slots: { tamb: { v: null, files: ['tamb.mp3'] } } };
    const source = new PackSource();
    await source.loadPerc(engine);
    const playBuf = vi.spyOn(engine, 'playBuf');

    engine.sound = { p: {} };
    source.percHit(engine, 0.5, 'tamb', 0.8, false);
    const first = playBuf.mock.calls[0];
    expect(first[3]).toBe('p'); // voice, for send()'s room routing
    expect(first[2]).toBeCloseTo(0.8, 9); // vel * (level ?? 1) = 0.8 * 1
    expect(first[4]).toBeCloseTo(1, 9); // (tune ?? 1) * jitter(=1 at random()=0.5)
    expect(first[6]).toBeCloseTo(0, 9); // (tone ?? 1 - 1) * 9

    engine.sound = { p: { level: 0.5, tone: 1.5, tune: 1.2 } };
    source.percHit(engine, 1, 'tamb', 0.8, false);
    const second = playBuf.mock.calls[1];
    expect(second[2]).toBeCloseTo(0.4, 9); // 0.8 * 0.5
    expect(second[4]).toBeCloseTo(1.2, 9); // 1.2 * jitter(1)
    expect(second[6]).toBeCloseTo(4.5, 9); // (1.5 - 1) * 9
  });
});
