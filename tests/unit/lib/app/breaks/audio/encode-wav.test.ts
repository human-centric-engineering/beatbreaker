/**
 * The browser's sample encoder (4A.9): whatever you pick goes up as mono,
 * 16-bit, 44.1 kHz WAV with the silence in front trimmed — checked here with
 * the server's own reader, so the two sides are held to one format.
 *
 * Web Audio is faked at the `OfflineAudioContext` seam. The fake resamples by
 * nearest neighbour: good enough to show a 48 kHz file comes out at 44.1 kHz
 * with the right length, which is what is under test, not the filter quality.
 */

import { describe, expect, it } from 'vitest';

import {
  type DecodedAudio,
  encodeWav,
  type MakeContext,
  mixToMono,
  trimLeadingSilence,
} from '@/lib/app/breaks/audio/encode-wav';
import { parseWav } from '@/lib/app/breaks/samples/wav';

class Buffer implements DecodedAudio {
  readonly channels: Float32Array[];
  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number
  ) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  getChannelData(c: number): Float32Array {
    return this.channels[c];
  }
  copyToChannel(source: Float32Array, c: number): void {
    this.channels[c].set(source);
  }
}

/** A context that decodes to `decoded` and renders its one source by nearest neighbour. */
function fakeContext(decoded: DecodedAudio | Error): MakeContext {
  return (channels, length, sampleRate) => {
    let playing: Buffer | null = null;
    return {
      destination: {},
      decodeAudioData: () =>
        decoded instanceof Error ? Promise.reject(decoded) : Promise.resolve(decoded),
      createBuffer: (c, n, rate) => new Buffer(c, n, rate),
      createBufferSource() {
        const node = {
          buffer: null as unknown,
          connect: () => node,
          start: () => {
            playing = node.buffer as Buffer;
          },
        };
        return node;
      },
      startRendering: () => {
        const out = new Buffer(channels, length, sampleRate);
        const src = playing!;
        for (let i = 0; i < length; i++) {
          const j = Math.floor((i * src.sampleRate) / sampleRate);
          out.channels[0][i] = j < src.length ? src.channels[0][j] : 0;
        }
        return Promise.resolve(out);
      },
    };
  };
}

/** Stereo at `rate`: `silence` seconds of nothing, then a decaying hit. */
function hit(rate: number, silence: number, seconds: number): Buffer {
  const b = new Buffer(2, Math.round(rate * seconds), rate);
  const start = Math.round(rate * silence);
  for (let i = start; i < b.length; i++) {
    const v = Math.exp(-(i - start) / (rate * 0.05)) * 0.8;
    b.channels[0][i] = v;
    b.channels[1][i] = v / 2;
  }
  return b;
}

const file = (bytes = 100) => new Blob([new Uint8Array(bytes)]);

describe('encodeWav', () => {
  it('turns a 48 kHz stereo file into mono 16-bit 44.1 kHz with the silence gone', async () => {
    const result = await encodeWav(file(), fakeContext(hit(48_000, 0.25, 1.25)));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bytes = new Uint8Array(await result.wav.arrayBuffer());
    const verdict = parseWav(bytes);
    // mono, 16-bit, 44.1 kHz: anything else and the server's reader refuses it
    expect(verdict.ok).toBe(true);
    // a quarter-second of silence trimmed from 1.25 s, less the millisecond kept
    expect(result.durationMs).toBeGreaterThanOrEqual(1000);
    expect(result.durationMs).toBeLessThanOrEqual(1002);
    expect(verdict.ok && verdict.durationMs).toBe(result.durationMs);

    // the attack lands in the first couple of milliseconds, not a quarter-second in
    const pcm = new DataView(bytes.buffer, 44);
    const loud = Array.from({ length: 200 }, (_, i) =>
      Math.abs(pcm.getInt16(i * 2, true))
    ).findIndex((v) => v > 1000);
    expect(loud).toBeGreaterThanOrEqual(0);
    expect(loud).toBeLessThan(100);
    expect(result.wav.type).toBe('audio/wav');
  });

  it('refuses a file longer than 12 seconds once trimmed, saying how long', async () => {
    const result = await encodeWav(file(), fakeContext(hit(44_100, 0, 12.5)));
    expect(result).toEqual({
      ok: false,
      message: 'That is 12.5 seconds long — a sample can be at most 12',
    });
  });

  it('keeps a file whose silence takes it past 12 seconds untrimmed', async () => {
    const result = await encodeWav(file(), fakeContext(hit(44_100, 1, 12.5)));
    expect(result.ok).toBe(true);
  });

  it('refuses a file it cannot decode', async () => {
    const result = await encodeWav(file(), fakeContext(new Error('EncodingError')));
    expect(result).toEqual({
      ok: false,
      message: 'Could not decode that file — try WAV, MP3, FLAC or M4A',
    });
  });

  it('refuses a file too big to be one hit, without decoding it', async () => {
    const result = await encodeWav(file(33 * 1024 * 1024), fakeContext(new Error('not reached')));
    expect(result).toEqual({
      ok: false,
      message: 'That file is 33.0 MB — pick a single hit under 32.0 MB',
    });
  });

  it('says so when there is no Web Audio', async () => {
    expect(await encodeWav(file(), null)).toEqual({
      ok: false,
      message: 'This browser has no Web Audio',
    });
  });
});

describe('mixToMono', () => {
  it('averages the channels', () => {
    const b = new Buffer(2, 2, 44_100);
    b.channels[0].set([1, 0.5]);
    b.channels[1].set([0, 0.5]);
    expect(Array.from(mixToMono(b))).toEqual([0.5, 0.5]);
  });
});

describe('trimLeadingSilence', () => {
  it('leaves a silent file alone', () => {
    const silent = new Float32Array(10);
    expect(trimLeadingSilence(silent, 1000)).toBe(silent);
  });

  it('keeps a millisecond before the attack', () => {
    const s = new Float32Array(20);
    s[10] = 1;
    // at 1 kHz a millisecond is one sample
    expect(trimLeadingSilence(s, 1000).length).toBe(11);
  });
});
