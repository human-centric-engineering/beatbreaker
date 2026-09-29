/**
 * `open_pattern`: a saved pattern, a famous break or a `/p/` link into the
 * caller's workspace. `openSavedBreak`, `openableIdForSlug` and the workspace
 * module are real; the database is a fake that applies owner and visibility
 * filters, so a private pattern of someone else's is unreachable only because
 * the query says so.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { breakDocFromPayload } from '@/lib/app/breaks/share';
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

import { OpenPatternCapability } from '@/lib/app/breaks/buddy/open-pattern';
import { listLibraries, listStyles } from '@/lib/app/breaks/catalogue/data';

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

async function run(args: unknown, userId: string | null = 'user-1') {
  const cap = new OpenPatternCapability();
  return cap.execute(cap.validate(args), { userId, agentId: 'agent-1' });
}

describe('open_pattern', () => {
  it("opens the caller's own saved pattern into the workspace and says it is theirs", async () => {
    const result = await run({ source: 'mine', id: 'mine-1' });

    expect(dataOf(result).doc).toEqual(sharePayloadSchema.parse(OPEN_DOC));
    expect(dataOf(result).opened).toEqual({
      source: 'saved',
      id: 'mine-1',
      title: 'Kitchen Groove',
      mine: true,
    });
    expect(dataOf(result).summary).toBe('Opened Kitchen Groove');
    expect(db.workspace?.rows.get('user-1')?.rev).toBe(3);
  });

  it("refuses someone else's private pattern exactly as it refuses an id that was never saved", async () => {
    const theirs = await run({ source: 'mine', id: 'theirs-private' });
    const nothing = await run({ source: 'mine', id: 'no-such-id' });

    expect(theirs).toEqual(nothing);
    expect(theirs).toMatchObject({ success: false, error: { code: 'not_found' } });
    expect(db.workspace?.rows.get('user-1')).toMatchObject({ doc: WORKSPACE_DOC, rev: 2 });
  });

  it("opens someone else's published pattern as a copy", async () => {
    const result = await run({ source: 'published', id: 'theirs-pub' });

    expect(dataOf(result).opened).toMatchObject({ id: 'theirs-pub', mine: false });
    expect(dataOf(result).summary).toBe('Opened Kitchen Public (a copy)');
  });

  it('opens a /p/ link by its slug, and refuses a link to nothing', async () => {
    const byLink = await run({ link: 'https://beatbreaker.app/p/abc123xy' });
    expect(dataOf(byLink).opened).toMatchObject({ id: 'theirs-link', mine: false });

    const bare = await run({ link: 'abc123xy' });
    expect(dataOf(bare).opened.id).toBe('theirs-link');

    const unknown = await run({ link: 'https://beatbreaker.app/p/zzzzzzzz' });
    expect(unknown).toMatchObject({ success: false, error: { code: 'not_found' } });

    const elsewhere = await run({ link: 'https://example.com/abc123xy' });
    expect(elsewhere).toMatchObject({ success: false, error: { code: 'not_found' } });
  });

  it("opens a famous break the way the Studio's picker does, keeping the workspace's swing and layer", async () => {
    const entry = testLibrary().entries[0];
    const result = await run({ source: 'library', id: entry.id });

    const after = breakDocFromPayload(sharePayloadSchema.parse(dataOf(result).doc));
    expect(after.A.name).toBe(entry.title);
    expect(after.B.name).toBe(`${entry.title} (B)`);
    expect(after.bpm).toBe(entry.bpm);
    expect(after.swing).toBe(0);
    expect(dataOf(result).opened).toEqual({
      source: 'library',
      id: entry.id,
      title: entry.title,
      mine: false,
    });
  });

  it('needs a source and id, or a link', () => {
    const cap = new OpenPatternCapability();
    expect(() => cap.validate({ id: 'mine-1' })).toThrow();
    expect(() => cap.validate({})).toThrow();
    expect(() => cap.validate({ link: 'abc123xy', id: 'mine-1' })).toThrow();
  });
});
