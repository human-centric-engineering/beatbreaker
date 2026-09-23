import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The catalogue's process-local memo, and the one filter (`visibility:
 * 'system'`) that stands between today and D16 (`.context/app/catalogue.md`
 * §"The data layer").
 *
 * What is pinned here is deliberately narrow: the row → catalogue-shape
 * conversion is `rows.test.ts`'s job. This file is about what the memo does
 * that a plain `Map<string, T>` would not — caches the *promise* so
 * concurrent callers share one query, evicts a rejection instead of caching a
 * failure for a minute, and expires on a TTL — plus the query shape every
 * read must carry.
 */

vi.mock('@/lib/db/client', () => ({
  prisma: {
    style: { findMany: vi.fn(), findFirst: vi.fn() },
    kit: { findMany: vi.fn() },
    patternLibrary: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/logging', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import type { KitRow, LibraryRow, StyleRow } from '@/lib/app/breaks/catalogue/rows';
import {
  CACHE_TTL_MS,
  getLibrary,
  getStyle,
  invalidateCatalogue,
  listKits,
  listLibraries,
  listStyles,
  studioCatalogue,
  styleLookup,
} from '@/lib/app/breaks/catalogue/data';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logging';
import { testKit, testLibrary, testStyle } from '@/tests/helpers/catalogue';

function styleRow(key = 'funk'): StyleRow {
  const s = testStyle(key);
  return {
    key: s.key,
    group: s.group,
    currentVersion: s.version,
    // `testStyle` always sets a concrete versionId; the `?? ''` only satisfies
    // the wider `ResolvedStyle` type, which allows null for a style that did
    // not come from the catalogue at all.
    versions: [{ id: s.versionId ?? '', version: s.version, params: s.params }],
  };
}

function kitRow(key = 'studio70'): KitRow {
  const k = testKit(key);
  const { key: kitKey, label, hint, engine, credit, group, samples, ...params } = k;
  // `testKit` always sets a concrete engine; `Kit.engine` is merely optional on
  // the wider type because a hand-written row may name none (toKit's own
  // 'synth' fallback is what that case is for — see rows.test.ts).
  return {
    key: kitKey,
    engine: engine ?? 'synth',
    label,
    hint,
    group,
    credit: credit ?? null,
    params,
    samples,
  };
}

function libraryRow(): LibraryRow {
  const lib = testLibrary();
  return {
    key: lib.key,
    title: lib.title,
    description: lib.description,
    entries: [...lib.entries],
  };
}

beforeEach(() => {
  invalidateCatalogue();
  vi.mocked(prisma.style.findMany).mockReset();
  vi.mocked(prisma.style.findFirst).mockReset();
  vi.mocked(prisma.kit.findMany).mockReset();
  vi.mocked(prisma.patternLibrary.findMany).mockReset();
  vi.mocked(logger.warn).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the memo', () => {
  it('caches the promise, so two callers that overlap share one query rather than racing to run the same three', async () => {
    vi.mocked(prisma.style.findMany).mockResolvedValue([styleRow()] as never);

    const [a, b] = await Promise.all([listStyles(), listStyles()]);

    expect(prisma.style.findMany).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it('invalidateCatalogue empties it, so the next read re-queries', async () => {
    vi.mocked(prisma.style.findMany).mockResolvedValue([styleRow()] as never);

    await listStyles();
    invalidateCatalogue();
    await listStyles();

    expect(prisma.style.findMany).toHaveBeenCalledTimes(2);
  });

  it('evicts a rejected read rather than caching the failure for a minute', async () => {
    vi.mocked(prisma.style.findMany).mockRejectedValueOnce(new Error('connection reset'));
    await expect(listStyles()).rejects.toThrow('connection reset');

    // If the rejection had been cached, this second call would replay the
    // same error instead of reaching the (now healthy) database.
    vi.mocked(prisma.style.findMany).mockResolvedValueOnce([styleRow()] as never);
    const styles = await listStyles();

    expect(styles).toHaveLength(1);
    expect(prisma.style.findMany).toHaveBeenCalledTimes(2);
  });

  it('serves a cached read within the TTL, and re-queries once it has passed', async () => {
    vi.useFakeTimers();
    vi.mocked(prisma.style.findMany).mockResolvedValue([styleRow()] as never);

    await listStyles();

    // Still inside the window: the backstop, not the mechanism.
    await vi.advanceTimersByTimeAsync(CACHE_TTL_MS - 1);
    await listStyles();
    expect(prisma.style.findMany).toHaveBeenCalledTimes(1);

    // Past it: a second app instance could still be serving a retuned style up
    // to exactly this point, per the doc's own stated bound.
    await vi.advanceTimersByTimeAsync(2);
    await listStyles();
    expect(prisma.style.findMany).toHaveBeenCalledTimes(2);
  });
});

describe('visibility', () => {
  it('filters every table read on visibility: system — the seam D16 lands user rows through', async () => {
    vi.mocked(prisma.style.findMany).mockResolvedValue([]);
    vi.mocked(prisma.kit.findMany).mockResolvedValue([]);
    vi.mocked(prisma.patternLibrary.findMany).mockResolvedValue([]);

    await Promise.all([listStyles(), listKits(), listLibraries()]);

    for (const mock of [
      prisma.style.findMany,
      prisma.kit.findMany,
      prisma.patternLibrary.findMany,
    ]) {
      expect(mock).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ visibility: 'system' }) })
      );
    }
  });
});

describe('a row that fails validation', () => {
  it('is dropped from the list and logged, not thrown — the picker keeps the other rows', async () => {
    const broken: StyleRow = {
      key: 'broken',
      group: 'Classic',
      currentVersion: 1,
      versions: [{ id: 'bad-1', version: 1, params: { ...testStyle('funk').params, swing: 999 } }],
    };
    vi.mocked(prisma.style.findMany).mockResolvedValue([styleRow(), broken] as never);

    const styles = await listStyles();

    expect(styles.map((s) => s.key)).toEqual(['funk']);
    // A style that vanishes with nothing in the log is a bug report that
    // starts "it used to be there" — the doc's own line for why this logs.
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('did not validate'),
      expect.objectContaining({ what: 'style', key: 'broken' })
    );
  });
});

describe('getStyle', () => {
  /**
   * With no version asked for, `getStyle` is a lookup against the same cached
   * list `listStyles` serves — not a second query path. That matters because
   * a style picker that already called `listStyles` should not cost a query
   * per style it then resolves; proving `findFirst` is untouched is what
   * pins that, not just that the right style key comes back.
   */
  it('with no version, resolves against the cached list rather than querying by key', async () => {
    vi.mocked(prisma.style.findMany).mockResolvedValue([styleRow('funk')] as never);

    const style = await getStyle('funk');

    expect(style?.key).toBe('funk');
    expect(prisma.style.findFirst).not.toHaveBeenCalled();
  });

  it('with no version, returns null for a key the list does not have — no throw for a bad link or stale share', async () => {
    vi.mocked(prisma.style.findMany).mockResolvedValue([styleRow('funk')] as never);

    const style = await getStyle('does-not-exist');

    expect(style).toBeNull();
  });

  /**
   * With a version, `getStyle` is a *different* read: it queries the row by
   * key directly (not through the cached, current-version-only list), because
   * a pattern saved months ago must still resolve against the version it was
   * generated from even after the style has since moved on. The `where`
   * clause is what carries both the key filter and the public-visibility
   * filter that keeps this consistent with every other catalogue read.
   */
  it('with a version, queries the row by key (not the cached list) and applies the visibility filter', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue(styleRow('funk') as never);

    const style = await getStyle('funk', 1);

    expect(style).toMatchObject({ key: 'funk', version: 1 });
    expect(prisma.style.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ key: 'funk', visibility: 'system' }),
      })
    );
  });

  it('with a version, returns null when no row matches the key at all', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue(null);

    const style = await getStyle('does-not-exist', 1);

    expect(style).toBeNull();
  });

  /**
   * A version number that the row does not have (retuned since, or simply
   * wrong) must not throw — a pattern generated against a version that later
   * got pruned should drop out of the picker quietly, the same as any other
   * row-validation failure, and get logged the same way so it is not a silent
   * disappearance.
   */
  it('with a version the row does not have, reports the row problem and returns null instead of throwing', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue(styleRow('funk') as never); // only version 1

    const style = await getStyle('funk', 99);

    expect(style).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('did not validate'),
      expect.objectContaining({
        what: 'style',
        key: 'funk',
        reason: expect.stringContaining('no version 99'),
      })
    );
  });
});

describe('styleLookup', () => {
  /**
   * `decodeBreak` runs on a paste event and cannot await, so it is handed a
   * synchronous closure over a list the caller already loaded. The contract
   * that matters here is keyed-by-`key` lookup against exactly the objects
   * passed in — not a re-fetch, not a re-derivation.
   */
  it('resolves a style by key from the list it closed over', () => {
    const funk = testStyle('funk');
    const lookup = styleLookup([funk, testStyle('boombap')]);

    expect(lookup('funk')).toBe(funk);
  });

  it('returns undefined for a key not in the list, so a share code for a retired style fails soft', () => {
    const lookup = styleLookup([testStyle('funk')]);

    expect(lookup('retired-style')).toBeUndefined();
  });
});

describe('getLibrary', () => {
  it('resolves a library by key from the cached list', async () => {
    vi.mocked(prisma.patternLibrary.findMany).mockResolvedValue([libraryRow()] as never);

    const library = await getLibrary('famous-breaks');

    expect(library?.key).toBe('famous-breaks');
  });

  it('returns null for a key no library has, rather than throwing', async () => {
    vi.mocked(prisma.patternLibrary.findMany).mockResolvedValue([libraryRow()] as never);

    const library = await getLibrary('does-not-exist');

    expect(library).toBeNull();
  });
});

describe('studioCatalogue', () => {
  it('makes exactly one query per table — the "no per-item catalogue requests" contract, true by construction', async () => {
    vi.mocked(prisma.style.findMany).mockResolvedValue([styleRow()] as never);
    vi.mocked(prisma.kit.findMany).mockResolvedValue([kitRow()] as never);
    vi.mocked(prisma.patternLibrary.findMany).mockResolvedValue([libraryRow()] as never);

    const catalogue = await studioCatalogue();

    expect(prisma.style.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.kit.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.patternLibrary.findMany).toHaveBeenCalledTimes(1);
    expect(catalogue.styles.funk).toBeDefined();
    expect(catalogue.kits.studio70).toBeDefined();
    expect(catalogue.libraries).toHaveLength(1);
  });
});
