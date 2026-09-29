/** Fixtures for BeatBuddy's tools and workspace (Phase 7). */

import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import type { CapabilityResult } from '@/lib/orchestration/capabilities/types';
import { resolveLanes } from '@/lib/app/breaks/pattern';
import type { SharePayload } from '@/lib/app/breaks/schema';
import { breakPayload } from '@/lib/app/breaks/share';
import { styleIn } from '@/lib/app/breaks/styles';
import { testStyle } from '@/tests/helpers/catalogue';

/** A real funk break as a workspace document: seeded, so every run gets the same notes. */
export function funkPayload(seed = 424242): SharePayload {
  const funk = testStyle('funk');
  const roster = resolveLanes(styleIn(funk.params, '4/4'), null);
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    bars: 2,
    density: 55,
    ghosts: 60,
    seed,
    lanes: roster.lanes,
    perc: roster.perc,
  });
  return breakPayload({
    bpm: 94,
    swing: 0,
    level: 5,
    arrangement: ['A', 'A', 'B', 'A'],
    A,
    B: deriveB(A, funk.params),
  });
}

interface WorkspaceRow {
  userId: string;
  doc: unknown;
  rev: number;
}

/**
 * An in-memory `prisma.buddyWorkspace` that applies `where.userId` and
 * `where.rev` the way the database would. A `mockResolvedValue(row)` would hand
 * back the row whoever asked, so a test that one user never sees another's
 * workspace would pass with the owner filter deleted; this one would not.
 */
export type FakeWorkspaceTable = ReturnType<typeof fakeWorkspaceTable>;

export function fakeWorkspaceTable(rows: WorkspaceRow[] = []) {
  const table = new Map(rows.map((r) => [r.userId, { ...r }]));
  return {
    rows: table,
    findUnique: async ({ where }: { where: { userId: string } }) => {
      const row = table.get(where.userId);
      return row ? { doc: row.doc, rev: row.rev } : null;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { userId: string; rev: number };
      data: { doc: unknown; rev: { increment: number } };
    }) => {
      const row = table.get(where.userId);
      if (!row || row.rev !== where.rev) return { count: 0 };
      row.doc = data.doc;
      row.rev += data.rev.increment;
      return { count: 1 };
    },
  };
}

/** A tool result's data, or a thrown error naming the failure — so a test reads the data without narrowing. */
export function dataOf<T>(result: CapabilityResult<T>): T {
  if (!result.success || result.data === undefined) {
    throw new Error(`expected success, got ${JSON.stringify(result.error)}`);
  }
  return result.data;
}
