/**
 * Check every song link in the drummer model (Phase 15-b, D73).
 *
 *   npm run lineage:check-links            # report only
 *   npm run lineage:check-links -- --fix   # and drop the links that fail
 *
 * A track's `spotify` and `youtube` links may not be guessed. Each one is
 * resolved through the provider's oEmbed endpoint (no key needed), and the
 * title that comes back must contain the song's title, folded the way the
 * index folds it. A link that does not resolve, or resolves to another song,
 * fails; with `--fix` it is removed from the track. Run by hand per batch: it
 * needs the network, so it is not in CI.
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { z } from 'zod';

import { trackSchema as modelTrack } from '@/lib/app/lineage/corpus';
import { fold } from '@/lib/app/lineage/search';
import { DRUMMER_MODEL_DIR } from '@/scripts/lineage/read-corpus';

const OEMBED = {
  youtube: 'https://www.youtube.com/oembed',
  spotify: 'https://open.spotify.com/oembed',
} as const;
type Provider = keyof typeof OEMBED;

const oembedSchema = z.object({ title: z.string() });
/* The model's own track shape, the part this check reads; the rest is kept as it is. */
const trackSchema = modelTrack.pick({ title: true, youtube: true, spotify: true });
const recordingSchema = z.looseObject({ tracks: z.array(trackSchema).optional() });

/**
 * Whether an oEmbed title names the song: its folded title, or the title
 * without a bracketed part ("Voodoo Child (Slight Return)"), as whole words.
 */
export function titleNamesSong(song: string, oembedTitle: string): boolean {
  const have = ` ${fold(oembedTitle)} `;
  const bare = fold(song.replace(/\(.*?\)|\[.*?\]/g, ''));
  return [fold(song), bare].some((t) => t.length > 0 && have.includes(` ${t} `));
}

/**
 * The title the provider gives for a link; null when it does not resolve;
 * undefined when the provider could not be asked (rate limited, down, the
 * network failed, or it answered with something that is not JSON), which says
 * nothing about the link.
 */
export async function oembedTitle(
  provider: Provider,
  url: string,
  fetcher: typeof fetch = fetch
): Promise<string | null | undefined> {
  const q = new URLSearchParams({ url, format: 'json' });
  for (let attempt = 0; attempt < 3; attempt++) {
    let res: Response;
    try {
      res = await fetcher(`${OEMBED[provider]}?${q.toString()}`, {
        headers: { 'User-Agent': 'BeatBreaker song link check' },
      });
    } catch {
      res = new Response(null, { status: 503 });
    }
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) return null;
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return undefined;
    }
    const read = oembedSchema.safeParse(body);
    return read.success ? read.data.title : null;
  }
  return undefined;
}

/** One failed link: where it is and why. */
export interface LinkFailure {
  file: string;
  song: string;
  provider: Provider;
  url: string;
  got: string | null;
  /** The provider could not be asked: reported, never removed. */
  unreachable: boolean;
}

/**
 * Check every link on one recording's tracks. With `fix`, a failed link is
 * removed from the track in place. Returns the failures and how many passed.
 */
export async function checkRecordingLinks(
  file: string,
  json: unknown,
  { fix, fetcher = fetch }: { fix: boolean; fetcher?: typeof fetch }
): Promise<{ failures: LinkFailure[]; passed: number; changed: boolean }> {
  const read = recordingSchema.safeParse(json);
  const failures: LinkFailure[] = [];
  let passed = 0;
  let changed = false;
  if (!read.success) return { failures, passed, changed };
  for (const track of read.data.tracks ?? []) {
    for (const provider of ['youtube', 'spotify'] as const) {
      const url = track[provider];
      if (!url) continue;
      const got = await oembedTitle(provider, url, fetcher);
      if (typeof got === 'string' && titleNamesSong(track.title, got)) {
        passed++;
        continue;
      }
      const unreachable = got === undefined;
      failures.push({ file, song: track.title, provider, url, got: got ?? null, unreachable });
      if (fix && !unreachable) {
        delete track[provider];
        changed = true;
      }
    }
  }
  if (changed && json && typeof json === 'object' && 'tracks' in json) {
    Object.assign(json, { tracks: read.data.tracks });
  }
  return { failures, passed, changed };
}

async function main(): Promise<void> {
  const fix = process.argv.includes('--fix');
  const dir = join(DRUMMER_MODEL_DIR, 'recordings');
  const all: LinkFailure[] = [];
  let passed = 0;
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const path = join(dir, name);
    const json: unknown = JSON.parse(readFileSync(path, 'utf-8'));
    const result = await checkRecordingLinks(`recordings/${name}`, json, { fix });
    passed += result.passed;
    all.push(...result.failures);
    if (result.changed) writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
  }
  for (const f of all) {
    process.stdout.write(
      `FAIL ${f.file} "${f.song}" ${f.provider} ${f.url} → ${f.unreachable ? 'could not ask' : (f.got ?? 'no answer')}\n`
    );
  }
  const removed = fix ? all.filter((f) => !f.unreachable).length : 0;
  process.stdout.write(
    `${passed} links passed, ${all.length} failed${removed ? `, ${removed} removed` : ''}\n`
  );
  if (all.length && !fix) process.exitCode = 1;
}

if (process.argv[1]?.endsWith('check-song-links.ts')) {
  void main();
}
