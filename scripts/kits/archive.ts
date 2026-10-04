/**
 * An archive source on its publisher's server, zip or tar: downloaded once
 * into the cache and checked against its pinned length and sha256 before
 * anything is read out of it. `zip.ts` and `tar.ts` read the members.
 */

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, mkdirSync, renameSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

import { CACHE } from '@/scripts/kits/fetch';
import type { TarSource, ZipSource } from '@/scripts/kits/sources';

export type ArchiveSource = ZipSource | TarSource;

/** Where the downloaded archive is kept. */
export function archivePath(source: ArchiveSource): string {
  return join(CACHE, 'archives', basename(new URL(source.archive).pathname));
}

/** Where its members are kept once read out, under the first 16 of its sha256. */
export function archiveCacheDir(source: ArchiveSource): string {
  return join(CACHE, `${basename(new URL(source.archive).pathname)}@${source.sha256.slice(0, 16)}`);
}

async function download(source: ArchiveSource, file: string): Promise<void> {
  const size =
    source.bytes >= 1e9
      ? `${(source.bytes / 1e9).toFixed(1)} GB`
      : `${Math.round(source.bytes / 1e6)} MB`;
  console.log(`  downloading ${source.archive} (${size}, once)`);
  const res = await fetch(source.archive);
  if (!res.ok || !res.body) throw new Error(`${source.archive}: ${res.status} ${res.statusText}`);
  mkdirSync(dirname(file), { recursive: true });
  const part = `${file}.part`;
  await pipeline(Readable.fromWeb(res.body as WebReadableStream), createWriteStream(part));
  renameSync(part, file);
}

async function sha256Of(file: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(createReadStream(file), hash);
  return hash.digest('hex');
}

const verified = new Set<string>();

/** The archive, downloaded if it is not cached, and checked against its pin once a build. */
export async function archiveOf(source: ArchiveSource): Promise<string> {
  const file = archivePath(source);
  if (verified.has(file)) return file;
  let size: number | undefined;
  try {
    size = statSync(file).size;
  } catch {
    await download(source, file);
    size = statSync(file).size;
  }
  if (size !== source.bytes) {
    throw new Error(
      `${file}: ${size} bytes, sources.ts pins ${source.bytes}; delete it to re-fetch`
    );
  }
  const got = await sha256Of(file);
  if (got !== source.sha256) {
    throw new Error(`${source.archive}: sha256 ${got}, sources.ts pins ${source.sha256}`);
  }
  verified.add(file);
  return file;
}
