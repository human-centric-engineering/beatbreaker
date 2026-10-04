/**
 * The pipeline's signal work (`scripts/kits/dsp.ts`), on synthesised hits.
 *
 * These numbers decide where every shipped sample starts, how long it rings
 * and how loud the kit thinks it is, and none of it is audible in a test run.
 * A mistake here is a kit that sounds late, clipped or out of balance.
 */

import { describe, expect, it } from 'vitest';

import {
  amp,
  BAKE_PEAK,
  FADE_S,
  kWeight,
  loudness,
  mix,
  onsetIndex,
  RATE,
  splitGain,
  TRIM_CEILING,
  trimHit,
} from '@/scripts/kits/dsp';

/** `pre` seconds of silence, then a decaying sine at `level` that lasts `len` seconds. */
function hit(pre: number, len: number, level = 0.5, freq = 1000, decayS = 0.2): Float32Array {
  const a = Math.round(pre * RATE);
  const out = new Float32Array(a + Math.round(len * RATE));
  for (let i = a; i < out.length; i++) {
    const t = (i - a) / RATE;
    out[i] = level * Math.exp(-t / decayS) * Math.sin(2 * Math.PI * freq * t);
  }
  return out;
}

function sine(freq: number, seconds: number, level = 0.5): Float32Array {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < out.length; i++) out[i] = level * Math.sin((2 * Math.PI * freq * i) / RATE);
  return out;
}

const rms = (x: Float32Array, from = 0, to = x.length): number => {
  let s = 0;
  for (let i = from; i < to; i++) s += x[i] * x[i];
  return Math.sqrt(s / (to - from));
};

describe('mix()', () => {
  it('sums mics by weight and pads the shorter with silence', () => {
    const out = mix([
      { pcm: Float32Array.from([1, 1, 1]), weight: 0.5 },
      { pcm: Float32Array.from([1]), weight: 0.25 },
    ]);
    expect(Array.from(out)).toEqual([0.75, 0.5, 0.5]);
  });
});

describe('onsetIndex()', () => {
  it('starts half a millisecond before the first sample over −50 dBFS', () => {
    const x = hit(0.1, 0.3);
    const first = x.findIndex((v) => Math.abs(v) > 10 ** (-50 / 20));
    expect(onsetIndex(x)).toBe(first - Math.round(RATE * 0.0005));
  });

  it('finds a hit too soft for −50 dBFS to mean anything, by its own peak', () => {
    // peaks at −60 dBFS: nothing crosses −50, but the hit is still there
    const x = hit(0.1, 0.3, 0.001);
    expect(onsetIndex(x) / RATE).toBeCloseTo(0.1, 2);
  });
});

describe('trimHit()', () => {
  it('starts at the onset and ends a fade after the hit has died 60 dB', () => {
    const x = hit(0.05, 3, 0.5, 1000, 0.1); // −60 dB at about 0.69 s
    const out = trimHit(x, 4);
    expect(out.length / RATE).toBeGreaterThan(0.6);
    expect(out.length / RATE).toBeLessThan(0.69 + FADE_S + 0.02);
    expect(Math.abs(out[out.length - 1])).toBe(0);
  });

  it('cuts a long ring at the cap', () => {
    const out = trimHit(hit(0, 10, 0.5, 1000, 5), 1.2);
    expect(out.length / RATE).toBeCloseTo(1.2, 2);
  });

  it('fades the tail rather than cutting it off', () => {
    const out = trimHit(hit(0, 10, 0.5, 1000, 5), 1.2);
    const fade = Math.round(RATE * FADE_S);
    // the last third of the fade is quieter than the third before it
    expect(rms(out, out.length - fade / 3)).toBeLessThan(
      rms(out, out.length - fade, out.length - fade / 3) / 2
    );
  });
});

describe('kWeight()', () => {
  it('lifts the top by about 4 dB and leaves the middle alone, as BS.1770 does', () => {
    const at = (f: number): number => {
      const y = kWeight(sine(f, 1));
      return 20 * Math.log10(rms(y, RATE / 2) / rms(sine(f, 1), RATE / 2));
    };
    expect(at(1000)).toBeCloseTo(0.7, 0); // the shelf is already rising at 1 kHz
    expect(at(10000)).toBeCloseTo(4, 0);
    expect(at(20)).toBeLessThan(-10); // the high pass
  });
});

describe('loudness()', () => {
  it('is 6 dB lower for a hit at half the level', () => {
    expect(loudness(hit(0, 0.5, 0.5)) - loudness(hit(0, 0.5, 0.25))).toBeCloseTo(6.02, 1);
  });

  it('reads only the first 150 ms, so a long tail does not make a hit louder', () => {
    const short = hit(0, 0.15, 0.5, 1000, 0.05);
    const long = new Float32Array(RATE);
    long.set(short);
    long.fill(0.5, short.length); // a loud tail after the window
    expect(loudness(long)).toBeCloseTo(loudness(short), 3);
  });

  it('is -Infinity for nothing at all', () => {
    expect(loudness(new Float32Array(0))).toBe(-Infinity);
  });
});

describe('splitGain()', () => {
  it('leaves a piece that needs no more than the ceiling to its trim alone', () => {
    expect(splitGain(1.8, 0.5)).toEqual({ trim: 1.8, bake: 1 });
    // turning down is the trim's too: nothing is ever baked quieter
    expect(splitGain(0.4, 0.9)).toEqual({ trim: 0.4, bake: 1 });
  });

  it('bakes what the trim cannot reach into the samples', () => {
    // 24 dB of gain on a quiet brush: the trim's 12, and the samples the rest
    const { trim, bake } = splitGain(amp(24), 0.01);
    expect(trim).toBe(TRIM_CEILING);
    expect(20 * Math.log10(trim * bake)).toBeCloseTo(24, 6);
  });

  it('bakes no further than a decibel under full scale, however much is needed', () => {
    const peak = 0.2;
    const { trim, bake } = splitGain(100, peak);
    expect(trim).toBe(TRIM_CEILING);
    expect(peak * bake).toBeCloseTo(BAKE_PEAK, 9);
  });

  it('bakes nothing when the samples are already at the peak', () => {
    expect(splitGain(10, 0.95)).toEqual({ trim: TRIM_CEILING, bake: 1 });
  });
});
