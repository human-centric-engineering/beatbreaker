import { prisma } from '@/lib/db/client';

/**
 * What the admin catalogue pages read.
 *
 * Separate from `data.ts` and deliberately **uncached**: the public data layer
 * serves a picker and is memoised, which is right for it and wrong here. An
 * admin who has just saved a style edit and reloaded the page must see the
 * edit, not a snapshot that is correct for everyone else.
 *
 * It is also a different query. The public read returns what a client needs to
 * render; these return what an editor needs to decide — version counts, entry
 * counts, and (from D16) rows that are not `system`.
 *
 * **Server-side only.** Not marked with the `server-only` package — see the
 * note in `data.ts`.
 */

export interface AdminStyleRow {
  id: string;
  key: string;
  label: string;
  hint: string;
  group: string;
  meter: string;
  position: number;
  currentVersion: number;
  updatedAt: Date;
  versionCount: number;
}

export async function adminStyles(): Promise<AdminStyleRow[]> {
  const rows = await prisma.style.findMany({
    where: { ownerId: null },
    orderBy: [{ group: 'asc' }, { position: 'asc' }],
    select: {
      id: true,
      key: true,
      label: true,
      hint: true,
      group: true,
      meter: true,
      position: true,
      currentVersion: true,
      updatedAt: true,
      /* The count comes back with the row rather than from a query per style.
         37 styles is exactly the size where an N+1 is invisible in development
         and obvious in production. */
      _count: { select: { versions: true } },
    },
  });
  return rows.map(({ _count, ...row }) => ({ ...row, versionCount: _count.versions }));
}

export interface AdminLibraryRow {
  id: string;
  key: string;
  title: string;
  description: string;
  entryCount: number;
  /** The headings inside it, in order, with how many entries each holds. */
  groups: Array<{ group: string; count: number }>;
}

export async function adminLibraries(): Promise<AdminLibraryRow[]> {
  const rows = await prisma.patternLibrary.findMany({
    where: { ownerId: null },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      key: true,
      title: true,
      description: true,
      entries: { orderBy: { position: 'asc' }, select: { group: true } },
    },
  });

  return rows.map((row) => {
    const counts = new Map<string, number>();
    for (const e of row.entries) counts.set(e.group, (counts.get(e.group) ?? 0) + 1);
    return {
      id: row.id,
      key: row.key,
      title: row.title,
      description: row.description,
      entryCount: row.entries.length,
      groups: [...counts.entries()].map(([group, count]) => ({ group, count })),
    };
  });
}

export interface AdminKitRow {
  id: string;
  key: string;
  label: string;
  hint: string;
  group: string;
  engine: string;
  credit: string | null;
  position: number;
}

export async function adminKits(): Promise<AdminKitRow[]> {
  return prisma.kit.findMany({
    where: { ownerId: null },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      key: true,
      label: true,
      hint: true,
      group: true,
      engine: true,
      credit: true,
      position: true,
    },
  });
}

export interface AdminStyleDetail extends AdminStyleRow {
  versions: Array<{
    id: string;
    version: number;
    note: string;
    params: unknown;
    createdAt: Date;
  }>;
}

export async function adminStyle(key: string): Promise<AdminStyleDetail | null> {
  const row = await prisma.style.findFirst({
    where: { key, ownerId: null },
    select: {
      id: true,
      key: true,
      label: true,
      hint: true,
      group: true,
      meter: true,
      position: true,
      currentVersion: true,
      updatedAt: true,
      versions: {
        orderBy: { version: 'desc' },
        select: { id: true, version: true, note: true, params: true, createdAt: true },
      },
    },
  });
  if (!row) return null;
  return { ...row, versionCount: row.versions.length };
}
