/**
 * The server's WAV reader (4A.6): the one format a sample is stored in, and a
 * distinct refusal for each way a file can fail to be it.
 */

import { describe, expect, it } from 'vitest';

import { parseWav, WAV_REFUSALS, writeWav } from '@/lib/app/breaks/samples/wav';

interface Fmt {
  format?: number;
  channels?: number;
  rate?: number;
  bits?: number;
}

/** A WAV built by hand, so each test can get one field wrong. */
function wav({
  fmt = {},
  dataBytes = 44_100 * 2,
  withData = true,
  extra = [] as Array<[string, number]>,
}: {
  fmt?: Fmt;
  dataBytes?: number;
  withData?: boolean;
  extra?: Array<[string, number]>;
} = {}): Uint8Array {
  const { format = 1, channels = 1, rate = 44_100, bits = 16 } = fmt;
  const chunks: Uint8Array[] = [];
  const chunk = (id: string, body: Uint8Array) => {
    const out = new Uint8Array(8 + body.length + (body.length % 2));
    const view = new DataView(out.buffer);
    for (let i = 0; i < 4; i++) out[i] = id.charCodeAt(i);
    view.setUint32(4, body.length, true);
    out.set(body, 8);
    chunks.push(out);
  };

  const f = new Uint8Array(16);
  const fv = new DataView(f.buffer);
  fv.setUint16(0, format, true);
  fv.setUint16(2, channels, true);
  fv.setUint32(4, rate, true);
  fv.setUint32(8, rate * channels * (bits / 8), true);
  fv.setUint16(12, channels * (bits / 8), true);
  fv.setUint16(14, bits, true);
  chunk('fmt ', f);
  for (const [id, n] of extra) chunk(id, new Uint8Array(n));
  if (withData) chunk('data', new Uint8Array(dataBytes));

  const bodyLen = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(12 + bodyLen);
  const view = new DataView(out.buffer);
  out.set(
    [...'RIFF'].map((c) => c.charCodeAt(0)),
    0
  );
  view.setUint32(4, 4 + bodyLen, true);
  out.set(
    [...'WAVE'].map((c) => c.charCodeAt(0)),
    8
  );
  let at = 12;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

describe('parseWav', () => {
  it('gives the duration of a mono 16-bit 44.1 kHz file from its data chunk', () => {
    // 1.5 s of audio: 66,150 frames of two bytes each
    const verdict = parseWav(wav({ dataBytes: 66_150 * 2 }));
    expect(verdict).toEqual({ ok: true, frames: 66_150, durationMs: 1500 });
  });

  it('skips chunks it does not need, and counts only the data chunk', () => {
    const verdict = parseWav(wav({ dataBytes: 44_100 * 2, extra: [['LIST', 33]] }));
    expect(verdict).toMatchObject({ ok: true, durationMs: 1000 });
  });

  it.each([
    ['stereo', wav({ fmt: { channels: 2 } }), 'not-mono'],
    ['48 kHz', wav({ fmt: { rate: 48_000 } }), 'wrong-rate'],
    ['24-bit', wav({ fmt: { bits: 24 } }), 'wrong-depth'],
    ['floating point', wav({ fmt: { format: 3, bits: 32 } }), 'not-pcm'],
    ['a missing data chunk', wav({ withData: false }), 'no-data'],
    ['an empty data chunk', wav({ dataBytes: 0 }), 'no-data'],
    ['a truncated header', wav().slice(0, 30), 'truncated'],
    ['a text file renamed .wav', new TextEncoder().encode('kick drum, honest\n'), 'not-wav'],
  ] as const)('refuses %s as %s', (_label, bytes, reason) => {
    const verdict = parseWav(bytes);
    expect(verdict).toEqual({ ok: false, reason, message: WAV_REFUSALS[reason] });
  });

  it('gives every refusal its own message', () => {
    const messages = Object.values(WAV_REFUSALS);
    expect(new Set(messages).size).toBe(messages.length);
  });

  it('refuses a data chunk that claims more bytes than the file has', () => {
    const bytes = wav({ dataBytes: 100 });
    // claim twelve seconds of audio in a 100-byte chunk
    new DataView(bytes.buffer).setUint32(40, 44_100 * 2 * 12, true);
    expect(parseWav(bytes)).toMatchObject({ ok: false, reason: 'truncated' });
  });

  it('reads a file that is a view into a larger buffer', () => {
    const inner = wav({ dataBytes: 441 * 2 });
    const outer = new Uint8Array(inner.length + 10);
    outer.set(inner, 5);
    expect(parseWav(outer.subarray(5, 5 + inner.length))).toMatchObject({
      ok: true,
      durationMs: 10,
    });
  });
});

describe('writeWav', () => {
  it('writes what parseWav accepts, with the samples as 16-bit PCM', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 2]);
    const bytes = writeWav(samples);

    expect(parseWav(bytes)).toMatchObject({ ok: true, frames: 6 });
    const view = new DataView(bytes.buffer);
    const pcm = Array.from({ length: 6 }, (_, i) => view.getInt16(44 + i * 2, true));
    // 2 is clipped to full scale rather than wrapping round
    expect(pcm).toEqual([0, 16383, -16384, 32767, -32768, 32767]);
  });
});
