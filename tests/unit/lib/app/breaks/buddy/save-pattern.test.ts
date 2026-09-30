/**
 * `save_pattern`: the workspace saved to the caller's account as a new
 * private pattern, through the same row builder `POST /api/v1/breaks` uses.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sharePayloadSchema } from '@/lib/app/breaks/schema';
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

import { SavePatternCapability } from '@/lib/app/breaks/buddy/save-pattern';
import { listLibraries, listStyles } from '@/lib/app/breaks/catalogue/data';
import { columnsFromDoc } from '@/lib/app/breaks/columns';

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
  const cap = new SavePatternCapability();
  return cap.execute(cap.validate(args), { userId, agentId: 'agent-1' });
}

describe('save_pattern', () => {
  it('saves the workspace as a private pattern owned by the caller, with the columns the Save button writes', async () => {
    const result = await run({ title: '  Late Night Funk ' });

    const saved = db.breaks?.rows.find((r) => r.id === dataOf(result).id) as unknown as Record<
      string,
      unknown
    >;
    expect(dataOf(result).title).toBe('Late Night Funk');
    expect(saved).toMatchObject({
      userId: 'user-1',
      title: 'Late Night Funk',
      visibility: 'private',
      doc: WORKSPACE_DOC,
    });
    expect(saved.slug).toBeNull();
    const { columns } = await columnsFromDoc(sharePayloadSchema.parse(WORKSPACE_DOC));
    expect(saved).toMatchObject(columns);
  });

  it('takes the owner from the context: a user id in the arguments is dropped', async () => {
    const cap = new SavePatternCapability();
    const args = cap.validate({ title: 'Mine', userId: 'user-2' });

    expect(args).toEqual({ title: 'Mine' });
    const result = await cap.execute(args, { userId: 'user-1', agentId: 'agent-1' });
    expect(db.breaks?.rows.find((r) => r.id === dataOf(result).id)?.userId).toBe('user-1');
  });

  it('refuses with no workspace, and saves nothing', async () => {
    const before = db.breaks?.rows.length;
    const result = await run({ title: 'X' }, 'user-3');

    expect(result).toMatchObject({ success: false, error: { code: 'no_workspace' } });
    expect(db.breaks?.rows.length).toBe(before);
  });
});
