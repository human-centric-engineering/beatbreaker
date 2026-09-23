import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * What `/admin/catalogue` reads — deliberately uncached and a different query
 * shape than `data.ts` (`.context/app/catalogue.md` §"/admin/catalogue"): an
 * editor needs version counts and entry counts a picker never asks for, and
 * needs them fresh the moment a save reloads the page.
 *
 * The one behaviour worth pinning here is the one the doc calls out by name:
 * "the count comes back with the row rather than from a query per style" —
 * 37 styles is exactly the size where an N+1 is invisible in development and
 * obvious in production. So every test below asserts one `findMany` call, not
 * a `findMany` plus a `count`/`findMany` per row.
 */

vi.mock('@/lib/db/client', () => ({
  prisma: {
    style: { findMany: vi.fn(), findFirst: vi.fn() },
    patternLibrary: { findMany: vi.fn() },
    kit: { findMany: vi.fn() },
  },
}));

import {
  adminKits,
  adminLibraries,
  adminStyle,
  adminStyles,
} from '@/lib/app/breaks/catalogue/admin-lists';
import { prisma } from '@/lib/db/client';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('adminStyles', () => {
  it('derives versionCount from the _count Prisma returned with the row, in a single query', async () => {
    vi.mocked(prisma.style.findMany).mockResolvedValue([
      {
        id: 's1',
        key: 'funk',
        label: 'Funk',
        hint: '',
        group: 'Classic',
        meter: '4/4',
        position: 0,
        currentVersion: 3,
        updatedAt: new Date('2026-01-01'),
        _count: { versions: 3 },
      },
    ] as never);

    const rows = await adminStyles();

    expect(prisma.style.findMany).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([expect.objectContaining({ key: 'funk', versionCount: 3 })]);
    // The raw _count shape must not leak into what the page renders.
    expect(rows[0]).not.toHaveProperty('_count');
  });
});

describe('adminLibraries', () => {
  it('derives per-heading counts from the entries the one query already fetched', async () => {
    vi.mocked(prisma.patternLibrary.findMany).mockResolvedValue([
      {
        id: 'lib-1',
        key: 'famous-breaks',
        title: 'Famous breaks',
        description: 'The main groove off each record.',
        entries: [{ group: 'Funk' }, { group: 'Funk' }, { group: 'Hip-hop' }],
      },
    ] as never);

    const rows = await adminLibraries();

    // No per-library count query: the counts are folded from `entries`, which
    // came back on the same `patternLibrary.findMany` call.
    expect(prisma.patternLibrary.findMany).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([
      expect.objectContaining({
        key: 'famous-breaks',
        entryCount: 3,
        groups: [
          { group: 'Funk', count: 2 },
          { group: 'Hip-hop', count: 1 },
        ],
      }),
    ]);
  });

  it('returns an empty groups list for a library with no entries, rather than throwing', async () => {
    vi.mocked(prisma.patternLibrary.findMany).mockResolvedValue([
      { id: 'lib-2', key: 'empty', title: 'Empty', description: '', entries: [] },
    ] as never);

    const rows = await adminLibraries();

    expect(rows).toEqual([expect.objectContaining({ key: 'empty', entryCount: 0, groups: [] })]);
  });
});

describe('adminKits', () => {
  it('reads the kit table in one query', async () => {
    vi.mocked(prisma.kit.findMany).mockResolvedValue([
      {
        id: 'kit-1',
        key: 'studio70',
        label: "Studio '70s",
        hint: '',
        group: 'Synthesised',
        engine: 'synth',
        credit: null,
        position: 0,
      },
    ] as never);

    const rows = await adminKits();

    expect(prisma.kit.findMany).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([expect.objectContaining({ key: 'studio70' })]);
  });
});

describe('adminStyle', () => {
  it('returns null for a key that is not there, rather than throwing', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue(null);

    expect(await adminStyle('ghost')).toBeNull();
  });

  it('derives versionCount from the versions array length, for the detail page', async () => {
    vi.mocked(prisma.style.findFirst).mockResolvedValue({
      id: 's1',
      key: 'funk',
      label: 'Funk',
      hint: '',
      group: 'Classic',
      meter: '4/4',
      position: 0,
      currentVersion: 2,
      updatedAt: new Date('2026-01-01'),
      versions: [
        { id: 'v2', version: 2, note: 'retune', params: {}, createdAt: new Date('2026-02-01') },
        { id: 'v1', version: 1, note: '', params: {}, createdAt: new Date('2026-01-01') },
      ],
    } as never);

    const detail = await adminStyle('funk');

    expect(detail).toMatchObject({ key: 'funk', versionCount: 2 });
    expect(detail?.versions).toHaveLength(2);
  });
});
