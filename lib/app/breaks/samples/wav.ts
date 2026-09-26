/**
 * Read a WAV header, and refuse anything that is not the one format a sample
 * is stored in (D20).
 *
 * The Studio encodes every sample before it leaves the browser — mono, 16-bit
 * PCM, 44.1 kHz — whatever file you picked. The server does not take the
 * browser's word for that: anyone can post to the API, so the upload route runs
 * the bytes through this before it stores anything. One format is what lets
 * the audio route serve every sample as `audio/wav` and every browser play it.
 *
 * **Pure.** Bytes in, a verdict out: no I/O, no Node or browser APIs, so it is
 * tested with hand-built buffers and runs the same on either side.
 *
 * A RIFF file is a 12-byte header and then chunks, each a four-letter id, a
 * little-endian length and that many bytes (padded to even). `fmt ` says what
 * the samples are; `data` is the samples. Anything else (`LIST`, `bext`,
 * `cue `) is skipped, because encoders add them freely and they change nothing
 * about how the audio plays.
 */

/** The one format a stored sample is in. */
export const SAMPLE_FORMAT = {
  channels: 1,
  sampleRate: 44_100,
  bitsPerSample: 16,
} as const;

/** Why a file was refused. Each one is a different thing to tell the person. */
export type WavRefusal =
  'not-wav' | 'truncated' | 'not-pcm' | 'not-mono' | 'wrong-rate' | 'wrong-depth' | 'no-data';

export type WavVerdict =
  | { ok: true; durationMs: number; frames: number }
  | { ok: false; reason: WavRefusal; message: string };

/** What each refusal says. Written for the person who picked the file. */
export const WAV_REFUSALS: Record<WavRefusal, string> = {
  'not-wav': 'That is not a WAV file',
  truncated: 'That WAV file is cut short — its header is incomplete',
  'not-pcm': 'That WAV is not plain PCM audio (it may be floating point or compressed)',
  'not-mono': 'That WAV has more than one channel — a sample is stored in mono',
  'wrong-rate': 'That WAV is not at 44.1 kHz',
  'wrong-depth': 'That WAV is not 16-bit',
  'no-data': 'That WAV has no audio in it',
};

/** WAVE_FORMAT_PCM. Float is 3; WAVE_FORMAT_EXTENSIBLE (0xFFFE) wraps either. */
const FORMAT_PCM = 1;

function refuse(reason: WavRefusal): WavVerdict {
  return { ok: false, reason, message: WAV_REFUSALS[reason] };
}

function fourcc(bytes: Uint8Array, at: number): string {
  return String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
}

/**
 * Check `bytes` is a mono, 16-bit, 44.1 kHz PCM WAV and say how long it is.
 *
 * The duration comes from the `data` chunk's length, not from the file size,
 * so trailing chunks do not make a sample look longer than it plays. A `data`
 * chunk that claims more bytes than the file has is `truncated`: trusting the
 * claim would let a 44-byte file pass for twelve seconds.
 */
export function parseWav(bytes: Uint8Array): WavVerdict {
  if (bytes.length < 12) {
    return bytes.length >= 4 && fourcc(bytes, 0) === 'RIFF'
      ? refuse('truncated')
      : refuse('not-wav');
  }
  if (fourcc(bytes, 0) !== 'RIFF' || fourcc(bytes, 8) !== 'WAVE') return refuse('not-wav');

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let fmt: { format: number; channels: number; rate: number; bits: number } | null = null;

  let at = 12;
  while (at + 8 <= bytes.length) {
    const id = fourcc(bytes, at);
    const size = view.getUint32(at + 4, true);
    const body = at + 8;

    if (id === 'fmt ') {
      if (size < 16 || body + 16 > bytes.length) return refuse('truncated');
      fmt = {
        format: view.getUint16(body, true),
        channels: view.getUint16(body + 2, true),
        rate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      };
    } else if (id === 'data') {
      /* `fmt ` comes first in every file this app writes and in the spec, so a
         `data` chunk before it is a file that is not what it says. */
      if (!fmt) return refuse('truncated');
      if (fmt.format !== FORMAT_PCM) return refuse('not-pcm');
      if (fmt.channels !== SAMPLE_FORMAT.channels) return refuse('not-mono');
      if (fmt.rate !== SAMPLE_FORMAT.sampleRate) return refuse('wrong-rate');
      if (fmt.bits !== SAMPLE_FORMAT.bitsPerSample) return refuse('wrong-depth');
      if (body + size > bytes.length) return refuse('truncated');

      const frames = Math.floor(size / (SAMPLE_FORMAT.bitsPerSample / 8));
      if (frames === 0) return refuse('no-data');
      return {
        ok: true,
        frames,
        durationMs: Math.round((frames / SAMPLE_FORMAT.sampleRate) * 1000),
      };
    }

    // chunks are padded to an even length
    at = body + size + (size % 2);
  }

  return fmt ? refuse('no-data') : refuse('truncated');
}

/**
 * Write mono float samples (−1…1) as a 16-bit PCM WAV at 44.1 kHz — the
 * format {@link parseWav} accepts, and the only one the upload route stores.
 *
 * The caller has already mixed to mono and resampled; this is the byte layout
 * and nothing else. Values outside −1…1 are clipped rather than wrapped, since
 * a wrapped sample is a click.
 */
export function writeWav(samples: Float32Array): Uint8Array<ArrayBuffer> {
  const bytesPerSample = SAMPLE_FORMAT.bitsPerSample / 8;
  const dataBytes = samples.length * bytesPerSample;
  const out = new Uint8Array(44 + dataBytes);
  const view = new DataView(out.buffer);
  const ascii = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) out[at + i] = s.charCodeAt(i);
  };

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, FORMAT_PCM, true);
  view.setUint16(22, SAMPLE_FORMAT.channels, true);
  view.setUint32(24, SAMPLE_FORMAT.sampleRate, true);
  view.setUint32(28, SAMPLE_FORMAT.sampleRate * SAMPLE_FORMAT.channels * bytesPerSample, true);
  view.setUint16(32, SAMPLE_FORMAT.channels * bytesPerSample, true);
  view.setUint16(34, SAMPLE_FORMAT.bitsPerSample, true);
  ascii(36, 'data');
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * bytesPerSample, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}
