/**
 * Fetching a source's files at its pinned commit, into a local cache.
 *
 * The cache is `.kit-sources/` at the repo root, gitignored. A file is fetched
 * once and checked against its git blob hash in the pinned commit's tree, so
 * neither a moved branch nor a corrupted download gets into a kit.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { z } from 'zod';

import type { GitSource } from '@/scripts/kits/sources';

export const CACHE = join(process.cwd(), '.kit-sources');

const treeEntrySchema = z.object({ path: z.string(), type: z.string(), sha: z.string() });
const treeSchema = z.array(treeEntrySchema);

/** What GitHub's git trees API answers; checked, not trusted. */
const treeResponseSchema = z.object({
  tree: treeSchema.optional(),
  truncated: z.boolean().optional(),
});

function cacheDir(source: GitSource): string {
  return join(CACHE, `${source.repo.replace('/', '__')}@${source.commit}`);
}

/**
 * `path` under `dir`, refusing anything that resolves outside it. The path
 * comes from a tree fetched over the network, so a `..` in it must not reach
 * the rest of the disk.
 */
export function inCache(dir: string, path: string): string {
  const full = resolve(dir, path);
  const rel = relative(dir, full);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`${path}: outside the cache`);
  }
  return full;
}

/** The file's bytes, or null if it is not there yet. Read, not stat-then-read. */
function readCached(file: string): Buffer | null {
  try {
    return readFileSync(file);
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') return null;
    throw err;
  }
}

function headers(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** The pinned commit's file list: path → blob hash. Fetched once, then cached. */
export async function treeOf(source: GitSource): Promise<Map<string, string>> {
  const file = join(cacheDir(source), 'tree.json');
  let raw = readCached(file)?.toString('utf8');
  if (raw === undefined) {
    const url = `https://api.github.com/repos/${source.repo}/git/trees/${source.commit}?recursive=1`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
    const body = treeResponseSchema.parse(await res.json());
    if (!body.tree || body.truncated) throw new Error(`${source.repo}: tree missing or truncated`);
    raw = JSON.stringify(body.tree);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, raw);
  }
  const tree = treeSchema.parse(JSON.parse(raw));
  return new Map(tree.filter((e) => e.type === 'blob').map((e) => [e.path, e.sha]));
}

/** Git's own content hash: sha1 of `blob <length>\0` and the bytes. */
export function gitBlobSha(bytes: Buffer): string {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

export function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * One file at the pinned commit, as a path in the cache. Throws if it is not
 * in the commit, or if what arrives is not what the commit holds.
 */
export async function fetchFile(
  source: GitSource,
  tree: Map<string, string>,
  path: string
): Promise<string> {
  const want = tree.get(path);
  if (!want) throw new Error(`${source.repo}@${source.commit}: no ${path}`);
  const local = inCache(join(cacheDir(source), 'files'), path);
  const cached = readCached(local);
  if (cached && gitBlobSha(cached) === want) return local;

  const url = `https://raw.githubusercontent.com/${source.repo}/${source.commit}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const got = gitBlobSha(bytes);
  if (got !== want) throw new Error(`${source.repo}/${path}: blob ${got}, the commit has ${want}`);
  mkdirSync(dirname(local), { recursive: true });
  writeFileSync(local, bytes);
  return local;
}

/** Run `fn` over `items`, `limit` at a time, keeping their order in the result. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
