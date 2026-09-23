import {
  type RowProblem,
  type StyleRow,
  styleGroupsOf,
  toKits,
  toLibrary,
  toStyle,
  toStyles,
} from '@/lib/app/breaks/catalogue/rows';
import type {
  CatalogueKit,
  CatalogueLibrary,
  CatalogueStyle,
  StudioCatalogue,
} from '@/lib/app/breaks/catalogue/types';
import { kitGroups } from '@/lib/app/breaks/kit';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logging';

/**
 * The catalogue data layer.
 *
 * **Server-side only.** Not marked with the `server-only` package — Sunrise
 * deliberately does not depend on it, because this tier is consumed by the
 * orchestration MCP layer as well as by Next.js routes. Do not import this
 * module from a `'use client'` component; the Studio gets its catalogue as a
 * prop from the `(studio)` pages, which is the seam that keeps that true.
 *
 * The one place that reads the `style`, `pattern_library` and `kit` tables.
 * Route handlers, server components and — later — BeatBuddy's tools all call
 * these rather than querying, so "what does a published style look like" is
 * answered once. The Studio's layout calls them directly rather than making an
 * HTTP request to its own API: same functions, one fewer hop, and no way for a
 * server render to be waiting on its own server.
 *
 * **Caching — a process-local memo, and what that does and does not buy.**
 * A catalogue read happens on every Studio load and the data changes a few
 * times a year, so it is worth not querying three tables per request. An admin
 * write calls {@link invalidateCatalogue} and the next read rebuilds.
 *
 * Not `unstable_cache` and not the `use cache` directive, for two separate
 * reasons. `use cache` needs the `cacheComponents` flag, which changes how
 * every route in the app renders; turning that on is a platform decision, not
 * something this phase should do on the way past. `unstable_cache` would work,
 * but `lib/app/**` is the fork-extension surface and is held to being
 * framework-agnostic — and it would buy nothing here anyway: its `revalidateTag`
 * only reaches other instances when a shared cache handler is configured, and
 * `next.config.js` configures none. Both are therefore per-process, and this is
 * the per-process one that a fork can read without knowing Next.
 *
 * **So: on more than one instance, an admin's edit reaches the instance that
 * served the write immediately and the others within {@link CACHE_TTL_MS}.**
 * That is stated rather than hidden, and the TTL is what bounds it. If this
 * ever runs behind more than a couple of instances, the fix is a shared cache
 * (Redis, or Next's cache handler) rather than a longer comment.
 */

/**
 * How long a catalogue snapshot is served before it is rebuilt anyway.
 *
 * A backstop, not the mechanism — the mechanism is
 * {@link invalidateCatalogue}. Sixty seconds is the window in which a second
 * app instance can still be serving a style an admin has just retuned; it is
 * short enough that nobody files a bug and long enough that the cache is doing
 * its job.
 */
export const CACHE_TTL_MS = 60_000;

interface Memo<T> {
  value: Promise<T>;
  at: number;
}

/** Every live memo, so one call empties all of them. */
const memos = new Map<string, Memo<unknown>>();

/**
 * Wrap a read in the catalogue memo.
 *
 * The *promise* is cached, not the resolved value: two requests arriving
 * together on a cold cache then share one query rather than racing to run the
 * same three. A rejected promise is evicted, so a failed read is retried rather
 * than cached as a failure for a minute.
 */
function memoised<T>(key: string, read: () => Promise<T>): () => Promise<T> {
  return () => {
    const hit = memos.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as Promise<T>;

    const value = read().catch((error: unknown) => {
      if (memos.get(key)?.value === value) memos.delete(key);
      throw error;
    });
    memos.set(key, { value, at: Date.now() });
    return value;
  };
}

/**
 * Throw the catalogue's cache away after an admin write.
 *
 * Called by the admin write routes rather than by the data layer itself, so
 * that a transaction that wrote several rows invalidates once.
 */
export function invalidateCatalogue(): void {
  memos.clear();
}

/** Only rows the public may see. `system` is all of them until D16. */
const PUBLIC = { visibility: 'system' } as const;

function report(problems: RowProblem[]): void {
  /* Warn rather than throw: one unreadable row costs you that row, and the
     picker still works. Silence would be worse than either — a style that
     vanishes from the list with nothing in the log is a bug report that starts
     "it used to be there". */
  for (const p of problems) {
    logger.warn('BeatBreaker: a catalogue row did not validate and was skipped', { ...p });
  }
}

/* ---- styles --------------------------------------------------------- */

/**
 * The style columns. **No `versions` relation** — see `readStyles`.
 *
 * An unfiltered `versions: { select: … }` here is the obvious version and it
 * reads every version of every style to use one of each: `params` is the whole
 * weighted-table blob, and the set grows every time an admin saves, which is
 * the thing this phase exists to make easy. A hundred retunes of one style and
 * the picker's query is a hundred blobs to render one row.
 */
const STYLE_SELECT = {
  id: true,
  key: true,
  group: true,
  currentVersion: true,
  position: true,
} as const;

type StyleColumns = { id: string; currentVersion: number } & Omit<StyleRow, 'versions'>;

/**
 * Attach exactly the version each style points at.
 *
 * Prisma cannot filter a relation against a column of the parent row — there is
 * no `versions: { where: { version: currentVersion } }` — so this is a second
 * query over the (styleId, version) pairs the first one returned. One row per
 * style, whatever the history behind it.
 *
 * It resolves by `currentVersion` rather than by "the newest", because those
 * are not the same row: a seed interrupted between writing a version and moving
 * the pointer leaves the newest one uncommitted, and `take: 1` ordered by
 * version would quietly serve it. A style whose pointer names a version that is
 * not there still reports through `toStyle`'s own "no version N".
 */
