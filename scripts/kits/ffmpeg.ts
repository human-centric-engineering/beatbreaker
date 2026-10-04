/**
 * Decoding and encoding, through the developer's `ffmpeg`. Never run in CI:
 * CI checks what the build wrote, not the build.
 */

import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { RATE } from '@/scripts/kits/dsp';

/** Long enough for any one sample; a stuck call fails the build rather than stalling it. */
const TIMEOUT_MS = 60_000;

/**
 * Run ffmpeg, with no stdin, and collect what it writes.
 *
 * Asynchronously, so the build decodes several files at once and a call that
 * stalls is killed by its timer rather than holding the build. A Mac that
 * idle-sleeps mid-build freezes everything for as long as it sleeps — keep it
 * awake for a full build: `caffeinate -i npm run kits:build`.
 */
function run(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on('data', (d: Buffer) => out.push(d));
    child.stderr.on('data', (d: Buffer) => err.push(d));
    const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT_MS);
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(out));
      else
        reject(
          new Error(`ffmpeg ${args.join(' ')}: ${signal ?? code} ${Buffer.concat(err).toString()}`)
        );
    });
  });
}

/** `ffmpeg -version`'s first line, or null when there is no ffmpeg. */
export function ffmpegVersion(): string | null {
  const res = spawnSync('ffmpeg', ['-version']);
  if (res.error || res.status !== 0) return null;
  return res.stdout.toString().split('\n')[0].trim();
}

/** Any file ffmpeg reads, as mono Float32 at {@link RATE}. Several channels are averaged. */
export async function decode(path: string): Promise<Float32Array> {
  const raw = await run(['-i', path, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', 'pipe:1']);
  const copy = new Uint8Array(raw.byteLength);
  copy.set(raw);
  return new Float32Array(copy.buffer);
}

/**
 * Mono Float32 to AAC-LC in `.m4a` at 96 kbps (`sound-plan.md` §6). The
 * container's metadata is stripped and the muxer told to be bit-exact, so the
 * same input through the same ffmpeg writes the same bytes.
 */
export async function encode(pcm: Float32Array, out: string): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'kits-'));
  const raw = join(dir, 'in.f32');
  await writeFile(raw, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength));
  try {
    await run([
      '-f',
      'f32le',
      '-ar',
      String(RATE),
      '-ac',
      '1',
      '-i',
      raw,
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-map_metadata',
      '-1',
      '-fflags',
      '+bitexact',
      '-flags:a',
      '+bitexact',
      '-y',
      out,
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
