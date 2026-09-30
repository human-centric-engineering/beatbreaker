/**
 * `find_patterns`: the caller's own patterns, the famous breaks and the
 * community library. The database is a fake that applies owner and
 * visibility filters; `listPublished` is the real query over it.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type BreakRow,
  dataOf,
  fakeBreakTable,
  fakeWorkspaceTable,
  funkPayload,
  type FakeWorkspaceTable,
} from '@/tests/helpers/buddy';
import { testLibrary, testStyles } from '@/tests/helpers/catalogue';

const db = vi.hoisted(() => ({
  workspace: null as FakeWorkspaceTable | null,
  breaks: null as ReturnType<typeof import('@/tests/helpers/buddy').fakeBreakTable> | null,
}));

vi.mock('@/lib/db/client', () => ({
  prisma: {
    get buddyWorkspace() {
      return db.workspace;
    },
    get break() {
      return db.breaks;
    },
  },
}));
vi.mock('@/lib/app/breaks/catalogue/data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/app/breaks/catalogue/data')>()),
  listStyles: vi.fn(),
  listLibraries: vi.fn(),
}));

vi.mock('@/lib/app/breaks/community/public', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/app/breaks/community/public')>()),
  listPublished: vi.fn(),
}));

import { FindPatternsCapability } from '@/lib/app/breaks/buddy/find-patterns';
import { listLibraries, listStyles } from '@/lib/app/breaks/catalogue/data';
import { listPublished } from '@/lib/app/breaks/community/public';

const OPEN_DOC = funkPayload(99);
const WORKSPACE_DOC = funkPayload();

function row(over: Partial<BreakRow>): BreakRow {
  return {
    id: 'b1',
    userId: 'user-1',
    title: 'Kitchen Groove',
    style: 'funk',
    meter: '4/4',
    bpm: 94,
    visibility: 'private',
    slug: null,
    doc: OPEN_DOC,
    updatedAt: new Date('2026-09-01'),
    ...over,
  };
}

const ROWS: BreakRow[] = [
  row({ id: 'mine-1', title: 'Kitchen Groove' }),
  row({ id: 'theirs-private', userId: 'user-2', title: 'Kitchen Secret' }),
  row({
    id: 'theirs-link',
    userId: 'user-2',
    title: 'Kitchen Link',
    visibility: 'link',
    slug: 'abc123xy',
  }),
  row({
    id: 'theirs-pub',
    userId: 'user-2',
    title: 'Kitchen Public',
    visibility: 'published',
    slug: 'pub12345',
  }),
];

beforeEach(() => {
  db.workspace = fakeWorkspaceTable([{ userId: 'user-1', doc: WORKSPACE_DOC, rev: 2 }]);
  db.breaks = fakeBreakTable(ROWS);
  vi.mocked(listStyles).mockResolvedValue(Object.values(testStyles()));
  vi.mocked(listLibraries).mockResolvedValue([testLibrary()]);
});

beforeEach(() => {
  vi.mocked(listPublished).mockResolvedValue({
    patterns: [
      {
        id: 'theirs-pub',
        slug: 'pub12345',
        title: 'Kitchen Public',
        description: null,
        style: 'funk',
        meter: '4/4',
        bpm: 94,
        level: 5,
        difficulty: 2,
        linkKinds: [],
        publishedAt: null,
        author: 'drummer2',
        saves: 3,
      },
    ],
    nextCursor: null,
  });
});

async function run(args: unknown, userId: string | null = 'user-1') {
  const cap = new FindPatternsCapability();
  return cap.execute(cap.validate(args), { userId, agentId: 'agent-1' });
}

describe('find_patterns', () => {
  it("finds the caller's own patterns by title and never another user's private ones", async () => {
    const result = await run({ query: 'kitchen', source: 'mine' });

    expect(dataOf(result).patterns.map((p) => p.id)).toEqual(['mine-1']);
    expect(dataOf(result).patterns[0]).toMatchObject({
      source: 'mine',
      title: 'Kitchen Groove',
      by: null,
    });
  });

  it('searches the famous breaks by artist as well as title', async () => {
    const entry = testLibrary().entries[0];
    const result = await run({ query: entry.artist.split(' ')[0], source: 'library' });

    expect(dataOf(result).patterns.map((p) => p.id)).toContain(entry.id);
    expect(dataOf(result).patterns.every((p) => p.source === 'library')).toBe(true);
  });

  it('asks the community library for published patterns with the words and style given', async () => {
    const result = await run({ query: 'kitchen', source: 'published', style: 'funk', limit: 5 });

    expect(listPublished).toHaveBeenCalledWith({
      q: 'kitchen',
      style: 'funk',
      sort: 'saved',
      limit: 5,
    });
    expect(dataOf(result).patterns).toEqual([
      {
        source: 'published',
        id: 'theirs-pub',
        title: 'Kitchen Public',
        style: 'funk',
        meter: '4/4',
        bpm: 94,
        by: 'drummer2',
      },
    ]);
  });

  it('searches all three by default', async () => {
    const result = await run({ query: 'kitchen' });
    const sources = new Set(dataOf(result).patterns.map((p) => p.source));
    expect(sources).toEqual(new Set(['mine', 'published']));
  });
});
