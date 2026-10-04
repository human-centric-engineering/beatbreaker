/**
 * Reading a tar source. A compressed tarball has no index: reaching one
 * member means decompressing everything before it. So once the archive passes
 * its pin it is unpacked whole by the system `tar`, and every file is hashed
 * into `tree.json`, path → sha256, as a git source keeps its tree. A file is
 * served from the cache only while it still matches that hash; one that does
 * not is extracted again, alone, from the archive, checked against its pin
 * first.
 *
 * Only regular files are kept. A link in the archive is refused, because a
 * file read through it could be anywhere on the disk. `tar` itself refuses
 * absolute paths and `..` unless told otherwise, and is not told.
 */

import { execFileSync } from 'node:child_process';
import {
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { z } from 'zod';

import { archiveCacheDir, archiveOf } from '@/scripts/kits/archive';
import { inCache, readCached, sha256 } from '@/scripts/kits/fetch';
import type { TarSource } from '@/scripts/kits/sources';

/** Every regular file under `dir`, by its path from `dir` with `/` separators. */
function walk(dir: string, root = dir): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = lstatSync(full);
    if (st.isDirectory()) out.push(...walk(full, root));
    else if (st.isFile()) out.push(relative(root, full).split(sep).join('/'));
    else throw new Error(`${relative(root, full)}: not a regular file; links are not unpacked`);
  }
  return out;
}

/**
 * Unpack the archive into `files/`, through a fresh directory renamed into
 * place, and hash what it holds. A build interrupted half way leaves only the
 * `.part` directory, which the next one starts again.
 */
async function unpack(source: TarSource): Promise<Map<string, string>> {
  const archive = await archiveOf(source);
  const dir = archiveCacheDir(source);
  const part = join(dir, 'files.part');
  rmSync(part, { recursive: true, force: true });
  mkdirSync(part, { recursive: true });
  console.log(`  unpacking ${source.archive}`);
  execFileSync('tar', ['-xf', archive, '-C', part, '--no-same-owner'], { stdio: 'inherit' });
  const tree = new Map(walk(part).map((p) => [p, sha256(readFileSync(join(part, p)))]));
  rmSync(join(dir, 'files'), { recursive: true, force: true });
  renameSync(part, join(dir, 'files'));
  writeFileSync(join(dir, 'tree.json'), JSON.stringify(Object.fromEntries(tree)));
  return tree;
}

const treeSchema = z.record(z.string(), z.string().regex(/^[0-9a-f]{64}$/));
/** One tree per archive, shared by every caller, so concurrent ones unpack it once. */
const trees = new Map<string, Promise<Map<string, string>>>();
/** The repairs of each archive's cache, run one after another. */
const repairs = new Map<string, Promise<unknown>>();

/** The archive's file list, path → sha256: from `tree.json`, or by unpacking it. */
export function tarTree(source: TarSource): Promise<Map<string, string>> {
  const dir = archiveCacheDir(source);
  let tree = trees.get(dir);
  if (!tree) {
    const raw = readCached(join(dir, 'tree.json'))?.toString('utf8');
    tree =
      raw !== undefined
        ? Promise.resolve(new Map(Object.entries(treeSchema.parse(JSON.parse(raw)))))
        : unpack(source);
    // a failed unpack is not remembered, so the next call tries again
    tree.catch(() => trees.delete(dir));
    trees.set(dir, tree);
  }
  return tree;
}

/**
 * Put one file back from the archive: extracted alone into a scratch
 * directory, checked against its hash, and renamed into place. The rest of
 * `files/` is left where it is, so a decode already reading another file is
 * never pulled out from under. Repairs queue behind each other, each one
 * decompressing the archive, and one that finds its file already put back by
 * an earlier one does nothing.
 */
function repair(source: TarSource, path: string, want: string, local: string): Promise<void> {
  const dir = archiveCacheDir(source);
  const run = async (): Promise<void> => {
    const cached = readCached(local);
    if (cached && sha256(cached) === want) return;
    const archive = await archiveOf(source);
    const part = join(dir, 'repair.part');
    rmSync(part, { recursive: true, force: true });
    mkdirSync(part, { recursive: true });
    try {
      execFileSync('tar', ['-xf', archive, '-C', part, '--no-same-owner', path], {
        stdio: 'inherit',
      });
      const got = inCache(part, path);
      if (!lstatSync(got).isFile() || sha256(readFileSync(got)) !== want) {
        throw new Error(`${source.archive}: ${path} is not what was unpacked before`);
      }
      mkdirSync(dirname(local), { recursive: true });
      renameSync(got, local);
    } finally {
      rmSync(part, { recursive: true, force: true });
    }
  };
  const next = (repairs.get(dir) ?? Promise.resolve()).catch(() => undefined).then(run);
  repairs.set(dir, next);
  return next;
}

/** One file of the archive, as a path in the cache, matching its hash in the tree. */
export async function tarFile(source: TarSource, path: string): Promise<string> {
  const want = (await tarTree(source)).get(path);
  if (!want) throw new Error(`${source.archive}: no ${path}`);
  const local = inCache(join(archiveCacheDir(source), 'files'), path);
  const cached = readCached(local);
  if (cached && sha256(cached) === want) return local;

  // changed or gone since it was unpacked: put it back from the archive
  await repair(source, path, want, local);
  return local;
}