async function withCurrentVersions(rows: StyleColumns[]): Promise<StyleRow[]> {
  if (rows.length === 0) return [];
  const versions = await prisma.styleVersion.findMany({
    where: { OR: rows.map((r) => ({ styleId: r.id, version: r.currentVersion })) },
    select: { id: true, styleId: true, version: true, params: true },
  });
  const byStyle = new Map(versions.map((v) => [v.styleId, v]));
  return rows.map(({ id, ...row }) => {
    const v = byStyle.get(id);
    return { ...row, versions: v ? [{ id: v.id, version: v.version, params: v.params }] : [] };
  });
}

const readStyles = memoised('styles', async (): Promise<CatalogueStyle[]> => {
  const rows = await prisma.style.findMany({
    where: PUBLIC,
    select: STYLE_SELECT,
    orderBy: [{ group: 'asc' }, { position: 'asc' }],
  });
  const { rows: styles, problems } = toStyles(await withCurrentVersions(rows));
  report(problems);
  return styles;
});

/** Every visible style, at its current version, in picker order. */
export async function listStyles(): Promise<CatalogueStyle[]> {
  return readStyles();
}

/**
 * One style, at a given version.
 *
 * With no version this is the current one — what a new pattern is generated
 * from. With a version it is that version, for ever, which is what lets a
 * pattern saved in March be re-derived in June after its style was retuned.
 * Not cached per key: the whole list is one small query and one cache entry,
 * and a per-key entry would be a second thing for a write to invalidate.
 */
export async function getStyle(key: string, version?: number): Promise<CatalogueStyle | null> {
  if (version == null) {
    return (await readStyles()).find((s) => s.key === key) ?? null;
  }

  /* `version` is a parameter here rather than a column of the row, so the
     relation CAN be filtered — one version, by name, instead of the style's
     whole history to read one of it. */
  const row = await prisma.style.findFirst({
    where: { ...PUBLIC, key },
    select: {
      key: true,
      group: true,
      currentVersion: true,
      versions: { where: { version }, select: { id: true, version: true, params: true } },
    },
  });
  if (!row) return null;

  const result = toStyle(row, version);
  if ('reason' in result) {
    report([result]);
    return null;
  }
  return result;
}

/**
 * A synchronous style lookup for decoding a v3 share code.
 *
 * `decodeBreak` runs on a paste and cannot await, so the caller loads the list
 * first and hands over a closure. See `StyleLookup` in `share.ts`.
 */
export function styleLookup(
  styles: readonly CatalogueStyle[]
): (key: string) => CatalogueStyle | undefined {
  const byKey = new Map(styles.map((s) => [s.key, s]));
  return (key) => byKey.get(key);
}

/* ---- kits ----------------------------------------------------------- */

const readKits = memoised('kits', async (): Promise<CatalogueKit[]> => {
  const rows = await prisma.kit.findMany({
    where: PUBLIC,
    select: {
      key: true,
      engine: true,
      label: true,
      hint: true,
      group: true,
      credit: true,
      params: true,
      samples: true,
    },
    orderBy: { position: 'asc' },
  });
  const { rows: kits, problems } = toKits(rows);
  report(problems);
  return kits;
});

/** Every visible kit, in picker order, with its sample map. */
export async function listKits(): Promise<CatalogueKit[]> {
  return readKits();
}

/* ---- libraries ------------------------------------------------------ */

const LIBRARY_SELECT = {
  key: true,
  title: true,
  description: true,
  entries: {
    select: {
      id: true,
      group: true,
      title: true,
      artist: true,
      note: true,
      bpm: true,
      styleKey: true,
      styleVersionId: true,
      meter: true,
      doc: true,
    },
    orderBy: { position: 'asc' },
  },
} as const;

const readLibraries = memoised('libraries', async (): Promise<CatalogueLibrary[]> => {
  /* Entries come back with their library in one query rather than one query
       per library: 47 entries in 8 headings is exactly the shape that turns
       into an N+1 if the list page is allowed to fetch per row. */
  const rows = await prisma.patternLibrary.findMany({
    where: PUBLIC,
    select: LIBRARY_SELECT,
    orderBy: { position: 'asc' },
  });

  const out: CatalogueLibrary[] = [];
  for (const row of rows) {
    const { library, problems } = toLibrary(row);
    report(problems);
    out.push(library);
  }
  return out;
});

/** Every visible library, entries included. */
export async function listLibraries(): Promise<CatalogueLibrary[]> {
  return readLibraries();
}

export async function getLibrary(key: string): Promise<CatalogueLibrary | null> {
  return (await readLibraries()).find((l) => l.key === key) ?? null;
}

/* ---- the whole thing ------------------------------------------------ */

/**
 * The catalogue as the Studio wants it: keyed maps plus the group orders.
 *
 * One call, three cached queries, no per-item requests — which is the
 * "Loading the Studio makes no per-item catalogue requests" line in the phase's
 * done-when, enforced by construction rather than by discipline.
 */
export async function studioCatalogue(): Promise<StudioCatalogue> {
  const [styles, kits, libraries] = await Promise.all([listStyles(), listKits(), listLibraries()]);
  return {
    styles: Object.fromEntries(styles.map((s) => [s.key, s])),
    styleGroups: styleGroupsOf(styles),
    kits: Object.fromEntries(kits.map((k) => [k.key, k])),
    kitGroups: kitGroups(kits),
    libraries,
  };
}
