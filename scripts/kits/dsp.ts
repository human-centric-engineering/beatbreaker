/**
 * The pipeline's signal work, pure: mixing, trimming, measuring.
 *
 * Everything here takes and returns mono Float32 at {@link RATE}. Decoding
 * and encoding are `ffmpeg.ts`'s; this file never touches a file, so it is
 * tested on synthesised signals.
 */

export const RATE = 44100;

/** Mix mics to mono by weight. Shorter inputs are padded with silence. */
export function mix(inputs: Array<{ pcm: Float32Array; weight: number }>): Float32Array {
  const len = Math.max(0, ...inputs.map((x) => x.pcm.length));
  const out = new Float32Array(len);
  for (const { pcm, weight } of inputs)
    for (let i = 0; i < pcm.length; i++) out[i] += pcm[i] * weight;
  return out;
}

export function peakOf(pcm: Float32Array): number {
  let peak = 0;
  for (const x of pcm) if (Math.abs(x) > peak) peak = Math.abs(x);
  return peak;
}

const db = (x: number): number => 20 * Math.log10(Math.max(x, 1e-12));
const amp = (d: number): number => 10 ** (d / 20);

/**
 * Where the hit starts: the first sample over −50 dBFS — or over 20 dB under
 * the peak, if the hit is too soft for −50 to mean anything — less half a
 * millisecond, so the front of the transient survives.
 */
export function onsetIndex(pcm: Float32Array): number {
  const th = Math.min(amp(-50), peakOf(pcm) * amp(-20));
  for (let i = 0; i < pcm.length; i++) {
    if (Math.abs(pcm[i]) > th) return Math.max(0, i - Math.round(RATE * 0.0005));
  }
  return 0;
}

/** The fade at the end of every sample. */
export const FADE_S = 0.03;

/**
 * Cut from the onset to where the hit has died 60 dB under its peak, or to
 * `capS`, whichever is sooner, and fade the last {@link FADE_S} to silence.
 */
export function trimHit(pcm: Float32Array, capS: number): Float32Array {
  const start = onsetIndex(pcm);
  const th = peakOf(pcm) * amp(-60);
  let last = start;
  for (let i = pcm.length - 1; i > start; i--) {
    if (Math.abs(pcm[i]) > th) {
      last = i;
      break;
    }
  }
  const fade = Math.round(RATE * FADE_S);
  const end = Math.min(last + 1 + fade, start + Math.round(RATE * capS), pcm.length);
  const out = pcm.slice(start, end);
  const n = Math.min(fade, out.length);
  for (let i = 0; i < n; i++) out[out.length - 1 - i] *= i / n;
  return out;
}

/** One biquad section, Direct Form I. */
function biquad(
  x: Float32Array,
  [b0, b1, b2, a1, a2]: [number, number, number, number, number]
): Float32Array {
  const y = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
}

/**
 * ITU-R BS.1770's K-weighting at {@link RATE}: its high shelf and its high
 * pass, designed for this rate from the standard's analogue parameters rather
 * than taken from its 48 kHz table.
 */
export function kWeight(pcm: Float32Array): Float32Array {
  const shelf = ((): [number, number, number, number, number] => {
    const f0 = 1681.974450955533;
    const G = 3.999843853973347;
    const Q = 0.7071752369554196;
    const K = Math.tan((Math.PI * f0) / RATE);
    const Vh = 10 ** (G / 20);
    const Vb = Vh ** 0.4996667741545416;
    const a0 = 1 + K / Q + K * K;
    return [
      (Vh + (Vb * K) / Q + K * K) / a0,
      (2 * (K * K - Vh)) / a0,
      (Vh - (Vb * K) / Q + K * K) / a0,
      (2 * (K * K - 1)) / a0,
      (1 - K / Q + K * K) / a0,
    ];
  })();
  const highpass = ((): [number, number, number, number, number] => {
    const f0 = 38.13547087602444;
    const Q = 0.5003270373238773;
    const K = Math.tan((Math.PI * f0) / RATE);
    const a0 = 1 + K / Q + K * K;
    return [1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0];
  })();
  return biquad(biquad(pcm, shelf), highpass);
}

/** The window loudness is measured over, from the onset. */
export const LOUDNESS_WINDOW_S = 0.15;

/**
 * A one-shot's loudness, in dB: K-weighted RMS over the first 150 ms after
 * its onset. LUFS-integrated gates in 400 ms blocks and is wrong for a drum
 * hit (`sound-plan.md` §6). Expects a trimmed hit, which starts at its onset.
 */
export function loudness(hit: Float32Array): number {
  const w = kWeight(hit);
  const n = Math.min(w.length, Math.round(RATE * LOUDNESS_WINDOW_S));
  if (n === 0) return -Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += w[i] * w[i];
  return db(Math.sqrt(sum / n));
}

/** The most a slot's `trim` may be: the kit slot schema's ceiling. */
export const TRIM_CEILING = 4;

/** How loud a sample may be made at build time: a decibel of headroom for the encoder. */
export const BAKE_PEAK = amp(-1);

/**
 * Split the gain a piece needs between its `trim` and the samples themselves.
 * The trim takes what it can, up to {@link TRIM_CEILING}; the rest is baked
 * into every sample of the piece alike, so a layer's level against the next is
 * untouched, and only so far that the loudest of them peaks at {@link BAKE_PEAK}.
 * A quietly recorded piece (DRSKit's brushes) still reaches its role's level.
 */
export function splitGain(needed: number, peak: number): { trim: number; bake: number } {
  const trim = Math.min(TRIM_CEILING, needed);
  const bake = Math.max(1, Math.min(needed / trim, peak > 0 ? BAKE_PEAK / peak : 1));
  return { trim, bake };
}

export { amp, db };
