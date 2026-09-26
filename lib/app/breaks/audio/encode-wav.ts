import { MAX_PICKED_BYTES, MAX_SAMPLE_SECONDS, mb } from '@/lib/app/breaks/samples/limits';
import { SAMPLE_FORMAT, writeWav } from '@/lib/app/breaks/samples/wav';

/**
 * Turn whatever file you picked into the one format a sample is stored in
 * (D20): mono, 16-bit PCM, 44.1 kHz WAV, with the silence in front trimmed.
 *
 * Browser only — it needs Web Audio to decode an mp3 or an m4a — and done here
 * rather than on the server so the server never has to decode anything: it
 * reads a WAV header and refuses what does not match (`parseWav`).
 *
 * Decode → mix to mono → resample to 44.1 kHz through an
 * `OfflineAudioContext` → trim the leading silence → write PCM16. The trim is
 * the same rule `onsetOf` uses for the packs: a drum that starts 23 ms late
 * is a drum in the wrong place, and here the silence is cut from the file
 * rather than skipped at playback, so it costs nothing to store.
 */

export type Encoded = { ok: true; wav: Blob; durationMs: number } | { ok: false; message: string };

/** The slice of `AudioBuffer` this reads. */
export interface DecodedAudio {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

/** The slice of `OfflineAudioContext` this drives — injectable, so it tests without a browser. */
export interface RenderContext {
  decodeAudioData(data: ArrayBuffer): Promise<DecodedAudio>;
  createBuffer(
    channels: number,
    length: number,
    sampleRate: number
  ): DecodedAudio & {
    copyToChannel(source: Float32Array<ArrayBuffer>, channel: number): void;
  };
  createBufferSource(): {
    buffer: unknown;
    connect(destination: unknown): unknown;
    start(): void;
  };
  destination: unknown;
  startRendering(): Promise<DecodedAudio>;
}

export type MakeContext = (channels: number, length: number, sampleRate: number) => RenderContext;

function browserContext(): MakeContext | null {
  if (typeof OfflineAudioContext === 'undefined') return null;
  // structurally a `RenderContext`: the narrower interface is what lets tests supply a fake
  return (channels, length, sampleRate) => new OfflineAudioContext(channels, length, sampleRate);
}

/** The channels averaged into one, so a stereo kick is not twice as loud as a mono one. */
export function mixToMono(audio: DecodedAudio): Float32Array<ArrayBuffer> {
  const out = new Float32Array(audio.length);
  const n = audio.numberOfChannels;
  for (let c = 0; c < n; c++) {
    const data = audio.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] += data[i] / n;
  }
  return out;
}

/**
 * Everything before the attack, cut. The attack is the first sample above 2%
 * of the peak, less a millisecond so the very front of the transient
 * survives. A silent file is left as it is.
 */
export function trimLeadingSilence(samples: Float32Array, sampleRate: number): Float32Array {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  if (peak === 0) return samples;
  const threshold = peak * 0.02;
  const first = samples.findIndex((s) => Math.abs(s) > threshold);
  const start = Math.max(0, first - Math.round(sampleRate * 0.001));
  return samples.subarray(start);
}

/** Encode `file` as a sample, or say why it cannot be one. */
export async function encodeWav(
  file: Blob,
  makeContext: MakeContext | null = browserContext()
): Promise<Encoded> {
  if (!makeContext) return { ok: false, message: 'This browser has no Web Audio' };
  if (file.size > MAX_PICKED_BYTES) {
    return {
      ok: false,
      message: `That file is ${mb(file.size)} MB — pick a single hit under ${mb(MAX_PICKED_BYTES)} MB`,
    };
  }

  const rate = SAMPLE_FORMAT.sampleRate;
  let decoded: DecodedAudio;
  try {
    decoded = await makeContext(1, 1, rate).decodeAudioData(await file.arrayBuffer());
  } catch {
    return { ok: false, message: 'Could not decode that file — try WAV, MP3, FLAC or M4A' };
  }

  const frames = Math.max(1, Math.ceil((decoded.length / decoded.sampleRate) * rate));
  const ctx = makeContext(1, frames, rate);
  const mono = ctx.createBuffer(1, decoded.length, decoded.sampleRate);
  mono.copyToChannel(mixToMono(decoded), 0);
  const source = ctx.createBufferSource();
  source.buffer = mono;
  source.connect(ctx.destination);
  source.start();
  const rendered = await ctx.startRendering();

  const samples = trimLeadingSilence(rendered.getChannelData(0), rate);
  const seconds = samples.length / rate;
  if (seconds > MAX_SAMPLE_SECONDS) {
    return {
      ok: false,
      message: `That is ${Math.round(seconds * 10) / 10} seconds long — a sample can be at most ${MAX_SAMPLE_SECONDS}`,
    };
  }

  return {
    ok: true,
    wav: new Blob([writeWav(samples)], { type: 'audio/wav' }),
    durationMs: Math.round(seconds * 1000),
  };
}
